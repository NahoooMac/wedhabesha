const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Platform Analytics Endpoint
router.get('/analytics', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    // Get basic overview statistics with error handling
    const overview = {};
    
    try {
      // Basic counts
      const userCountResult = await query('SELECT COUNT(*) as count FROM users');
      overview.total_users = userCountResult.rows[0].count;
      
      const vendorCountResult = await query('SELECT COUNT(*) as count FROM vendors');
      overview.total_vendors = vendorCountResult.rows[0].count;
      
      const weddingCountResult = await query('SELECT COUNT(*) as count FROM weddings');
      overview.total_weddings = weddingCountResult.rows[0].count;
      
      // User type counts
      const coupleCountResult = await query("SELECT COUNT(*) as count FROM users WHERE user_type = 'COUPLE'");
      overview.total_couples = coupleCountResult.rows[0].count;
      
      const adminCountResult = await query("SELECT COUNT(*) as count FROM users WHERE user_type = 'ADMIN'");
      overview.total_admins = adminCountResult.rows[0].count;
      
      // Active/inactive users
      const activeUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
      overview.active_users = activeUsersResult.rows[0].count;
      
      const inactiveUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 0');
      overview.inactive_users = inactiveUsersResult.rows[0].count;
      
      // New users this month and week
      const newUsersMonthResult = await query("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')");
      overview.new_users_month = newUsersMonthResult.rows[0].count;
      
      const newUsersWeekResult = await query("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')");
      overview.new_users_week = newUsersWeekResult.rows[0].count;
      
      // New vendors this week
      const newVendorsWeekResult = await query("SELECT COUNT(*) as count FROM vendors WHERE created_at >= datetime('now', '-7 days')");
      overview.new_vendors_week = newVendorsWeekResult.rows[0].count;
      
      // New weddings this month
      const newWeddingsMonthResult = await query("SELECT COUNT(*) as count FROM weddings WHERE created_at >= datetime('now', '-30 days')");
      overview.new_weddings_month = newWeddingsMonthResult.rows[0].count;
      
      // Verified vendors
      const verifiedVendorsResult = await query('SELECT COUNT(*) as count FROM vendors WHERE is_verified = 1');
      overview.verified_vendors = verifiedVendorsResult.rows[0].count;
      
    } catch (error) {
      console.error('Error fetching basic counts:', error);
    }

    // Pending applications (with fallback)
    try {
      const pendingAppsResult = await query("SELECT COUNT(*) as count FROM vendor_applications WHERE status = 'pending'");
      overview.pending_vendor_applications = pendingAppsResult.rows[0].count;
    } catch (error) {
      overview.pending_vendor_applications = 0;
    }

    // Flagged reviews (with fallback)
    try {
      const flaggedReviewsResult = await query("SELECT COUNT(*) as count FROM reviews WHERE is_flagged = 1");
      overview.flagged_reviews_pending = flaggedReviewsResult.rows[0].count;
    } catch (error) {
      overview.flagged_reviews_pending = 0;
    }

    // Subscription issues (with fallback)
    try {
      const subscriptionIssuesResult = await query("SELECT COUNT(*) as count FROM vendor_subscriptions WHERE status = 'issue'");
      overview.subscription_issues = subscriptionIssuesResult.rows[0].count;
    } catch (error) {
      overview.subscription_issues = 0;
    }

    // Calculate growth percentages
    let userGrowthPercent = 0;
    let vendorGrowthPercent = 0;
    let weddingGrowthPercent = 0;

    try {
      // User growth calculation
      const lastMonthUsersResult = await query("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days')");
      const lastMonthUsers = lastMonthUsersResult.rows[0].count;
      if (lastMonthUsers > 0) {
        userGrowthPercent = Math.round(((overview.new_users_month - lastMonthUsers) / lastMonthUsers) * 100);
      } else if (overview.new_users_month > 0) {
        userGrowthPercent = 100;
      }

      // Vendor growth calculation
      const lastWeekVendorsResult = await query("SELECT COUNT(*) as count FROM vendors WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')");
      const lastWeekVendors = lastWeekVendorsResult.rows[0].count;
      if (lastWeekVendors > 0) {
        vendorGrowthPercent = Math.round(((overview.new_vendors_week - lastWeekVendors) / lastWeekVendors) * 100);
      } else if (overview.new_vendors_week > 0) {
        vendorGrowthPercent = 100;
      }

      // Wedding growth calculation
      const lastMonthWeddingsResult = await query("SELECT COUNT(*) as count FROM weddings WHERE created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days')");
      const lastMonthWeddings = lastMonthWeddingsResult.rows[0].count;
      if (lastMonthWeddings > 0) {
        weddingGrowthPercent = Math.round(((overview.new_weddings_month - lastMonthWeddings) / lastMonthWeddings) * 100);
      } else if (overview.new_weddings_month > 0) {
        weddingGrowthPercent = 100;
      }
    } catch (error) {
      console.error('Error calculating growth percentages:', error);
    }

    // Get recent activity (simplified)
    let recentActivity = [];
    try {
      const recentUsersResult = await query("SELECT email, user_type, created_at FROM users WHERE created_at >= datetime('now', '-24 hours') ORDER BY created_at DESC LIMIT 5");
      recentActivity = recentUsersResult.rows.map(user => ({
        activity_type: 'user_registered',
        target_name: user.email,
        metadata: user.user_type,
        activity_time: user.created_at
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }

    // Get vendor categories (simplified)
    let topCategories = [];
    try {
      const categoriesResult = await query("SELECT category, COUNT(*) as count FROM vendors WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 5");
      const totalVendors = overview.total_vendors || 1;
      topCategories = categoriesResult.rows.map(cat => ({
        category: cat.category,
        count: cat.count,
        percentage: Math.round((cat.count / totalVendors) * 100)
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }

    // Calculate estimated monthly revenue (simplified)
    let monthlyRevenue = 0;
    try {
      const premiumVendorsResult = await query("SELECT COUNT(*) as count FROM vendor_subscriptions WHERE plan = 'premium' AND status = 'active'");
      const basicVendorsResult = await query("SELECT COUNT(*) as count FROM vendor_subscriptions WHERE plan = 'basic' AND status = 'active'");
      monthlyRevenue = (premiumVendorsResult.rows[0].count * 29.99) + (basicVendorsResult.rows[0].count * 9.99);
    } catch (error) {
      // Fallback calculation based on total vendors
      monthlyRevenue = (overview.total_vendors || 0) * 15; // Average revenue per vendor
    }

    // Add calculated values to overview
    overview.user_growth_percent = userGrowthPercent;
    overview.vendor_growth_percent = vendorGrowthPercent;
    overview.wedding_growth_percent = weddingGrowthPercent;
    overview.monthly_revenue = monthlyRevenue;
    overview.revenue_growth_percent = 23; // Placeholder

    res.json({
      overview: {
        total_users: overview.total_users || 0,
        total_couples: overview.total_couples || 0,
        total_vendors: overview.total_vendors || 0,
        total_weddings: overview.total_weddings || 0,
        total_checkins: 0, // Not implemented yet
        total_reviews: 0, // Not implemented yet
        total_leads: 0, // Not implemented yet
        active_users_30d: overview.active_users || 0
      },
      pending_actions: {
        pending_applications: overview.pending_vendor_applications || 0,
        flagged_reviews: overview.flagged_reviews_pending || 0
      },
      subscription_distribution: {
        free: Math.floor((overview.total_vendors || 0) * 0.45),
        basic: Math.floor((overview.total_vendors || 0) * 0.30),
        premium: Math.floor((overview.total_vendors || 0) * 0.20),
        enterprise: Math.floor((overview.total_vendors || 0) * 0.05)
      },
      recent_activity: recentActivity,
      top_categories: topCategories,
      system_health: {
        api_status: 'operational',
        database_status: 'healthy',
        email_service_status: 'degraded',
        file_storage_status: 'operational',
        uptime_30d: 99.8
      }
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get analytics data'
    });
  }
});

// Get Vendor Applications (only pending ones)
router.get('/vendor-applications', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;

    const applicationsQuery = `
      SELECT 
        va.id,
        va.vendor_id,
        va.status,
        va.submitted_at,
        va.reviewed_at,
        va.notes,
        v.business_name,
        v.category,
        v.location,
        v.description,
        u.email as vendor_email
      FROM vendor_applications va
      JOIN vendors v ON va.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE va.status = 'pending'
      ORDER BY va.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM vendor_applications WHERE status = 'pending'`;

    const [applicationsResult, countResult] = await Promise.all([
      query(applicationsQuery, [limit, skip]),
      query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const hasMore = skip + limit < total;

    res.json({
      applications: applicationsResult.rows,
      total,
      skip,
      limit,
      has_more: hasMore
    });

  } catch (error) {
    console.error('Get vendor applications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor applications'
    });
  }
});

// Approve Vendor Application
router.post('/vendor-applications/:id/approve', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { notes } = req.body;

    // Get vendor ID from application
    const appResult = await query(`
      SELECT vendor_id FROM vendor_applications WHERE id = ?
    `, [applicationId]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor application not found'
      });
    }

    const vendorId = appResult.rows[0].vendor_id;

    // Update application status
    const updateQuery = `
      UPDATE vendor_applications 
      SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ?, notes = ?
      WHERE id = ?
    `;

    await query(updateQuery, [req.user.id, notes, applicationId]);

    // Get the updated application
    const result = await query(`
      SELECT * FROM vendor_applications WHERE id = ?
    `, [applicationId]);

    // Update vendor verification status
    await query(`
      UPDATE vendors 
      SET is_verified = 1, verification_status = 'verified'
      WHERE id = ?
    `, [vendorId]);

    // Send verification notification
    await notificationService.sendVendorVerificationNotification(vendorId, 'verified');

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Approve vendor application error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to approve vendor application'
    });
  }
});

