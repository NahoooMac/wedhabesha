const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Configure email transporter based on environment
      if (process.env.NODE_ENV === 'production') {
        // Production email configuration (e.g., SendGrid, AWS SES, etc.)
        this.transporter = nodemailer.createTransporter({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      } else {
        // Development configuration - use Ethereal Email for testing
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: 'ethereal.user@ethereal.email',
            pass: 'ethereal.pass'
          }
        });
      }
      
      console.log('📧 Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      // Create a mock transporter for development
      this.transporter = {
        sendMail: async (options) => {
          console.log('📧 Mock Email Sent:', {
            to: options.to,
            subject: options.subject,
            text: options.text?.substring(0, 100) + '...'
          });
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }

  async sendVerificationEmail(email, verificationCode, userName = 'User') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@weddingplatform.com',
        to: email,
        subject: '✅ Verify Your Account - Wedding Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
              <p style="color: #6B7280; margin: 5px 0;">Account Verification</p>
            </div>
            
            <div style="background: #F0FDF4; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid #10B981;">
              <h2 style="color: #1F2937; margin-top: 0;">Welcome ${userName}!</h2>
              <p style="color: #4B5563; line-height: 1.6;">
                Thank you for joining Wedding Platform! To complete your registration, please verify your email address using the code below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #10B981; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                  ${verificationCode}
                </div>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
                This code will expire in 15 minutes. If you didn't create an account, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 30px;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `Welcome ${userName}! Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Verification email sent successfully:', {
        to: email,
        messageId: result.messageId
      });
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendOTP(email, otpCode, type = 'PASSWORD_RESET') {
    try {
      const templates = {
        PASSWORD_RESET: {
          subject: '🔐 Password Reset Code - Wedding Platform',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
                <p style="color: #6B7280; margin: 5px 0;">Secure Password Reset</p>
              </div>
              
              <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; margin: 20px 0;">
                <h2 style="color: #1F2937; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #4B5563; line-height: 1.6;">
                  We received a request to reset your password. Use the verification code below to proceed:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: #4F46E5; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                    ${otpCode}
                  </div>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
                  This code will expire in 10 minutes. If you didn't request this, please ignore this email.
                </p>
              </div>
              
              <div style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 30px;">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          `
        },
        
        '2FA_SETUP': {
          subject: '🔐 Two-Factor Authentication Setup - Wedding Platform',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
                <p style="color: #6B7280; margin: 5px 0;">Two-Factor Authentication</p>
              </div>
              
              <div style="background: #F0FDF4; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h2 style="color: #1F2937; margin-top: 0;">2FA Setup Verification</h2>
                <p style="color: #4B5563; line-height: 1.6;">
                  To complete your two-factor authentication setup, please use this verification code:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: #10B981; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                    ${otpCode}
                  </div>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
                  This code will expire in 10 minutes. Keep your account secure!
                </p>
              </div>
            </div>
          `
        },
        
        '2FA_LOGIN': {
          subject: '🔐 Login Verification Code - Wedding Platform',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
                <p style="color: #6B7280; margin: 5px 0;">Login Verification</p>
              </div>
              
              <div style="background: #FEF3C7; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h2 style="color: #1F2937; margin-top: 0;">Login Verification Required</h2>
                <p style="color: #4B5563; line-height: 1.6;">
                  Someone is trying to log into your account. If this is you, use the code below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: #F59E0B; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                    ${otpCode}
                  </div>
                </div>
                
                <p style="color: #92400E; font-size: 14px; margin-bottom: 0;">
                  If you didn't try to log in, please secure your account immediately.
                </p>
              </div>
            </div>
          `
        }
      };

      const template = templates[type] || templates.PASSWORD_RESET;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@weddingplatform.com',
        to: email,
        subject: template.subject,
        html: template.html,
        text: `Your verification code is: ${otpCode}. This code will expire in 10 minutes.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 OTP email sent successfully:', {
        to: email,
        type: type,
        messageId: result.messageId
      });
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async send2FABackupCodes(email, backupCodes) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@weddingplatform.com',
        to: email,
        subject: '🔐 Your 2FA Backup Codes - Wedding Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
              <p style="color: #6B7280; margin: 5px 0;">Two-Factor Authentication Backup Codes</p>
            </div>
            
            <div style="background: #FEF2F2; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid #EF4444;">
              <h2 style="color: #1F2937; margin-top: 0;">⚠️ Important: Save These Backup Codes</h2>
              <p style="color: #4B5563; line-height: 1.6;">
                These backup codes can be used to access your account if you lose access to your authenticator app. 
                <strong>Each code can only be used once.</strong>
              </p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: monospace;">
                ${backupCodes.map(code => `<div style="padding: 5px 0; font-size: 16px; font-weight: bold;">${code}</div>`).join('')}
              </div>
              
              <div style="background: #FEE2E2; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #DC2626; font-size: 14px; margin: 0; font-weight: bold;">
                  🔒 Security Tips:
                </p>
                <ul style="color: #7F1D1D; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Store these codes in a secure location</li>
                  <li>Don't share them with anyone</li>
                  <li>Each code can only be used once</li>
                  <li>Generate new codes if these are compromised</li>
                </ul>
              </div>
            </div>
          </div>
        `,
        text: `Your 2FA Backup Codes:\n\n${backupCodes.join('\n')}\n\nKeep these codes secure and use them only if you lose access to your authenticator app.`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 2FA backup codes sent successfully:', {
        to: email,
        messageId: result.messageId
      });
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to send 2FA backup codes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendSecurityAlert(email, eventType, details = {}) {
    try {
      const alerts = {
        'password_changed': {
          subject: '🔐 Password Changed - Wedding Platform',
          message: 'Your account password has been successfully changed.',
          color: '#10B981'
        },
        '2fa_enabled': {
          subject: '🔐 Two-Factor Authentication Enabled - Wedding Platform',
          message: 'Two-factor authentication has been enabled on your account.',
          color: '#10B981'
        },
        '2fa_disabled': {
          subject: '⚠️ Two-Factor Authentication Disabled - Wedding Platform',
          message: 'Two-factor authentication has been disabled on your account.',
          color: '#F59E0B'
        },
        'suspicious_login': {
          subject: '🚨 Suspicious Login Attempt - Wedding Platform',
          message: 'We detected a suspicious login attempt on your account.',
          color: '#EF4444'
        }
      };

      const alert = alerts[eventType] || alerts['password_changed'];
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@weddingplatform.com',
        to: email,
        subject: alert.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0;">Wedding Platform</h1>
              <p style="color: #6B7280; margin: 5px 0;">Security Alert</p>
            </div>
            
            <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; margin: 20px 0; border-left: 4px solid ${alert.color};">
              <h2 style="color: #1F2937; margin-top: 0;">Security Notification</h2>
              <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                ${alert.message}
              </p>
              
              ${details.timestamp ? `<p style="color: #6B7280; font-size: 14px;"><strong>Time:</strong> ${new Date(details.timestamp).toLocaleString()}</p>` : ''}
              ${details.ip_address ? `<p style="color: #6B7280; font-size: 14px;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ''}
              ${details.location ? `<p style="color: #6B7280; font-size: 14px;"><strong>Location:</strong> ${details.location}</p>` : ''}
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
                If you didn't make this change or if you notice any suspicious activity, please contact our support team immediately.
              </p>
            </div>
          </div>
        `,
        text: `${alert.message}\n\nTime: ${details.timestamp ? new Date(details.timestamp).toLocaleString() : 'N/A'}\nIP: ${details.ip_address || 'N/A'}`
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Security alert sent successfully:', {
        to: email,
        type: eventType,
        messageId: result.messageId
      });
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to send security alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;