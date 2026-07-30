const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  links: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema, 'project_tasks');
