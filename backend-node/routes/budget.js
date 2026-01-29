const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const budgetValidation = [
  body('total_budget').isFloat({ min: 0 }).withMessage('Total budget must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('categories').optional().isArray().withMessage('Categories must be an array')
];

const categoryValidation = [
  body('category').notEmpty().withMessage('Category name is required'),
  body('allocated_amount').isFloat({ min: 0 }).withMessage('Allocated amount must be positive')
];

const expenseValidation = [
  body('budget_category_id').isInt({ min: 1 }).withMessage('Budget category ID is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('date').isISO8601().withMessage('Valid date is required')
];

// Add expense (must come before /:weddingId routes)
router.post('/expenses', authenticateToken, requireRole('COUPLE'), expenseValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { budget_category_id, vendor_id, description, amount, date, receipt_url } = req.body;

    // Verify user owns this budget category
    const categoryResult = await query(`
      SELECT bc.id, bc.budget_id, b.wedding_id, w.couple_id
      FROM budget_categories bc
      JOIN budgets b ON bc.budget_id = b.id
      JOIN weddings w ON b.wedding_id = w.id
      JOIN couples c ON w.couple_id = c.id
      WHERE bc.id = $1 AND c.user_id = $2
    `, [budget_category_id, req.user.id]);

    if (categoryResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this budget category'
      });
    }

    // Add expense
    const expenseResult = await query(`
      INSERT INTO expenses (budget_category_id, vendor_id, description, amount, date, receipt_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, budget_category_id, vendor_id, description, amount, date, receipt_url, created_at
    `, [budget_category_id, vendor_id, description, amount, date, receipt_url]);

    const expense = expenseResult.rows[0];

    res.status(201).json(expense);

  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add expense'
    });
  }
});

// Update expense
router.put('/expenses/:expenseId', authenticateToken, requireRole('COUPLE'), [
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('date').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const expenseId = parseInt(req.params.expenseId);
    const { description, amount, date, receipt_url } = req.body;

    if (isNaN(expenseId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid expense ID'
      });
    }

    // Verify user owns this expense
    const expenseCheck = await query(`
      SELECT e.id
      FROM expenses e
      JOIN budget_categories bc ON e.budget_category_id = bc.id
      JOIN budgets b ON bc.budget_id = b.id
      JOIN weddings w ON b.wedding_id = w.id
      JOIN couples c ON w.couple_id = c.id
      WHERE e.id = $1 AND c.user_id = $2
    `, [expenseId, req.user.id]);

    if (expenseCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this expense'
      });
    }

    // Update expense
    const expenseResult = await query(`
      UPDATE expenses 
      SET description = $1, amount = $2, date = $3, receipt_url = $4
      WHERE id = $5
      RETURNING id, budget_category_id, vendor_id, description, amount, date, receipt_url, created_at
    `, [description, amount, date, receipt_url, expenseId]);

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }

    res.json(expenseResult.rows[0]);

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update expense'
    });
  }
});

// Get expenses for a wedding
router.get('/expenses/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Get expenses with category information
    const expensesResult = await query(`
      SELECT e.id, e.budget_category_id, e.vendor_id, e.description, e.amount, e.date, e.receipt_url, e.created_at,
             bc.category as category_name,
             v.business_name as vendor_name
      FROM expenses e
      JOIN budget_categories bc ON e.budget_category_id = bc.id
      JOIN budgets b ON bc.budget_id = b.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      WHERE b.wedding_id = $1
      ORDER BY e.date DESC, e.created_at DESC
    `, [weddingId]);

    res.json(expensesResult.rows);

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get expenses'
    });
  }
});

// Delete expense
router.delete('/expenses/:expenseId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);

    if (isNaN(expenseId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid expense ID'
      });
    }

    // Verify user owns this expense
    const expenseCheck = await query(`
      SELECT e.id
      FROM expenses e
      JOIN budget_categories bc ON e.budget_category_id = bc.id
      JOIN budgets b ON bc.budget_id = b.id
      JOIN weddings w ON b.wedding_id = w.id
      JOIN couples c ON w.couple_id = c.id
      WHERE e.id = $1 AND c.user_id = $2
    `, [expenseId, req.user.id]);

    if (expenseCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this expense'
      });
    }

    // Delete expense
    await query('DELETE FROM expenses WHERE id = $1', [expenseId]);

    res.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete expense'
    });
  }
});

