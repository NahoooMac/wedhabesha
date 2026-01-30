const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const otpService = require('../services/otpService');
const smsService = require('../services/smsService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'vendors');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'vendor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload vendor photos endpoint
router.post('/upload-photos', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can upload photos'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }

    // Generate URLs for uploaded files
    const photoUrls = req.files.map(file => {
      return `/uploads/vendors/${file.filename}`;
    });

    res.json({
      success: true,
      photos: photoUrls,
      message: `${photoUrls.length} photo(s) uploaded successfully`
    });

  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload photos'
    });
  }
});

// Get vendor categories
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'venue', label: 'Venue' },
    { value: 'catering', label: 'Catering' },
    { value: 'photography', label: 'Photography' },
    { value: 'videography', label: 'Videography' },
    { value: 'music', label: 'Music & DJ' },
    { value: 'flowers', label: 'Flowers & Decoration' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'makeup', label: 'Makeup & Beauty' },
    { value: 'dress', label: 'Wedding Dress' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'invitations', label: 'Invitations' },
    { value: 'other', label: 'Other Services' }
  ];

  res.json(categories);
});

// Search/List vendors (public endpoint)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      location,
      search,
      min_rating,
      verified_only,
      offset = 0,
      limit = 20
    } = req.query;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    // Only show verified vendors by default (or all if specifically requested)
    if (verified_only === 'true') {
      whereConditions.push('v.is_verified = 1');
    } else if (verified_only === 'false') {
      whereConditions.push('v.is_verified = 0');
    }
    // If verified_only is not specified, show all vendors

    // Category filter
    if (category) {
      whereConditions.push('v.category = ?');
      queryParams.push(category);
    }

    // Location filter (search in location, city, or state)
    if (location) {
      whereConditions.push('(v.location LIKE ? OR v.city LIKE ? OR v.state LIKE ?)');
      const locationPattern = `%${location}%`;
      queryParams.push(locationPattern, locationPattern, locationPattern);
    }

    // Search filter (search in business name, description, or category)
    if (search) {
      whereConditions.push('(v.business_name LIKE ? OR v.description LIKE ? OR v.category LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Rating filter
    if (min_rating) {
      const minRatingValue = parseFloat(min_rating);
      if (!isNaN(minRatingValue)) {
        whereConditions.push('v.rating >= ?');
        queryParams.push(minRatingValue);
      }
    }

    // Build final WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Add pagination parameters
    const limitValue = parseInt(limit) || 20;
    const offsetValue = parseInt(offset) || 0;
    queryParams.push(limitValue, offsetValue);

    // Get vendors with pagination
    const vendorsResult = await query(`
      SELECT v.id, v.business_name, v.category, v.location, v.description, 
             v.is_verified, v.rating, v.created_at, v.phone,
             v.starting_price, v.why_choose_us, v.website, v.street_address,
             v.city, v.state, v.postal_code, v.country, v.years_in_business,
             v.team_size, v.service_area, v.business_photos, v.portfolio_photos,
             v.service_packages, v.business_hours, v.working_hours,
             v.additional_info, v.verification_date, v.verification_history,
             v.latitude, v.longitude, v.map_address, v.phone_verified, v.verified_phone
      FROM vendors v
      ${whereClause}
      ORDER BY v.is_verified DESC, v.rating DESC, v.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM vendors v
      ${whereClause}
    `, queryParams.slice(0, -2)); // Remove limit and offset for count query

    // Process vendors data
    const vendors = vendorsResult.rows.map(vendor => {
      // Parse JSON fields safely
      try {
        vendor.why_choose_us = vendor.why_choose_us ? JSON.parse(vendor.why_choose_us) : [];
      } catch (e) {
        vendor.why_choose_us = [];
      }

      try {
        vendor.business_photos = vendor.business_photos ? JSON.parse(vendor.business_photos) : [];
      } catch (e) {
        vendor.business_photos = [];
      }

      try {
        vendor.portfolio_photos = vendor.portfolio_photos ? JSON.parse(vendor.portfolio_photos) : [];
      } catch (e) {
        vendor.portfolio_photos = [];
      }

      try {
        vendor.service_packages = vendor.service_packages ? JSON.parse(vendor.service_packages) : [];
      } catch (e) {
        vendor.service_packages = [];
      }

      try {
        vendor.business_hours = vendor.business_hours ? JSON.parse(vendor.business_hours) : [];
      } catch (e) {
        vendor.business_hours = [];
      }

      try {
        vendor.working_hours = vendor.working_hours ? JSON.parse(vendor.working_hours) : [];
      } catch (e) {
        vendor.working_hours = [];
      }

      try {
        vendor.verification_history = vendor.verification_history ? JSON.parse(vendor.verification_history) : [];
      } catch (e) {
        vendor.verification_history = [];
      }

      // Add default values for fields that might be null
      vendor.website = vendor.website || null;
      vendor.street_address = vendor.street_address || null;
      vendor.city = vendor.city || null;
      vendor.state = vendor.state || null;
      vendor.postal_code = vendor.postal_code || null;
      vendor.country = vendor.country || 'Ethiopia';
      vendor.years_in_business = vendor.years_in_business || 0;
      vendor.team_size = vendor.team_size || 1;
      vendor.service_area = vendor.service_area || null;
      vendor.phone_verified = vendor.phone_verified || false;
      vendor.verified_phone = vendor.verified_phone || null;
      vendor.additional_info = vendor.additional_info || null;
      vendor.verification_date = vendor.verification_date || null;
      vendor.latitude = vendor.latitude || null;
      vendor.longitude = vendor.longitude || null;
      vendor.map_address = vendor.map_address || null;
      vendor.starting_price = vendor.starting_price || null;

      return vendor;
    });

    const total = countResult.rows[0].total;
    const hasMore = offsetValue + vendors.length < total;

    res.json({
      vendors: vendors,
      total: total,
      skip: offsetValue,
      limit: limitValue,
      has_more: hasMore
    });

  } catch (error) {
    console.error('Search vendors error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search vendors'
    });
  }
});

