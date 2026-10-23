// The only Status values a project can have. The uploaded sheet's Status
// column is matched against this list case/whitespace-insensitively; anything
// else is not guessed at or remapped - it's saved as no status and flagged
// in the upload preview (see projectExcelParser.service.js).
const PROJECT_STATUSES = ['Delivered', 'Cancelled', 'Hold', 'Review', 'In Progress', 'Not Started'];

const normalizeStatus = (value) => {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return PROJECT_STATUSES.find((s) => s.toLowerCase() === cleaned) || '';
};

module.exports = { PROJECT_STATUSES, normalizeStatus };
