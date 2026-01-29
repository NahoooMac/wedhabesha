const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const emailService = require('./emailService');
const smsService = require('./smsService');
const otpService = require('./otpService');

class RegistrationService {
  constructor() {
    this.VERIFICATION_CODE_LENGTH = 6;
    this.VERIFICATION_EXPIRY_MINUTES = 15;
    this.MAX_VERIFICATION_ATTEMPTS = 3;
  }

  // Generate verification code
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Check if user already exists
  async checkUserExists(email, phone = null) {
    try {
      let existingUser = null;
      
      // Check by email
      if (email) {
        const emailResult = await query('SELECT id, email, phone, is_verified FROM users WHERE email = $1', [email]);
        if (emailResult.rows.length > 0) {
          existingUser = { ...emailResult.rows[0], conflictField: 'email' };
        }
      }
      
      // Check by phone if provided and no email conflict
      if (phone && !existingUser) {
        const phoneResult = await query('SELECT id, email, phone, is_verified FROM users WHERE phone = $1', [phone]);
        if (phoneResult.rows.length > 0) {
          existingUser = { ...phoneResult.rows[0], conflictField: 'phone' };
        }
      }
      
      return existingUser;
    } catch (error) {
      console.error('Check user exists error:', error);
      throw error;
    }
  }

