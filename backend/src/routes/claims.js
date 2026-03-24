'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');

const { query, getClient } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { calculateClaimAdjudication } = require('../utils/adjudication');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

router.use(authenticateToken);

const generateClaimNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `CLM-${date}-${rand}`;
};

// ---------------------------------------------------------------------------
// GET / – list claims
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { member_id, dentist_id, status, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    // Role-based scoping
    if (req.user.role === 'member') {
      const mResult = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (mResult.rows.length === 0) return res.json({ success: true, claims: [], total: 0 });
      params.push(mResult.rows[0].id);
      conditions.push(`c.member_id = $${params.length}`);
    } else if (req.user.role === 'dentist') {
      const dResult = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
      if (dResult.rows.length === 0) return res.json({ success: true, claims: [], total: 0 });
      params.push(dResult.rows[0].id);
      conditions.push(`c.dentist_id = $${params.length}`);
    } else if (req.user.role === 'employer') {
      const eResult = await query('SELECT id FROM employers WHERE user_id = $1', [req.user.id]);
      if (eResult.rows.length === 0) return res.json({ success: true, claims: [], total: 0 });
      params.push(eResult.rows[0].id);
      conditions.push(`m.employer_id = $${params.length}`);
    }

    if (member_id && req.user.role !== 'member') {
      params.push(member_id);
      conditions.push(`c.member_id = $${params.length}`);
    }

    if (dentist_id) {
      params.push(dentist_id);
      conditions.push(`c.dentist_id = $${params.length}`);
    }

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT c.*,
              mu.first_name AS member_first_name, mu.last_name AS member_last_name,
              mem.member_id AS member_number,
              d.practice_name AS dentist_practice,
              du.first_name AS dentist_first_name, du.last_name AS dentist_last_name,
              p.name AS plan_name
       FROM claims c
       JOIN members mem ON mem.id = c.member_id
       JOIN users mu ON mu.id = mem.user_id
       LEFT JOIN dentists d ON d.id = c.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN plans p ON p.id = c.plan_id
       ${whereClause}
       ORDER BY c.submission_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM claims c
       JOIN members mem ON mem.id = c.member_id
       ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      claims: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id – get claim detail with line items
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const claimResult = await query(
      `SELECT c.*,
              mu.first_name AS member_first_name, mu.last_name AS member_last_name,
              mu.email AS member_email, mem.member_id AS member_number,
              d.practice_name AS dentist_practice, d.address_line1 AS dentist_address,
              d.city AS dentist_city, d.state AS dentist_state,
              du.first_name AS dentist_first_name, du.last_name AS dentist_last_name,
              p.name AS plan_name
       FROM claims c
       JOIN members mem ON mem.id = c.member_id
       JOIN users mu ON mu.id = mem.user_id
       LEFT JOIN dentists d ON d.id = c.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       LEFT JOIN plans p ON p.id = c.plan_id
       WHERE c.id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = claimResult.rows[0];

    // Access control
    if (req.user.role === 'member') {
      const mCheck = await query('SELECT id FROM members WHERE id = $1 AND user_id = $2', [claim.member_id, req.user.id]);
      if (mCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Access denied' });
    } else if (req.user.role === 'dentist') {
      const dCheck = await query('SELECT id FROM dentists WHERE id = $1 AND user_id = $2', [claim.dentist_id, req.user.id]);
      if (dCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const lineItemsResult = await query(
      'SELECT * FROM claim_line_items WHERE claim_id = $1 ORDER BY created_at',
      [id]
    );

    return res.json({ success: true, claim, line_items: lineItemsResult.rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / – submit new claim with instant adjudication
// ---------------------------------------------------------------------------
router.post(
  '/',
  requireRole('dentist', 'admin'),
  [
    body('member_id').isUUID(),
    body('dentist_id').isUUID(),
    body('service_date').isISO8601(),
    body('line_items').isArray({ min: 1 }),
    body('line_items.*.procedure_code').notEmpty(),
    body('line_items.*.billed_amount').isFloat({ min: 0.01 }),
    body('line_items.*.category').isIn(['preventive', 'basic', 'major', 'orthodontic']),
  ],
  async (req, res, next) => {
    const client = await getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { member_id, dentist_id, service_date, line_items, notes } = req.body;

      // Fetch member + plan
      const memberResult = await client.query(
        `SELECT m.*, p.* AS plan,
                p.id AS plan_id, p.name AS plan_name,
                p.annual_maximum, p.deductible_individual, p.deductible_family,
                p.coverage_preventive, p.coverage_basic, p.coverage_major, p.coverage_orthodontic,
                p.orthodontic_lifetime_max, p.waiting_period_basic, p.waiting_period_major
         FROM members m
         JOIN plans p ON p.id = m.plan_id
         WHERE m.id = $1`,
        [member_id]
      );

      if (memberResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Member not found or not enrolled in a plan' });
      }

      const memberRow = memberResult.rows[0];

      // Run adjudication
      const adjResult = calculateClaimAdjudication(
        { service_date },
        line_items,
        memberRow, // plan fields are on the same row due to the join
        memberRow
      );

      const totalBilled = line_items.reduce((s, li) => s + parseFloat(li.billed_amount) * (li.quantity || 1), 0);
      const claimNumber = generateClaimNumber();

      await client.query('BEGIN');

      const claimRes = await client.query(
        `INSERT INTO claims (claim_number, member_id, dentist_id, plan_id, service_date,
           status, total_billed, allowed_amount, plan_paid, member_responsibility,
           deductible_applied, adjudication_reason, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [claimNumber, member_id, dentist_id, memberRow.plan_id, service_date,
          adjResult.status, totalBilled.toFixed(2), adjResult.allowed_amount,
          adjResult.plan_paid, adjResult.member_responsibility,
          adjResult.deductible_applied, adjResult.adjudication_reason, notes || null]
      );

      const claim = claimRes.rows[0];

      // Insert line items
      for (let i = 0; i < line_items.length; i++) {
        const li = line_items[i];
        const lr = adjResult.line_item_results[i] || {};

        await client.query(
          `INSERT INTO claim_line_items (claim_id, procedure_code, procedure_description,
             tooth_number, surface, quantity, billed_amount, allowed_amount,
             plan_paid, member_responsibility, category)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [claim.id, li.procedure_code, li.procedure_description || null,
            li.tooth_number || null, li.surface || null, li.quantity || 1,
            li.billed_amount, lr.allowed_amount ?? li.billed_amount,
            lr.plan_paid ?? 0, lr.member_responsibility ?? li.billed_amount, li.category]
        );
      }

      // Update member's annual maximum used and deductible met
      await client.query(
        `UPDATE members SET
           annual_maximum_used = annual_maximum_used + $1,
           annual_deductible_met = LEAST(annual_deductible_met + $2, $3)
         WHERE id = $4`,
        [adjResult.plan_paid, adjResult.deductible_applied,
          memberRow.deductible_individual, member_id]
      );

      await client.query('COMMIT');

      // Notify member and dentist
      const io = req.app.get('io');

      // Get member user_id
      const mUser = await query('SELECT user_id FROM members WHERE id = $1', [member_id]);
      // Get dentist user_id
      const dUser = await query('SELECT user_id FROM dentists WHERE id = $1', [dentist_id]);

      const notifType = adjResult.status === 'denied' ? 'claim_denied'
        : adjResult.status === 'partial' ? 'claim_partial'
        : 'claim_approved';

      if (mUser.rows.length > 0) {
        await createNotification(
          mUser.rows[0].user_id,
          notifType,
          `Claim ${adjResult.status === 'denied' ? 'Denied' : 'Approved'}`,
          `Claim ${claimNumber}: Plan paid $${adjResult.plan_paid.toFixed(2)}, your responsibility $${adjResult.member_responsibility.toFixed(2)}.`,
          { claim_id: claim.id, claim_number: claimNumber },
          io
        );
      }

      if (dUser.rows.length > 0) {
        await createNotification(
          dUser.rows[0].user_id,
          notifType,
          'Claim Adjudicated',
          `Claim ${claimNumber} adjudicated. Status: ${adjResult.status}. Amount owed: $${adjResult.plan_paid.toFixed(2)}.`,
          { claim_id: claim.id, claim_number: claimNumber },
          io
        );
      }

      // Emit socket event
      if (io) {
        io.emit('claim_adjudicated', {
          claim_id: claim.id,
          claim_number: claimNumber,
          status: adjResult.status,
          plan_paid: adjResult.plan_paid,
          member_responsibility: adjResult.member_responsibility,
        });
      }

      return res.status(201).json({
        success: true,
        claim,
        adjudication: adjResult,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      return next(err);
    } finally {
      client.release();
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /:id/status – update claim status (admin)
// ---------------------------------------------------------------------------
router.put('/:id/status', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'approved', 'partial', 'denied', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await query(
      `UPDATE claims SET
         status = $1,
         notes = COALESCE($2, notes),
         paid_date = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_date END,
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    return res.json({ success: true, claim: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/estimate – pre-estimate (same adjudication logic, no save)
// ---------------------------------------------------------------------------
router.get('/:id/estimate', async (req, res, next) => {
  try {
    // :id here is the member_id for estimation
    const { member_id } = req.query;
    const targetMemberId = member_id || req.params.id;

    const { line_items: rawItems, service_date } = req.query;

    if (!rawItems) {
      return res.status(400).json({ success: false, error: 'line_items query param required as JSON string' });
    }

    let lineItems;
    try {
      lineItems = JSON.parse(rawItems);
    } catch {
      return res.status(400).json({ success: false, error: 'line_items must be valid JSON' });
    }

    const memberResult = await query(
      `SELECT m.*, p.id AS plan_id, p.annual_maximum, p.deductible_individual,
              p.coverage_preventive, p.coverage_basic, p.coverage_major,
              p.coverage_orthodontic, p.orthodontic_lifetime_max,
              p.waiting_period_basic, p.waiting_period_major
       FROM members m
       JOIN plans p ON p.id = m.plan_id
       WHERE m.id = $1`,
      [targetMemberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const memberRow = memberResult.rows[0];

    const estimate = calculateClaimAdjudication(
      { service_date: service_date || new Date().toISOString().split('T')[0] },
      lineItems,
      memberRow,
      memberRow
    );

    return res.json({ success: true, estimate, member_id: targetMemberId });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
