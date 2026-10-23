const xlsx = require('xlsx');
const { normalizeStatus } = require('../utils/projectStatuses');

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

// Unlike REQUIRED_FIELDS, a sheet missing these columns is still valid - a
// row simply gets an empty weekNo / no links, same as any already-saved
// project from before this feature existed. Never affects row validity,
// the duplicate key, or anything about the required-field flow above.
const OPTIONAL_HEADER_ALIASES = {
  weekNo: ['week no', 'week no.', 'week number', 'week'],
  links: ['links', 'link'],
  status: ['status'],
};
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

// Strict-duplicate key: exact (case-insensitive) match across every required
// field. Shared by the in-file duplicate check below and by the controller's
// cross-check against what's already saved, so "duplicate" means the same
// thing in both places.
const buildDedupeKey = (record) =>
  REQUIRED_FIELDS.map((field) => String(record[field] ?? '').trim().toLowerCase()).join('|');
exports.buildDedupeKey = buildDedupeKey;

// A Links cell is expected to be one "Label: https://..." pair per line
// (Excel/CSV cells commonly wrap this way via Alt+Enter). Each line is
// parsed independently; a line with no recognizable URL is silently
// skipped rather than rejected, since Links is optional and best-effort.
const URL_PATTERN = /(https?:\/\/\S+)/i;

const parseLinks = (cellValue) => {
  const raw = String(cellValue ?? '');
  if (!raw.trim()) return [];

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(URL_PATTERN);
      if (!match) return null;
      const url = match[1].trim();
      const label = line.slice(0, match.index).replace(/:\s*$/, '').trim() || 'Link';
      return { label, url };
    })
    .filter(Boolean);
};

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

  const optionalFieldToColumnIndex = {};
  Object.keys(OPTIONAL_HEADER_ALIASES).forEach((field) => {
    const aliases = OPTIONAL_HEADER_ALIASES[field];
    const columnIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (columnIndex !== -1) {
      optionalFieldToColumnIndex[field] = columnIndex;
    }
  });

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
      weekNo: 'weekNo' in optionalFieldToColumnIndex ? normalizeValue(row[optionalFieldToColumnIndex.weekNo]) : '',
      links: 'links' in optionalFieldToColumnIndex ? parseLinks(row[optionalFieldToColumnIndex.links]) : [],
    };

    // Status must be one of the six allowed values (see projectStatuses.js).
    // A blank cell is simply "no status"; a non-blank value that isn't one of
    // the six is kept out of the saved record (status stays '') and surfaced
    // via unrecognizedStatus so the preview can flag it. Never affects row
    // validity or the duplicate key.
    const rawStatus = 'status' in optionalFieldToColumnIndex ? normalizeValue(row[optionalFieldToColumnIndex.status]) : '';
    record.status = normalizeStatus(rawStatus);
    record.unrecognizedStatus = rawStatus && !record.status ? rawStatus : '';

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
    const key = buildDedupeKey(record);
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
