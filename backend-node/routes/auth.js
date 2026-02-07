const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const twoFactorService = require('../services/twoFactorService');
const registrationService = require('../services/registrationService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate unique wedding code
const generateWeddingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate staff PIN
const generateStaffPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enhanced registration validation
const enhancedRegisterValidation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('verification_type').isIn(['email', 'sms']).withMessage('Verification type must be email or sms'),
  body('user_type').isIn(['couple', 'vendor']).withMessage('User type must be couple or vendor')
];

const verificationValidation = [
  body('verification_token').notEmpty().withMessage('Verification token is required'),
  body('verification_code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
];

// Enhanced registration - start registration process
router.post('/register/enhanced', enhancedRegisterValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { verification_type, ...userData } = req.body;

    // Validate required fields based on verification type
    if (verification_type === 'email' && !userData.email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required for email verification'
      });
    }

    if (verification_type === 'sms' && !userData.phone) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Phone number is required for SMS verification'
      });
    }

    // Start registration process
    const result = await registrationService.startRegistration(userData, verification_type);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        verification_token: result.verificationToken,
        verification_type: result.verificationType,
        user_id: result.userId
      });
    } else {
      res.status(400).json({
        error: 'Registration Error',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Enhanced registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to start registration process'
    });
  }
});

// Verify registration
router.post('/register/verify', verificationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { verification_token, verification_code } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Verify registration
    const result = await registrationService.verifyRegistration(verification_token, verification_code, ipAddress);

    if (result.success) {
      // Generate access token for the verified user
      const accessToken = generateToken(result.user.id, result.user.user_type);

      res.status(200).json({
        success: true,
        message: result.message,
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          user_type: result.user.user_type,
          auth_provider: result.user.auth_provider
        }
      });
    } else {
      res.status(400).json({
        error: 'Verification Error',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Registration verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify registration'
    });
  }
});

// Resend verification code
router.post('/register/resend', async (req, res) => {
  try {
    const { user_id, verification_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'User ID is required'
      });
    }

    // Resend verification
    const result = await registrationService.resendVerification(user_id, verification_type);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        verification_token: result.verificationToken,
        verification_type: result.verificationType
      });
    } else {
      res.status(400).json({
        error: 'Resend Error',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend verification code'
    });
  }
});

// Switch verification method
router.post('/register/switch-method', async (req, res) => {
  try {
    const { user_id, new_verification_type } = req.body;

    if (!user_id || !new_verification_type) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'User ID and new verification type are required'
      });
    }

    if (!['email', 'sms'].includes(new_verification_type)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Verification type must be email or sms'
      });
    }

    // Switch verification method
    const result = await registrationService.switchVerificationMethod(user_id, new_verification_type);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        verification_token: result.verificationToken,
        verification_type: result.verificationType
      });
    } else {
      res.status(400).json({
        error: 'Switch Method Error',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Switch verification method error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to switch verification method'
    });
  }
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('partner1_name').notEmpty().withMessage('Partner 1 name is required'),
  body('partner2_name').notEmpty().withMessage('Partner 2 name is required')
];

const vendorRegisterValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('business_name').notEmpty().withMessage('Business name is required'),
  body('business_type').notEmpty().withMessage('Business type is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('location').optional()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Register vendor
router.post('/register/vendor', vendorRegisterValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password, business_name, business_type, phone, location } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Check if phone number is already taken (if provided)
    if (phone) {
      const existingPhone = await query('SELECT id FROM vendors WHERE phone = $1', [phone]);
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This phone number is already registered with another account'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(`
      INSERT INTO users (email, password_hash, user_type, auth_provider)
      VALUES ($1, $2, 'VENDOR', 'EMAIL')
      RETURNING id, email, user_type, auth_provider, created_at
    `, [email, passwordHash]);

    const user = userResult.rows[0];

    // Create vendor profile
    const vendorResult = await query(`
      INSERT INTO vendors (user_id, business_name, category, location, description, phone, is_verified, verification_status)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending')
      RETURNING id
    `, [user.id, business_name, business_type, location || '', business_name, phone]);

    const vendor = vendorResult.rows[0];

    // Create vendor application for admin review
    await query(`
      INSERT INTO vendor_applications (vendor_id, status, submitted_at)
      VALUES ($1, 'pending', datetime('now'))
    `, [vendor.id]);

    // Generate access token
    const accessToken = generateToken(user.id, user.user_type);

    res.status(201).json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        auth_provider: user.auth_provider
      },
      vendor_id: vendor.id
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register vendor'
    });
  }
});

// Register couple
router.post('/register/couple', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password, partner1_name, partner2_name, phone } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Check if phone number is already taken (if provided)
    if (phone) {
      const existingPhone = await query('SELECT id FROM couples WHERE phone = $1', [phone]);
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This phone number is already registered with another account'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(`
      INSERT INTO users (email, password_hash, user_type, auth_provider)
      VALUES ($1, $2, 'COUPLE', 'EMAIL')
      RETURNING id, email, user_type, auth_provider, created_at
    `, [email, passwordHash]);

    const user = userResult.rows[0];

    // Create couple profile
    const coupleResult = await query(`
      INSERT INTO couples (user_id, partner1_name, partner2_name, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [user.id, partner1_name, partner2_name, phone]);

    const couple = coupleResult.rows[0];

    // Generate wedding code and staff PIN
    let weddingCode, isUnique = false;
    while (!isUnique) {
      weddingCode = generateWeddingCode();
      const existing = await query('SELECT id FROM weddings WHERE wedding_code = $1', [weddingCode]);
      isUnique = existing.rows.length === 0;
    }

    const staffPin = generateStaffPin();
    const hashedStaffPin = await bcrypt.hash(staffPin, 10);

    // Generate access token
    const accessToken = generateToken(user.id, user.user_type);

    res.status(201).json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        auth_provider: user.auth_provider
      },
      couple_id: couple.id,
      wedding_code: weddingCode,
      staff_pin: staffPin // Only returned on registration
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user
    const userResult = await query(`
      SELECT id, email, password_hash, user_type, auth_provider, is_active, two_factor_enabled
      FROM users 
      WHERE email = $1 AND auth_provider = 'EMAIL'
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
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
        message: 'Invalid email or password'
      });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      return res.status(200).json({
        requires2FA: true,
        message: 'Two-factor authentication required',
        userId: user.id,
        email: user.email
      });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = datetime("now") WHERE id = $1', [user.id]);

    // Generate access token
    const accessToken = generateToken(user.id, user.user_type);

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        auth_provider: user.auth_provider
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

// Google Sign-In with Firebase Admin SDK
router.post('/google-signin', async (req, res) => {
  try {
    const { id_token } = req.body;

    console.log('Google Sign-In attempt:', { hasToken: !!id_token });

    if (!id_token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Firebase ID token is required'
      });
    }

    // For development, we'll create a simplified version that works with the frontend
    // In production, you should verify the Firebase ID token properly
    
    // Extract email from the token payload (simplified for development)
    // Note: This is not secure for production - implement proper token verification
    try {
      // Decode the token to get user info (simplified approach)
      const tokenParts = id_token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const { email, name, picture, sub } = payload;
      
      console.log('Decoded token payload:', { email, name, sub: sub?.substring(0, 10) + '...' });
      
      if (!email) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email not found in token'
        });
      }

      // Check if user exists
      let userResult = await query('SELECT id, email, user_type, auth_provider, is_active FROM users WHERE email = $1', [email]);
      let user;

      if (userResult.rows.length === 0) {
        console.log('Creating new user for:', email);
        
        // Create new user
        const newUserResult = await query(`
          INSERT INTO users (email, user_type, auth_provider, firebase_uid)
          VALUES ($1, 'COUPLE', 'GOOGLE', $2)
          RETURNING id, email, user_type, auth_provider, created_at
        `, [email, sub]);

        user = newUserResult.rows[0];

        // Create couple profile with name from Google
        const nameParts = name ? name.split(' ') : [email.split('@')[0], ''];
        const partner1Name = nameParts[0] || email.split('@')[0];
        const partner2Name = nameParts.slice(1).join(' ') || 'Partner';

        await query(`
          INSERT INTO couples (user_id, partner1_name, partner2_name)
          VALUES ($1, $2, $3)
        `, [user.id, partner1Name, partner2Name]);

        console.log('New user created successfully:', user.id);

      } else {
        user = userResult.rows[0];
        console.log('Existing user found:', user.id);
        
        if (!user.is_active) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Account is deactivated'
          });
        }

        // Update auth provider if it was previously email
        if (user.auth_provider === 'EMAIL') {
          await query('UPDATE users SET auth_provider = $1, firebase_uid = $2 WHERE id = $3', 
            ['GOOGLE', sub, user.id]);
          user.auth_provider = 'GOOGLE';
          console.log('Updated user auth provider to Google');
        }
      }

      // Generate access token
      const accessToken = generateToken(user.id, user.user_type);

      console.log('Google Sign-In successful for user:', user.id);

      res.json({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
        user: {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
          auth_provider: user.auth_provider
        }
      });

    } catch (tokenError) {
      console.error('Token parsing error:', tokenError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Firebase ID token'
      });
    }

  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process Google Sign-In'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(`
      SELECT u.id, u.email, u.user_type, u.auth_provider, u.created_at,
             c.id as couple_id, c.partner1_name, c.partner2_name, c.phone
      FROM users u
      LEFT JOIN couples c ON u.id = c.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const userData = userResult.rows[0];
    
    res.json({
      id: userData.id,
      email: userData.email,
      user_type: userData.user_type,
      auth_provider: userData.auth_provider,
      created_at: userData.created_at,
      ...(userData.couple_id && {
        couple: {
          id: userData.couple_id,
          partner1_name: userData.partner1_name,
          partner2_name: userData.partner2_name,
          phone: userData.phone
        }
      })
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user data'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // For enhanced security, you could maintain a token blacklist in Redis/database
  res.json({
    message: 'Successfully logged out'
  });
});

// Staff verification for check-in
router.post('/staff/verify', async (req, res) => {
  try {
    const { wedding_code, staff_pin } = req.body;

    if (!wedding_code || !staff_pin) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Wedding code and staff PIN are required'
      });
    }

    // Get wedding with staff PIN
    const weddingResult = await query(`
      SELECT id, staff_pin, wedding_date, venue_name
      FROM weddings 
      WHERE wedding_code = $1
    `, [wedding_code]);

    if (weddingResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid wedding code'
      });
    }

    const wedding = weddingResult.rows[0];

    // Verify staff PIN
    const isValidPin = await bcrypt.compare(staff_pin, wedding.staff_pin);
    if (!isValidPin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid staff PIN'
      });
    }

    // Generate session token for staff
    const sessionToken = jwt.sign(
      { 
        weddingId: wedding.id,
        type: 'staff_session',
        weddingCode: wedding_code
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      session_token: sessionToken,
      wedding_id: wedding.id,
      expires_in: 4 * 60 * 60 // 4 hours in seconds
    });

  } catch (error) {
    console.error('Staff verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify staff credentials'
    });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { partner1_name, partner2_name, phone, email } = req.body;
    const userId = req.user.id;

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid email format'
        });
      }

      // Check if email is already taken by another user
      const existingUser = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email is already taken'
        });
      }

      // Update user email
      await query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    }

    // Validate phone number if provided
    if (phone) {
      // Check if phone number is already taken by another user
      const existingPhone = await query(`
        SELECT u.id FROM users u 
        LEFT JOIN couples c ON u.id = c.user_id 
        LEFT JOIN vendors v ON u.id = v.user_id 
        WHERE (c.phone = $1 OR v.phone = $1) AND u.id != $2
      `, [phone, userId]);
      
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This phone number is already registered with another account'
        });
      }
    }

    // Update couple profile if user is a couple
    if (req.user.user_type === 'COUPLE') {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (partner1_name) {
        updateFields.push(`partner1_name = $${paramIndex++}`);
        updateValues.push(partner1_name);
      }
      
      if (partner2_name) {
        updateFields.push(`partner2_name = $${paramIndex++}`);
        updateValues.push(partner2_name);
      }
      
      if (phone) {
        updateFields.push(`phone = $${paramIndex++}`);
        updateValues.push(phone);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        await query(`UPDATE couples SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`, updateValues);
      }
    }

    res.json({
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get current password hash
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

module.exports = router;