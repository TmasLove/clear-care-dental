'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / – list payments
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { dentist_id, claim_id, payment_status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    // Dentists only see their own payments
    if (req.user.role === 'dentist') {
      const dResult = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
      if (dResult.rows.length === 0) return res.json({ success: true, payments: [], total: 0 });
      params.push(dResult.rows[0].id);
      conditions.push(`pay.dentist_id = $${params.length}`);
    } else if (dentist_id) {
      params.push(dentist_id);
      conditions.push(`pay.dentist_id = $${params.length}`);
    }

    if (claim_id) {
      params.push(claim_id);
      conditions.push(`pay.claim_id = $${params.length}`);
    }

    if (payment_status) {
      params.push(payment_status);
      conditions.push(`pay.payment_status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT pay.*,
              c.claim_number, c.service_date, c.total_billed,
              du.first_name AS dentist_first_name, du.last_name AS dentist_last_name,
              d.practice_name
       FROM payments pay
       JOIN claims c ON c.id = pay.claim_id
       LEFT JOIN dentists d ON d.id = pay.dentist_id
       LEFT JOIN users du ON du.id = d.user_id
       ${whereClause}
       ORDER BY pay.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM payments pay ${whereClause}`,
      params
    );

    const totalsResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN pay.payment_status = 'completed' THEN pay.amount END), 0) AS total_paid,
         COALESCE(SUM(CASE WHEN pay.payment_status = 'pending' THEN pay.amount END), 0) AS total_pending
       FROM payments pay
       ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      payments: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      totals: totalsResult.rows[0],
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /:claimId/process – process payment for approved claim
// ---------------------------------------------------------------------------
router.post('/:claimId/process', requireRole('admin'), async (req, res, next) => {
  try {
    const { claimId } = req.params;

    // Fetch claim details
    const claimResult = await query(
      `SELECT c.*, d.id AS dentist_id, d.user_id AS dentist_user_id
       FROM claims c
       LEFT JOIN dentists d ON d.id = c.dentist_id
       WHERE c.id = $1`,
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = claimResult.rows[0];

    if (!['approved', 'partial'].includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot process payment for claim with status '${claim.status}'. Claim must be approved or partial.`,
      });
    }

    // Check for existing payment
    const existingPayment = await query(
      `SELECT id, payment_status FROM payments WHERE claim_id = $1 AND payment_status IN ('completed', 'processing')`,
      [claimId]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Payment already exists for this claim',
        payment_id: existingPayment.rows[0].id,
      });
    }

    // Simulate ACH payment processing
    const transactionId = `ACH-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const amount = parseFloat(claim.plan_paid) || 0;

    // Insert payment record as processing
    const paymentResult = await query(
      `INSERT INTO payments (claim_id, dentist_id, amount, payment_method, payment_status, transaction_id)
       VALUES ($1, $2, $3, 'ach', 'processing', $4)
       RETURNING *`,
      [claimId, claim.dentist_id, amount, transactionId]
    );

    const payment = paymentResult.rows[0];

    // Simulate completion (in production, this would be a webhook callback)
    await query(
      `UPDATE payments SET payment_status = 'completed', payment_date = NOW() WHERE id = $1`,
      [payment.id]
    );

    // Mark claim as paid
    await query(
      `UPDATE claims SET status = 'paid', paid_date = NOW(), updated_at = NOW() WHERE id = $1`,
      [claimId]
    );

    const completedPayment = { ...payment, payment_status: 'completed', payment_date: new Date() };

    // Emit socket.io payment event
    const io = req.app.get('io');
    if (io) {
      io.emit('payment_received', {
        payment_id: payment.id,
        claim_id: claimId,
        claim_number: claim.claim_number,
        dentist_id: claim.dentist_id,
        amount,
        transaction_id: transactionId,
      });
    }

    // Notify dentist
    if (claim.dentist_user_id) {
      await createNotification(
        claim.dentist_user_id,
        'payment_received',
        'Payment Received',
        `ACH payment of $${amount.toFixed(2)} for claim ${claim.claim_number} has been processed. Transaction ID: ${transactionId}.`,
        { payment_id: payment.id, claim_id: claimId, transaction_id: transactionId },
        io
      );
    }

    return res.status(201).json({
      success: true,
      payment: completedPayment,
      transaction_id: transactionId,
      amount,
      message: 'ACH payment processed successfully (simulated)',
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