// Get vendor profile (authenticated)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const vendorResult = await query(`
      SELECT v.id, v.business_name, v.category, v.location, v.description, 
             v.is_verified, v.rating, v.created_at, u.email,
             v.phone, v.verification_status, v.starting_price, v.why_choose_us,
             v.website, v.street_address, v.city, v.state, v.postal_code,
             v.country, v.business_photos, v.portfolio_photos, v.service_packages,
             v.business_hours, v.phone_verified, v.verified_phone, v.working_hours,
             v.additional_info, v.verification_date, v.verification_history,
             v.latitude, v.longitude, v.map_address
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendor = vendorResult.rows[0];
    
    // Parse JSON fields safely
    try {
      vendor.why_choose_us = vendor.why_choose_us ? JSON.parse(vendor.why_choose_us) : ['', '', '', ''];
    } catch (e) {
      vendor.why_choose_us = ['', '', '', ''];
    }

    try {
      vendor.business_photos = vendor.business_photos ? JSON.parse(vendor.business_photos) : [];
    } catch (e) {
      vendor.business_photos = [];
    }

    try {
      vendor.portfolio_photos = vendor.portfolio_photos ? JSON.parse(vendor.portfolio_photos) : [];
    } catch (e) {
      vendor.portfolio_photos = [];
    }

    try {
      vendor.service_packages = vendor.service_packages ? JSON.parse(vendor.service_packages) : [];
    } catch (e) {
      vendor.service_packages = [];
    }

    try {
      vendor.business_hours = vendor.business_hours ? JSON.parse(vendor.business_hours) : [];
    } catch (e) {
      vendor.business_hours = [];
    }

    try {
      vendor.working_hours = vendor.working_hours ? JSON.parse(vendor.working_hours) : [];
    } catch (e) {
      vendor.working_hours = [];
    }

    try {
      vendor.verification_history = vendor.verification_history ? JSON.parse(vendor.verification_history) : [];
    } catch (e) {
      vendor.verification_history = [];
    }

    // Add default values for fields that might be null
    vendor.website = vendor.website || null;
    vendor.street_address = vendor.street_address || null;
    vendor.city = vendor.city || null;
    vendor.state = vendor.state || null;
    vendor.postal_code = vendor.postal_code || null;
    vendor.country = vendor.country || 'Ethiopia';
    vendor.years_in_business = vendor.years_in_business || 0;
    vendor.team_size = vendor.team_size || 1;
    vendor.service_area = vendor.service_area || null;
    vendor.phone_verified = vendor.phone_verified || false;
    vendor.verified_phone = vendor.verified_phone || null;
    vendor.additional_info = vendor.additional_info || null;
    vendor.verification_date = vendor.verification_date || null;
    vendor.latitude = vendor.latitude || null;
    vendor.longitude = vendor.longitude || null;
    vendor.map_address = vendor.map_address || null;
    vendor.starting_price = vendor.starting_price || null;

    res.json(vendor);

  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor profile'
    });
  }
});

