const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportName: {
    type: String,
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  employeeType: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    required: true,
    default: 'ACTIVE',
    uppercase: true,
  },
  employeeCount: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

reportSchema.index(
  { month: 1, year: 1, startDate: 1, endDate: 1, employeeType: 1 },
  { unique: true }
);

module.exports = mongoose.model('Report', reportSchema, 'attendance_reports');
