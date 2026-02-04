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

  // Generate 2FA secret for user (authenticator method)
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

  // Setup 2FA with SMS method
  async setupSMS2FA(userId, phone) {
    try {
      // Generate and send SMS OTP
      const otpResult = await otpService.generateAndSendOTP(phone, '2FA_SETUP', userId);
      
      if (!otpResult.success) {
        return otpResult;
      }

      // Update user's 2FA method preference
      await query(`
        UPDATE users 
        SET two_factor_method = 'sms'
        WHERE id = $1
      `, [userId]);

      return {
        success: true,
        message: 'SMS verification code sent to your phone.',
        otpId: otpResult.otpId
      };

    } catch (error) {
      console.error('Setup SMS 2FA error:', error);
      return {
        success: false,
        message: 'Failed to setup SMS 2FA.'
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

  // Enable 2FA for user (supports both authenticator and SMS)
  async enable2FA(userId, phone, token, method = 'authenticator', ipAddress = null, userAgent = null) {
    try {
      // Get user's information
      const userResult = await query(`
        SELECT two_factor_secret, two_factor_enabled, email, two_factor_method
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

      if (user.two_factor_enabled) {
        return {
          success: false,
          message: '2FA is already enabled for this account.'
        };
      }

      let isValidToken = false;

      if (method === 'sms') {
        // Verify SMS OTP
        const otpResult = await otpService.verifyOTP(phone, token, '2FA_SETUP');
        isValidToken = otpResult.success;
        
        if (!isValidToken) {
          await otpService.logSecurityEvent(userId, '2fa_setup_failed', {
            ip_address: ipAddress,
            user_agent: userAgent,
            method: 'sms',
            reason: 'invalid_sms_otp'
          });

          return {
            success: false,
            message: 'Invalid SMS verification code. Please try again.'
          };
        }
      } else {
        // Verify TOTP token for authenticator method
        if (!user.two_factor_secret) {
          return {
            success: false,
            message: '2FA secret not found. Please start the setup process again.'
          };
        }

        isValidToken = this.verifyToken(user.two_factor_secret, token);
        
        if (!isValidToken) {
          await otpService.logSecurityEvent(userId, '2fa_setup_failed', {
            ip_address: ipAddress,
            user_agent: userAgent,
            method: 'authenticator',
            reason: 'invalid_totp_token'
          });

          return {
            success: false,
            message: 'Invalid verification code. Please check your authenticator app and try again.'
          };
        }
      }

      // Generate backup codes
      const backupCodesResult = await otpService.generateAndStore2FABackupCodes(userId);
      if (!backupCodesResult.success) {
        return {
          success: false,
          message: 'Failed to generate backup codes.'
        };
      }

      // Enable 2FA with the chosen method
      await query(`
        UPDATE users 
        SET two_factor_enabled = 1, two_factor_method = $2
        WHERE id = $1
      `, [userId, method]);

      // Send backup codes via SMS (only if phone number is available)
      const methodText = method === 'sms' ? 'SMS' : 'Authenticator App';
      
      if (phone && phone !== null && phone !== undefined && String(phone).trim()) {
        try {
          const backupCodesText = backupCodesResult.backupCodes.join(', ');
          const message = `Your WedHabesha 2FA backup codes: ${backupCodesText}. Save these codes securely. Each code can only be used once.`;
          const smsResult = await smsService.sendSMS(phone, message);
          
          if (!smsResult.success) {
            console.warn('Failed to send backup codes via SMS:', smsResult.error);
          }

          // Send security alert via SMS
          const alertMessage = `2FA (${methodText}) has been enabled on your WedHabesha account. If this wasn't you, contact support immediately.`;
          const alertResult = await smsService.sendSMS(phone, alertMessage);
          
          if (!alertResult.success) {
            console.warn('Failed to send security alert via SMS:', alertResult.error);
          }
        } catch (error) {
          console.warn('Error sending SMS notifications:', error.message);
        }
      } else {
        console.warn('Phone number not available for SMS notifications');
      }

      // Log security event
      await otpService.logSecurityEvent(userId, '2fa_enabled', {
        ip_address: ipAddress,
        user_agent: userAgent,
        method: method
      });

      return {
        success: true,
        message: `2FA enabled successfully with ${methodText}! Backup codes have been sent to your phone.`,
        backupCodes: backupCodesResult.backupCodes,
        method: method
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
      if (phone && phone !== null && phone !== undefined && String(phone).trim()) {
        try {
          const alertMessage = `2FA has been disabled on your WedHabesha account. If this wasn't you, contact support immediately.`;
          const alertResult = await smsService.sendSMS(phone, alertMessage);
          
          if (!alertResult.success) {
            console.warn('Failed to send security alert via SMS:', alertResult.error);
          }
        } catch (error) {
          console.warn('Error sending SMS security alert:', error.message);
        }
      } else {
        console.warn('Phone number not available for SMS security alert');
      }

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

  // Verify 2FA during login (supports both methods)
  async verifyLogin2FA(userId, token, ipAddress = null, userAgent = null) {
    try {
      // Get user's 2FA settings and phone
      const userResult = await query(`
        SELECT two_factor_secret, two_factor_enabled, two_factor_method, email, phone
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
            user_agent: userAgent,
            method: user.two_factor_method
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

      let isValidToken = false;

      if (user.two_factor_method === 'sms') {
        // For SMS method, verify the OTP
        if (user.phone && otpService.isTestPhoneNumber(user.phone) && token === '123456') {
          // Test phone number with fixed OTP
          isValidToken = true;
        } else {
          // Verify SMS OTP
          const otpResult = await otpService.verifyOTP(user.phone, token, '2FA_LOGIN');
          isValidToken = otpResult.success;
        }
      } else {
        // For authenticator method, verify TOTP
        if (user.phone && otpService.isTestPhoneNumber(user.phone) && token === '123456') {
          // Test phone number with fixed OTP
          isValidToken = true;
        } else {
          // Verify TOTP token
          isValidToken = this.verifyToken(user.two_factor_secret, token);
        }
      }

      if (!isValidToken) {
        // Log failed attempt
        await otpService.logSecurityEvent(userId, '2fa_login_failed', {
          ip_address: ipAddress,
          user_agent: userAgent,
          method: user.two_factor_method,
          provided_token: token.substring(0, 2) + '****' // Partial token for logging
        });

        const methodText = user.two_factor_method === 'sms' ? 'SMS code' : 'authenticator code';
        return {
          success: false,
          message: `Invalid ${methodText}.`
        };
      }

      // Log successful 2FA login
      await otpService.logSecurityEvent(userId, '2fa_login_success', {
        ip_address: ipAddress,
        user_agent: userAgent,
        method: user.two_factor_method,
        test_mode: user.phone && otpService.isTestPhoneNumber(user.phone)
      });

      return {
        success: true,
        message: '2FA verification successful.',
        method: user.two_factor_method
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
        SELECT two_factor_enabled, two_factor_method,
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
        method: user.two_factor_method || 'authenticator',
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
        SELECT password_hash, two_factor_secret, two_factor_enabled, two_factor_method, email 
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

      // Verify token based on method
      let isValidToken = false;
      if (user.two_factor_method === 'sms') {
        const otpResult = await otpService.verifyOTP(phone, totpToken, '2FA_SETUP');
        isValidToken = otpResult.success;
      } else {
        isValidToken = this.verifyToken(user.two_factor_secret, totpToken);
      }

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
      if (phone && phone !== null && phone !== undefined && String(phone).trim()) {
        try {
          const backupCodesText = backupCodesResult.backupCodes.join(', ');
          const message = `Your new WedHabesha 2FA backup codes: ${backupCodesText}. Save these codes securely. Each code can only be used once.`;
          const smsResult = await smsService.sendSMS(phone, message);
          
          if (!smsResult.success) {
            console.warn('Failed to send new backup codes via SMS:', smsResult.error);
          }
        } catch (error) {
          console.warn('Error sending new backup codes via SMS:', error.message);
        }
      } else {
        console.warn('Phone number not available for SMS backup codes');
      }

      // Log security event
      await otpService.logSecurityEvent(userId, '2fa_backup_codes_regenerated', {
        ip_address: ipAddress,
        method: user.two_factor_method
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

  // Send SMS OTP for login (for SMS 2FA method)
  async sendLoginSMS(userId) {
    try {
      // Get user's phone and 2FA method
      const userResult = await query(`
        SELECT phone, two_factor_enabled, two_factor_method
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

      if (!user.two_factor_enabled || user.two_factor_method !== 'sms') {
        return {
          success: false,
          message: 'SMS 2FA is not enabled for this account.'
        };
      }

      if (!user.phone) {
        return {
          success: false,
          message: 'No phone number found for SMS 2FA.'
        };
      }

      // Generate and send SMS OTP
      const otpResult = await otpService.generateAndSendOTP(user.phone, '2FA_LOGIN', userId);
      
      return {
        success: otpResult.success,
        message: otpResult.success ? 'SMS verification code sent to your phone.' : otpResult.message
      };

    } catch (error) {
      console.error('Send login SMS error:', error);
      return {
        success: false,
        message: 'Failed to send SMS verification code.'
      };
    }
  }
}

// Create singleton instance
const twoFactorService = new TwoFactorService();

module.exports = twoFactorService;