// Get vendor dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    // Get vendor ID
    const vendorResult = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Get leads count
    const leadsResult = await query(`
      SELECT COUNT(*) as total_leads,
             SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
             SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
             SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_leads
      FROM vendor_leads 
      WHERE vendor_id = ?
    `, [vendorId]);

    // Get reviews count and average rating
    const reviewsResult = await query(`
      SELECT COUNT(*) as total_reviews,
             AVG(rating) as avg_rating
      FROM reviews 
      WHERE vendor_id = ? AND is_hidden = 0
    `, [vendorId]);

    // Get recent leads (last 30 days)
    const recentLeadsResult = await query(`
      SELECT COUNT(*) as recent_leads
      FROM vendor_leads 
      WHERE vendor_id = ? AND created_at >= datetime('now', '-30 days')
    `, [vendorId]);

    // Calculate average response time (mock for now)
    const avgResponseTime = '2h';

    const stats = {
      total_leads: leadsResult.rows[0].total_leads || 0,
      new_leads: leadsResult.rows[0].new_leads || 0,
      contacted_leads: leadsResult.rows[0].contacted_leads || 0,
      converted_leads: leadsResult.rows[0].converted_leads || 0,
      total_reviews: reviewsResult.rows[0].total_reviews || 0,
      average_rating: reviewsResult.rows[0].avg_rating ? parseFloat(reviewsResult.rows[0].avg_rating).toFixed(1) : null,
      recent_leads: recentLeadsResult.rows[0].recent_leads || 0,
      avg_response_time: avgResponseTime,
      conversion_rate: leadsResult.rows[0].total_leads > 0 ? 
        ((leadsResult.rows[0].converted_leads || 0) / leadsResult.rows[0].total_leads * 100).toFixed(1) : '0'
    };

    res.json(stats);

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get dashboard stats'
    });
  }
});

// Get vendor leads
router.get('/leads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    // Get vendor ID
    const vendorResult = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    let whereClause = 'WHERE vl.vendor_id = ?';
    const queryParams = [vendorId];

    if (status) {
      whereClause += ' AND vl.status = ?';
      queryParams.push(status);
    }

    queryParams.push(limit);
    queryParams.push(offset);

    // Get leads with couple information
    const leadsResult = await query(`
      SELECT vl.id, vl.vendor_id, vl.couple_id, vl.message, vl.budget_range,
             vl.event_date, vl.status, vl.created_at, vl.updated_at,
             c.partner1_name, c.partner2_name, u.email as couple_email
      FROM vendor_leads vl
      LEFT JOIN couples c ON vl.couple_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY vl.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    // Format leads data
    const leads = leadsResult.rows.map(lead => ({
      id: lead.id,
      vendor_id: lead.vendor_id,
      couple_id: lead.couple_id,
      couple_name: lead.partner1_name && lead.partner2_name ? 
        `${lead.partner1_name} & ${lead.partner2_name}` : 
        lead.couple_email || 'Unknown Couple',
      couple_email: lead.couple_email,
      message: lead.message,
      budget_range: lead.budget_range,
      event_date: lead.event_date,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      date_received: formatTimeAgo(lead.created_at)
    }));

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM vendor_leads vl
      ${whereClause.replace('LIMIT ? OFFSET ?', '')}
    `, queryParams.slice(0, -2));

    res.json({
      leads: leads,
      total: countResult.rows[0].total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Get vendor leads error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor leads'
    });
  }
});

// Get vendor notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await notificationService.getUserNotifications(req.user.id, limit, offset);
    
    if (result.success) {
      res.json({
        notifications: result.notifications,
        limit,
        offset
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get vendor notifications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get notifications'
    });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const result = await notificationService.getUnreadCount(req.user.id);
    
    if (result.success) {
      res.json({ count: result.count });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get unread count'
    });
  }
});