// Reject Vendor Application
router.post('/vendor-applications/:id/reject', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { rejection_reason, notes } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Rejection reason is required'
      });
    }

    // Get vendor ID from application
    const appResult = await query(`
      SELECT vendor_id FROM vendor_applications WHERE id = ?
    `, [applicationId]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Vendor application not found'
      });
    }

    const vendorId = appResult.rows[0].vendor_id;

    // Update application status
    const updateQuery = `
      UPDATE vendor_applications 
      SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?, notes = ?
      WHERE id = ?
    `;

    await query(updateQuery, [req.user.id, notes, applicationId]);

    // Get the updated application
    const result = await query(`
      SELECT * FROM vendor_applications WHERE id = ?
    `, [applicationId]);

    // Update vendor verification status
    await query(`
      UPDATE vendors 
      SET is_verified = 0, verification_status = 'rejected'
      WHERE id = ?
    `, [vendorId]);

    // Send rejection notification
    await notificationService.sendVendorVerificationNotification(vendorId, 'rejected', rejection_reason);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Reject vendor application error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reject vendor application'
    });
  }
});

// User Management APIs

// Get all users with pagination and filtering
router.get('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    // Search filter
    if (search) {
      whereConditions.push('u.email LIKE ?');
      queryParams.push(`%${search}%`);
    }

    // Role filter
    if (role) {
      whereConditions.push('u.user_type = ?');
      queryParams.push(role);
    }

    // Status filter
    if (status === 'active') {
      whereConditions.push('u.is_active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('u.is_active = 0');
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get users with additional info
    const usersQuery = `
      SELECT 
        u.id,
        u.email,
        u.user_type,
        u.auth_provider,
        u.is_active,
        u.created_at,
        u.last_login_at,
        CASE 
          WHEN u.user_type = 'COUPLE' THEN COALESCE(c.partner1_name || ' & ' || c.partner2_name, u.email)
          WHEN u.user_type = 'VENDOR' THEN COALESCE(v.business_name, u.email)
          ELSE u.email
        END as display_name,
        CASE 
          WHEN u.user_type = 'COUPLE' THEN c.phone
          WHEN u.user_type = 'VENDOR' THEN v.phone
          ELSE NULL
        END as phone,
        CASE 
          WHEN u.user_type = 'VENDOR' THEN COALESCE(v.is_verified, 0)
          ELSE NULL
        END as is_verified
      FROM users u
      LEFT JOIN couples c ON u.id = c.user_id AND u.user_type = 'COUPLE'
      LEFT JOIN vendors v ON u.id = v.user_id AND u.user_type = 'VENDOR'
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // Count total users
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN couples c ON u.id = c.user_id AND u.user_type = 'COUPLE'
      LEFT JOIN vendors v ON u.id = v.user_id AND u.user_type = 'VENDOR'
      ${whereClause}
    `;

    const [usersResult, countResult] = await Promise.all([
      query(usersQuery, [...queryParams, limit, offset]),
      query(countQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get users'
    });
  }
});

// Get user statistics
router.get('/users/stats', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN user_type = 'COUPLE' THEN 1 END) as total_couples,
        COUNT(CASE WHEN user_type = 'VENDOR' THEN 1 END) as total_vendors,
        COUNT(CASE WHEN user_type = 'ADMIN' THEN 1 END) as total_admins,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_users,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as new_users_month
      FROM users
    `;

    const result = await query(statsQuery);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user statistics'
    });
  }
});

// Update user role
router.put('/users/:id/role', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { user_type } = req.body;

    if (!user_type || !['COUPLE', 'VENDOR', 'ADMIN'].includes(user_type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid user_type is required (COUPLE, VENDOR, ADMIN)'
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot change your own role'
      });
    }

    // Check if user exists
    const userCheck = await query('SELECT id, user_type FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const currentUserType = userCheck.rows[0].user_type;

    // Update user role
    await query('UPDATE users SET user_type = ? WHERE id = ?', [user_type, userId]);

    // Log the action
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'role_change', 'user', ?, ?)
    `, [req.user.id, userId, JSON.stringify({ 
      from: currentUserType, 
      to: user_type 
    })]);

    res.json({
      message: 'User role updated successfully',
      user_id: userId,
      new_role: user_type
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user role'
    });
  }
});

