// Create a login user, or reset an existing user's password.
//
//   node scripts/createUser.js <username> <password> [admin|user] [display name]
//
// Example:
//   node scripts/createUser.js neeraj S3curePass! admin "Neeraj"
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const [username, password, role = 'user', ...nameParts] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/createUser.js <username> <password> [admin|user] [display name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  if (!['admin', 'user'].includes(role)) {
    console.error('Role must be "admin" or "user".');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const passwordHash = await bcrypt.hash(password, 12);
  const name = nameParts.join(' ');
  const user = await User.findOneAndUpdate(
    { username: username.toLowerCase() },
    { $set: { passwordHash, role, active: true, ...(name ? { name } : {}) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`✅ User "${user.username}" saved (role: ${user.role}).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
