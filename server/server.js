require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');
const projectsRoutes = require('./routes/projects.routes');
const fs = require('fs');

const app = express();

// Middleware
// CLIENT_URL restricts CORS to specific origin(s) (comma-separated) once set,
// e.g. the deployed Vercel URL. Left unset, all origins are allowed - keeps
// local dev and any interim deployment working out of the box.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Routes
app.use('/api', apiRoutes);
app.use('/api/projects', projectsRoutes);

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
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
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
