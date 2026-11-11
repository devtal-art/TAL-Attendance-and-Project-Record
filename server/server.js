require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const apiRoutes = require('./routes/api.routes');
const projectsRoutes = require('./routes/projects.routes');
const authRoutes = require('./routes/auth.routes');
const { requireAuth } = require('./middleware/auth');
const User = require('./models/User');
const { parseAllowedOrigins } = require('./utils/corsOrigins');
const fs = require('fs');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

const app = express();

// Middleware
// CLIENT_URL restricts CORS to specific origin(s) (comma-separated) once set,
// e.g. the deployed Vercel URL. Left unset, all origins are allowed - keeps
// local dev and any interim deployment working out of the box. Entries may use
// '*' as a wildcard (see utils/corsOrigins.js).
const originMatchers = parseAllowedOrigins(process.env.CLIENT_URL);
app.use(cors({
  ...(originMatchers.length ? { origin: originMatchers } : {}),
  // Lets the client read the filename of Excel exports downloaded via XHR.
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check - no auth, no DB access, no side effects. Used by Render (or
// any uptime/monitoring check) to confirm the process is up and responsive.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'attendance-and-project-record',
    timestamp: new Date().toISOString(),
  });
});

// Public auth endpoints (login). Everything registered after the requireAuth
// line below needs a valid login token.
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api', requireAuth);
app.use('/api', apiRoutes);
app.use('/api/projects', projectsRoutes);

// Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD when the users
// collection is empty, so a fresh deployment always has a way in.
async function seedAdmin() {
  if ((await User.estimatedDocumentCount()) > 0) return;
  const username = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || !password) {
    console.warn('⚠️  No users exist. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env (or run scripts/createUser.js) so someone can log in.');
    return;
  }
  await User.create({
    username,
    name: 'Administrator',
    role: 'admin',
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log(`👤 Created initial admin user "${username}"`);
}

// Database Connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('FATAL: MONGODB_URI is not set in .env');
  process.exit(1);
}

const mongoOptions = {
  tls: true,
  serverSelectionTimeoutMS: 15000,
  retryWrites: true,
};

console.log('Connecting to MongoDB Atlas...');
mongoose.connect(mongoUri, mongoOptions)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    await seedAdmin();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('   Code:', error.code || 'N/A');
    process.exit(1);
  });
