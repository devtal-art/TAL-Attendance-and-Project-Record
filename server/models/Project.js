const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  taskName: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema, 'project_tasks');
