import {
  FolderKanban,
  CheckCircle2,
  Loader2,
  Clock,
  PauseCircle,
  Eye,
  XCircle,
  Circle,
} from 'lucide-react';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthIndex = (month) => {
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === String(month ?? '').trim().toLowerCase());
  return idx === -1 ? MONTHS.length : idx;
};

// Well-known statuses get a curated color + icon when the sheet happens to use
// these exact words (case-insensitive). Anything else - the summary cards and
// status chart are driven entirely by whatever status text is actually in the
// uploaded data - falls back to a deterministic palette color + generic icon
// below, so a brand-new status vocabulary is never invisible or unstyled.
export const STATUS_ORDER = ['Completed', 'In Progress', 'Pending', 'Hold', 'Review', 'Cancelled'];

export const STATUS_CONFIG = {
  Completed: { color: '#0ca30c', icon: CheckCircle2 },
  'In Progress': { color: '#2a78d6', icon: Loader2 },
  Pending: { color: '#fab219', icon: Clock },
  Hold: { color: '#ec835a', icon: PauseCircle },
  Review: { color: '#4a3aa7', icon: Eye },
  Cancelled: { color: '#d03b3b', icon: XCircle },
};

export const TOTAL_CARD_ICON = FolderKanban;
export const UNKNOWN_STATUS_COLOR = '#898781';
export const UNKNOWN_STATUS_ICON = Circle;

export const normalizeStatus = (status) => String(status ?? '').trim();

const findKnownStatus = (status) => {
  const normalized = normalizeStatus(status).toLowerCase();
  return STATUS_ORDER.find((s) => s.toLowerCase() === normalized);
};

// Simple deterministic string hash so an arbitrary status string always maps
// to the same fallback palette color across renders/sessions.
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

// Fixed categorical order (validated for CVD-safe adjacent contrast) used for
// identity encodings with more than a handful of values, e.g. brand, and as
// the fallback ramp for statuses outside the well-known vocabulary above.
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

export const getStatusColor = (status) => {
  const known = findKnownStatus(status);
  if (known) return STATUS_CONFIG[known].color;
  const normalized = normalizeStatus(status);
  if (!normalized) return UNKNOWN_STATUS_COLOR;
  return CATEGORICAL_PALETTE[hashString(normalized.toLowerCase()) % CATEGORICAL_PALETTE.length];
};

export const getStatusIcon = (status) => {
  const known = findKnownStatus(status);
  return known ? STATUS_CONFIG[known].icon : UNKNOWN_STATUS_ICON;
};
