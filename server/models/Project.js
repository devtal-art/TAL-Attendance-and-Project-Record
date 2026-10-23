const mongoose = require('mongoose');
const { PROJECT_STATUSES } = require('../utils/projectStatuses');

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
  // Both optional and additive: sheets uploaded before this feature existed
  // have neither field, and existing saved documents are never touched to
  // backfill them - the frontend treats a missing weekNo/links exactly like
  // an empty one (see ProjectLinks.jsx, ProjectsSimpleTable.jsx).
  weekNo: {
    type: String,
    default: '',
  },
  links: [
    {
      _id: false,
      label: { type: String, required: true },
      url: { type: String, required: true },
    },
  ],
  // Optional like weekNo/links: records saved before this field existed have
  // no status and are left untouched - the frontend reads a missing status
  // the same as ''. Only the six values in projectStatuses.js are allowed.
  status: {
    type: String,
    enum: [...PROJECT_STATUSES, ''],
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema, 'project_tasks');
