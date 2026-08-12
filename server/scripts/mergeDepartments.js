// One-off migration: merges legacy/duplicate department labels in the
// attendance_employees collection into their canonical name (see
// ../utils/departmentMap.js). Safe to re-run - once merged, a department
// no longer matches any key in the map, so a second run is a no-op.
require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const { DEPARTMENT_MERGE_MAP } = require('../utils/departmentMap');

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('FATAL: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { tls: true, serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB Atlas.\n');

  let totalChanged = 0;
  for (const [oldName, newName] of Object.entries(DEPARTMENT_MERGE_MAP)) {
    const count = await Employee.countDocuments({ department: oldName });
    if (count === 0) {
      console.log(`"${oldName}" -> "${newName}": 0 records, skipping.`);
      continue;
    }
    const result = await Employee.updateMany({ department: oldName }, { $set: { department: newName } });
    console.log(`"${oldName}" -> "${newName}": ${result.modifiedCount}/${count} records updated.`);
    totalChanged += result.modifiedCount;
  }

  console.log(`\nDone. ${totalChanged} record(s) changed.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
