'use strict';

const { query } = require('../config/database');

/**
 * Valid notification types.
 */
const NOTIFICATION_TYPES = [
  'claim_submitted',
  'claim_approved',
  'claim_denied',
  'payment_received',
  'appointment_reminder',
  'plan_update',
  'claim_partial',
  'general',
];

/**
 * Create a notification record and emit it via socket.io.
 *
 * @param {string}  userId  - UUID of the target user
 * @param {string}  type    - one of NOTIFICATION_TYPES
 * @param {string}  title
 * @param {string}  message
 * @param {Object}  [data]  - optional JSONB payload
 * @param {Object}  [io]    - socket.io Server instance (optional)
 * @returns {Object} created notification row
 */
const createNotification = async (userId, type, title, message, data = null, io = null) => {
  if (!NOTIFICATION_TYPES.includes(type)) {
    console.warn(`Unknown notification type: ${type}. Using 'general'.`);
    type = 'general';
  }

  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );

  const notification = result.rows[0];

  // Emit real-time event if socket.io instance is available
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }

  return notification;
};

/**
 * Create notifications for multiple users at once.
 */
const createBulkNotifications = async (notifications, io = null) => {
  const results = [];
  for (const n of notifications) {
    const result = await createNotification(n.userId, n.type, n.title, n.message, n.data, io);
    results.push(result);
  }
  return results;
};

module.exports = { createNotification, createBulkNotifications, NOTIFICATION_TYPES };
