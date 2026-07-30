const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
  },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  company: { type: String, required: true },

  // Metrics
  totalWorkDuration: { type: String, default: '00:00' },
  totalOT: { type: String, default: '00:00' },
  totalDurationOT: { type: String, default: '00:00' },
  lateBy: { type: String, default: '00:00' },
  remoteDays: { type: Number, default: 0 },
  clockInDays: { type: Number, default: 0 },
  payrollPresentDays: { type: Number, default: 0 },
  absent: { type: Number, default: 0 },
  earlyOut: { type: String, default: '00:00' },
  remoteHours: { type: Number, default: 0 },
  weekOff: { type: Number, default: 0 },
  holidays: { type: Number, default: 0 },
  hourlyLeaves: { type: String, default: '00:00' },
  leavesTaken: { type: Number, default: 0 },
  averageWorkingHours: { type: String, default: '00:00' }
});

module.exports = mongoose.model('Employee', employeeSchema, 'attendance_employees');
