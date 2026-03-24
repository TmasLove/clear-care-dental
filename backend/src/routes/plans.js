'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – list plans
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { employer_id, active_only = 'true' } = req.query;

    const params = [];
    const conditions = [];

    if (employer_id) {
      params.push(employer_id);
      conditions.push(`p.employer_id = $${params.length}`);
    }

    // Employers can only see their own plans
    if (req.user.role === 'employer') {
      const empResult = await query('SELECT id FROM employers WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length > 0) {
        params.push(empResult.rows[0].id);
        conditions.push(`p.employer_id = $${params.length}`);
      }
    }

    if (active_only === 'true') {
      conditions.push('p.is_active = true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT p.*, e.company_name,
              COUNT(DISTINCT m.id)::int AS member_count
       FROM plans p
       LEFT JOIN employers e ON e.id = p.employer_id
       LEFT JOIN members m ON m.plan_id = p.id
       ${whereClause}
       GROUP BY p.id, e.company_name
       ORDER BY p.created_at DESC`,
      params
    );

    return res.json({ success: true, plans: result.rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id – get plan details
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, e.company_name, e.id AS employer_id,
              COUNT(DISTINCT m.id)::int AS member_count
       FROM plans p
       LEFT JOIN employers e ON e.id = p.employer_id
       LEFT JOIN members m ON m.plan_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, e.company_name, e.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    return res.json({ success: true, plan: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / – create plan
// ---------------------------------------------------------------------------
router.post(
  '/',
  requireRole('employer', 'admin'),
  [
    body('employer_id').isUUID(),
    body('name').notEmpty().trim(),
    body('annual_maximum').optional().isFloat({ min: 0 }),
    body('deductible_individual').optional().isFloat({ min: 0 }),
    body('coverage_preventive').optional().isFloat({ min: 0, max: 100 }),
    body('coverage_basic').optional().isFloat({ min: 0, max: 100 }),
    body('coverage_major').optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        employer_id, name, plan_type, annual_maximum, deductible_individual,
        deductible_family, coverage_preventive, coverage_basic, coverage_major,
        coverage_orthodontic, orthodontic_lifetime_max, waiting_period_basic,
        waiting_period_major, effective_date, termination_date,
      } = req.body;

      // Employer can only create plans for their own company
      if (req.user.role === 'employer') {
        const check = await query('SELECT id FROM employers WHERE id = $1 AND user_id = $2', [employer_id, req.user.id]);
        if (check.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }

      const result = await query(
        `INSERT INTO plans (employer_id, name, plan_type, annual_maximum, deductible_individual,
           deductible_family, coverage_preventive, coverage_basic, coverage_major,
           coverage_orthodontic, orthodontic_lifetime_max, waiting_period_basic,
           waiting_period_major, effective_date, termination_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [employer_id, name, plan_type || 'self_insured', annual_maximum, deductible_individual,
          deductible_family, coverage_preventive ?? 100, coverage_basic ?? 80,
          coverage_major ?? 50, coverage_orthodontic ?? 50, orthodontic_lifetime_max,
          waiting_period_basic ?? 0, waiting_period_major ?? 6,
          effective_date || null, termination_date || null]
      );

      return res.status(201).json({ success: true, plan: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /:id – update plan
// ---------------------------------------------------------------------------
router.put('/:id', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'employer') {
      const check = await query(
        `SELECT p.id FROM plans p
         JOIN employers e ON e.id = p.employer_id
         WHERE p.id = $1 AND e.user_id = $2`,
        [id, req.user.id]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const {
      name, annual_maximum, deductible_individual, deductible_family,
      coverage_preventive, coverage_basic, coverage_major, coverage_orthodontic,
      orthodontic_lifetime_max, waiting_period_basic, waiting_period_major,
      effective_date, termination_date, is_active,
    } = req.body;

    const result = await query(
      `UPDATE plans SET
         name = COALESCE($1, name),
         annual_maximum = COALESCE($2, annual_maximum),
         deductible_individual = COALESCE($3, deductible_individual),
         deductible_family = COALESCE($4, deductible_family),
         coverage_preventive = COALESCE($5, coverage_preventive),
         coverage_basic = COALESCE($6, coverage_basic),
         coverage_major = COALESCE($7, coverage_major),
         coverage_orthodontic = COALESCE($8, coverage_orthodontic),
         orthodontic_lifetime_max = COALESCE($9, orthodontic_lifetime_max),
         waiting_period_basic = COALESCE($10, waiting_period_basic),
         waiting_period_major = COALESCE($11, waiting_period_major),
         effective_date = COALESCE($12, effective_date),
         termination_date = COALESCE($13, termination_date),
         is_active = COALESCE($14, is_active)
       WHERE id = $15
       RETURNING *`,
      [name, annual_maximum, deductible_individual, deductible_family,
        coverage_preventive, coverage_basic, coverage_major, coverage_orthodontic,
        orthodontic_lifetime_max, waiting_period_basic, waiting_period_major,
        effective_date, termination_date, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    return res.json({ success: true, plan: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id – deactivate plan
// ---------------------------------------------------------------------------
router.delete('/:id', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE plans SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    return res.json({ success: true, message: 'Plan deactivated', plan: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/members – members enrolled in plan
// ---------------------------------------------------------------------------
router.get('/:id/members', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    if (req.user.role === 'employer') {
      const empResult = await query('SELECT id FROM employers WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const planCheck = await query('SELECT id FROM plans WHERE id = $1 AND employer_id = $2', [id, empResult.rows[0].id]);
      if (planCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `SELECT m.*, u.email, u.first_name, u.last_name, u.phone
       FROM members m
       JOIN users u ON u.id = m.user_id
       WHERE m.plan_id = $1
       ORDER BY u.last_name, u.first_name
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM members WHERE plan_id = $1', [id]);

    return res.json({
      success: true,
      members: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /:id/members/:memberId – enroll member in plan
// ---------------------------------------------------------------------------
router.post('/:id/members/:memberId', requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const { id: planId, memberId } = req.params;

    const planCheck = await query('SELECT id, employer_id FROM plans WHERE id = $1', [planId]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    const result = await query(
      'UPDATE members SET plan_id = $1 WHERE id = $2 RETURNING *',
      [planId, memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    return res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
