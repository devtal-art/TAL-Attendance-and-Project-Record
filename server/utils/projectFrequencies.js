// The only Frequency values a project can have. The uploaded sheet's Frequency
// column is matched against this list ignoring case, spaces and hyphens (so
// "one time" is One-time); anything else is not guessed at or remapped - it's
// saved as no frequency and flagged in the upload preview (see
// projectExcelParser.service.js).
const PROJECT_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'One-time'];

const comparable = (value) => String(value ?? '').toLowerCase().replace(/[\s-]+/g, '');

const normalizeFrequency = (value) => {
  const cleaned = comparable(value);
  return PROJECT_FREQUENCIES.find((f) => comparable(f) === cleaned) || '';
};

module.exports = { PROJECT_FREQUENCIES, normalizeFrequency };
