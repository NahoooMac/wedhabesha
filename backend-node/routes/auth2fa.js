const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const otpService = require('../services/otpService');
const twoFactorService = require('../services/twoFactorService');

const router = express.Router();

// Helper function to get user's phone number from couples or vendors table
async function getUserPhone(userId) {
  try {
    // Check couples table if user is a couple
    const coupleResult = await query(`SELECT phone FROM couples WHERE user_id = ?`, [userId]);
    if (coupleResult.rows.length > 0 && coupleResult.rows[0].phone && String(coupleResult.rows[0].phone).trim()) {
      return coupleResult.rows[0].phone;
    }
  } catch (error) {
    console.log('Error checking couples table:', error.message);
  }
  
  try {
    // Check vendors table if user is a vendor
    const vendorResult = await query(`SELECT phone FROM vendors WHERE user_id = ?`, [userId]);
    if (vendorResult.rows.length > 0 && vendorResult.rows[0].phone && String(vendorResult.rows[0].phone).trim()) {
      return vendorResult.rows[0].phone;
    }
  } catch (error) {
    console.log('Error checking vendors table:', error.message);
  }
  
  console.warn(`No phone number found for user ID: ${userId}`);
  return null;
}

// Validation rules
const forgotPasswordValidation = [
  body('phone').matches(/^(\+251|0)[9][0-9]{8}$/).withMessage('Please enter a valid Ethiopian phone number (format: +251912345678 or 0912345678)')
];

const resetPasswordValidation = [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('otpCode').isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const verify2FAValidation = [
  body('token').isLength({ min: 6, max: 9 }).withMessage('Invalid token format')
];

// ==================== FORGOT PASSWORD ROUTES ====================

// Request password reset
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { phone } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await otpService.generatePasswordResetOTP(phone, ipAddress, userAgent);

    if (result.success) {
      res.json({
        message: result.message,
        resetToken: result.resetToken
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process password reset request'
    });
  }
});

// Verify OTP and reset password
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  try {
    console.log('=== Reset Password Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { resetToken, otpCode, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log('Calling verifyPasswordResetOTP...');
    // Verify OTP
    const otpResult = await otpService.verifyPasswordResetOTP(resetToken, otpCode, ipAddress);
    
    console.log('OTP verification result:', otpResult);

    if (!otpResult.success) {
      console.log('❌ OTP verification failed:', otpResult.message);
      return res.status(400).json({
        error: 'Bad Request',
        message: otpResult.message
      });
    }

    console.log('✅ OTP verified, updating password...');

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(`
      UPDATE users 
      SET password_hash = $1, last_login_at = datetime('now') 
      WHERE id = $2
    `, [passwordHash, otpResult.userId]);

    console.log('✅ Password updated successfully for user:', otpResult.userId);

    // Send security alert
    await otpService.logSecurityEvent(otpResult.userId, 'password_reset_completed', {
      ip_address: ipAddress,
      email: otpResult.email
    });

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
});

// ==================== TWO-FACTOR AUTHENTICATION ROUTES ====================

// Get 2FA status
router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const result = await twoFactorService.get2FAStatus(req.user.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get 2FA status'
    });
  }
});

// Start 2FA setup (generate secret and QR code for authenticator or setup SMS)
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { method = 'authenticator' } = req.body;

    if (method === 'sms') {
      // Setup SMS 2FA - get phone number from appropriate table
      const phone = await getUserPhone(userId);
      
      if (!phone) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Phone number is required for SMS 2FA. Please update your profile first.'
        });
      }

      const result = await twoFactorService.setupSMS2FA(userId, phone);
      
      if (!result.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: result.message
        });
      }

      return res.json({
        message: result.message,
        method: 'sms'
      });
    } else {
      // Setup authenticator 2FA (existing logic)
      // Generate secret
      const secretResult = await twoFactorService.generateSecret(userId, userEmail);
      
      if (!secretResult.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: secretResult.message
        });
      }

      // Generate QR code
      const qrResult = await twoFactorService.generateQRCode(secretResult.qrCodeUrl);
      
      if (!qrResult.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: qrResult.message
        });
      }

      res.json({
        message: '2FA setup initiated. Scan the QR code with your authenticator app.',
        secret: secretResult.secret,
        qrCode: qrResult.qrCode,
        manualEntryKey: secretResult.secret,
        method: 'authenticator'
      });
    }

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to setup 2FA'
    });
  }
});

