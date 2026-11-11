const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

// Simple in-memory brute-force guard: max attempts per IP+username within the
// window. Resets on a successful login or when the window passes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

const attemptKey = (req, username) => `${req.ip}|${username}`;

const isLocked = (key) => {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
};

const recordFailure = (key) => {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
};

exports.login = async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const key = attemptKey(req, username);
    if (isLocked(key)) {
      return res.status(429).json({ message: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const user = await User.findOne({ username });
    const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      recordFailure(key);
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    attempts.delete(key);
    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.me = (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};
