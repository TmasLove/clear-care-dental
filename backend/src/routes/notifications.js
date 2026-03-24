'use strict';

const express = require('express');

const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – get notifications for current user
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { unread_only, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = ['user_id = $1'];
    const params = [req.user.id];

    if (unread_only === 'true') {
      conditions.push('is_read = false');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params
    );

    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    return res.json({
      success: true,
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      unread_count: parseInt(unreadCount.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /read-all – mark all as read
// ---------------------------------------------------------------------------
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: `${result.rowCount} notification(s) marked as read`,
      updated_count: result.rowCount,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/read – mark notification as read
// ---------------------------------------------------------------------------
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
