const Project = require('../models/Project');
const projectExcelParser = require('../services/projectExcelParser.service');
const fs = require('fs');

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const PARSER_ERROR_CODES = ['INVALID_HEADERS', 'EMPTY_FILE', 'CORRUPTED_FILE'];

// Replaces the entire dataset with the newly uploaded file's contents - the
// module always reflects a single, most-recently-uploaded workbook.
exports.uploadProjects = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const { records, skippedBlank } = projectExcelParser.parseProjectsExcel(req.file.path);

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid project rows were found in the uploaded file.' });
    }

    await Project.deleteMany({});
    await Project.insertMany(records);

    res.status(200).json({
      message: `Uploaded ${records.length} project record(s). ${skippedBlank} blank row(s) were skipped.`,
      count: records.length,
      skippedBlank,
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

// Updates only the links on a single project - lets users attach reference
// links manually without touching the rest of the record.
exports.updateProjectLinks = async (req, res) => {
  try {
    if (!Array.isArray(req.body.links)) {
      return res.status(400).json({ message: 'links must be an array of strings.' });
    }

    const links = req.body.links
      .filter((link) => typeof link === 'string')
      .map((link) => link.trim())
      .filter(Boolean);

    const project = await Project.findByIdAndUpdate(req.params.id, { links }, { new: true }).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update links', error: error.message });
  }
};
