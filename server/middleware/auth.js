const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getSecret = () => process.env.JWT_SECRET;

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });

// Rejects any request without a valid Bearer token belonging to an active
// user. On success the user document is attached as req.user.
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, getSecret());
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Account not found or disabled.' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, signToken };
