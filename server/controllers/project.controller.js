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
//
// Also returns the Status backfill plan: for an existing match whose saved
// status is blank (every project from before Status existed) and whose
// uploaded row carries a status, that one blank field is the only thing an
// upload may ever change on an existing project. A saved status is never
// overwritten, and the matching record is flagged updatesExistingStatus so
// the preview can say so.
const markExistingDuplicates = async (records) => {
  const validRecords = records.filter((r) => r.valid);
  if (validRecords.length === 0) return [];

  const existing = await Project.find({}, 'year brand category department month taskName status').lean();
  const existingByKey = new Map();
  existing.forEach((p) => {
    const key = projectExcelParser.buildDedupeKey(p);
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key).push(p);
  });

  const claimedIds = new Set();
  const statusUpdates = [];

  validRecords.forEach((r) => {
    const matches = existingByKey.get(projectExcelParser.buildDedupeKey(r));
    r.existsInDatabase = !!matches;
    if (!matches || !r.status) return;

    const blanks = matches.filter((p) => !p.status && !claimedIds.has(String(p._id)));
    if (blanks.length === 0) return;

    r.updatesExistingStatus = true;
    blanks.forEach((p) => {
      claimedIds.add(String(p._id));
      statusUpdates.push({ id: p._id, status: r.status });
    });
  });

  return statusUpdates;
};

const countUnrecognizedStatus = (records) => records.filter((r) => r.valid && r.unrecognizedStatus).length;

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
    const statusUpdateCount = records.filter((r) => r.updatesExistingStatus).length;
    const unrecognizedStatusCount = countUnrecognizedStatus(records);
    res.status(200).json({ records, invalidCount, duplicateCount, existingDuplicateCount, statusUpdateCount, unrecognizedStatusCount });
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

    const statusUpdates = await markExistingDuplicates(records);
    const newRecords = validRecords.filter((r) => !r.existsInDatabase);
    const existingDuplicateCount = validRecords.length - newRecords.length;
    const unrecognizedStatusCount = countUnrecognizedStatus(records);

    if (newRecords.length === 0 && statusUpdates.length === 0) {
      return res.status(400).json({
        message: `No new project records to add - all ${existingDuplicateCount} valid row(s) already exist in the database.`,
      });
    }

    // The filter re-checks that the saved status is still blank at write
    // time, so even a concurrent change can't be overwritten.
    let statusUpdatedCount = 0;
    if (statusUpdates.length > 0) {
      const result = await Project.bulkWrite(
        statusUpdates.map(({ id, status }) => ({
          updateOne: {
            filter: { _id: id, $or: [{ status: { $exists: false } }, { status: '' }] },
            update: { $set: { status } },
          },
        })),
      );
      statusUpdatedCount = result.modifiedCount || 0;
    }

    if (newRecords.length > 0) {
      await Project.insertMany(newRecords);
    }

    const statusNote = statusUpdatedCount > 0 ? ` Status was filled in for ${statusUpdatedCount} existing project(s) that had none.` : '';
    const unrecognizedNote = unrecognizedStatusCount > 0 ? ` ${unrecognizedStatusCount} row(s) had an unrecognized Status and were saved without one.` : '';

    res.status(200).json({
      message: `Added ${newRecords.length} new project record(s). ${existingDuplicateCount} already existed and were skipped. ${invalidCount} invalid row(s) were skipped.${statusNote}${unrecognizedNote}`,
      count: newRecords.length,
      existingDuplicateCount,
      invalidCount,
      statusUpdatedCount,
      unrecognizedStatusCount,
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
