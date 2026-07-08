const jwt = require('jsonwebtoken');
const { models } = require('../models');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforchatapps');
    const user = await models.User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User associated with token not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT auth error:', error.message);
    return res.status(403).json({ error: 'Token is invalid or expired.' });
  }
}

module.exports = authMiddleware;
