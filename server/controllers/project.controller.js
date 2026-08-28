const Project = require('../models/Project');
const projectExcelParser = require('../services/projectExcelParser.service');
const fs = require('fs');

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const PARSER_ERROR_CODES = ['INVALID_HEADERS', 'EMPTY_FILE', 'CORRUPTED_FILE'];

// Flags, in place, every valid record whose exact (Year, Brand, Category,
// Department, Month, Task Name) combination already exists in the database -
// distinct from the parser's own isDuplicate, which only catches repeats
// within the uploaded file itself. Uploads are additive now (see
// uploadProjects below), so a row can be a "new" duplicate of something
// saved by an earlier, unrelated upload, not just of another row in this one.
const markExistingDuplicates = async (records) => {
  const validRecords = records.filter((r) => r.valid);
  if (validRecords.length === 0) return;

  const existing = await Project.find({}, 'year brand category department month taskName').lean();
  const existingKeys = new Set(existing.map((p) => projectExcelParser.buildDedupeKey(p)));

  validRecords.forEach((r) => {
    r.existsInDatabase = existingKeys.has(projectExcelParser.buildDedupeKey(r));
  });
};

// Parses the uploaded file and returns the full preview (valid + invalid
// rows, in-file duplicate flags, and now also which valid rows already exist
// in the database) without touching the DB, so the client can show the user
// exactly what will be added before they confirm.
exports.previewProjects = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { records, invalidCount, duplicateCount } = projectExcelParser.parseProjectsExcel(req.file.path);
    await markExistingDuplicates(records);
    const existingDuplicateCount = records.filter((r) => r.existsInDatabase).length;
    res.status(200).json({ records, invalidCount, duplicateCount, existingDuplicateCount });
  } catch (error) {
    const status = PARSER_ERROR_CODES.includes(error.code) ? 400 : 500;
    res.status(status).json({ message: error.message });
  } finally {
    cleanupFile(req.file.path);
  }
};

// Additive save: existing project records are never deleted or modified.
// Only fully valid rows are persisted, and among those, only rows whose
// exact field combination isn't already saved - so re-uploading a sheet (or
// uploading one that overlaps a prior upload) adds what's new instead of
// creating duplicate entries or wiping unrelated prior data.
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

    await markExistingDuplicates(records);
    const newRecords = validRecords.filter((r) => !r.existsInDatabase);
    const existingDuplicateCount = validRecords.length - newRecords.length;

    if (newRecords.length === 0) {
      return res.status(400).json({
        message: `No new project records to add - all ${existingDuplicateCount} valid row(s) already exist in the database.`,
      });
    }

    await Project.insertMany(newRecords);

    res.status(200).json({
      message: `Added ${newRecords.length} new project record(s). ${existingDuplicateCount} already existed and were skipped. ${invalidCount} invalid row(s) were skipped.`,
      count: newRecords.length,
      existingDuplicateCount,
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
