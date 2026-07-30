const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');
const reportController = require('../controllers/report.controller');

// Multer config for file upload - accepts up to 20 files per request
const upload = multer({ dest: 'uploads/' });
const MAX_FILES = 20;

const handleUpload = (req, res, next) => {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: `You can upload a maximum of ${MAX_FILES} files at a time.` });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Upload Route
router.post('/upload', handleUpload, uploadController.uploadReports);

// Report Routes
router.get('/reports', reportController.getReports);
router.get('/reports/monthly-summary', reportController.getMonthlySummary);
router.get('/reports/:id', reportController.getReportById);
router.delete('/reports/:id', reportController.deleteReport);

// Employee Routes
router.get('/employees', reportController.getEmployees);
router.get('/employees/:id/export/month', reportController.exportEmployeeMonth);
router.get('/employees/:id/export/all', reportController.exportEmployeeAll);
router.get('/employees/:id', reportController.getEmployeeById);

module.exports = router;
