const axios = require('axios');
const otpService = require('./otpService');
require('dotenv').config();

class SMSService {
  constructor() {
    this.baseURL = 'https://api.afromessage.com/api';
    this.token = process.env.AFROMESSAGE_TOKEN;
    this.senderName = process.env.AFROMESSAGE_SENDER_NAMES;
    this.identifierId = process.env.AFROMESSAGE_IDENTIFIER_ID;
    
    // Test phone numbers that bypass SMS API
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
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ AfroMessage SMS service initialized');
    console.log('📋 Configuration:');
    console.log('  - Base URL:', this.baseURL);
    console.log('  - API Token:', this.token ? 'Set (***' + this.token.slice(-4) + ')' : 'Not set');
    console.log('  - Sender Name:', this.senderName);
    console.log('  - Identifier ID:', this.identifierId);
    console.log('  - Test Phone Numbers:', this.testPhoneNumbers.length, 'configured');
  }

  // Check if phone number is a test number
  isTestPhoneNumber(phone) {
    const formattedPhone = this.formatPhoneNumber(phone);
    return this.testPhoneNumbers.includes(formattedPhone);
  }

  // Get list of test phone numbers
  getTestPhoneNumbers() {
    return [...this.testPhoneNumbers];
  }

  // Check if phone number is a test number (public method)
  isTestNumber(phone) {
    return this.isTestPhoneNumber(phone);
  }
  generateMockSMSResponse(phone, message) {
    const formattedPhone = this.formatPhoneNumber(phone);
    const mockMessageId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log(`📱 [TEST MODE] Mock SMS sent to ${formattedPhone}: ${message.substring(0, 50)}...`);
    
    return {
      success: true,
      messageId: mockMessageId,
      phone: formattedPhone,
      status: 'sent',
      response: {
        acknowledge: 'success',
        messageId: mockMessageId,
        status: 'sent',
        testMode: true,
        message: 'SMS sent successfully (test mode)'
      }
    };
  }
  isConfigured() {
    return !!(this.token && this.senderName && this.identifierId);
  }

  // Format Ethiopian phone numbers
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different Ethiopian phone number formats
    if (cleaned.startsWith('251')) {
      // Already has country code, add + prefix
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Convert from local format (09XXXXXXXXX) to international format (+251XXXXXXXXX)
      return '+251' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // Add country code and + prefix
      return '+251' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Send single SMS
  async sendSMS(to, message, options = {}) {
    const formattedPhone = this.formatPhoneNumber(to);
    
    // Check if this is a test phone number
    if (this.isTestPhoneNumber(formattedPhone)) {
      console.log(`📱 [TEST MODE] Using test phone number: ${formattedPhone}`);
      return this.generateMockSMSResponse(formattedPhone, message);
    }

    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const payload = {
        to: formattedPhone,
        message: message,
        ...options
      };

      console.log(`📱 Sending SMS to ${formattedPhone}: ${message.substring(0, 50)}...`);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await this.axiosInstance.post('/send', payload);
      
      console.log('✅ SMS API Response:', response.data);
      
      // Check if the response indicates success or error
      if (response.data.acknowledge === 'error') {
        const errorMessage = response.data.response?.errors?.[0] || 'Unknown error';
        console.error('❌ SMS API Error:', errorMessage);
        
        return {
          success: false,
          phone: formattedPhone,
          status: 'failed',
          error: errorMessage,
          response: response.data
        };
      }
      
      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
        phone: formattedPhone,
        status: 'sent',
        response: response.data
      };
    } catch (error) {
      console.error('❌ SMS sending failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        phone: to,
        status: 'failed',
        error: error.message,
        response: error.response?.data || null
      };
    }
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, message, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const formattedPhones = recipients.map(phone => this.formatPhoneNumber(phone));
      
      const payload = {
        to: formattedPhones,
        message: message,
        ...options
      };