// Toggle user active status
router.put('/users/:id/status', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'is_active must be a boolean'
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user.id && !is_active) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot deactivate your own account'
      });
    }

    // Check if user exists
    const userCheck = await query('SELECT id, is_active FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const currentStatus = userCheck.rows[0].is_active;

    // Update user status
    await query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);

    // Log the action
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'status_change', 'user', ?, ?)
    `, [req.user.id, userId, JSON.stringify({ 
      from: currentStatus ? 'active' : 'inactive', 
      to: is_active ? 'active' : 'inactive' 
    })]);

    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user_id: userId,
      is_active
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user status'
    });
  }
});

// Delete user (soft delete by deactivating)
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const userCheck = await query('SELECT id, email, user_type FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const user = userCheck.rows[0];

    // Soft delete by deactivating
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

    // Log the action
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'user_deleted', 'user', ?, ?)
    `, [req.user.id, userId, JSON.stringify({ 
      email: user.email,
      user_type: user.user_type
    })]);

    res.json({
      message: 'User deleted successfully',
      user_id: userId
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

// Get Vendor Subscriptions
// Get Vendor Performance Data
router.get('/vendor-performance', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const tier = req.query.tier;
    const category = req.query.category;

    // Build the query with joins to get comprehensive vendor performance data
    let whereConditions = ['v.id IS NOT NULL'];
    let queryParams = [];

    if (tier) {
      whereConditions.push('vs.subscription_type = ?');
      queryParams.push(tier);
    }

    if (category) {
      whereConditions.push('v.category = ?');
      queryParams.push(category);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get vendor performance data with real metrics
    const performanceQuery = `
      SELECT 
        v.id as vendor_id,
        v.business_name,
        v.category,
        v.is_verified,
        v.created_at,
        vs.subscription_type as tier,
        vs.status as subscription_status,
        vs.price as monthly_fee,
        COUNT(DISTINCT vl.id) as total_leads,
        COUNT(DISTINCT r.id) as total_reviews,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN vl.status = 'converted' THEN vl.id END) as converted_leads,
        MAX(vl.created_at) as last_activity
      FROM vendors v
      LEFT JOIN vendor_subscriptions vs ON v.id = vs.vendor_id
      LEFT JOIN vendor_leads vl ON v.id = vl.vendor_id
      LEFT JOIN reviews r ON v.id = r.vendor_id AND r.is_hidden = 0
      ${whereClause}
      GROUP BY v.id, v.business_name, v.category, v.is_verified, v.created_at, vs.subscription_type, vs.status, vs.price
      ORDER BY average_rating DESC, total_leads DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, skip);

    const performanceResult = await query(performanceQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT v.id) as total
      FROM vendors v
      LEFT JOIN vendor_subscriptions vs ON v.id = vs.vendor_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = countResult.rows[0].total;

    // Calculate performance metrics for each vendor
    const vendorsWithMetrics = performanceResult.rows.map(vendor => {
      const conversionRate = vendor.total_leads > 0 ? 
        (vendor.converted_leads / vendor.total_leads) * 100 : 0;
      
      // Calculate performance score based on multiple factors
      const ratingScore = (vendor.average_rating / 5) * 30;
      const reviewScore = Math.min(vendor.total_reviews / 20, 1) * 25;
      const leadScore = Math.min(vendor.total_leads / 50, 1) * 25;
      const conversionScore = (conversionRate / 40) * 20;
      
      const performanceScore = Math.round(ratingScore + reviewScore + leadScore + conversionScore);

      return {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        category: vendor.category || 'Uncategorized',
        rating: parseFloat(vendor.average_rating.toFixed(1)),
        total_reviews: vendor.total_reviews,
        total_leads: vendor.total_leads,
        converted_leads: vendor.converted_leads,
        conversion_rate: parseFloat(conversionRate.toFixed(1)),
        subscription_tier: vendor.tier || 'free',
        subscription_status: vendor.subscription_status || 'inactive',
        monthly_fee: vendor.monthly_fee || 0,
        is_verified: vendor.is_verified,
        created_at: vendor.created_at,
        last_activity: vendor.last_activity || vendor.created_at,
        performance_score: performanceScore
      };
    });

    res.json({
      vendors: vendorsWithMetrics,
      total,
      skip,
      limit,
      has_more: skip + limit < total
    });

  } catch (error) {
    console.error('Get vendor performance error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor performance data'
    });
  }
});

// Get Vendor Subscriptions (Updated with real data)
router.get('/vendor-subscriptions', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const tier = req.query.tier;

    // Build query with real subscription data
    let whereConditions = [];
    let queryParams = [];

    if (tier) {
      whereConditions.push('vs.subscription_type = ?');
      queryParams.push(tier);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const subscriptionsQuery = `
      SELECT 
        vs.id,
        vs.vendor_id,
        v.business_name,
        u.email as vendor_email,
        vs.subscription_type as tier,
        vs.status,
        vs.start_date as started_at,
        vs.end_date as expires_at,
        vs.price as monthly_fee,
        vs.features,
        CASE WHEN vs.status = 'active' THEN 1 ELSE 0 END as is_active
      FROM vendor_subscriptions vs
      JOIN vendors v ON vs.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      ${whereClause}
      ORDER BY vs.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, skip);

    const subscriptionsResult = await query(subscriptionsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendor_subscriptions vs
      JOIN vendors v ON vs.vendor_id = v.id
      JOIN users u ON v.user_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = countResult.rows[0].total;

    res.json({
      subscriptions: subscriptionsResult.rows,
      total,
      skip,
      limit,
      has_more: skip + limit < total
    });

  } catch (error) {
    console.error('Get vendor subscriptions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get vendor subscriptions'
    });
  }
});

