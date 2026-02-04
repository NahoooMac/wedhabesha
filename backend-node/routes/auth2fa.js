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
    const coupleResult = await query(`SELECT phone FROM couples WHERE user_id = $1`, [userId]);
    if (coupleResult.rows.length > 0 && coupleResult.rows[0].phone && String(coupleResult.rows[0].phone).trim()) {
      return coupleResult.rows[0].phone;
    }
  } catch (error) {
    console.log('Error checking couples table:', error.message);
  }
  
  try {
    // Check vendors table if user is a vendor
    const vendorResult = await query(`SELECT phone FROM vendors WHERE user_id = $1`, [userId]);
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { resetToken, otpCode, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Verify OTP
    const otpResult = await otpService.verifyPasswordResetOTP(resetToken, otpCode, ipAddress);
    
    if (!otpResult.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: otpResult.message
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(`
      UPDATE users 
      SET password_hash = $1, last_login_at = datetime('now') 
      WHERE id = $2
    `, [passwordHash, otpResult.userId]);

    // Send security alert
    await otpService.logSecurityEvent(otpResult.userId, 'password_reset_completed', {
      ip_address: ipAddress,
      phone: phone
    });

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
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
    const { phone, password, token } = req.body;
    
    if (!phone || !password || !token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone, password, and 2FA token are required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // First verify phone and password
    const userResult = await query(`
      SELECT id, email, phone, password_hash, user_type, auth_provider, is_active, two_factor_enabled
      FROM users 
      WHERE phone = $1 AND auth_provider = 'EMAIL'
    `, [phone]);

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

    // Verify 2FA token
    const twoFAResult = await twoFactorService.verifyLogin2FA(user.id, token, ipAddress, userAgent);
    
    if (!twoFAResult.success) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: twoFAResult.message
      });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = datetime("now") WHERE id = $1', [user.id]);

    // Generate access token
    const accessToken = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
    console.error('2FA verify login error:', error);
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

    // Verify phone and password first
    const userResult = await query(`
      SELECT id, email, phone, password_hash, user_type, two_factor_enabled, is_active
      FROM users 
      WHERE phone = $1 AND auth_provider = 'EMAIL'
    `, [phone]);

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
      userId: user.id,
      phone: user.phone
    });

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