// Create budget
router.post('/:weddingId', authenticateToken, requireRole('COUPLE'), budgetValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const weddingId = parseInt(req.params.weddingId);
    const { total_budget, currency = 'USD', categories = [] } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Check if budget already exists
    const existingBudget = await query('SELECT id FROM budgets WHERE wedding_id = $1', [weddingId]);
    if (existingBudget.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Budget already exists for this wedding'
      });
    }

    // Create budget
    const budgetResult = await query(`
      INSERT INTO budgets (wedding_id, total_budget, currency)
      VALUES ($1, $2, $3)
      RETURNING id, wedding_id, total_budget, currency, created_at
    `, [weddingId, total_budget, currency]);

    const budget = budgetResult.rows[0];

    // Create default categories if provided
    const createdCategories = [];
    for (const category of categories) {
      const categoryResult = await query(`
        INSERT INTO budget_categories (budget_id, category, allocated_amount)
        VALUES ($1, $2, $3)
        RETURNING id, category, allocated_amount
      `, [budget.id, category.category, category.allocated_amount]);
      
      createdCategories.push({
        ...categoryResult.rows[0],
        spent_amount: 0,
        remaining_amount: category.allocated_amount,
        percentage_spent: 0
      });
    }

    res.status(201).json({
      ...budget,
      total_spent: 0,
      total_remaining: total_budget,
      percentage_spent: 0,
      categories: createdCategories
    });

  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create budget'
    });
  }
});

// Get budget
router.get('/:weddingId', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Get budget
    const budgetResult = await query(`
      SELECT id, wedding_id, total_budget, currency, created_at
      FROM budgets 
      WHERE wedding_id = $1
    `, [weddingId]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Budget not found'
      });
    }

    const budget = budgetResult.rows[0];

    // Get categories with spending calculations
    const categoriesResult = await query(`
      SELECT bc.id, bc.category, bc.allocated_amount,
             COALESCE(SUM(e.amount), 0) as spent_amount
      FROM budget_categories bc
      LEFT JOIN expenses e ON bc.id = e.budget_category_id
      WHERE bc.budget_id = $1
      GROUP BY bc.id, bc.category, bc.allocated_amount
      ORDER BY bc.category
    `, [budget.id]);

    const categories = categoriesResult.rows.map(cat => ({
      ...cat,
      spent_amount: parseFloat(cat.spent_amount),
      remaining_amount: cat.allocated_amount - parseFloat(cat.spent_amount),
      percentage_spent: cat.allocated_amount > 0 ? (parseFloat(cat.spent_amount) / cat.allocated_amount) * 100 : 0
    }));

    // Calculate totals
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0);
    const totalRemaining = budget.total_budget - totalSpent;
    const percentageSpent = budget.total_budget > 0 ? (totalSpent / budget.total_budget) * 100 : 0;

    res.json({
      ...budget,
      total_spent: totalSpent,
      total_remaining: totalRemaining,
      percentage_spent: percentageSpent,
      categories
    });

  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get budget'
    });
  }
});

// Update budget
router.put('/:weddingId', authenticateToken, requireRole('COUPLE'), budgetValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const weddingId = parseInt(req.params.weddingId);
    const { total_budget, currency } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Update budget
    const budgetResult = await query(`
      UPDATE budgets 
      SET total_budget = $1, currency = $2
      WHERE wedding_id = $3
      RETURNING id, wedding_id, total_budget, currency, created_at
    `, [total_budget, currency, weddingId]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Budget not found'
      });
    }

    const budget = budgetResult.rows[0];

    res.json({
      ...budget,
      total_spent: 0,
      total_remaining: total_budget,
      percentage_spent: 0,
      categories: []
    });

  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update budget'
    });
  }
});

