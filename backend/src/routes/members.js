'use strict';

const express = require('express');
const QRCode = require('qrcode');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

const canAccessMember = async (req, memberId) => {
  const { role, id: userId } = req.user;
  if (role === 'admin') return true;
  if (role === 'employer') {
    const check = await query(
      `SELECT m.id FROM members m
       JOIN employers e ON e.id = m.employer_id
       WHERE m.id = $1 AND e.user_id = $2`,
      [memberId, userId]
    );
    return check.rows.length > 0;
  }
  if (role === 'member') {
    const check = await query('SELECT id FROM members WHERE id = $1 AND user_id = $2', [memberId, userId]);
    return check.rows.length > 0;
  }
  return false;
};

// ---------------------------------------------------------------------------
// GET /me – current member's own profile (looked up by user_id)
// ---------------------------------------------------------------------------
router.get('/me', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              p.name AS plan_name, p.annual_maximum, p.deductible_individual,
              p.coverage_preventive, p.coverage_basic, p.coverage_major, p.coverage_orthodontic,
              e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member profile not found' });
    }
    return res.json({ success: true, member: result.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /lookup/:memberIdString – look up member by their display member_id
// ---------------------------------------------------------------------------
router.get('/lookup/:memberIdString', async (req, res, next) => {
  try {
    if (req.user.role === 'member') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const result = await query(
      `SELECT m.*, u.first_name, u.last_name, u.email,
              p.name AS plan_name, p.annual_maximum, p.coverage_preventive,
              p.coverage_basic, p.coverage_major, p.deductible_individual,
              e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.member_id = $1`,
      [req.params.memberIdString]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    return res.json({ success: true, member: result.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET / – list members
// ---------------------------------------------------------------------------
router.get('/', requireRole('admin', 'employer'), async (req, res, next) => {
  try {
    const { page = 1, employer_id, plan_id, q } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.user.role === 'employer') {
      const empResult = await query('SELECT id FROM employers WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length === 0) {
        return res.json({ success: true, members: [], total: 0 });
      }
      params.push(empResult.rows[0].id);
      conditions.push(`m.employer_id = $${params.length}`);
    } else if (employer_id) {
      params.push(employer_id);
      conditions.push(`m.employer_id = $${params.length}`);
    }

    if (plan_id) {
      params.push(plan_id);
      conditions.push(`m.plan_id = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR m.member_id ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT m.*, u.email, u.first_name, u.last_name, u.phone, u.is_active,
              p.name AS plan_name, e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       ${whereClause}
       ORDER BY u.last_name, u.first_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM members m JOIN users u ON u.id = m.user_id ${whereClause}`,
      params
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
// GET /:id – get member profile with plan info
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(
      `SELECT m.*,
              u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active,
              p.name AS plan_name, p.annual_maximum, p.deductible_individual,
              p.coverage_preventive, p.coverage_basic, p.coverage_major, p.coverage_orthodontic,
              e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    return res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id – update member
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { date_of_birth, gender, relationship, plan_id: requestedPlanId } = req.body;

    // Only admin and employer roles may change plan_id
    const plan_id = (requestedPlanId !== undefined && req.user.role === 'member')
      ? undefined
      : requestedPlanId;

    const result = await query(
      `UPDATE members SET
         date_of_birth = COALESCE($1, date_of_birth),
         gender = COALESCE($2, gender),
         relationship = COALESCE($3, relationship),
         plan_id = COALESCE($4, plan_id)
       WHERE id = $5
       RETURNING *`,
      [date_of_birth, gender, relationship, plan_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    return res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/plan – member's plan details (alias)
// ---------------------------------------------------------------------------
router.get('/:id/plan', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const result = await query(
      `SELECT p.*, e.company_name
       FROM members m
       JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found for this member' });
    }
    return res.json({ success: true, plan: result.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /:id/usage – benefits usage (alias for /benefits)
// ---------------------------------------------------------------------------
router.get('/:id/usage', async (req, res, next) => {
  req.url = req.url.replace('/usage', '/benefits');
  return next('route');
});

// ---------------------------------------------------------------------------
// GET /:id/eligibility – eligibility check
// ---------------------------------------------------------------------------
router.get('/:id/eligibility', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const result = await query(
      `SELECT m.member_id, m.enrollment_date, m.termination_date, m.annual_maximum_used,
              m.annual_deductible_met, u.first_name, u.last_name,
              p.name AS plan_name, p.annual_maximum, p.deductible_individual,
              p.coverage_preventive, p.coverage_basic, p.coverage_major,
              e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    const row = result.rows[0];
    const isActive = !row.termination_date || new Date(row.termination_date) > new Date();
    return res.json({ success: true, eligible: isActive, member: row });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /:id/benefits – remaining benefits
// ---------------------------------------------------------------------------
router.get('/:id/benefits', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(
      `SELECT m.annual_deductible_met, m.annual_maximum_used, m.enrollment_date,
              p.annual_maximum, p.deductible_individual, p.deductible_family,
              p.coverage_preventive, p.coverage_basic, p.coverage_major, p.coverage_orthodontic,
              p.orthodontic_lifetime_max, p.name AS plan_name
       FROM members m
       JOIN plans p ON p.id = m.plan_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found or not enrolled in a plan' });
    }

    const row = result.rows[0];
    const annualMax = parseFloat(row.annual_maximum) || 0;
    const maxUsed = parseFloat(row.annual_maximum_used) || 0;
    const deductibleInd = parseFloat(row.deductible_individual) || 0;
    const deductibleMet = parseFloat(row.annual_deductible_met) || 0;

    return res.json({
      success: true,
      benefits: {
        plan_name: row.plan_name,
        annual_maximum: annualMax,
        annual_maximum_used: maxUsed,
        annual_maximum_remaining: Math.max(0, annualMax - maxUsed),
        deductible_individual: deductibleInd,
        deductible_met: deductibleMet,
        deductible_remaining: Math.max(0, deductibleInd - deductibleMet),
        coverage: {
          preventive: parseFloat(row.coverage_preventive) || 100,
          basic: parseFloat(row.coverage_basic) || 80,
          major: parseFloat(row.coverage_major) || 50,
          orthodontic: parseFloat(row.coverage_orthodontic) || 50,
        },
        orthodontic_lifetime_max: parseFloat(row.orthodontic_lifetime_max) || 0,
        enrollment_date: row.enrollment_date,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/claims – claims history
// ---------------------------------------------------------------------------
router.get('/:id/claims', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { page = 1, status, from, to } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    const conditions = ['c.member_id = $1'];
    const params = [id];

    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`c.service_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`c.service_date <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT c.*, d.practice_name AS dentist_practice,
              u.first_name AS dentist_first_name, u.last_name AS dentist_last_name
       FROM claims c
       LEFT JOIN dentists d ON d.id = c.dentist_id
       LEFT JOIN users u ON u.id = d.user_id
       ${whereClause}
       ORDER BY c.service_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM claims c ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      claims: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: limit,
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/plan-qr – generate QR code with member plan info
// ---------------------------------------------------------------------------
router.get('/:id/plan-qr', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!(await canAccessMember(req, id))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(
      `SELECT m.member_id, m.annual_deductible_met, m.annual_maximum_used,
              u.first_name, u.last_name,
              p.name AS plan_name, p.annual_maximum, p.coverage_preventive,
              p.coverage_basic, p.coverage_major,
              e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const member = result.rows[0];

    const qrData = JSON.stringify({
      insurer: 'Clear Care Dental',
      member_id: member.member_id,
      member_name: `${member.first_name} ${member.last_name}`,
      plan: member.plan_name,
      employer: member.company_name,
      coverage: {
        preventive: `${member.coverage_preventive}%`,
        basic: `${member.coverage_basic}%`,
        major: `${member.coverage_major}%`,
      },
      annual_max: member.annual_maximum,
      generated: new Date().toISOString(),
    });

    const { format = 'base64' } = req.query;

    if (format === 'svg') {
      const svg = await QRCode.toString(qrData, { type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    const base64 = await QRCode.toDataURL(qrData);

    return res.json({
      success: true,
      qr_code: base64,
      member_id: member.member_id,
      member_name: `${member.first_name} ${member.last_name}`,
      plan_name: member.plan_name,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
