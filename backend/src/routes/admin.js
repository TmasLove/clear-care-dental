'use strict';

const express = require('express');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, requireRole('admin'));

// ---------------------------------------------------------------------------
// GET /stats – system overview
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res, next) => {
  try {
    const [usersRes, claimsRes, membersRes, employersRes, dentistsRes, pendingRes, ticketsRes] =
      await Promise.all([
        query('SELECT COUNT(*) AS total, role, COUNT(*) FILTER (WHERE is_active) AS active FROM users GROUP BY role'),
        query(`SELECT
                 COUNT(*) AS total,
                 COALESCE(SUM(total_billed), 0) AS total_billed,
                 COALESCE(SUM(plan_paid), 0) AS total_plan_paid,
                 COALESCE(SUM(member_responsibility), 0) AS total_member_resp
               FROM claims`),
        query('SELECT COUNT(*) AS total FROM members'),
        query('SELECT COUNT(*) AS total FROM employers'),
        query('SELECT COUNT(*) AS total FROM dentists'),
        query(`SELECT
                 COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                 COUNT(*) FILTER (WHERE status = 'processing') AS processing,
                 COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                 COUNT(*) FILTER (WHERE status = 'paid') AS paid,
                 COUNT(*) FILTER (WHERE status = 'denied') AS denied
               FROM claims`),
        query(`SELECT
                 COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
                 COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets
               FROM support_tickets`),
      ]);

    // Build role breakdown
    const usersByRole = {};
    for (const row of usersRes.rows) {
      usersByRole[row.role] = { total: parseInt(row.total, 10), active: parseInt(row.active, 10) };
    }

    const claimsStats = claimsRes.rows[0];
    const claimStatus = pendingRes.rows[0];

    return res.json({
      success: true,
      stats: {
        users: {
          total: usersRes.rows.reduce((s, r) => s + parseInt(r.total, 10), 0),
          by_role: usersByRole,
        },
        members: parseInt(membersRes.rows[0].total, 10),
        employers: parseInt(employersRes.rows[0].total, 10),
        dentists: parseInt(dentistsRes.rows[0].total, 10),
        claims: {
          total: parseInt(claimsStats.total, 10),
          total_billed: parseFloat(claimsStats.total_billed),
          total_plan_paid: parseFloat(claimsStats.total_plan_paid),
          total_member_responsibility: parseFloat(claimsStats.total_member_resp),
          pending: parseInt(claimStatus.pending, 10),
          processing: parseInt(claimStatus.processing, 10),
          approved: parseInt(claimStatus.approved, 10),
          paid: parseInt(claimStatus.paid, 10),
          denied: parseInt(claimStatus.denied, 10),
        },
        support: {
          open_tickets: parseInt(ticketsRes.rows[0].open_tickets, 10),
          in_progress_tickets: parseInt(ticketsRes.rows[0].in_progress_tickets, 10),
        },
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /users – list all users
// ---------------------------------------------------------------------------
router.get('/users', async (req, res, next) => {
  try {
    const { role, is_active, q, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    const conditions = [];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const pn = params.length;
      conditions.push(`(email ILIKE $${pn} OR first_name ILIKE $${pn} OR last_name ILIKE $${pn})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT id, email, role, first_name, last_name, phone,
              is_active, email_verified, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);

    return res.json({
      success: true,
      users: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /users/:id/activate – toggle user active status
// ---------------------------------------------------------------------------
router.put('/users/:id/activate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'is_active (boolean) required' });
    }

    const result = await query(
      `UPDATE users SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, role, first_name, last_name, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /claims/activity – recent claim activity feed
// ---------------------------------------------------------------------------
router.get('/claims/activity', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const result = await query(
      `SELECT c.id, c.claim_number, c.status, c.total_billed, c.plan_paid,
              c.member_responsibility, c.service_date, c.submission_date, c.updated_at,
              mu.first_name AS member_first_name, mu.last_name AS member_last_name,
              mem.member_id AS member_number,
              d.practice_name, du.first_name AS dentist_first_name, du.last_name AS dentist_last_name,
              p.name AS plan_name
       FROM claims c
       JOIN members mem ON mem.id = c.member_id
       JOIN users mu ON mu.id = mem.user_id
       LEFT JOIN dentists d ON d.id = c.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN plans p ON p.id = c.plan_id
       ORDER BY c.updated_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.json({ success: true, activity: result.rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