// Get vendor by ID (public endpoint) - MOVED TO END TO AVOID ROUTE CONFLICTS
router.get('/:id', async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id);
    
    if (!vendorId || isNaN(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendor ID'
      });
    }

    const vendorResult = await query(`
      SELECT v.id, v.business_name, v.category, v.location, v.description, 
             v.is_verified, v.rating, v.created_at, v.phone,
             v.starting_price, v.why_choose_us, v.website, v.street_address,
             v.city, v.state, v.postal_code, v.country, v.years_in_business,
             v.team_size, v.service_area, v.business_photos, v.portfolio_photos,
             v.service_packages, v.business_hours, v.working_hours,
             v.additional_info, v.verification_date, v.verification_history,
             v.latitude, v.longitude, v.map_address, v.phone_verified, v.verified_phone
      FROM vendors v
      WHERE v.id = ?
    `, [vendorId]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor not found'
      });
    }

    const vendor = vendorResult.rows[0];
    
    // Parse JSON fields safely
    try {
      vendor.why_choose_us = vendor.why_choose_us ? JSON.parse(vendor.why_choose_us) : ['', '', '', ''];
    } catch (e) {
      vendor.why_choose_us = ['', '', '', ''];
    }

    try {
      vendor.business_photos = vendor.business_photos ? JSON.parse(vendor.business_photos) : [];
    } catch (e) {
      vendor.business_photos = [];
    }

    try {
      vendor.portfolio_photos = vendor.portfolio_photos ? JSON.parse(vendor.portfolio_photos) : [];
    } catch (e) {
      vendor.portfolio_photos = [];
    }

    try {
      vendor.service_packages = vendor.service_packages ? JSON.parse(vendor.service_packages) : [];
    } catch (e) {
      vendor.service_packages = [];
    }

    try {
      vendor.business_hours = vendor.business_hours ? JSON.parse(vendor.business_hours) : [];
    } catch (e) {
      vendor.business_hours = [];
    }

    try {
      vendor.working_hours = vendor.working_hours ? JSON.parse(vendor.working_hours) : [];
    } catch (e) {
      vendor.working_hours = [];
    }

    try {
      vendor.verification_history = vendor.verification_history ? JSON.parse(vendor.verification_history) : [];
    } catch (e) {
      vendor.verification_history = [];
    }

    // Add default values for fields that might be null
    vendor.website = vendor.website || null;
    vendor.street_address = vendor.street_address || null;
    vendor.city = vendor.city || null;
    vendor.state = vendor.state || null;
    vendor.postal_code = vendor.postal_code || null;
    vendor.country = vendor.country || 'Ethiopia';
    vendor.years_in_business = vendor.years_in_business || 0;
    vendor.team_size = vendor.team_size || 1;
    vendor.service_area = vendor.service_area || null;
    vendor.phone_verified = vendor.phone_verified || false;
    vendor.verified_phone = vendor.verified_phone || null;
    vendor.additional_info = vendor.additional_info || null;
    vendor.verification_date = vendor.verification_date || null;
    vendor.latitude = vendor.latitude || null;
    vendor.longitude = vendor.longitude || null;
    vendor.map_address = vendor.map_address || null;
    vendor.starting_price = vendor.starting_price || null;

    res.json(vendor);

  } catch (error) {
    console.error('Get vendor by ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor'
    });
  }
});

