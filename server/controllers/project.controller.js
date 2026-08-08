const Project = require('../models/Project');
const projectExcelParser = require('../services/projectExcelParser.service');
const fs = require('fs');

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const PARSER_ERROR_CODES = ['INVALID_HEADERS', 'EMPTY_FILE', 'CORRUPTED_FILE'];

// Parses the uploaded file and returns the full preview (valid + invalid rows,
// duplicate flags) without touching the DB, so the client can show the user
// what will be saved before they confirm.
exports.previewProjects = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { records, invalidCount, duplicateCount } = projectExcelParser.parseProjectsExcel(req.file.path);
    res.status(200).json({ records, invalidCount, duplicateCount });
  } catch (error) {
    const status = PARSER_ERROR_CODES.includes(error.code) ? 400 : 500;
    res.status(status).json({ message: error.message });
  } finally {
    cleanupFile(req.file.path);
  }
};

// Replaces the entire dataset with the newly uploaded file's contents - the
// module always reflects a single, most-recently-uploaded workbook. Only
// fully valid rows (all required fields present) are persisted.
exports.uploadProjects = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { records, invalidCount } = projectExcelParser.parseProjectsExcel(req.file.path);
    const validRecords = records.filter((r) => r.valid);

    if (validRecords.length === 0) {
      return res.status(400).json({ message: 'No valid project rows were found in the uploaded file.' });
    }

    await Project.deleteMany({});
    await Project.insertMany(validRecords);

    res.status(200).json({
      message: `Uploaded ${validRecords.length} project record(s). ${invalidCount} invalid row(s) were skipped.`,
      count: validRecords.length,
      invalidCount,
    });
  } catch (error) {
    const status = PARSER_ERROR_CODES.includes(error.code) ? 400 : 500;
    res.status(status).json({ message: error.message });
  } finally {
    cleanupFile(req.file.path);
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
};
