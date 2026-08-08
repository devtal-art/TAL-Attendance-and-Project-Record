const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/project.controller');

// Multer config for the Projects upload - a single Excel/CSV file per request,
// independent of the Attendance upload config in api.routes.js.
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls and .csv files are supported.'));
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.post('/preview', handleUpload, projectController.previewProjects);
router.post('/upload', handleUpload, projectController.uploadProjects);
router.get('/', projectController.getProjects);

module.exports = router;
