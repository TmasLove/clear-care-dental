'use strict';

// In-memory JWT blacklist for logout invalidation.
// Tokens are added on logout and checked in authenticateToken middleware.
// Note: this resets on server restart — for persistent revocation use a Redis set.
const tokenBlacklist = new Set();

module.exports = { tokenBlacklist };
