'use strict';

const express = require('express');

const { query } = require('../config/database');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Haversine formula – distance in miles between two lat/lng points.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (deg) => (deg * Math.PI) / 180;

// Shared search handler used by GET / and GET /search
const handleDentistSearch = async (req, res, next) => {
  try {
    // Normalise `query` → `q`
    const q = req.query.q || req.query.query;
    const { city, state, specialty, in_network, lat, lng, radius = '25', page = 1, accepting_new_patients } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const conditions = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      const pn = params.length;
      conditions.push(`(d.practice_name ILIKE $${pn} OR u.first_name ILIKE $${pn} OR u.last_name ILIKE $${pn} OR d.specialty ILIKE $${pn})`);
    }
    if (city) { params.push(`%${city}%`); conditions.push(`d.city ILIKE $${params.length}`); }
    if (state) { params.push(state.toUpperCase()); conditions.push(`UPPER(d.state) = $${params.length}`); }
    if (specialty) { params.push(`%${specialty}%`); conditions.push(`d.specialty ILIKE $${params.length}`); }
    if (in_network !== undefined) { params.push(in_network === 'true'); conditions.push(`d.is_in_network = $${params.length}`); }
    if (accepting_new_patients !== undefined) { params.push(accepting_new_patients === 'true'); conditions.push(`d.accepting_new_patients = $${params.length}`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name FROM dentists d JOIN users u ON u.id = d.user_id ${whereClause} ORDER BY d.rating DESC NULLS LAST, d.review_count DESC`,
      params
    );

    let dentists = result.rows;
    if (lat && lng) {
      const userLat = parseFloat(lat), userLng = parseFloat(lng), maxRadius = parseFloat(radius);
      dentists = dentists
        .map((d) => {
          const dist = d.latitude && d.longitude ? haversineDistance(userLat, userLng, parseFloat(d.latitude), parseFloat(d.longitude)) : null;
          return { ...d, distance_miles: dist !== null ? Math.round(dist * 10) / 10 : null };
        })
        .filter((d) => d.distance_miles === null || d.distance_miles <= maxRadius)
        .sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999));
    }

    const total = dentists.length;
    const offset = (parseInt(page, 10) - 1) * limit;
    return res.json({ success: true, dentists: dentists.slice(offset, offset + limit), total, page: parseInt(page, 10), limit });
  } catch (err) { return next(err); }
};

// ---------------------------------------------------------------------------
// GET /search – alias for the main dentist search
// ---------------------------------------------------------------------------
router.get('/search', optionalAuth, handleDentistSearch);

// ---------------------------------------------------------------------------
// GET /nearby – lat/lng proximity search alias
// ---------------------------------------------------------------------------
router.get('/nearby', optionalAuth, handleDentistSearch);

// ---------------------------------------------------------------------------
// GET /me – current dentist's own profile
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, requireRole('dentist', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone
       FROM dentists d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dentist profile not found' });
    }
    return res.json({ success: true, dentist: result.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// PUT /me – update current dentist's profile
// ---------------------------------------------------------------------------
router.put('/me', authenticateToken, requireRole('dentist'), async (req, res, next) => {
  try {
    const dentist = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
    if (dentist.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const id = dentist.rows[0].id;
    const { practice_name, specialty, address_line1, city, state, zip_code, phone, accepting_new_patients, bio } = req.body;
    const result = await query(
      `UPDATE dentists SET practice_name=COALESCE($1,practice_name), specialty=COALESCE($2,specialty),
       address_line1=COALESCE($3,address_line1), city=COALESCE($4,city), state=COALESCE($5,state),
       zip_code=COALESCE($6,zip_code), phone=COALESCE($7,phone),
       accepting_new_patients=COALESCE($8,accepting_new_patients), bio=COALESCE($9,bio)
       WHERE id=$10 RETURNING *`,
      [practice_name, specialty, address_line1, city, state, zip_code, phone, accepting_new_patients, bio, id]
    );
    return res.json({ success: true, dentist: result.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /me/appointments – today's / upcoming appointments
// ---------------------------------------------------------------------------
router.get('/me/appointments', authenticateToken, requireRole('dentist'), async (req, res, next) => {
  try {
    const dentist = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
    if (dentist.rows.length === 0) return res.json({ success: true, appointments: [] });
    const id = dentist.rows[0].id;
    const { from, to, status } = req.query;
    const conditions = ['a.dentist_id = $1'];
    const params = [id];
    if (status) { params.push(status); conditions.push(`a.status = $${params.length}`); }
    if (from) { params.push(from); conditions.push(`a.appointment_date >= $${params.length}`); }
    if (to) { params.push(to); conditions.push(`a.appointment_date <= $${params.length}`); }
    const result = await query(
      `SELECT a.*, u.first_name AS member_first_name, u.last_name AS member_last_name,
              u.email AS member_email, m.member_id
       FROM appointments a
       JOIN members m ON m.id = a.member_id
       JOIN users u ON u.id = m.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.appointment_date ASC LIMIT 50`,
      params
    );
    return res.json({ success: true, appointments: result.rows });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /me/patients – insured patients who visited this dentist
// ---------------------------------------------------------------------------
router.get('/me/patients', authenticateToken, requireRole('dentist'), async (req, res, next) => {
  try {
    const dentist = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
    if (dentist.rows.length === 0) return res.json({ success: true, patients: [] });
    const id = dentist.rows[0].id;
    const result = await query(
      `SELECT DISTINCT m.id, m.member_id, u.first_name, u.last_name, u.email,
              p.name AS plan_name, e.company_name, COUNT(c.id)::int AS total_claims
       FROM claims c
       JOIN members m ON m.id = c.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE c.dentist_id = $1
       GROUP BY m.id, m.member_id, u.first_name, u.last_name, u.email, p.name, e.company_name
       ORDER BY u.last_name, u.first_name`,
      [id]
    );
    return res.json({ success: true, patients: result.rows });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET /me/payments – payment history for current dentist
// ---------------------------------------------------------------------------
router.get('/me/payments', authenticateToken, requireRole('dentist'), async (req, res, next) => {
  try {
    const dentist = await query('SELECT id FROM dentists WHERE user_id = $1', [req.user.id]);
    if (dentist.rows.length === 0) return res.json({ success: true, payments: [], totals: { total_paid: 0, total_pending: 0 } });
    const id = dentist.rows[0].id;
    const { page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;
    const result = await query(
      `SELECT pay.*, c.claim_number, c.service_date, c.total_billed,
              u.first_name AS member_first_name, u.last_name AS member_last_name
       FROM payments pay
       JOIN claims c ON c.id = pay.claim_id
       JOIN members m ON m.id = c.member_id
       JOIN users u ON u.id = m.user_id
       WHERE pay.dentist_id = $1
       ORDER BY pay.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    const totals = await query(
      `SELECT COALESCE(SUM(CASE WHEN payment_status='completed' THEN amount END),0) AS total_paid,
              COALESCE(SUM(CASE WHEN payment_status='pending' THEN amount END),0) AS total_pending
       FROM payments WHERE dentist_id=$1`, [id]
    );
    return res.json({ success: true, payments: result.rows, totals: totals.rows[0] });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// POST /verify-eligibility – look up a member by their member_id string
// ---------------------------------------------------------------------------
router.post('/verify-eligibility', authenticateToken, requireRole('dentist', 'admin'), async (req, res, next) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ success: false, error: 'memberId is required' });
    const result = await query(
      `SELECT m.*, u.first_name, u.last_name, u.email,
              p.name AS plan_name, p.annual_maximum, p.coverage_preventive,
              p.coverage_basic, p.coverage_major, p.coverage_orthodontic,
              p.deductible_individual, e.company_name
       FROM members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE m.member_id = $1`,
      [memberId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    return res.json({ success: true, member: result.rows[0], eligible: true });
  } catch (err) { return next(err); }
});

// ---------------------------------------------------------------------------
// GET / – search dentists
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, handleDentistSearch);