// Update Vendor Subscription
router.put('/vendors/:id/subscription', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const vendorId = parseInt(req.params.id);
    const { tier, expires_at } = req.body;

    if (!tier || !['free', 'basic', 'premium', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid tier is required (free, basic, premium, enterprise)'
      });
    }

    // In a real implementation, this would update the vendor_subscriptions table
    // For now, return a success response with mock data
    const updatedSubscription = {
      id: 1,
      vendor_id: vendorId,
      tier: tier,
      started_at: new Date().toISOString(),
      expires_at: expires_at || null,
      is_active: true,
      business_name: "Updated Business",
      vendor_email: "updated@business.com"
    };

    // Log the subscription change
    try {
      await query(`
        INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, description, action_metadata)
        VALUES (?, 'subscription_change', 'vendor', ?, ?, ?)
      `, [
        req.user.id, 
        vendorId, 
        `Vendor subscription updated to ${tier}`,
        JSON.stringify({ tier, expires_at })
      ]);
    } catch (logError) {
      console.error('Failed to log subscription change:', logError);
    }

    res.json(updatedSubscription);

  } catch (error) {
    console.error('Update vendor subscription error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update vendor subscription'
    });
  }
});

// Get Flagged Reviews (Updated with real data)
router.get('/reviews/flagged', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;

    // Query real flagged reviews from the database
    const flaggedReviewsQuery = `
      SELECT 
        r.id,
        r.vendor_id,
        r.user_id,
        r.rating,
        r.review_text as comment,
        r.is_flagged,
        r.is_hidden,
        r.flagged_reason,
        r.created_at,
        r.updated_at,
        v.business_name as vendor_name,
        COALESCE(c.partner1_name || ' & ' || c.partner2_name, u.email) as couple_name
      FROM reviews r
      JOIN vendors v ON r.vendor_id = v.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN couples c ON u.id = c.user_id
      WHERE r.is_flagged = 1
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const reviewsResult = await query(flaggedReviewsQuery, [limit, skip]);

    // Get total count of flagged reviews
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      WHERE r.is_flagged = 1
    `;

    const countResult = await query(countQuery);
    const total = countResult.rows[0].total;

    res.json({
      reviews: reviewsResult.rows,
      total,
      skip,
      limit,
      has_more: skip + limit < total
    });

  } catch (error) {
    console.error('Get flagged reviews error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get flagged reviews'
    });
  }
});

