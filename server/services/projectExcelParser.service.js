const xlsx = require('xlsx');

// Canonical field -> the header spellings (case/whitespace-insensitive) that
// resolve to it. "category" also accepts "project name" because the sheets
// this module has been given in practice use that header for what is
// semantically a category/grouping ("Social Media", "Brand Material", ...),
// not a project name.
const HEADER_ALIASES = {
  year: ['year', 'years'],
  brand: ['brand', 'brands'],
  category: ['category', 'categories', 'project name', 'project names'],
  department: ['department', 'departments'],
  month: ['month', 'months'],
  taskName: ['task name', 'task names', 'task'],
};
const REQUIRED_FIELDS = Object.keys(HEADER_ALIASES);
const CANONICAL_LABELS = {
  year: 'Year',
  brand: 'Brand',
  category: 'Category',
  department: 'Department',
  month: 'Month',
  taskName: 'Task Name',
};
const INVALID_FORMAT_MESSAGE =
  `Invalid Excel format. Required columns are: ${REQUIRED_FIELDS.map((f) => CANONICAL_LABELS[f]).join(', ')}.`;

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeValue = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

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

  // Resolve each semantic field to the first column whose header matches one
  // of its accepted aliases, so extra/reordered/renamed columns don't break
  // parsing as long as every required field is represented.
  const fieldToColumnIndex = {};
  REQUIRED_FIELDS.forEach((field) => {
    const aliases = HEADER_ALIASES[field];
    const columnIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (columnIndex !== -1) {
      fieldToColumnIndex[field] = columnIndex;
    }
  });

  const missingField = REQUIRED_FIELDS.some((field) => !(field in fieldToColumnIndex));
  if (missingField) {
    throw invalidFormatError();
  }

  const dataRows = rows.slice(1);
  const records = [];

  dataRows.forEach((row, index) => {
    const record = {
      rowNumber: index + 2, // +1 for header row, +1 for 1-based numbering
      year: normalizeValue(row[fieldToColumnIndex.year]),
      brand: normalizeValue(row[fieldToColumnIndex.brand]),
      category: normalizeValue(row[fieldToColumnIndex.category]),
      department: normalizeValue(row[fieldToColumnIndex.department]),
      month: normalizeValue(row[fieldToColumnIndex.month]),
      taskName: normalizeValue(row[fieldToColumnIndex.taskName]),
    };

    const yearNum = parseInt(record.year, 10);
    record.year = Number.isNaN(yearNum) ? record.year : yearNum;

    record.missingFields = REQUIRED_FIELDS.filter((field) => {
      const value = record[field];
      return value === '' || value === null || value === undefined;
    }).map((field) => CANONICAL_LABELS[field]);
    record.valid = record.missingFields.length === 0;
    record.isDuplicate = false;

    records.push(record);
  });

  // Flag exact duplicates (case-insensitive across all fields) among valid
  // records only - review-only, nothing is removed.
  const duplicateGroups = new Map();
  records.forEach((record) => {
    if (!record.valid) return;
    const key = REQUIRED_FIELDS.map((field) => String(record[field]).toLowerCase()).join('|');
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key).push(record);
  });
  duplicateGroups.forEach((group) => {
    if (group.length > 1) {
      group.forEach((record) => { record.isDuplicate = true; });
    }
  });

  const invalidCount = records.filter((r) => !r.valid).length;
  const duplicateCount = records.filter((r) => r.isDuplicate).length;

  return { records, invalidCount, duplicateCount };
};
