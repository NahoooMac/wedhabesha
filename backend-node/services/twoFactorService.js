const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const otpService = require('./otpService');
const smsService = require('./smsService');

class TwoFactorService {
  constructor() {
    this.serviceName = 'Wedding Platform';
    this.issuer = 'WeddingPlatform';
  }

  // Generate 2FA secret for user
  async generateSecret(userId, email) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${email})`,
        issuer: this.issuer,
        length: 32
      });

      // Store the secret temporarily (not enabled yet)
      await query(`
        UPDATE users 
        SET two_factor_secret = $1 
        WHERE id = $2
      `, [secret.base32, userId]);

      return {
        success: true,
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url
      };

    } catch (error) {
      console.error('Generate 2FA secret error:', error);
      return {
        success: false,
        message: 'Failed to generate 2FA secret.'
      };
    }
  }

  // Generate QR code for 2FA setup
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return {
        success: true,
        qrCode: qrCodeDataUrl
      };

    } catch (error) {
      console.error('Generate QR code error:', error);
      return {
        success: false,
        message: 'Failed to generate QR code.'
      };
    }
  }

  // Verify TOTP token
  verifyToken(secret, token, window = 2) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window, // Allow some time drift
        step: 30 // 30-second time step
      });
    } catch (error) {
      console.error('Verify TOTP token error:', error);
      return false;
    }
  }

  // Enable 2FA for user
  async enable2FA(userId, phone, totpToken, ipAddress = null, userAgent = null) {
    try {
      // Get user's secret and email
      const userResult = await query(`
        SELECT two_factor_secret, two_factor_enabled, email 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const user = userResult.rows[0];

      if (!user.two_factor_secret) {
        return {
          success: false,
          message: '2FA secret not found. Please start the setup process again.'
        };
      }

      if (user.two_factor_enabled) {
        return {
          success: false,
          message: '2FA is already enabled for this account.'
        };
      }

      // Verify TOTP token
      const isValidToken = this.verifyToken(user.two_factor_secret, totpToken);
      if (!isValidToken) {
        // Log failed attempt
        await otpService.logSecurityEvent(userId, '2fa_setup_failed', {
          ip_address: ipAddress,
          user_agent: userAgent,
          reason: 'invalid_totp_token'
        });

        return {
          success: false,
          message: 'Invalid verification code. Please check your authenticator app and try again.'
        };
      }

      // Generate backup codes
      const backupCodesResult = await otpService.generateAndStore2FABackupCodes(userId);
      if (!backupCodesResult.success) {
        return {
          success: false,
          message: 'Failed to generate backup codes.'
        };
      }

      // Enable 2FA
      await query(`
        UPDATE users 
        SET two_factor_enabled = 1 
        WHERE id = $1
      `, [userId]);

      // Send backup codes via SMS
      const backupCodesText = backupCodesResult.backupCodes.join(', ');
      const message = `Your WedHabesha 2FA backup codes: ${backupCodesText}. Save these codes securely. Each code can only be used once.`;
      await smsService.sendSMS(phone, message);

      // Send security alert via SMS
      const alertMessage = `2FA has been enabled on your WedHabesha account. If this wasn't you, contact support immediately.`;
      await smsService.sendSMS(phone, alertMessage);

      // Log security event
      await otpService.logSecurityEvent(userId, '2fa_enabled', {
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        message: '2FA enabled successfully! Backup codes have been sent to your phone.',
        backupCodes: backupCodesResult.backupCodes
      };

    } catch (error) {
      console.error('Enable 2FA error:', error);
      return {
        success: false,
        message: 'Failed to enable 2FA. Please try again.'
      };
    }
  }

  // Disable 2FA for user
  async disable2FA(userId, phone, currentPassword, totpToken, ipAddress = null, userAgent = null) {
    try {
      // Verify current password
      const userResult = await query(`
        SELECT password_hash, two_factor_secret, two_factor_enabled, email 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const user = userResult.rows[0];

      if (!user.two_factor_enabled) {
        return {
          success: false,
          message: '2FA is not enabled for this account.'
        };
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid current password.'
        };
      }

      // Verify TOTP token
      const isValidToken = this.verifyToken(user.two_factor_secret, totpToken);
      if (!isValidToken) {
        // Log failed attempt
        await otpService.logSecurityEvent(userId, '2fa_disable_failed', {
          ip_address: ipAddress,
          user_agent: userAgent,
          reason: 'invalid_totp_token'
        });

        return {
          success: false,
          message: 'Invalid verification code.'
        };
      }

      // Disable 2FA and clear secret
      await query(`
        UPDATE users 
        SET two_factor_enabled = 0, two_factor_secret = NULL 
        WHERE id = $1
      `, [userId]);

      // Delete backup codes
      await query(`
        DELETE FROM two_factor_backup_codes 
        WHERE user_id = $1
      `, [userId]);

      // Send security alert via SMS
      const alertMessage = `2FA has been disabled on your WedHabesha account. If this wasn't you, contact support immediately.`;
      await smsService.sendSMS(phone, alertMessage);

      // Log security event
      await otpService.logSecurityEvent(userId, '2fa_disabled', {
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        message: '2FA has been disabled successfully.'
      };

    } catch (error) {
      console.error('Disable 2FA error:', error);
      return {
        success: false,
        message: 'Failed to disable 2FA. Please try again.'
      };
    }
  }

  // Verify 2FA during login
  async verifyLogin2FA(userId, token, ipAddress = null, userAgent = null) {
    try {
      // Get user's 2FA settings and phone
      const userResult = await query(`
        SELECT two_factor_secret, two_factor_enabled, email, phone
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const user = userResult.rows[0];

      if (!user.two_factor_enabled) {
        return {
          success: true,
          message: '2FA not required for this user.'
        };
      }

      // Check if it's a backup code
      if (token.includes('-') && token.length === 9) {
        const backupResult = await otpService.verifyBackupCode(userId, token);
        if (backupResult.success) {
          // Log successful backup code login
          await otpService.logSecurityEvent(userId, '2fa_backup_code_login', {
            ip_address: ipAddress,
            user_agent: userAgent
          });

          return {
            success: true,
            message: 'Backup code verified successfully.',
            usedBackupCode: true
          };
        } else {
          return backupResult;
        }
      }

      // Check if this is a test phone number using fixed OTP
      if (user.phone && otpService.isTestPhoneNumber(user.phone) && token === '123456') {
        // Using fixed OTP verification for test number
        
        // Log successful test 2FA login
        await otpService.logSecurityEvent(userId, '2fa_login_success', {
          ip_address: ipAddress,
          user_agent: userAgent,
          test_mode: true
        });

        return {
          success: true,
          message: '2FA verification successful (test mode).'
        };
      }

      // Verify TOTP token for non-test numbers
      const isValidToken = this.verifyToken(user.two_factor_secret, token);
      if (!isValidToken) {
        // Log failed attempt
        await otpService.logSecurityEvent(userId, '2fa_login_failed', {
          ip_address: ipAddress,
          user_agent: userAgent,
          provided_token: token.substring(0, 2) + '****' // Partial token for logging
        });

        return {
          success: false,
          message: 'Invalid verification code.'
        };
      }

      // Log successful 2FA login
      await otpService.logSecurityEvent(userId, '2fa_login_success', {
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return {
        success: true,
        message: '2FA verification successful.'
      };

    } catch (error) {
      console.error('Verify login 2FA error:', error);
      return {
        success: false,
        message: 'Failed to verify 2FA. Please try again.'
      };
    }
  }

  // Get 2FA status for user
  async get2FAStatus(userId) {
    try {
      const userResult = await query(`
        SELECT two_factor_enabled, 
               CASE WHEN two_factor_secret IS NOT NULL THEN 1 ELSE 0 END as has_secret
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const user = userResult.rows[0];

      // Get backup codes count
      const backupCodesResult = await query(`
        SELECT COUNT(*) as total_codes, 
               COUNT(CASE WHEN is_used = 0 THEN 1 END) as unused_codes
        FROM two_factor_backup_codes 
        WHERE user_id = $1
      `, [userId]);

      const backupCodes = backupCodesResult.rows[0] || { total_codes: 0, unused_codes: 0 };

      return {
        success: true,
        enabled: Boolean(user.two_factor_enabled),
        hasSecret: Boolean(user.has_secret),
        backupCodes: {
          total: parseInt(backupCodes.total_codes),
          unused: parseInt(backupCodes.unused_codes)
        }
      };

    } catch (error) {
      console.error('Get 2FA status error:', error);
      return {
        success: false,
        message: 'Failed to get 2FA status.'
      };
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId, phone, currentPassword, totpToken, ipAddress = null) {
    try {
      // Verify current password and 2FA token
      const userResult = await query(`
        SELECT password_hash, two_factor_secret, two_factor_enabled, email 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      const user = userResult.rows[0];

      if (!user.two_factor_enabled) {
        return {
          success: false,
          message: '2FA is not enabled for this account.'
        };
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid current password.'
        };
      }

      // Verify TOTP token
      const isValidToken = this.verifyToken(user.two_factor_secret, totpToken);
      if (!isValidToken) {
        return {
          success: false,
          message: 'Invalid verification code.'
        };
      }

      // Generate new backup codes
      const backupCodesResult = await otpService.generateAndStore2FABackupCodes(userId);
      if (!backupCodesResult.success) {
        return backupCodesResult;
      }

      // Send new backup codes via SMS
      const backupCodesText = backupCodesResult.backupCodes.join(', ');
      const message = `Your new WedHabesha 2FA backup codes: ${backupCodesText}. Save these codes securely. Each code can only be used once.`;
      await smsService.sendSMS(phone, message);

      // Log security event
      await otpService.logSecurityEvent(userId, '2fa_backup_codes_regenerated', {
        ip_address: ipAddress
      });

      return {
        success: true,
        message: 'New backup codes generated and sent to your phone.',
        backupCodes: backupCodesResult.backupCodes
      };

    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      return {
        success: false,
        message: 'Failed to regenerate backup codes.'
      };
    }
  }
}

// Create singleton instance
const twoFactorService = new TwoFactorService();

module.exports = twoFactorService;