'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All employer routes require authentication
router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – list employers (admin only)
// ---------------------------------------------------------------------------
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, q } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    let whereClause = '';
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      whereClause = `WHERE e.company_name ILIKE $1`;
    }

    const result = await query(
      `SELECT e.*, u.email, u.first_name, u.last_name, u.phone, u.is_active,
              COUNT(DISTINCT m.id) AS member_count,
              COUNT(DISTINCT p.id) AS plan_count
       FROM employers e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN members m ON m.employer_id = e.id
       LEFT JOIN plans p ON p.employer_id = e.id AND p.is_active = true
       ${whereClause}
       GROUP BY e.id, u.email, u.first_name, u.last_name, u.phone, u.is_active
       ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM employers e ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      employers: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id – get employer profile
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Employers can only see their own profile; admin sees all
    if (req.user.role === 'employer') {
      const selfCheck = await query(
        'SELECT id FROM employers WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (selfCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `SELECT e.*, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at as user_created_at
       FROM employers e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    return res.json({ success: true, employer: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id – update employer profile
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  requireRole('employer', 'admin'),
  [
    body('company_name').optional().notEmpty().trim(),
    body('company_size').optional().isInt({ min: 1 }),
    body('website').optional().isURL(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;

      if (req.user.role === 'employer') {
        const check = await query('SELECT id FROM employers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      const { company_name, company_size, industry, tax_id, address_line1, address_line2, city, state, zip_code, website } = req.body;

      const result = await query(
        `UPDATE employers
         SET company_name = COALESCE($1, company_name),
             company_size = COALESCE($2, company_size),
             industry = COALESCE($3, industry),
             tax_id = COALESCE($4, tax_id),
             address_line1 = COALESCE($5, address_line1),
             address_line2 = COALESCE($6, address_line2),
             city = COALESCE($7, city),
             state = COALESCE($8, state),
             zip_code = COALESCE($9, zip_code),
             website = COALESCE($10, website)
         WHERE id = $11
         RETURNING *`,
        [company_name, company_size, industry, tax_id, address_line1, address_line2, city, state, zip_code, website, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Employer not found' });
      }

      return res.json({ success: true, employer: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:id/dashboard – savings report
// ---------------------------------------------------------------------------
router.get('/:id/dashboard', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'employer') {
      const check = await query('SELECT id FROM employers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const statsResult = await query(
      `SELECT
         COUNT(DISTINCT c.id)::int AS claims_count,
         COUNT(DISTINCT m.id)::int AS members_count,
         COALESCE(SUM(c.total_billed), 0) AS total_billed,
         COALESCE(SUM(c.plan_paid), 0) AS plan_paid,
         COALESCE(SUM(c.member_responsibility), 0) AS member_responsibility,
         COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END)::int AS pending_claims,
         COUNT(DISTINCT CASE WHEN c.status = 'approved' THEN c.id END)::int AS approved_claims,
         COUNT(DISTINCT CASE WHEN c.status = 'paid' THEN c.id END)::int AS paid_claims
       FROM employers e
       JOIN members m ON m.employer_id = e.id
       LEFT JOIN claims c ON c.member_id = m.id
       WHERE e.id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];
    const totalBilled = parseFloat(stats.total_billed) || 0;
    const planPaid = parseFloat(stats.plan_paid) || 0;
    const savingsAmount = totalBilled - planPaid;
    const savingsPercent = totalBilled > 0 ? Math.round((savingsAmount / totalBilled) * 100 * 10) / 10 : 0;

    // Monthly claims trend (last 6 months)
    const trendResult = await query(
      `SELECT
         DATE_TRUNC('month', c.service_date) AS month,
         COUNT(c.id)::int AS claims,
         COALESCE(SUM(c.plan_paid), 0) AS plan_paid
       FROM employers e
       JOIN members m ON m.employer_id = e.id
       JOIN claims c ON c.member_id = m.id
       WHERE e.id = $1 AND c.service_date >= NOW() - INTERVAL '6 months'
       GROUP BY 1
       ORDER BY 1`,
      [id]
    );

    return res.json({
      success: true,
      dashboard: {
        total_billed: totalBilled,
        plan_paid: planPaid,
        member_responsibility: parseFloat(stats.member_responsibility) || 0,
        savings_amount: savingsAmount,
        savings_percent: savingsPercent,
        claims_count: stats.claims_count,
        members_count: stats.members_count,
        pending_claims: stats.pending_claims,
        approved_claims: stats.approved_claims,
        paid_claims: stats.paid_claims,
        monthly_trend: trendResult.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/members – list members under this employer
// ---------------------------------------------------------------------------
router.get('/:id/members', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    if (req.user.role === 'employer') {
      const check = await query('SELECT id FROM employers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `SELECT m.*, u.email, u.first_name, u.last_name, u.phone, u.is_active,
              p.name AS plan_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       WHERE m.employer_id = $1
       ORDER BY u.last_name, u.first_name
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM members WHERE employer_id = $1',
      [id]
    );

    return res.json({
      success: true,
      members: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /:id/invite – invite member by email
// ---------------------------------------------------------------------------
router.post(
  '/:id/invite',
  requireRole('employer', 'admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('first_name').notEmpty().trim(),
    body('last_name').notEmpty().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { email, first_name, last_name, plan_id } = req.body;

      if (req.user.role === 'employer') {
        const check = await query('SELECT id FROM employers WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      let userId;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
      } else {
        // Create pending member user
        const magicToken = crypto.randomBytes(32).toString('hex');
        const magicExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const newUser = await query(
          `INSERT INTO users (email, role, first_name, last_name, magic_link_token, magic_link_expires, is_active)
           VALUES ($1, 'member', $2, $3, $4, $5, true)
           RETURNING id`,
          [email, first_name, last_name, magicToken, magicExpires]
        );
        userId = newUser.rows[0].id;
      }

      // Check member record doesn't already exist for this employer
      const existingMember = await query(
        'SELECT id FROM members WHERE user_id = $1 AND employer_id = $2',
        [userId, id]
      );

      if (existingMember.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Member already enrolled with this employer' });
      }

      // Generate member ID
      const countResult = await query('SELECT COUNT(*) FROM members');
      const memberNum = parseInt(countResult.rows[0].count, 10) + 1;
      const memberId = `BEN-${String(memberNum).padStart(3, '0')}`;

      await query(
        `INSERT INTO members (user_id, employer_id, plan_id, member_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, id, plan_id || null, memberId]
      );

      // Simulate sending invite email (invite URL is sent via email only, not returned in response)
      return res.status(201).json({
        success: true,
        message: 'Invitation sent.',
        member_id: memberId,
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
