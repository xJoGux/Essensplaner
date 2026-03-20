const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'essensplaner-secret-key-change-in-production';

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Nicht angemeldet' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiges Token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
