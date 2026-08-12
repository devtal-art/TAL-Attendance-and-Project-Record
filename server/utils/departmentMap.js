// Department names come straight from whatever the uploaded Excel sheet
// says, so near-duplicate/legacy labels for the same team pile up over
// time. This maps the deprecated labels onto the canonical department name
// they should be reported under.
const DEPARTMENT_MERGE_MAP = {
  'Visual Design': 'Design',
  'UI/UX': 'Design',
  'Business Management': 'Management',
  'Executive Office': 'Management',
};

const normalizeDepartment = (department) => {
  if (typeof department !== 'string') return department;
  const trimmed = department.trim();
  return DEPARTMENT_MERGE_MAP[trimmed] || department;
};

module.exports = { DEPARTMENT_MERGE_MAP, normalizeDepartment };