// Create vendor profile (authenticated)
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const { 
      business_name, 
      category, 
      location, 
      description,
      starting_price,
      why_choose_us,
      phone,
      website,
      street_address,
      city,
      state,
      postal_code,
      country,
      years_in_business,
      team_size,
      service_area,
      business_photos,
      portfolio_photos,
      service_packages,
      business_hours,
      working_hours,
      additional_info,
      latitude,
      longitude,
      map_address
    } = req.body;

    // Validate required fields
    if (!business_name || !category || !location || !description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: business_name, category, location, description'
      });
    }

    // Check if profile already exists
    const existingVendor = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);

    if (existingVendor.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Vendor profile already exists'
      });
    }

    // Prepare JSON fields
    const whyChooseUsJson = why_choose_us ? JSON.stringify(why_choose_us) : JSON.stringify(['', '', '', '']);
    const businessPhotosJson = business_photos ? JSON.stringify(business_photos) : JSON.stringify([]);
    const portfolioPhotosJson = portfolio_photos ? JSON.stringify(portfolio_photos) : JSON.stringify([]);
    const servicePackagesJson = service_packages ? JSON.stringify(service_packages) : JSON.stringify([]);
    const businessHoursJson = business_hours ? JSON.stringify(business_hours) : JSON.stringify([]);
    const workingHoursJson = working_hours ? JSON.stringify(working_hours) : JSON.stringify([]);
    const verificationHistoryJson = JSON.stringify([]);

    // Create vendor profile
    await query(`
      INSERT INTO vendors (
        user_id, business_name, category, location, description, 
        starting_price, why_choose_us, phone, website, street_address,
        city, state, postal_code, country, years_in_business, team_size,
        service_area, business_photos, portfolio_photos, service_packages,
        business_hours, working_hours, additional_info, latitude, longitude,
        map_address, is_verified, rating, verification_status, phone_verified,
        verified_phone, verification_date, verification_history
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'pending', 0, NULL, NULL, ?)
    `, [
      req.user.id, business_name, category, location, description,
      starting_price || null, whyChooseUsJson, phone || null, website || null, street_address || null,
      city || null, state || null, postal_code || null, country || 'Ethiopia', years_in_business || 0, team_size || 1,
      service_area || null, businessPhotosJson, portfolioPhotosJson, servicePackagesJson,
      businessHoursJson, workingHoursJson, additional_info || null, latitude || null, longitude || null,
      map_address || null, verificationHistoryJson
    ]);

    // Get the created vendor ID
    const createdVendorResult = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);
    
    const vendorId = createdVendorResult.rows[0].id;

    // Create vendor application for admin review
    await query(`
      INSERT INTO vendor_applications (vendor_id, status, submitted_at)
      VALUES (?, 'pending', datetime('now'))
    `, [vendorId]);

    // Get the created vendor with all fields
    const vendorResult = await query(`
      SELECT v.id, v.business_name, v.category, v.location, v.description, 
             v.is_verified, v.rating, v.created_at, u.email,
             v.phone, v.verification_status, v.starting_price, v.why_choose_us,
             v.website, v.street_address, v.city, v.state, v.postal_code,
             v.country, v.business_photos, v.portfolio_photos, v.service_packages,
             v.business_hours, v.phone_verified, v.verified_phone, v.working_hours,
             v.additional_info, v.verification_date, v.verification_history,
             v.latitude, v.longitude, v.map_address
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = ?
    `, [req.user.id]);

    const vendor = vendorResult.rows[0];
    
    // Parse JSON fields safely
    try {
      vendor.why_choose_us = vendor.why_choose_us ? JSON.parse(vendor.why_choose_us) : ['', '', '', ''];
      vendor.business_photos = vendor.business_photos ? JSON.parse(vendor.business_photos) : [];
      vendor.portfolio_photos = vendor.portfolio_photos ? JSON.parse(vendor.portfolio_photos) : [];
      vendor.service_packages = vendor.service_packages ? JSON.parse(vendor.service_packages) : [];
      vendor.business_hours = vendor.business_hours ? JSON.parse(vendor.business_hours) : [];
      vendor.working_hours = vendor.working_hours ? JSON.parse(vendor.working_hours) : [];
      vendor.verification_history = vendor.verification_history ? JSON.parse(vendor.verification_history) : [];
    } catch (e) {
      // Set defaults if parsing fails
      vendor.why_choose_us = ['', '', '', ''];
      vendor.business_photos = [];
      vendor.portfolio_photos = [];
      vendor.service_packages = [];
      vendor.business_hours = [];
      vendor.working_hours = [];
      vendor.verification_history = [];
    }

    res.status(201).json(vendor);

  } catch (error) {
    console.error('Create vendor profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create vendor profile'
    });
  }
});

