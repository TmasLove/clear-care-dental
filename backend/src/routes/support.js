'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – list tickets
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    // Non-admins only see their own tickets
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      conditions.push(`t.user_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    if (category) {
      params.push(`%${category}%`);
      conditions.push(`t.category ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT t.*,
              u.first_name, u.last_name, u.email,
              au.first_name AS assigned_first_name, au.last_name AS assigned_last_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users au ON au.id = t.assigned_to
       ${whereClause}
       ORDER BY
         CASE t.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           WHEN 'low' THEN 4
         END,
         t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM support_tickets t ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      tickets: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id – get ticket
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*,
              u.first_name, u.last_name, u.email,
              au.first_name AS assigned_first_name, au.last_name AS assigned_last_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users au ON au.id = t.assigned_to
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Non-admin can only view their own tickets
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, ticket });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / – create support ticket
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    body('subject').notEmpty().trim().isLength({ max: 255 }),
    body('description').notEmpty().trim(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('category').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { subject, description, priority = 'normal', category } = req.body;

      const result = await query(
        `INSERT INTO support_tickets (user_id, subject, description, priority, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, subject, description, priority, category || null]
      );

      return res.status(201).json({ success: true, ticket: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /:id – update ticket (admin)
// ---------------------------------------------------------------------------
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, category } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE support_tickets SET
         status = COALESCE($1, status),
         priority = COALESCE($2, priority),
         assigned_to = COALESCE($3, assigned_to),
         category = COALESCE($4, category),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, priority, assigned_to, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    return res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