// Enable 2FA (verify TOTP token)
router.post('/2fa/enable', authenticateToken, verify2FAValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { token, method = 'authenticator' } = req.body;
    const userId = req.user.id;
    const userPhone = await getUserPhone(userId);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await twoFactorService.enable2FA(userId, userPhone, token, method, ipAddress, userAgent);
    
    if (result.success) {
      // Create system notification for 2FA enabled
      try {
        const timestamp = new Date().toLocaleString('en-US', { 
          timeZone: 'Africa/Addis_Ababa',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        
        const methodName = method === 'sms' ? 'SMS' : 'Authenticator App';
        
        await query(`
          INSERT INTO notifications (user_id, type, title, message, is_read, data)
          VALUES (?, ?, ?, ?, 0, ?)
        `, [
          userId,
          'info',
          'Two-Factor Authentication Enabled',
          `Two-factor authentication via ${methodName} was successfully enabled on ${timestamp}. Your account is now more secure.`,
          JSON.stringify({ 
            event: '2fa_enabled',
            method: method,
            ip_address: ipAddress,
            timestamp: new Date().toISOString()
          })
        ]);
        
        console.log('✅ 2FA enabled notification created for user:', userId);
      } catch (notifError) {
        console.error('Failed to create 2FA enabled notification:', notifError);
        // Don't fail the 2FA enable if notification fails
      }
      
      res.json({
        message: result.message,
        backupCodes: result.backupCodes,
        method: result.method
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enable 2FA'
    });
  }
});

// Send verification code for disabling 2FA (for SMS method)
router.post('/2fa/disable/send-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's 2FA method and phone
    const userResult = await query(`
      SELECT two_factor_enabled, two_factor_method 
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '2FA is not enabled for this account'
      });
    }

    // Only send code for SMS method
    if (user.two_factor_method !== 'sms') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This endpoint is only for SMS-based 2FA. Please use your authenticator app.'
      });
    }

    // Get phone number
    const userPhone = await getUserPhone(userId);
    
    if (!userPhone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No phone number found for SMS verification'
      });
    }

    // Send OTP code
    const otpResult = await otpService.generateAndSendOTP(userPhone, '2FA_DISABLE', userId);

    if (otpResult.success) {
      res.json({
        message: 'Verification code sent to your phone',
        phone: userPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') // Mask middle digits
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: otpResult.message || 'Failed to send verification code'
      });
    }

  } catch (error) {
    console.error('Send disable 2FA code error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send verification code'
    });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, token } = req.body;
    
    if (!currentPassword || !token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and 2FA token are required'
      });
    }

    const userId = req.user.id;
    const userPhone = await getUserPhone(userId);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await twoFactorService.disable2FA(userId, userPhone, currentPassword, token, ipAddress, userAgent);
    
    if (result.success) {
      // Create system notification for 2FA disabled
      try {
        const timestamp = new Date().toLocaleString('en-US', { 
          timeZone: 'Africa/Addis_Ababa',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        
        await query(`
          INSERT INTO notifications (user_id, type, title, message, is_read, data)
          VALUES (?, ?, ?, ?, 0, ?)
        `, [
          userId,
          'alert',
          'Two-Factor Authentication Disabled',
          `Two-factor authentication was disabled on ${timestamp}. If you didn't make this change, please enable 2FA immediately and contact support.`,
          JSON.stringify({ 
            event: '2fa_disabled',
            ip_address: ipAddress,
            timestamp: new Date().toISOString()
          })
        ]);
        
        console.log('✅ 2FA disabled notification created for user:', userId);
      } catch (notifError) {
        console.error('Failed to create 2FA disabled notification:', notifError);
        // Don't fail the 2FA disable if notification fails
      }
      
      res.json({
        message: result.message
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disable 2FA'
    });
  }
});