  // Start registration process with verification choice
  async startRegistration(userData, verificationType = 'email') {
    try {
      const { email, phone, password, user_type, ...profileData } = userData;
      
      // Validate verification type and required fields
      if (verificationType === 'email' && !email) {
        return {
          success: false,
          message: 'Email is required for email verification'
        };
      }
      
      if (verificationType === 'sms' && !phone) {
        return {
          success: false,
          message: 'Phone number is required for SMS verification'
        };
      }

      // Check if user already exists
      const existingUser = await this.checkUserExists(email, phone);
      if (existingUser) {
        if (existingUser.is_verified) {
          return {
            success: false,
            message: `User with this ${existingUser.conflictField} already exists and is verified`
          };
        } else {
          // User exists but not verified, allow re-sending verification
          return await this.resendVerification(existingUser.id, verificationType);
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate verification code and token
      const verificationCode = this.generateVerificationCode();
      const verificationToken = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

      // Create unverified user
      const userResult = await query(`
        INSERT INTO users (email, phone, password_hash, user_type, auth_provider, is_verified, is_active)
        VALUES ($1, $2, $3, $4, 'EMAIL', 0, 0)
        RETURNING id, email, phone, user_type
      `, [email, phone, passwordHash, user_type.toUpperCase()]);

      const user = userResult.rows[0];

      // Store verification data
      await query(`
        INSERT INTO user_verifications (user_id, verification_type, verification_code, verification_token, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.id, verificationType, verificationCode, verificationToken, expiresAt.toISOString()]);

      // Create profile based on user type
      if (user_type.toLowerCase() === 'couple') {
        await query(`
          INSERT INTO couples (user_id, partner1_name, partner2_name, phone)
          VALUES ($1, $2, $3, $4)
        `, [user.id, profileData.partner1_name, profileData.partner2_name, phone]);
      } else if (user_type.toLowerCase() === 'vendor') {
        await query(`
          INSERT INTO vendors (user_id, business_name, category, location, description, phone, is_verified, verification_status)
          VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending')
        `, [user.id, profileData.business_name, profileData.business_type, profileData.location || '', profileData.business_name, phone]);
      }

      // Send verification code
      const sendResult = await this.sendVerificationCode(user, verificationType, verificationCode);
      
      if (!sendResult.success) {
        // Rollback user creation if verification sending fails
        await query('DELETE FROM users WHERE id = $1', [user.id]);
        return sendResult;
      }

      return {
        success: true,
        message: `Registration initiated. Please check your ${verificationType === 'email' ? 'email' : 'phone'} for verification code.`,
        verificationToken: verificationToken,
        verificationType: verificationType,
        userId: user.id
      };

    } catch (error) {
      console.error('Start registration error:', error);
      return {
        success: false,
        message: 'Failed to start registration process'
      };
    }
  }

  // Send verification code via email or SMS
  async sendVerificationCode(user, verificationType, verificationCode) {
    try {
      if (verificationType === 'email') {
        const emailResult = await emailService.sendVerificationEmail(
          user.email,
          verificationCode,
          user.partner1_name || user.business_name || 'User'
        );
        
        if (!emailResult.success) {
          return {
            success: false,
            message: 'Failed to send verification email'
          };
        }
      } else if (verificationType === 'sms') {
        const message = `Your WedHabesha verification code is: ${verificationCode}. This code expires in ${this.VERIFICATION_EXPIRY_MINUTES} minutes. Do not share this code.`;
        const smsResult = await smsService.sendSMS(user.phone, message);
        
        if (!smsResult.success) {
          return {
            success: false,
            message: 'Failed to send verification SMS'
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Send verification code error:', error);
      return {
        success: false,
        message: 'Failed to send verification code'
      };
    }
  }

  // Verify registration code
  async verifyRegistration(verificationToken, verificationCode, ipAddress = null) {
    try {
      // Find verification record
      const verificationResult = await query(`
        SELECT uv.*, u.id as user_id, u.email, u.phone, u.user_type
        FROM user_verifications uv
        JOIN users u ON uv.user_id = u.id
        WHERE uv.verification_token = $1 
        AND uv.is_used = 0 
        AND uv.expires_at > CURRENT_TIMESTAMP
      `, [verificationToken]);

      if (verificationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }

      const verification = verificationResult.rows[0];

      // Check verification code
      if (verification.verification_code !== verificationCode) {
        // Increment attempts
        await query(`
          UPDATE user_verifications 
          SET attempts = attempts + 1 
          WHERE id = $1
        `, [verification.id]);

        if (verification.attempts >= this.MAX_VERIFICATION_ATTEMPTS - 1) {
          return {
            success: false,
            message: 'Maximum verification attempts exceeded. Please request a new code.'
          };
        }

        return {
          success: false,
          message: 'Invalid verification code'
        };
      }

      // Mark verification as used
      await query(`
        UPDATE user_verifications 
        SET is_used = 1, used_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [verification.id]);

      // Activate user account
      await query(`
        UPDATE users 
        SET is_verified = 1, is_active = 1, verified_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [verification.user_id]);

      // Log verification event
      await this.logVerificationEvent(verification.user_id, 'registration_verified', {
        verification_type: verification.verification_type,
        ip_address: ipAddress
      });

      // Get updated user data
      const userResult = await query(`
        SELECT id, email, phone, user_type, auth_provider, created_at
        FROM users 
        WHERE id = $1
      `, [verification.user_id]);

      return {
        success: true,
        message: 'Registration verified successfully',
        user: userResult.rows[0]
      };

    } catch (error) {
      console.error('Verify registration error:', error);
      return {
        success: false,
        message: 'Failed to verify registration'
      };
    }
  }

  // Resend verification code
  async resendVerification(userId, verificationType = null) {
    try {
      // Get user data
      const userResult = await query(`
        SELECT id, email, phone, user_type, is_verified
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.rows[0];

      if (user.is_verified) {
        return {
          success: false,
          message: 'User is already verified'
        };
      }

      // Determine verification type if not provided
      if (!verificationType) {
        verificationType = user.phone ? 'sms' : 'email';
      }

      // Validate verification type availability
      if (verificationType === 'email' && !user.email) {
        return {
          success: false,
          message: 'Email not available for verification'
        };
      }

      if (verificationType === 'sms' && !user.phone) {
        return {
          success: false,
          message: 'Phone number not available for verification'
        };
      }

      // Generate new verification code and token
      const verificationCode = this.generateVerificationCode();
      const verificationToken = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

      // Invalidate old verification codes
      await query(`
        UPDATE user_verifications 
        SET is_used = 1 
        WHERE user_id = $1 AND is_used = 0
      `, [userId]);

      // Create new verification record
      await query(`
        INSERT INTO user_verifications (user_id, verification_type, verification_code, verification_token, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, verificationType, verificationCode, verificationToken, expiresAt.toISOString()]);

      // Send verification code
      const sendResult = await this.sendVerificationCode(user, verificationType, verificationCode);
      
      if (!sendResult.success) {
        return sendResult;
      }

      return {
        success: true,
        message: `Verification code sent to your ${verificationType === 'email' ? 'email' : 'phone'}`,
        verificationToken: verificationToken,
        verificationType: verificationType
      };

    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        message: 'Failed to resend verification code'
      };
    }
  }

  // Switch verification method
  async switchVerificationMethod(userId, newVerificationType) {
    try {
      // Get user data
      const userResult = await query(`
        SELECT id, email, phone, user_type, is_verified
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.rows[0];

      if (user.is_verified) {
        return {
          success: false,
          message: 'User is already verified'
        };
      }

      // Validate new verification type
      if (newVerificationType === 'email' && !user.email) {
        return {
          success: false,
          message: 'Email not available for verification'
        };
      }

      if (newVerificationType === 'sms' && !user.phone) {
        return {
          success: false,
          message: 'Phone number not available for verification'
        };
      }

      // Use resend verification with new type
      return await this.resendVerification(userId, newVerificationType);

    } catch (error) {
      console.error('Switch verification method error:', error);
      return {
        success: false,
        message: 'Failed to switch verification method'
      };
    }
  }

  // Log verification events
  async logVerificationEvent(userId, eventType, metadata = {}) {
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
      console.error('Failed to log verification event:', error);
    }
  }

  // Get event descriptions
  getEventDescription(eventType) {
    const descriptions = {
      'registration_started': 'User registration process started',
      'registration_verified': 'User registration verified successfully',
      'verification_resent': 'Verification code resent',
      'verification_method_switched': 'Verification method changed',
      'verification_failed': 'Verification attempt failed'
    };

    return descriptions[eventType] || eventType;
  }

  // Clean up expired verification codes
  async cleanupExpiredVerifications() {
    try {
      await query(`
        DELETE FROM user_verifications 
        WHERE expires_at < CURRENT_TIMESTAMP 
        OR is_used = 1
      `);
      
      console.log('🧹 Cleaned up expired verification codes');
    } catch (error) {
      console.error('❌ Failed to cleanup expired verifications:', error);
    }
  }

  // Start cleanup interval
  startCleanupInterval() {
    // Clean up expired verifications every hour
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredVerifications();
    }, 60 * 60 * 1000);
    
    console.log('🧹 Verification cleanup interval started');
  }

  // Stop cleanup interval
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('🧹 Verification cleanup interval stopped');
    }
  }
}

// Create singleton instance
const registrationService = new RegistrationService();

// Start cleanup interval only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  registrationService.startCleanupInterval();
}

module.exports = registrationService;