// Update vendor profile (authenticated)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const { 
      business_name, 
      category, 
      location, 
      description,
      starting_price,
      why_choose_us,
      phone,
      website,
      street_address,
      city,
      state,
      postal_code,
      country,
      years_in_business,
      team_size,
      service_area,
      business_photos,
      portfolio_photos,
      service_packages,
      business_hours,
      working_hours,
      additional_info,
      latitude,
      longitude,
      map_address
    } = req.body;

    // Validate required fields
    if (!business_name || !category || !location || !description) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: business_name, category, location, description'
      });
    }

    // Prepare JSON fields
    const whyChooseUsJson = why_choose_us ? JSON.stringify(why_choose_us) : null;
    const businessPhotosJson = business_photos ? JSON.stringify(business_photos) : null;
    const portfolioPhotosJson = portfolio_photos ? JSON.stringify(portfolio_photos) : null;
    const servicePackagesJson = service_packages ? JSON.stringify(service_packages) : null;
    const businessHoursJson = business_hours ? JSON.stringify(business_hours) : null;
    const workingHoursJson = working_hours ? JSON.stringify(working_hours) : null;

    // Update vendor profile
    await query(`
      UPDATE vendors 
      SET business_name = ?, category = ?, location = ?, description = ?, 
          starting_price = ?, why_choose_us = ?, phone = ?, website = ?, 
          street_address = ?, city = ?, state = ?, postal_code = ?, country = ?,
          years_in_business = ?, team_size = ?, service_area = ?, 
          business_photos = ?, portfolio_photos = ?, service_packages = ?,
          business_hours = ?, working_hours = ?, additional_info = ?,
          latitude = ?, longitude = ?, map_address = ?
      WHERE user_id = ?
    `, [
      business_name, category, location, description,
      starting_price || null, whyChooseUsJson, phone || null, website || null,
      street_address || null, city || null, state || null, postal_code || null, country || 'Ethiopia',
      years_in_business || 0, team_size || 1, service_area || null,
      businessPhotosJson, portfolioPhotosJson, servicePackagesJson,
      businessHoursJson, workingHoursJson, additional_info || null,
      latitude || null, longitude || null, map_address || null,
      req.user.id
    ]);

    // Get the updated vendor with all fields
    const vendorResult = await query(`
      SELECT v.id, v.business_name, v.category, v.location, v.description, 
             v.is_verified, v.rating, v.created_at, u.email,
             v.phone, v.verification_status, v.starting_price, v.why_choose_us,
             v.website, v.street_address, v.city, v.state, v.postal_code,
             v.country, v.business_photos, v.portfolio_photos, v.service_packages,
             v.business_hours, v.phone_verified, v.verified_phone, v.working_hours,
             v.additional_info, v.verification_date, v.verification_history,
             v.latitude, v.longitude, v.map_address
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendor = vendorResult.rows[0];
    
    // Parse JSON fields safely
    try {
      vendor.why_choose_us = vendor.why_choose_us ? JSON.parse(vendor.why_choose_us) : ['', '', '', ''];
      vendor.business_photos = vendor.business_photos ? JSON.parse(vendor.business_photos) : [];
      vendor.portfolio_photos = vendor.portfolio_photos ? JSON.parse(vendor.portfolio_photos) : [];
      vendor.service_packages = vendor.service_packages ? JSON.parse(vendor.service_packages) : [];
      vendor.business_hours = vendor.business_hours ? JSON.parse(vendor.business_hours) : [];
      vendor.working_hours = vendor.working_hours ? JSON.parse(vendor.working_hours) : [];
      vendor.verification_history = vendor.verification_history ? JSON.parse(vendor.verification_history) : [];
    } catch (e) {
      // Set defaults if parsing fails
      vendor.why_choose_us = ['', '', '', ''];
      vendor.business_photos = [];
      vendor.portfolio_photos = [];
      vendor.service_packages = [];
      vendor.business_hours = [];
      vendor.working_hours = [];
      vendor.verification_history = [];
    }

    res.json(vendor);

  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update vendor profile'
    });
  }
});

// Send phone verification OTP
router.post('/verify-phone/send', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone number is required'
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    const storeResult = await otpService.storeOTP(phone, otpCode, 300); // 5 minutes TTL
    
    if (!storeResult.success) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate verification code'
      });
    }

    // Send SMS
    const message = `Your WedHabesha verification code is: ${otpCode}. This code expires in 5 minutes.`;
    
    try {
      await smsService.sendSMS(phone, message);
      
      res.json({
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: storeResult.expiresAt
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      
      // Still return success since OTP was stored, but mention SMS issue
      res.json({
        success: true,
        message: 'Verification code generated. If SMS delivery fails, please try again.',
        expiresAt: storeResult.expiresAt,
        warning: 'SMS delivery may be delayed'
      });
    }

  } catch (error) {
    console.error('Send phone verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send verification code'
    });
  }
});

// Verify phone OTP
router.post('/verify-phone/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone number and verification code are required'
      });
    }

    // Verify OTP
    const verifyResult = await otpService.verifyOTP(phone, code);
    
    if (!verifyResult.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: verifyResult.error || 'Invalid verification code'
      });
    }

    // Update vendor phone verification status
    await query(`
      UPDATE vendors 
      SET phone_verified = 1, verified_phone = ?
      WHERE user_id = ?
    `, [phone, req.user.id]);

    res.json({
      success: true,
      verified: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify phone number'
    });
  }
});

// Get vendor notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await notificationService.getUserNotifications(req.user.id, limit, offset);
    
    if (result.success) {
      res.json({
        notifications: result.notifications,
        limit,
        offset
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get vendor notifications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get notifications'
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const notificationId = parseInt(req.params.id);
    const result = await notificationService.markAsRead(notificationId, req.user.id);
    
    if (result.success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notification as read'
    });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const result = await notificationService.getUnreadCount(req.user.id);
    
    if (result.success) {
      res.json({ count: result.count });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get unread count'
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user's current password hash
    const userResult = await query(`
      SELECT password_hash FROM users WHERE id = ?
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query(`
      UPDATE users 
      SET password_hash = ?
      WHERE id = ?
    `, [newPasswordHash, req.user.id]);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

// Get vendor dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    // Get vendor ID
    const vendorResult = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    // Get leads count
    const leadsResult = await query(`
      SELECT COUNT(*) as total_leads,
             SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
             SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_leads,
             SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_leads
      FROM vendor_leads 
      WHERE vendor_id = ?
    `, [vendorId]);

    // Get reviews count and average rating
    const reviewsResult = await query(`
      SELECT COUNT(*) as total_reviews,
             AVG(rating) as avg_rating
      FROM reviews 
      WHERE vendor_id = ? AND is_hidden = 0
    `, [vendorId]);

    // Get recent leads (last 30 days)
    const recentLeadsResult = await query(`
      SELECT COUNT(*) as recent_leads
      FROM vendor_leads 
      WHERE vendor_id = ? AND created_at >= datetime('now', '-30 days')
    `, [vendorId]);

    // Calculate average response time (mock for now)
    const avgResponseTime = '2h';

    const stats = {
      total_leads: leadsResult.rows[0].total_leads || 0,
      new_leads: leadsResult.rows[0].new_leads || 0,
      contacted_leads: leadsResult.rows[0].contacted_leads || 0,
      converted_leads: leadsResult.rows[0].converted_leads || 0,
      total_reviews: reviewsResult.rows[0].total_reviews || 0,
      average_rating: reviewsResult.rows[0].avg_rating ? parseFloat(reviewsResult.rows[0].avg_rating).toFixed(1) : null,
      recent_leads: recentLeadsResult.rows[0].recent_leads || 0,
      avg_response_time: avgResponseTime,
      conversion_rate: leadsResult.rows[0].total_leads > 0 ? 
        ((leadsResult.rows[0].converted_leads || 0) / leadsResult.rows[0].total_leads * 100).toFixed(1) : '0'
    };

    res.json(stats);

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get dashboard stats'
    });
  }
});

