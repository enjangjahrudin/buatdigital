const adminService = require('../services/adminService');

function requireAdminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;

  if (!token || !adminService.verifySession(token)) {
    return res.status(403).json({
      error: 'ADMIN_UNAUTHORIZED',
      message: 'Akses ditolak. Silakan login sebagai admin terlebih dahulu.'
    });
  }

  next();
}

module.exports = {
  requireAdminAuth
};
