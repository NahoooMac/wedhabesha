const crypto = require('crypto');
const { query } = require('../config/database');

class OTPService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
    this.RATE_LIMIT_MINUTES = 5; // Minimum time between OTP requests
    
    // Test phone numbers that use fixed OTP codes
    this.testPhoneNumbers = [
      '+251911234567',
      '+251912345678',
      '+251913456789',
      '+251914567890',
      '+251915678901',
      '+251916789012',
      '+251917890123',
      '+251918901234',
      '+251919012345',
      '+251910123456'
    ];
    
    // Fixed OTP code for test numbers
    this.testOTPCode = '123456';
  }

  // Check if phone number is a test number
  isTestPhoneNumber(phone) {
    // Format phone number to match test numbers
    let formatted = phone;
    if (phone.startsWith('0')) {
      formatted = '+251' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      formatted = '+' + phone;
    }
    
    return this.testPhoneNumbers.includes(formatted);
  }

  // Generate a random OTP code
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate OTP code (test-aware)
  generateOTPCode(phone = null) {
    if (phone && this.isTestPhoneNumber(phone)) {
      console.log(`📱 [TEST MODE] Using fixed OTP code for test number: ${phone}`);
      return this.testOTPCode;
    }
    return this.generateOTP();
  }

  // Generate a secure random token for password reset
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate backup codes for 2FA
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.substring(0, 4) + '-' + code.substring(4, 8));
    }
    return codes;
  }

  // Check rate limiting for OTP requests
  async checkRateLimit(identifier, otpType) {
    try {
      const rateLimitCheck = await query(`
        SELECT COUNT(*) as count 
        FROM otp_codes 
        WHERE (email = $1 OR user_id IN (SELECT id FROM users WHERE phone = $1))
        AND otp_type = $2 
        AND created_at > datetime('now', '-${this.RATE_LIMIT_MINUTES} minutes')
      `, [identifier, otpType]);

      const recentRequests = parseInt(rateLimitCheck.rows[0].count);
      
      if (recentRequests >= 3) {
        return {
          allowed: false,
          message: `Too many OTP requests. Please wait ${this.RATE_LIMIT_MINUTES} minutes before requesting again.`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow on error to prevent blocking legitimate users
    }
  }

  // Clean up expired OTP codes
  async cleanupExpiredOTPs() {
    try {
      await query(`
        DELETE FROM otp_codes 
        WHERE expires_at < datetime('now') 
        OR is_used = 1
      `);
      
      await query(`
        DELETE FROM password_reset_tokens 
        WHERE expires_at < datetime('now') 
        OR is_used = 1
      `);
      
      console.log('🧹 Cleaned up expired OTP codes');
    } catch (error) {
      console.error('❌ Failed to cleanup expired OTPs:', error);
    }
  }

  // Generate and send OTP for password reset via SMS
  async generatePasswordResetOTP(phone, ipAddress = null, userAgent = null) {
    try {
      // Check rate limiting
      const rateLimit = await this.checkRateLimit(phone, 'PASSWORD_RESET');
      if (!rateLimit.allowed) {
        return {
          success: false,
          message: rateLimit.message
        };
      }

      // Check if user exists by phone number
      const userResult = await query('SELECT id, phone, email FROM users WHERE phone = $1', [phone]);
      if (userResult.rows.length === 0) {
        // Don't reveal if phone exists or not for security
        return {
          success: true,
          message: 'If an account with this phone number exists, you will receive a password reset code.'
        };
      }

      const user = userResult.rows[0];
      const otpCode = this.generateOTPCode(phone); // Use test-aware OTP generation
      const resetToken = this.generateResetToken();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP in database
      await query(`
        INSERT INTO otp_codes (user_id, email, otp_code, otp_type, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, 'PASSWORD_RESET', $4, $5, $6)
      `, [user.id, user.email, otpCode, expiresAt.toISOString(), ipAddress, userAgent]);

      // Store password reset token
      await query(`
        INSERT INTO password_reset_tokens (user_id, email, token, otp_code, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [user.id, user.email, resetToken, otpCode, expiresAt.toISOString(), ipAddress, userAgent]);

      // Send OTP via SMS
      const message = `Your WedHabesha password reset code is: ${otpCode}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
      
      // Import SMS service here to avoid circular dependency
      const smsService = require('./smsService');
      const smsResult = await smsService.sendSMS(phone, message);
      
      if (!smsResult.success) {
        console.error('Failed to send password reset SMS:', smsResult.error);
        return {
          success: false,
          message: 'Failed to send password reset SMS. Please try again.'
        };
      }

      // Log security event
      await this.logSecurityEvent(user.id, 'password_reset_requested', {
        ip_address: ipAddress,
        user_agent: userAgent,
        phone: phone
      });

      return {
        success: true,
        message: 'Password reset code sent to your phone number.',
        resetToken: resetToken // This will be used to verify the OTP
      };

    } catch (error) {
      console.error('Generate password reset OTP error:', error);
      return {
        success: false,
        message: 'Failed to generate password reset code. Please try again.'
      };
    }
  }

  // Verify OTP for password reset
  async verifyPasswordResetOTP(resetToken, otpCode, ipAddress = null) {
    try {
      // Find the reset token
      const tokenResult = await query(`
        SELECT prt.*, u.id as user_id, u.email 
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.is_used = 0 AND prt.expires_at > datetime('now')
      `, [resetToken]);

      if (tokenResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired reset token.'
        };
      }

      const resetData = tokenResult.rows[0];

      // Verify OTP code
      if (resetData.otp_code !== otpCode) {
        // Log failed attempt
        await this.logSecurityEvent(resetData.user_id, 'password_reset_otp_failed', {
          ip_address: ipAddress,
          provided_otp: otpCode
        });

        return {
          success: false,
          message: 'Invalid verification code.'
        };
      }

      // Mark OTP as used
      await query(`
        UPDATE password_reset_tokens 
        SET is_used = 1, used_at = datetime('now') 
        WHERE token = $1
      `, [resetToken]);

      await query(`
        UPDATE otp_codes 
        SET is_used = 1, used_at = datetime('now') 
        WHERE user_id = $1 AND otp_code = $2 AND otp_type = 'PASSWORD_RESET'
      `, [resetData.user_id, otpCode]);

      // Log successful verification
      await this.logSecurityEvent(resetData.user_id, 'password_reset_otp_verified', {
        ip_address: ipAddress
      });

      return {
        success: true,
        message: 'OTP verified successfully.',
        userId: resetData.user_id,
        email: resetData.email
      };

    } catch (error) {
      console.error('Verify password reset OTP error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Generate OTP for 2FA setup via SMS
  async generate2FAOTP(userId, phone, ipAddress = null, userAgent = null) {
    try {
      const otpCode = this.generateOTPCode(phone); // Use test-aware OTP generation
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Get user email for database storage
      const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const userEmail = userResult.rows[0].email;

      // Store OTP in database
      await query(`
        INSERT INTO otp_codes (user_id, email, otp_code, otp_type, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, '2FA_SETUP', $4, $5, $6)
      `, [userId, userEmail, otpCode, expiresAt.toISOString(), ipAddress, userAgent]);

      // Send OTP via SMS
      const message = `Your WedHabesha 2FA setup code is: ${otpCode}. This code expires in ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
      
      // Import SMS service here to avoid circular dependency
      const smsService = require('./smsService');
      const smsResult = await smsService.sendSMS(phone, message);
      
      if (!smsResult.success) {
        return {
          success: false,
          message: 'Failed to send 2FA setup SMS. Please try again.'
        };
      }

      return {
        success: true,
        message: '2FA setup code sent to your phone number.'
      };

    } catch (error) {
      console.error('Generate 2FA OTP error:', error);
      return {
        success: false,
        message: 'Failed to generate 2FA setup code. Please try again.'
      };
    }
  }

  // Verify 2FA OTP
  async verify2FAOTP(userId, otpCode, otpType = '2FA_SETUP') {
    try {
      const otpResult = await query(`
        SELECT * FROM otp_codes 
        WHERE user_id = $1 
        AND otp_code = $2 
        AND otp_type = $3 
        AND is_used = 0 
        AND expires_at > datetime('now')
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId, otpCode, otpType]);

      if (otpResult.rows.length === 0) {
        // Increment failed attempts
        await query(`
          UPDATE otp_codes 
          SET attempts = attempts + 1 
          WHERE user_id = $1 AND otp_type = $2 AND is_used = 0
        `, [userId, otpType]);

        return {
          success: false,
          message: 'Invalid or expired verification code.'
        };
      }

      const otp = otpResult.rows[0];

      // Check max attempts
      if (otp.attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.'
        };
      }

      // Mark OTP as used
      await query(`
        UPDATE otp_codes 
        SET is_used = 1, used_at = datetime('now') 
        WHERE id = $1
      `, [otp.id]);

      return {
        success: true,
        message: 'OTP verified successfully.'
      };

    } catch (error) {
      console.error('Verify 2FA OTP error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Generate and store backup codes for 2FA
  async generateAndStore2FABackupCodes(userId) {
    try {
      const backupCodes = this.generateBackupCodes();
      
      // Delete existing backup codes
      await query('DELETE FROM two_factor_backup_codes WHERE user_id = $1', [userId]);
      
      // Store new backup codes
      for (const code of backupCodes) {
        await query(`
          INSERT INTO two_factor_backup_codes (user_id, code)
          VALUES ($1, $2)
        `, [userId, code]);
      }

      return {
        success: true,
        backupCodes: backupCodes
      };

    } catch (error) {
      console.error('Generate backup codes error:', error);
      return {
        success: false,
        message: 'Failed to generate backup codes.'
      };
    }
  }

  // Verify 2FA backup code
  async verifyBackupCode(userId, backupCode) {
    try {
      const codeResult = await query(`
        SELECT * FROM two_factor_backup_codes 
        WHERE user_id = $1 AND code = $2 AND is_used = 0
      `, [userId, backupCode]);

      if (codeResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or already used backup code.'
        };
      }

      // Mark backup code as used
      await query(`
        UPDATE two_factor_backup_codes 
        SET is_used = 1, used_at = datetime('now') 
        WHERE user_id = $1 AND code = $2
      `, [userId, backupCode]);

      // Log backup code usage
      await this.logSecurityEvent(userId, '2fa_backup_code_used', {
        backup_code: backupCode.substring(0, 4) + '****' // Partial code for logging
      });

      return {
        success: true,
        message: 'Backup code verified successfully.'
      };

    } catch (error) {
      console.error('Verify backup code error:', error);
      return {
        success: false,
        message: 'Failed to verify backup code.'
      };
    }
  }

  // Log security events
  async logSecurityEvent(userId, eventType, metadata = {}) {
    try {
      await query(`
        INSERT INTO security_events (user_id, event_type, event_description, ip_address, user_agent, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        eventType,
        this.getEventDescription(eventType),
        metadata.ip_address || null,
        metadata.user_agent || null,
        JSON.stringify(metadata)
      ]);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get human-readable event descriptions
  getEventDescription(eventType) {
    const descriptions = {
      'password_reset_requested': 'Password reset was requested',
      'password_reset_otp_failed': 'Failed password reset OTP verification',
      'password_reset_otp_verified': 'Password reset OTP verified successfully',
      'password_reset_completed': 'Password was reset successfully',
      '2fa_setup_started': '2FA setup process started',
      '2fa_enabled': 'Two-factor authentication enabled',
      '2fa_disabled': 'Two-factor authentication disabled',
      '2fa_login_required': '2FA verification required for login',
      '2fa_login_success': '2FA login verification successful',
      '2fa_login_failed': '2FA login verification failed',
      '2fa_backup_code_used': '2FA backup code was used for login',
      'suspicious_login_attempt': 'Suspicious login attempt detected'
    };

    return descriptions[eventType] || eventType;
  }

  // Store OTP for phone verification (SQLite compatible)
  async storeOTP(phone, otpCode, ttlSeconds = 300) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      
      // Clean up any existing OTPs for this phone
      await query(`
        DELETE FROM otp_codes 
        WHERE email = ? AND otp_type = 'EMAIL_VERIFICATION'
      `, [phone]);

      // Store new OTP (using EMAIL_VERIFICATION type since PHONE_VERIFICATION is not allowed)
      await query(`
        INSERT INTO otp_codes (email, otp_code, otp_type, expires_at, created_at)
        VALUES (?, ?, 'EMAIL_VERIFICATION', ?, datetime('now'))
      `, [phone, otpCode, expiresAt.toISOString()]);

      return {
        success: true,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error) {
      console.error('Store OTP error:', error);
      return {
        success: false,
        error: 'Failed to store OTP'
      };
    }
  }

  // Verify OTP for phone verification (SQLite compatible)
  async verifyOTP(phone, otpCode) {
    try {
      const otpResult = await query(`
        SELECT * FROM otp_codes 
        WHERE email = ? 
        AND otp_code = ? 
        AND otp_type = 'EMAIL_VERIFICATION'
        AND is_used = 0 
        AND expires_at > datetime('now')
        ORDER BY created_at DESC 
        LIMIT 1
      `, [phone, otpCode]);

      if (otpResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired verification code'
        };
      }

      const otp = otpResult.rows[0];

      // Mark OTP as used
      await query(`
        UPDATE otp_codes 
        SET is_used = 1, used_at = datetime('now') 
        WHERE id = ?
      `, [otp.id]);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  // Start cleanup interval for expired OTPs
  startCleanupInterval() {
    // Clean up expired OTPs every hour
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 60 * 60 * 1000);
    
    console.log('🧹 OTP cleanup interval started');
  }

  // Stop cleanup interval
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('🧹 OTP cleanup interval stopped');
    }
  }
}

// Create singleton instance
const otpService = new OTPService();

// Start cleanup interval only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  otpService.startCleanupInterval();
}

module.exports = otpService;