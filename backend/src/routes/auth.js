'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

const generateToken = (user) =>
  jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const userPublicFields = `
  id, email, role, first_name, last_name, phone,
  avatar_url, is_active, email_verified, created_at
`;

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['employer', 'member', 'dentist']).withMessage('Invalid role'),
    body('first_name').notEmpty().trim(),
    body('last_name').notEmpty().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password, role, first_name, last_name, phone } = req.body;

      // Check duplicate email
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${userPublicFields}`,
        [email, password_hash, role, first_name, last_name, phone || null]
      );

      const user = result.rows[0];
      const token = generateToken(user);

      return res.status(201).json({ success: true, token, user });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      const result = await query(
        `SELECT id, email, password_hash, role, first_name, last_name, phone,
                avatar_url, is_active, email_verified, created_at
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ success: false, error: 'Account deactivated' });
      }

      if (!user.password_hash) {
        return res.status(401).json({ success: false, error: 'Password login not available for this account. Use magic link.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const { password_hash: _ph, ...userPublic } = user;
      const token = generateToken(userPublic);

      return res.json({ success: true, token, user: userPublic });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /magic-link
// ---------------------------------------------------------------------------
router.post(
  '/magic-link',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email } = req.body;

      const result = await query('SELECT id, email, role FROM users WHERE email = $1', [email]);

      // Always respond 200 to avoid email enumeration
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          message: 'If that email exists, a magic link has been sent.',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await query(
        'UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE email = $3',
        [token, expires, email]
      );

      // In production this would call nodemailer. For demo, return the token.
      const magicUrl = `${process.env.APP_URL || 'http://localhost:3001'}/auth/magic?token=${token}`;

      return res.json({
        success: true,
        message: 'Magic link generated (demo mode – token returned in response)',
        magic_link_url: magicUrl,
        token, // exposed for demo/testing only
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /magic-link/verify?token=xxx
// ---------------------------------------------------------------------------
router.get('/magic-link/verify', async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    const result = await query(
      `SELECT ${userPublicFields}
       FROM users
       WHERE magic_link_token = $1 AND magic_link_expires > NOW() AND is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid or expired magic link' });
    }

    const user = result.rows[0];

    // Consume the token
    await query(
      'UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL, email_verified = true WHERE id = $1',
      [user.id]
    );

    const jwtToken = generateToken(user);

    return res.json({ success: true, token: jwtToken, user });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  // JWT is stateless; client must discard the token.
  // If refresh tokens / session table were used, we'd invalidate here.
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ${userPublicFields} FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Attach role-specific profile
    const user = result.rows[0];
    let profile = null;

    if (user.role === 'employer') {
      const ep = await query('SELECT * FROM employers WHERE user_id = $1', [user.id]);
      profile = ep.rows[0] || null;
    } else if (user.role === 'member') {
      const mp = await query(
        `SELECT m.*, p.name as plan_name, p.annual_maximum, p.coverage_preventive,
                p.coverage_basic, p.coverage_major
         FROM members m
         LEFT JOIN plans p ON p.id = m.plan_id
         WHERE m.user_id = $1`,
        [user.id]
      );
      profile = mp.rows[0] || null;
    } else if (user.role === 'dentist') {
      const dp = await query('SELECT * FROM dentists WHERE user_id = $1', [user.id]);
      profile = dp.rows[0] || null;
    }

    return res.json({ success: true, user, profile });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
