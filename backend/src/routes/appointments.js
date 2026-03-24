'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – list appointments
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { member_id, dentist_id, status, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    // Scope by role
    if (req.user.role === 'member') {
      const mResult = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (mResult.rows.length === 0) return res.json({ success: true, appointments: [], total: 0 });
      params.push(mResult.rows[0].id);
      conditions.push(`a.member_id = $${params.length}`);
    } else if (req.user.role === 'dentist') {
      const dResult = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
      if (dResult.rows.length === 0) return res.json({ success: true, appointments: [], total: 0 });
      params.push(dResult.rows[0].id);
      conditions.push(`a.dentist_id = $${params.length}`);
    }

    if (member_id && req.user.role !== 'member') {
      params.push(member_id);
      conditions.push(`a.member_id = $${params.length}`);
    }

    if (dentist_id && req.user.role !== 'dentist') {
      params.push(dentist_id);
      conditions.push(`a.dentist_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`a.appointment_date >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`a.appointment_date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT a.*,
              mu.first_name AS member_first_name, mu.last_name AS member_last_name,
              m.member_id AS member_number,
              d.practice_name, d.address_line1 AS dentist_address,
              d.city AS dentist_city, d.state AS dentist_state,
              du.first_name AS dentist_first_name, du.last_name AS dentist_last_name
       FROM appointments a
       JOIN members m ON m.id = a.member_id
       JOIN users mu ON mu.id = m.user_id
       LEFT JOIN dentists d ON d.id = a.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       ${whereClause}
       ORDER BY a.appointment_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      appointments: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id – get appointment
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*,
              mu.first_name AS member_first_name, mu.last_name AS member_last_name,
              mu.email AS member_email, m.member_id AS member_number,
              d.practice_name, d.phone AS dentist_phone,
              du.first_name AS dentist_first_name, du.last_name AS dentist_last_name
       FROM appointments a
       JOIN members m ON m.id = a.member_id
       JOIN users mu ON mu.id = m.user_id
       LEFT JOIN dentists d ON d.id = a.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    return res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / – create appointment
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    body('member_id').isUUID(),
    body('dentist_id').isUUID(),
    body('appointment_date').isISO8601(),
    body('appointment_type').optional().trim(),
    body('duration_minutes').optional().isInt({ min: 15, max: 480 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { member_id, dentist_id, appointment_date, duration_minutes = 60, appointment_type, notes } = req.body;

      // Check for scheduling conflicts
      const conflict = await query(
        `SELECT id FROM appointments
         WHERE dentist_id = $1
           AND status NOT IN ('cancelled', 'no_show')
           AND appointment_date BETWEEN $2::TIMESTAMP - INTERVAL '1 hour'
               AND $2::TIMESTAMP + INTERVAL '1 hour'`,
        [dentist_id, appointment_date]
      );

      if (conflict.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Scheduling conflict: dentist has another appointment near that time.',
        });
      }

      const result = await query(
        `INSERT INTO appointments (member_id, dentist_id, appointment_date, duration_minutes, appointment_type, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
         RETURNING *`,
        [member_id, dentist_id, appointment_date, duration_minutes, appointment_type || null, notes || null]
      );

      return res.status(201).json({ success: true, appointment: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /:id – update appointment
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { appointment_date, duration_minutes, appointment_type, status, notes } = req.body;

    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status` });
    }

    // Fetch appointment to check ownership
    const apptCheck = await query('SELECT member_id, dentist_id FROM appointments WHERE id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    const appt = apptCheck.rows[0];

    if (req.user.role === 'member') {
      if (appt.member_id !== req.user.profileId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    } else if (req.user.role === 'dentist') {
      if (appt.dentist_id !== req.user.profileId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `UPDATE appointments SET
         appointment_date = COALESCE($1, appointment_date),
         duration_minutes = COALESCE($2, duration_minutes),
         appointment_type = COALESCE($3, appointment_type),
         status = COALESCE($4, status),
         notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [appointment_date, duration_minutes, appointment_type, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    return res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id – cancel appointment
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch appointment to check ownership
    const apptCheck = await query('SELECT member_id, dentist_id FROM appointments WHERE id = $1', [id]);
    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    const appt = apptCheck.rows[0];

    if (req.user.role === 'member') {
      if (appt.member_id !== req.user.profileId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    } else if (req.user.role === 'dentist') {
      if (appt.dentist_id !== req.user.profileId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING id, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    return res.json({ success: true, message: 'Appointment cancelled', appointment: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