      console.log(`📱 Sending bulk SMS to ${formattedPhones.length} recipients`);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await this.axiosInstance.post('/bulk', payload);
      
      console.log('✅ Bulk SMS API Response:', response.data);
      
      // Check if the response indicates success or error
      if (response.data.acknowledge === 'error') {
        const errorMessage = response.data.response?.errors?.[0] || 'Unknown error';
        console.error('❌ Bulk SMS API Error:', errorMessage);
        
        return {
          success: false,
          totalSent: 0,
          recipients: recipients,
          status: 'failed',
          error: errorMessage,
          response: response.data
        };
      }
      
      return {
        success: true,
        totalSent: formattedPhones.length,
        messageId: response.data.messageId || response.data.id,
        recipients: formattedPhones,
        status: 'sent',
        response: response.data
      };
    } catch (error) {
      console.error('❌ Bulk SMS sending failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        totalSent: 0,
        recipients: recipients,
        status: 'failed',
        error: error.message,
        response: error.response?.data || null
      };
    }
  }

  // Send personalized bulk SMS
  async sendPersonalizedBulkSMS(personalizedMessages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const formattedMessages = personalizedMessages.map(msg => ({
        to: this.formatPhoneNumber(msg.to),
        message: msg.message
      }));
      
      const payload = {
        personalizedTo: formattedMessages,
        ...options
      };

      console.log(`📱 Sending personalized bulk SMS to ${formattedMessages.length} recipients`);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await this.axiosInstance.post('/bulk', payload);
      
      console.log('✅ Personalized bulk SMS API Response:', response.data);
      
      // Check if the response indicates success or error
      if (response.data.acknowledge === 'error') {
        const errorMessage = response.data.response?.errors?.[0] || 'Unknown error';
        console.error('❌ Personalized bulk SMS API Error:', errorMessage);
        
        return {
          success: false,
          totalSent: 0,
          recipients: personalizedMessages.map(msg => msg.to),
          status: 'failed',
          error: errorMessage,
          response: response.data
        };
      }
      
      return {
        success: true,
        totalSent: formattedMessages.length,
        messageId: response.data.messageId || response.data.id,
        recipients: formattedMessages.map(msg => msg.to),
        status: 'sent',
        response: response.data
      };
    } catch (error) {
      console.error('❌ Personalized bulk SMS sending failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        totalSent: 0,
        recipients: personalizedMessages.map(msg => msg.to),
        status: 'failed',
        error: error.message,
        response: error.response?.data || null
      };
    }
  }

  // Send security code (OTP) with database storage
  async sendSecurityCode(to, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      // Generate OTP code
      const code = this.generateOTP(options.length || 6, options.type || 0);
      const ttl = options.ttl || 300; // 5 minutes default
      const prefix = options.prefix || 'Your verification code is: ';
      const postfix = options.postfix || '. Do not share this code with anyone.';
      const message = `${prefix}${code}${postfix}`;

      // Store OTP in database
      const storeResult = await otpService.storeOTP(formattedPhone, code, ttl);
      if (!storeResult.success) {
        return {
          success: false,
          phone: formattedPhone,
          status: 'failed',
          error: 'Failed to store verification code',
          response: null
        };
      }

      // Send SMS
      const smsResult = await this.sendSMS(formattedPhone, message);
      
      if (smsResult.success) {
        return {
          success: true,
          phone: formattedPhone,
          verificationId: storeResult.id, // Use database ID as verification ID
          status: 'sent',
          expiresAt: storeResult.expiresAt,
          response: smsResult.response
        };
      } else {
        return {
          success: false,
          phone: formattedPhone,
          status: 'failed',
          error: smsResult.error,
          response: smsResult.response
        };
      }
    } catch (error) {
      console.error('❌ Security code sending failed:', error.message);
      
      return {
        success: false,
        phone: to,
        status: 'failed',
        error: error.message,
        response: null
      };
    }
  }

  // Generate OTP code
  generateOTP(length = 6, type = 0) {
    let characters;
    switch (type) {
      case 1: // alphabetic
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
      case 2: // alphanumeric
        characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        break;
      default: // numeric
        characters = '0123456789';
    }
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Verify security code using AfroMessage API or database storage
  async verifySecurityCode(to, code, verificationId = null, useAfroMessageAPI = false) {
    if (!this.isConfigured()) {
      throw new Error('SMS service not configured');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      console.log(`🔍 Verifying security code for ${formattedPhone} using ${useAfroMessageAPI ? 'AfroMessage API' : 'database'}`);
      
      // Try AfroMessage API verification first if requested
      if (useAfroMessageAPI) {
        try {
          const afroResult = await this.verifyWithAfroMessageAPI(formattedPhone, code, verificationId);
          if (afroResult.success) {
            return afroResult;
          }
          console.warn('⚠️ AfroMessage API verification failed, falling back to database verification');
        } catch (error) {
          console.warn('⚠️ AfroMessage API verification error, falling back to database verification:', error.message);
        }
      }
      
      // Use database verification as primary or fallback method
      const result = await otpService.verifyOTP(formattedPhone, code);
      
      if (result.success && result.verified) {
        console.log('✅ Security code verified successfully');
        return {
          success: true,
          verified: true,
          message: result.message,
          response: result
        };
      } else {
        console.log('❌ Security code verification failed:', result.error);
        return {
          success: false,
          verified: false,
          error: result.error,
          response: result
        };
      }
    } catch (error) {
      console.error('❌ Security code verification failed:', error.message);
      
      return {
        success: false,
        verified: false,
        error: error.message,
        response: null
      };
    }
  }

  // Verify security code using AfroMessage API
  async verifyWithAfroMessageAPI(to, code, verificationId = null) {
    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      // Build query parameters for AfroMessage verify endpoint
      const params = new URLSearchParams();
      params.append('code', code);
      
      if (verificationId) {
        params.append('vc', verificationId);
      } else {
        params.append('to', formattedPhone);
      }
      
      const verifyUrl = `/verify?${params.toString()}`;
      
      console.log(`🔍 Calling AfroMessage verify API: ${verifyUrl}`);
      
      const response = await this.axiosInstance.get(verifyUrl);
      
      console.log('✅ AfroMessage verify API response:', response.data);
      
      // Check if verification was successful
      if (response.data.acknowledge === 'success') {
        return {
          success: true,
          verified: true,
          message: 'Security code verified successfully via AfroMessage API',
          response: response.data
        };
      } else {
        const errorMessage = response.data.response?.errors?.[0] || 'Verification failed';
        return {
          success: false,
          verified: false,
          error: errorMessage,
          response: response.data
        };
      }
    } catch (error) {
      console.error('❌ AfroMessage verify API failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        verified: false,
        error: error.message,
        response: error.response?.data || null
      };
    }
  }

  // Generate wedding invitation message
  generateWeddingInvitation(guestName, weddingDetails, qrCode) {
    const { partner1_name, partner2_name, wedding_date, venue_name, venue_address } = weddingDetails;
    
    const formattedDate = new Date(wedding_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `Dear ${guestName},

You are cordially invited to the wedding of ${partner1_name} & ${partner2_name}!

📅 Date: ${formattedDate}
📍 Venue: ${venue_name}
🏠 Address: ${venue_address}

Your QR Code: ${qrCode}
Please present this QR code at the venue for check-in.

We look forward to celebrating with you!

Best regards,
${partner1_name} & ${partner2_name}`;
  }

  // Generate event update message
  generateEventUpdate(guestName, updateMessage, weddingDetails) {
    const { partner1_name, partner2_name } = weddingDetails;

    return `Dear ${guestName},

Wedding Update from ${partner1_name} & ${partner2_name}:

${updateMessage}

Thank you for your understanding.

Best regards,
${partner1_name} & ${partner2_name}`;
  }
}

// Export singleton instance
module.exports = new SMSService();