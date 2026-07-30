const xlsx = require('xlsx');

// Canonical header -> model field. Matching is case/whitespace-insensitive so
// "months", " Months ", "MONTHS" etc. all resolve the same way.
const HEADER_TO_FIELD = {
  'months': 'month',
  'years': 'year',
  'brands': 'brand',
  'project name': 'projectName',
  'project status': 'status',
};
const REQUIRED_HEADERS = Object.keys(HEADER_TO_FIELD);
const INVALID_FORMAT_MESSAGE =
  'Invalid Excel format. Required columns are: Months, Years, Brands, Project Name and Project Status.';

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const invalidFormatError = () => {
  const error = new Error(INVALID_FORMAT_MESSAGE);
  error.code = 'INVALID_HEADERS';
  return error;
};

exports.parseProjectsExcel = (filePath) => {
  let workbook;
  try {
    workbook = xlsx.readFile(filePath);
  } catch (err) {
    const error = new Error('The uploaded file could not be read. It may be corrupted or not a valid Excel/CSV file.');
    error.code = 'CORRUPTED_FILE';
    throw error;
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const error = new Error('The uploaded file has no sheets.');
    error.code = 'EMPTY_FILE';
    throw error;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

  if (!rows || rows.length === 0) {
    const error = new Error('The uploaded file is empty.');
    error.code = 'EMPTY_FILE';
    throw error;
  }

  const headerRow = rows[0];
  if (!Array.isArray(headerRow)) {
    throw invalidFormatError();
  }

  const normalizedHeaders = headerRow.map(normalizeHeader);
  const missingHeader = REQUIRED_HEADERS.some((h) => !normalizedHeaders.includes(h));
  if (missingHeader) {
    throw invalidFormatError();
  }

  // Map each expected header to the column index it appears at, so extra /
  // reordered columns in the sheet don't break parsing.
  const fieldToColumnIndex = {};
  normalizedHeaders.forEach((header, index) => {
    const field = HEADER_TO_FIELD[header];
    if (field && !(field in fieldToColumnIndex)) {
      fieldToColumnIndex[field] = index;
    }
  });

  const dataRows = rows.slice(1);
  const records = [];
  let skippedBlank = 0;

  dataRows.forEach((row) => {
    const record = {
      month: String(row[fieldToColumnIndex.month] ?? '').trim(),
      year: String(row[fieldToColumnIndex.year] ?? '').trim(),
      brand: String(row[fieldToColumnIndex.brand] ?? '').trim(),
      projectName: String(row[fieldToColumnIndex.projectName] ?? '').trim(),
      status: String(row[fieldToColumnIndex.status] ?? '').trim(),
    };

    // Skip fully blank rows and rows missing any required cell - a single
    // malformed row (e.g. a merged-cell artifact) must not abort the whole upload.
    const isIncomplete = !record.month || !record.year || !record.brand || !record.projectName || !record.status;
    if (isIncomplete) {
      skippedBlank += 1;
      return;
    }

    const yearNum = parseInt(record.year, 10);
    record.year = Number.isNaN(yearNum) ? record.year : yearNum;

    records.push(record);
  });

  return { records, skippedBlank };
};