// Add budget category
router.post('/:weddingId/categories', authenticateToken, requireRole('COUPLE'), categoryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const weddingId = parseInt(req.params.weddingId);
    const { category, allocated_amount } = req.body;

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding and get budget
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const budgetResult = await query(`
      SELECT b.id 
      FROM budgets b
      JOIN weddings w ON b.wedding_id = w.id
      WHERE w.id = $1 AND w.couple_id = $2
    `, [weddingId, coupleId]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Budget not found'
      });
    }

    const budgetId = budgetResult.rows[0].id;

    // Add category
    const categoryResult = await query(`
      INSERT INTO budget_categories (budget_id, category, allocated_amount)
      VALUES ($1, $2, $3)
      RETURNING id, category, allocated_amount
    `, [budgetId, category, allocated_amount]);

    const newCategory = categoryResult.rows[0];

    res.status(201).json({
      ...newCategory,
      spent_amount: 0,
      remaining_amount: allocated_amount,
      percentage_spent: 0
    });

  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add category'
    });
  }
});

// Get budget summary
router.get('/:weddingId/summary', authenticateToken, requireRole('COUPLE'), async (req, res) => {
  try {
    const weddingId = parseInt(req.params.weddingId);

    if (isNaN(weddingId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid wedding ID'
      });
    }

    // Verify user owns this wedding
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = $1', [req.user.id]);
    if (coupleResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const coupleId = coupleResult.rows[0].id;
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = $1 AND couple_id = $2', [weddingId, coupleId]);
    if (weddingCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this wedding'
      });
    }

    // Get budget
    const budgetResult = await query(`
      SELECT id, wedding_id, total_budget, currency, created_at
      FROM budgets 
      WHERE wedding_id = $1
    `, [weddingId]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Budget not found'
      });
    }

    const budget = budgetResult.rows[0];

    // Get categories with spending calculations
    const categoriesResult = await query(`
      SELECT bc.id, bc.category, bc.allocated_amount,
             COALESCE(SUM(e.amount), 0) as spent_amount
      FROM budget_categories bc
      LEFT JOIN expenses e ON bc.id = e.budget_category_id
      WHERE bc.budget_id = $1
      GROUP BY bc.id, bc.category, bc.allocated_amount
      ORDER BY bc.category
    `, [budget.id]);

    const categories = categoriesResult.rows.map(cat => ({
      ...cat,
      spent_amount: parseFloat(cat.spent_amount),
      remaining_amount: cat.allocated_amount - parseFloat(cat.spent_amount),
      percentage_spent: cat.allocated_amount > 0 ? (parseFloat(cat.spent_amount) / cat.allocated_amount) * 100 : 0
    }));

    // Calculate totals
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0);
    const totalRemaining = budget.total_budget - totalSpent;
    const percentageSpent = budget.total_budget > 0 ? (totalSpent / budget.total_budget) * 100 : 0;

    // Get expenses count
    const expensesResult = await query(`
      SELECT COUNT(*) as count
      FROM expenses e
      JOIN budget_categories bc ON e.budget_category_id = bc.id
      WHERE bc.budget_id = $1
    `, [budget.id]);

    const expensesCount = parseInt(expensesResult.rows[0].count);

    // Generate warnings
    const warnings = [];
    categories.forEach(category => {
      if (category.percentage_spent >= 100) {
        warnings.push({
          category: category.category,
          allocated_amount: category.allocated_amount,
          spent_amount: category.spent_amount,
          percentage_spent: category.percentage_spent,
          warning_level: 'exceeded',
          message: `Budget exceeded by ${budget.currency} ${(category.spent_amount - category.allocated_amount).toFixed(2)}`
        });
      } else if (category.percentage_spent >= 90) {
        warnings.push({
          category: category.category,
          allocated_amount: category.allocated_amount,
          spent_amount: category.spent_amount,
          percentage_spent: category.percentage_spent,
          warning_level: 'approaching',
          message: `Approaching budget limit (${category.percentage_spent.toFixed(1)}% used)`
        });
      }
    });

    res.json({
      total_budget: budget.total_budget,
      total_spent: totalSpent,
      total_remaining: totalRemaining,
      percentage_spent: percentageSpent,
      currency: budget.currency,
      warnings: warnings,
      categories_count: categories.length,
      expenses_count: expensesCount
    });

  } catch (error) {
    console.error('Get budget summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get budget summary'
    });
  }
});

module.exports = router;