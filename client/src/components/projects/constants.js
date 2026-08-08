export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthIndex = (month) => {
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === String(month ?? '').trim().toLowerCase());
  return idx === -1 ? MONTHS.length : idx;
};

const MONTH_FULL_NAMES = {
  Jan: 'January',
  Feb: 'February',
  Mar: 'March',
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
  Oct: 'October',
  Nov: 'November',
  Dec: 'December',
};

export const getFullMonthName = (month) => MONTH_FULL_NAMES[month] || month;

export const UNKNOWN_TAG_COLOR = '#898781';

export const normalizeTagValue = (value) => String(value ?? '').trim();

// Simple deterministic string hash so an arbitrary string always maps to the
// same fallback palette color across renders/sessions.
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

// Fixed categorical order (validated for CVD-safe adjacent contrast) used for
// identity encodings with more than a handful of values, e.g. brand/category,
// and as the fallback ramp for any tag outside a curated palette.
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];

// Generic hash-into-palette color for any free-text tag (brand, category) -
// no curated keyword list, since these values are entirely sheet-defined.
export const getTagColor = (value) => {
  const normalized = normalizeTagValue(value);
  if (!normalized) return UNKNOWN_TAG_COLOR;
  return CATEGORICAL_PALETTE[hashString(normalized.toLowerCase()) % CATEGORICAL_PALETTE.length];
};

export const getTagChipStyle = (value) => {
  const color = getTagColor(value);
  return { backgroundColor: `${color}1f`, color };
};

// Brand names are shown as plain neutral tags rather than the categorical
// palette - a category can list a dozen+ brands at once, so color-coding
// them adds visual noise without conveying anything (unlike department,
// where the palette distinguishes a handful of recurring team names). Text
// is a dark neutral gray for strong legibility, kept hue-free (not part of
// the categorical palette) so it still reads as a reference list rather
// than competing with the Category/Department pills.
export const BRAND_CHIP_STYLE = { backgroundColor: '#e5e3da', color: '#33322d' };

// Departments are free text on the sheet, but "Dev", "Des" and combined
// forms like "Des + Dev" show up constantly, so they get fixed colors - blue
// for dev work, green for design work, red for anything crossing both teams
// (a signal it needs coordination). Anything else falls back to the same
// deterministic palette hashing used for generic tags above.
const DEPARTMENT_COLORS = {
  Dev: '#2a78d6',
  Des: '#0ca30c',
  'Des + Dev': '#d03b3b',
  'Dev + Des': '#d03b3b',
};

const findKnownDepartment = (department) => {
  const normalized = normalizeTagValue(department).toLowerCase();
  return Object.keys(DEPARTMENT_COLORS).find((d) => d.toLowerCase() === normalized);
};

export const getDepartmentColor = (department) => {
  const known = findKnownDepartment(department);
  if (known) return DEPARTMENT_COLORS[known];
  return getTagColor(department);
};

// Light tinted background + solid text, both derived from the same color, so
// department chips read as a coherent color-coded set instead of flat gray.
export const getDepartmentChipStyle = (department) => {
  const color = getDepartmentColor(department);
  return { backgroundColor: `${color}1f`, color };
};