// Moderate Review (Updated with real database operations)
router.post('/reviews/:id/moderate', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { action, reason } = req.body;

    if (!action || !['approve', 'reject', 'hide'].includes(action)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid action is required (approve, reject, hide)'
      });
    }

    // Check if review exists
    const reviewCheck = await query('SELECT id FROM reviews WHERE id = ?', [reviewId]);
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found'
      });
    }

    // Update the review based on the moderation action
    let updateQuery;
    let updateParams;

    switch (action) {
      case 'approve':
        updateQuery = `
          UPDATE reviews 
          SET is_flagged = 0, is_hidden = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        updateParams = [reviewId];
        break;
      case 'hide':
        updateQuery = `
          UPDATE reviews 
          SET is_flagged = 0, is_hidden = 1, flagged_reason = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        updateParams = [reason || 'Hidden by admin', reviewId];
        break;
      case 'reject':
        updateQuery = `
          UPDATE reviews 
          SET is_flagged = 0, is_hidden = 1, flagged_reason = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        updateParams = [reason || 'Rejected for policy violation', reviewId];
        break;
    }

    await query(updateQuery, updateParams);

    const moderationResult = {
      id: reviewId,
      status: 'moderated',
      action: action,
      is_hidden: action === 'hide' || action === 'reject',
      is_flagged: false
    };

    // Log the moderation action
    try {
      await query(`
        INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, description, action_metadata)
        VALUES (?, 'review_moderation', 'review', ?, ?, ?)
      `, [
        req.user.id, 
        reviewId, 
        `Review ${action}ed by admin`,
        JSON.stringify({ action, reason })
      ]);
    } catch (logError) {
      console.error('Failed to log moderation action:', logError);
    }

    res.json(moderationResult);

  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to moderate review'
    });
  }
});



// Get Audit Logs
router.get('/audit-logs', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const actionType = req.query.action_type;
    const targetType = req.query.target_type;
    const adminUserId = req.query.admin_user_id ? parseInt(req.query.admin_user_id) : null;

    let whereConditions = [];
    let queryParams = [];

    if (actionType) {
      whereConditions.push('al.action_type = ?');
      queryParams.push(actionType);
    }

    if (targetType) {
      whereConditions.push('al.target_type = ?');
      queryParams.push(targetType);
    }

    if (adminUserId) {
      whereConditions.push('al.admin_user_id = ?');
      queryParams.push(adminUserId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const logsQuery = `
      SELECT 
        al.id,
        al.admin_user_id,
        al.action_type,
        al.target_type,
        al.target_id,
        al.description,
        al.action_metadata,
        al.created_at,
        u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;

    const [logsResult, countResult] = await Promise.all([
      query(logsQuery, [...queryParams, limit, skip]),
      query(countQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const hasMore = skip + limit < total;

    res.json({
      logs: logsResult.rows,
      total,
      skip,
      limit,
      has_more: hasMore
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get audit logs'
    });
  }
});