// ---------------------------------------------------------------------------
// GET /:id – get dentist profile
// ---------------------------------------------------------------------------
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone
       FROM dentists d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dentist not found' });
    }

    return res.json({ success: true, dentist: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id – update dentist profile
// ---------------------------------------------------------------------------
router.put('/:id', authenticateToken, requireRole('dentist', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'dentist') {
      const check = await query('SELECT id FROM dentists WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const {
      practice_name, specialty, address_line1, city, state, zip_code,
      latitude, longitude, phone, accepting_new_patients, bio,
    } = req.body;

    const result = await query(
      `UPDATE dentists SET
         practice_name = COALESCE($1, practice_name),
         specialty = COALESCE($2, specialty),
         address_line1 = COALESCE($3, address_line1),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         zip_code = COALESCE($6, zip_code),
         latitude = COALESCE($7, latitude),
         longitude = COALESCE($8, longitude),
         phone = COALESCE($9, phone),
         accepting_new_patients = COALESCE($10, accepting_new_patients),
         bio = COALESCE($11, bio)
       WHERE id = $12
       RETURNING *`,
      [practice_name, specialty, address_line1, city, state, zip_code,
        latitude, longitude, phone, accepting_new_patients, bio, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dentist not found' });
    }

    return res.json({ success: true, dentist: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/appointments – appointments for a dentist
// ---------------------------------------------------------------------------
router.get('/:id/appointments', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from, to, status, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    const conditions = ['a.dentist_id = $1'];
    const params = [id];

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

    const result = await query(
      `SELECT a.*,
              u.first_name AS member_first_name, u.last_name AS member_last_name,
              u.email AS member_email, m.member_id
       FROM appointments a
       JOIN members m ON m.id = a.member_id
       JOIN users u ON u.id = m.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.appointment_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return res.json({ success: true, appointments: result.rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/patients – insured patients
// ---------------------------------------------------------------------------
router.get('/:id/patients', authenticateToken, requireRole('dentist', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'dentist') {
      const check = await query('SELECT id FROM dentists WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const result = await query(
      `SELECT DISTINCT m.id, m.member_id, u.first_name, u.last_name, u.email,
              p.name AS plan_name, e.company_name,
              COUNT(c.id)::int AS total_claims
       FROM claims c
       JOIN members m ON m.id = c.member_id
       JOIN users u ON u.id = m.user_id
       LEFT JOIN plans p ON p.id = m.plan_id
       LEFT JOIN employers e ON e.id = m.employer_id
       WHERE c.dentist_id = $1
       GROUP BY m.id, m.member_id, u.first_name, u.last_name, u.email, p.name, e.company_name
       ORDER BY u.last_name, u.first_name`,
      [id]
    );

    return res.json({ success: true, patients: result.rows });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/payments – payment history for dentist
// ---------------------------------------------------------------------------
router.get('/:id/payments', authenticateToken, requireRole('dentist', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'dentist') {
      const check = await query('SELECT id FROM dentists WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const { page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (parseInt(page, 10) - 1) * limit;

    const result = await query(
      `SELECT pay.*, c.claim_number, c.service_date, c.total_billed
       FROM payments pay
       JOIN claims c ON c.id = pay.claim_id
       WHERE pay.dentist_id = $1
       ORDER BY pay.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const totalsResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount END), 0) AS total_paid,
         COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount END), 0) AS total_pending
       FROM payments WHERE dentist_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      payments: result.rows,
      totals: totalsResult.rows[0],
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