// Get vendor leads
router.get('/leads', authenticateToken, async (req, res) => {
  try {
    if (req.user.user_type !== 'VENDOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only vendors can access this endpoint'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    // Get vendor ID
    const vendorResult = await query(`
      SELECT id FROM vendors WHERE user_id = ?
    `, [req.user.id]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor profile not found'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    let whereClause = 'WHERE vl.vendor_id = ?';
    const queryParams = [vendorId];

    if (status) {
      whereClause += ' AND vl.status = ?';
      queryParams.push(status);
    }

    queryParams.push(limit);
    queryParams.push(offset);

    // Get leads with couple information
    const leadsResult = await query(`
      SELECT vl.id, vl.vendor_id, vl.couple_id, vl.message, vl.budget_range,
             vl.event_date, vl.status, vl.created_at, vl.updated_at,
             c.partner1_name, c.partner2_name, u.email as couple_email
      FROM vendor_leads vl
      LEFT JOIN couples c ON vl.couple_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY vl.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    // Format leads data
    const leads = leadsResult.rows.map(lead => ({
      id: lead.id,
      vendor_id: lead.vendor_id,
      couple_id: lead.couple_id,
      couple_name: lead.partner1_name && lead.partner2_name ? 
        `${lead.partner1_name} & ${lead.partner2_name}` : 
        lead.couple_email || 'Unknown Couple',
      couple_email: lead.couple_email,
      message: lead.message,
      budget_range: lead.budget_range,
      event_date: lead.event_date,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      date_received: formatTimeAgo(lead.created_at)
    }));

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM vendor_leads vl
      ${whereClause.replace('LIMIT ? OFFSET ?', '')}
    `, queryParams.slice(0, -2));

    res.json({
      leads: leads,
      total: countResult.rows[0].total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Get vendor leads error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor leads'
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

// Check review eligibility for a vendor
router.get('/:vendor_id/review-eligibility', authenticateToken, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendor_id);
    
    if (!vendorId || isNaN(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendor ID'
      });
    }

    // Check if user has already reviewed this vendor (using user_id from reviews table)
    const reviewResult = await query(`
      SELECT id FROM reviews 
      WHERE vendor_id = ? AND user_id = ?
    `, [vendorId, req.user.id]);

    const alreadyReviewed = reviewResult.rows.length > 0;

    // For couples, check if they have a booking (optional - for display purposes)
    let hasBooking = false;
    if (req.user.user_type === 'COUPLE') {
      const coupleResult = await query(`
        SELECT id FROM couples WHERE user_id = ?
      `, [req.user.id]);

      if (coupleResult.rows.length > 0) {
        const coupleId = coupleResult.rows[0].id;
        
        const bookingResult = await query(`
          SELECT id FROM vendor_leads 
          WHERE vendor_id = ? AND couple_id = ? AND status = 'converted'
        `, [vendorId, coupleId]);

        hasBooking = bookingResult.rows.length > 0;
      }
    }

    // All authenticated users can review (unless they already have)
    const canReview = !alreadyReviewed;
    
    let reason;
    if (canReview) {
      reason = "You can submit a review";
    } else {
      reason = "You have already reviewed this vendor";
    }

    res.json({
      can_review: canReview,
      has_booking: hasBooking,
      already_reviewed: alreadyReviewed,
      reason: reason
    });

  } catch (error) {
    console.error('Check review eligibility error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check review eligibility'
    });
  }
});

// Submit a review for a vendor
router.post('/:vendor_id/reviews', authenticateToken, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendor_id);
    const { rating, review_text } = req.body;
    
    if (!vendorId || isNaN(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendor ID'
      });
    }

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if vendor exists
    const vendorResult = await query(`
      SELECT id FROM vendors WHERE id = ?
    `, [vendorId]);

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor not found'
      });
    }

    // Check if user has already reviewed this vendor
    const existingReviewResult = await query(`
      SELECT id FROM reviews 
      WHERE vendor_id = ? AND user_id = ?
    `, [vendorId, req.user.id]);

    if (existingReviewResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'You have already reviewed this vendor'
      });
    }

    // Create the review
    const insertResult = await query(`
      INSERT INTO reviews (vendor_id, user_id, rating, review_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [vendorId, req.user.id, rating, review_text || null]);

    // Get the created review
    const reviewResult = await query(`
      SELECT r.id, r.vendor_id, r.user_id, r.rating, r.review_text, 
             r.is_flagged, r.is_hidden, r.created_at, r.updated_at,
             u.email as user_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [insertResult.lastID]);

    const review = reviewResult.rows[0];

    // Update vendor's average rating
    const ratingResult = await query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM reviews 
      WHERE vendor_id = ? AND is_hidden = 0
    `, [vendorId]);

    const avgRating = ratingResult.rows[0].avg_rating;
    
    await query(`
      UPDATE vendors 
      SET rating = ? 
      WHERE id = ?
    `, [avgRating ? parseFloat(avgRating).toFixed(1) : null, vendorId]);

    res.status(201).json({
      id: review.id,
      vendor_id: review.vendor_id,
      user_id: review.user_id,
      rating: review.rating,
      review_text: review.review_text,
      is_flagged: review.is_flagged,
      is_hidden: review.is_hidden,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user_email: review.user_email
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit review'
    });
  }
});

// Get reviews for a vendor
router.get('/:vendor_id/reviews', async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendor_id);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!vendorId || isNaN(vendorId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid vendor ID'
      });
    }

    // Get reviews for the vendor (only non-hidden ones)
    const reviewsResult = await query(`
      SELECT r.id, r.vendor_id, r.user_id, r.rating, r.review_text, 
             r.created_at, r.updated_at, u.email as user_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.vendor_id = ? AND r.is_hidden = 0
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [vendorId, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM reviews 
      WHERE vendor_id = ? AND is_hidden = 0
    `, [vendorId]);

    // Get rating summary
    const summaryResult = await query(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews 
      WHERE vendor_id = ? AND is_hidden = 0
    `, [vendorId]);

    const summary = summaryResult.rows[0];

    res.json({
      reviews: reviewsResult.rows,
      total: countResult.rows[0].total,
      limit,
      offset,
      summary: {
        average_rating: summary.avg_rating ? parseFloat(summary.avg_rating).toFixed(1) : null,
        total_reviews: summary.total_reviews,
        rating_distribution: {
          5: summary.five_star,
          4: summary.four_star,
          3: summary.three_star,
          2: summary.two_star,
          1: summary.one_star
        }
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get reviews'
    });
  }
});

module.exports = router;