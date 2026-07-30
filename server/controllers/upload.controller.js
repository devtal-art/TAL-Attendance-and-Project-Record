const Report = require('../models/Report');
const Employee = require('../models/Employee');
const excelParser = require('../services/excelParser.service');
const fs = require('fs');

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Parses and saves a single attendance file, reporting its outcome without
// throwing - callers process a batch and need every file's result, not just
// the first failure.
const processFile = async (file, employeeType, replace) => {
  try {
    const { reportData, employeesData } = excelParser.parseAttendanceReport(file.path);
    reportData.employeeType = employeeType;

    if (employeesData.length === 0) {
      return { fileName: file.originalname, status: 'error', message: 'No employee data found in the workbook or invalid format.' };
    }

    const existingReport = await Report.findOne({
      month: reportData.month,
      year: reportData.year,
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      employeeType: reportData.employeeType
    });

    const employeeTypeLabel = employeeType === 'ACTIVE' ? 'Active Employees' : 'Inactive Employees';

    if (existingReport) {
      if (replace) {
        await Employee.deleteMany({ reportId: existingReport._id });
        await Report.findByIdAndDelete(existingReport._id);
      } else {
        return {
          fileName: file.originalname,
          status: 'duplicate',
          message: `${reportData.month} ${reportData.year} (${employeeTypeLabel}) attendance report already exists.`,
          reportId: existingReport._id
        };
      }
    }

    const newReport = new Report(reportData);
    const savedReport = await newReport.save();

    const employeesToSave = employeesData.map(emp => ({
      ...emp,
      reportId: savedReport._id
    }));
    await Employee.insertMany(employeesToSave);

    return { fileName: file.originalname, status: 'success', report: savedReport };
  } catch (error) {
    return { fileName: file.originalname, status: 'error', message: error.message };
  } finally {
    cleanupFile(file.path);
  }
};

exports.uploadReports = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No file(s) uploaded' });
    }

    const employeeType = (req.body.employeeType || '').toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(employeeType)) {
      req.files.forEach(f => cleanupFile(f.path));
      return res.status(400).json({ message: 'employeeType is required and must be either "ACTIVE" or "INACTIVE".' });
    }

    const replace = req.body.replace === 'true' || req.body.replace === true;

    const results = [];
    for (const file of req.files) {
      results.push(await processFile(file, employeeType, replace));
    }

    const summary = results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, { success: 0, duplicate: 0, error: 0 });
    summary.total = results.length;

    res.status(200).json({
      message: `${summary.success} uploaded, ${summary.duplicate} duplicate(s) skipped, ${summary.error} failed.`,
      summary,
      results
    });
  } catch (error) {
    console.error('Upload Error:', error);
    if (req.files) {
      req.files.forEach(f => cleanupFile(f.path));
    }
    res.status(500).json({ message: 'Failed to process the upload', error: error.message });
  }
};