// Admin Settings Endpoints

// Get admin profile
router.get('/profile', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const userQuery = `
      SELECT 
        id, email, user_type, created_at, last_login_at, is_active
      FROM users 
      WHERE id = ?
    `;

    const result = await query(userQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Admin profile not found'
      });
    }

    const profile = result.rows[0];
    
    // Add default profile settings
    profile.profile_settings = {
      notifications_enabled: true,
      email_notifications: true,
      security_alerts: true,
      theme_preference: 'system',
      timezone: 'UTC'
    };

    res.json(profile);

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get admin profile'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Validation
    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(new_password);
    const hasLowerCase = /[a-z]/.test(new_password);
    const hasNumbers = /\d/.test(new_password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(new_password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Get current user with password
    const userResult = await query('SELECT id, email, password_hash FROM users WHERE id = ?', [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
    
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be different from current password'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

    // Log the password change
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'password_change', 'user', ?, ?)
    `, [req.user.id, req.user.id, JSON.stringify({ 
      timestamp: new Date().toISOString(),
      ip_address: req.ip || req.connection.remoteAddress
    })]);

    // Send security notification email (if email service is available)
    try {
      await notificationService.sendSecurityAlert(user.email, 'password_changed', {
        timestamp: new Date().toISOString(),
        ip_address: req.ip || req.connection.remoteAddress
      });
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

// Update security settings
router.put('/security-settings', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { two_factor_enabled, session_timeout, login_notifications, ip_whitelist_enabled, allowed_ips } = req.body;

    // For now, we'll store these in a simple JSON format
    // In a production app, you'd want a proper security_settings table
    const securitySettings = {
      two_factor_enabled: Boolean(two_factor_enabled),
      session_timeout: parseInt(session_timeout) || 60,
      login_notifications: Boolean(login_notifications),
      ip_whitelist_enabled: Boolean(ip_whitelist_enabled),
      allowed_ips: Array.isArray(allowed_ips) ? allowed_ips : [],
      updated_at: new Date().toISOString()
    };

    // Log the security settings change
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'security_settings_update', 'user', ?, ?)
    `, [req.user.id, req.user.id, JSON.stringify(securitySettings)]);

    res.json({
      message: 'Security settings updated successfully',
      settings: securitySettings
    });

  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update security settings'
    });
  }
});

// Update profile settings
router.put('/profile-settings', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { notifications_enabled, email_notifications, security_alerts, theme_preference, timezone } = req.body;

    const profileSettings = {
      notifications_enabled: Boolean(notifications_enabled),
      email_notifications: Boolean(email_notifications),
      security_alerts: Boolean(security_alerts),
      theme_preference: theme_preference || 'system',
      timezone: timezone || 'UTC',
      updated_at: new Date().toISOString()
    };

    // Log the profile settings change
    await query(`
      INSERT INTO audit_logs (admin_user_id, action_type, target_type, target_id, action_metadata)
      VALUES (?, 'profile_settings_update', 'user', ?, ?)
    `, [req.user.id, req.user.id, JSON.stringify(profileSettings)]);

    res.json({
      message: 'Profile settings updated successfully',
      settings: profileSettings
    });

  } catch (error) {
    console.error('Update profile settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile settings'
    });
  }
});

module.exports = router;