// Verify 2FA during login
router.post('/2fa/verify', async (req, res) => {
  try {
    console.log('=== 2FA Verify Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { phone, email, password, token } = req.body;
    
    // Accept either phone or email
    const identifier = phone || email;
    
    if (!identifier || !password || !token) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email/phone, password, and 2FA token are required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    let user = null;

    // Try to find user by email first
    if (email) {
      console.log('🔍 Looking up user by email:', email);
      const emailResult = await query(`
        SELECT id, email, password_hash, user_type, auth_provider, is_active, two_factor_enabled
        FROM users
        WHERE email = ? AND auth_provider = 'EMAIL'
      `, [email]);
      
      console.log('Email lookup result:', emailResult.rows.length, 'rows');
      
      if (emailResult.rows.length > 0) {
        user = emailResult.rows[0];
        console.log('✅ User found by email:', user.id, user.email);
      }
    }

    // If not found by email, try phone number
    if (!user && phone) {
      console.log('🔍 Looking up user by phone:', phone);
      // Find user by phone number from couples table
      let userResult = await query(`
        SELECT u.id, u.email, u.password_hash, u.user_type, u.auth_provider, u.is_active, u.two_factor_enabled, c.phone
        FROM users u
        JOIN couples c ON u.id = c.user_id
        WHERE c.phone = ? AND u.auth_provider = 'EMAIL'
      `, [phone]);

      console.log('Couples lookup result:', userResult.rows.length, 'rows');

      // If not found in couples, check vendors
      if (userResult.rows.length === 0) {
        userResult = await query(`
          SELECT u.id, u.email, u.password_hash, u.user_type, u.auth_provider, u.is_active, u.two_factor_enabled, v.phone
          FROM users u
          JOIN vendors v ON u.id = v.user_id
          WHERE v.phone = ? AND u.auth_provider = 'EMAIL'
        `, [phone]);
        
        console.log('Vendors lookup result:', userResult.rows.length, 'rows');
      }

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        console.log('✅ User found by phone:', user.id, user.email);
      }
    }

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials. Please check your email/phone and password.'
      });
    }

    if (!user.is_active) {
      console.log('❌ Account is deactivated');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is deactivated'
      });
    }

    // Verify password
    console.log('🔐 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials. Please check your email/phone and password.'
      });
    }
    console.log('✅ Password is valid');

    // Verify 2FA token
    console.log('🔐 Verifying 2FA token:', token);
    const twoFAResult = await twoFactorService.verifyLogin2FA(user.id, token, ipAddress, userAgent);
    
    console.log('2FA verification result:', twoFAResult);
    
    if (!twoFAResult.success) {
      console.log('❌ 2FA verification failed:', twoFAResult.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: twoFAResult.message
      });
    }
    
    console.log('✅ 2FA verification successful');

    // Update last login
    await query('UPDATE users SET last_login_at = datetime("now") WHERE id = ?', [user.id]);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Login successful, returning access token');

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        auth_provider: user.auth_provider
      },
      usedBackupCode: twoFAResult.usedBackupCode || false
    });

  } catch (error) {
    console.error('❌ 2FA verify login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify 2FA login'
    });
  }
});

// Regenerate backup codes
router.post('/2fa/regenerate-backup-codes', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, token } = req.body;
    
    if (!currentPassword || !token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and 2FA token are required'
      });
    }

    const userId = req.user.id;
    const userPhone = await getUserPhone(userId);
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await twoFactorService.regenerateBackupCodes(userId, userPhone, currentPassword, token, ipAddress);
    
    if (result.success) {
      res.json({
        message: result.message,
        backupCodes: result.backupCodes
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to regenerate backup codes'
    });
  }
});

// Check if 2FA is required for login
router.post('/login/check-2fa', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone and password are required'
      });
    }

    // Find user by phone number from couples or vendors table
    let userResult = await query(`
      SELECT u.id, u.email, u.password_hash, u.user_type, u.two_factor_enabled, u.two_factor_method, u.is_active, c.phone
      FROM users u
      JOIN couples c ON u.id = c.user_id
      WHERE c.phone = ? AND u.auth_provider = 'EMAIL'
    `, [phone]);

    // If not found in couples, check vendors
    if (userResult.rows.length === 0) {
      userResult = await query(`
        SELECT u.id, u.email, u.password_hash, u.user_type, u.two_factor_enabled, u.two_factor_method, u.is_active, v.phone
        FROM users u
        JOIN vendors v ON u.id = v.user_id
        WHERE v.phone = ? AND u.auth_provider = 'EMAIL'
      `, [phone]);
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid phone or password'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid phone or password'
      });
    }

    res.json({
      requires2FA: Boolean(user.two_factor_enabled),
      twoFactorMethod: user.two_factor_method || 'authenticator',
      userId: user.id,
      phone: user.phone
    });

    // If SMS 2FA is enabled, automatically send the OTP code after responding
    if (user.two_factor_enabled && user.two_factor_method === 'sms' && user.phone) {
      // Send SMS OTP asynchronously (don't wait for it)
      setImmediate(async () => {
        try {
          const otpResult = await otpService.generateAndSendOTP(user.phone, '2FA_LOGIN', user.id);
          
          if (!otpResult.success) {
            console.error('Failed to send login SMS OTP:', otpResult.message);
          } else {
            console.log('✅ Login SMS OTP sent successfully to:', user.phone);
          }
        } catch (error) {
          console.error('Error sending login SMS OTP:', error);
        }
      });
    }

  } catch (error) {
    console.error('Check 2FA requirement error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check 2FA requirement'
    });
  }
});

// Send SMS OTP for login (for SMS 2FA method)
router.post('/2fa/send-sms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await twoFactorService.sendLoginSMS(userId);
    
    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Send SMS 2FA error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send SMS verification code'
    });
  }
});

module.exports = router;