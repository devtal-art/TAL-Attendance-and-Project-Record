import { useCallback, useState } from 'react';

// What "Customize view" can switch off, per view. Each view has its own
// sections of toggleable parts (ids match what that view renders) plus the
// shared filter list, and each view remembers its own choices. Project Name
// is locked on wherever it appears: a row with no name can't be identified.
// Search is left out on purpose - it's the one control that's always there.
export const FILTER_FIELDS = [
  { id: 'year', label: 'Year' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'brand', label: 'Brand' },
  { id: 'category', label: 'Category' },
  { id: 'department', label: 'Department' },
  { id: 'status', label: 'Status' },
  { id: 'frequency', label: 'Frequency' },
];

export const VIEW_SECTIONS = {
  table: [
    {
      title: 'Table columns',
      items: [
        { id: 'category', label: 'Category' },
        { id: 'taskName', label: 'Project Name', locked: true },
        { id: 'brand', label: 'Brand' },
        { id: 'department', label: 'Department' },
        { id: 'weekNo', label: 'Week No.' },
        { id: 'monthYear', label: 'Month/Year' },
        { id: 'links', label: 'Links' },
        { id: 'status', label: 'Status' },
        { id: 'frequency', label: 'Frequency' },
      ],
    },
  ],
  // The tree's levels are fixed (Year > Month > Brand > Category); what can
  // be switched off is the detail shown on each project line.
  hierarchy: [
    {
      title: 'Project details',
      items: [
        { id: 'weekNo', label: 'Week No.' },
        { id: 'links', label: 'Links' },
        { id: 'frequency', label: 'Frequency' },
        { id: 'department', label: 'Department' },
      ],
    },
  ],
  compact: [
    {
      title: 'Card columns',
      items: [
        { id: 'taskName', label: 'Project Name', locked: true },
        { id: 'brand', label: 'Brand' },
        { id: 'category', label: 'Category' },
        { id: 'date', label: 'Date' },
        { id: 'frequency', label: 'Frequency' },
        { id: 'workCount', label: 'Work Count' },
      ],
    },
    {
      title: 'Opened card columns',
      items: [
        // Shown in the opened table only By Category (By Task it's the
        // card's title); always on there, but its place and width can change.
        { id: 'projectName', label: 'Project Name', locked: true },
        // Own id (not 'brand') so it toggles apart from the card's Brand column.
        { id: 'occurrenceBrand', label: 'Brand' },
        { id: 'monthYear', label: 'Month/Year' },
        { id: 'weekNo', label: 'Week No.' },
        { id: 'department', label: 'Department' },
        { id: 'status', label: 'Status' },
        { id: 'occurrenceFrequency', label: 'Frequency' },
        { id: 'description', label: 'Description' },
        { id: 'links', label: 'Links' },
      ],
    },
  ],
};

const VIEWS = Object.keys(VIEW_SECTIONS);
const STORAGE_KEY = 'tal.projects.customizeView';
const EMPTY = { hiddenColumns: [], hiddenFilters: [], columnOrder: [], detailOrder: [], wideColumns: [] };

// Table and Compact let the user choose the order of their (first-section)
// columns. Compact's Project Name is pinned as column 1 and can't move.
const orderableIds = (view) => (view === 'table' || view === 'compact' ? VIEW_SECTIONS[view][0].items.map((i) => i.id) : []);
const FIRST_COLUMN = { compact: 'taskName' };
// Same for the opened-card table: Project Name stays right after '#'.
const FIRST_DETAIL_COLUMN = { compact: 'projectName' };
// Compact's opened-card table: its columns can be reordered too (none pinned)
// and each set to single or double width.
const detailIds = (view) => (view === 'compact' ? VIEW_SECTIONS.compact[1].items.map((i) => i.id) : []);

const pick = (value, allowed) => (Array.isArray(value) ? allowed.filter((id) => value.includes(id)) : []);

const hideable = (view) =>
  VIEW_SECTIONS[view].flatMap((s) => s.items).filter((i) => !i.locked).map((i) => i.id);

// A stored order is kept only for ids that exist, each once; any column it
// does not mention is put back at its default position, so a new column
// never vanishes (and e.g. Project Name lands first, not last, in an order
// saved before it existed). Empty (never customised) gives the default order.
const sanitizeOrder = (ids, raw, first) => {
  if (ids.length === 0) return [];
  const given = Array.isArray(raw) ? raw.filter((id, i) => ids.includes(id) && raw.indexOf(id) === i) : [];
  const order = [...given];
  ids.forEach((id, index) => {
    if (!order.includes(id)) order.splice(Math.min(index, order.length), 0, id);
  });
  return first ? [first, ...order.filter((id) => id !== first)] : order;
};

const sanitizeView = (view, raw) => ({
  hiddenColumns: pick(raw?.hiddenColumns, hideable(view)),
  hiddenFilters: pick(raw?.hiddenFilters, FILTER_FIELDS.map((f) => f.id)),
  columnOrder: sanitizeOrder(orderableIds(view), raw?.columnOrder, FIRST_COLUMN[view]),
  detailOrder: sanitizeOrder(detailIds(view), raw?.detailOrder, FIRST_DETAIL_COLUMN[view]),
  wideColumns: pick(raw?.wideColumns, detailIds(view)),
});

// Whatever is stored (an older build, hand-edited, corrupt) is reduced to ids
// that exist today. The first version saved a single flat table-only
// preference ({hiddenColumns, hiddenFilters}); that is read as Table's.
const sanitize = (raw) => {
  const perView = raw && typeof raw === 'object' && !Array.isArray(raw) && !('hiddenColumns' in raw) && !('hiddenFilters' in raw)
    ? raw
    : { table: raw };
  return Object.fromEntries(VIEWS.map((v) => [v, sanitizeView(v, perView?.[v])]));
};

export const DEFAULT_PREFS = sanitize({});

const load = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

const save = (prefs) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked/full: the choice still applies for this visit.
  }
};

// Per-browser preference; works without storage, it just isn't remembered.
// Returns the choices for `view`; toggle/reset act on that view only.
export default function useProjectViewPrefs(view) {
  const [all, setAll] = useState(load);

  const update = useCallback((updater) => {
    setAll((prev) => {
      const next = sanitize({ ...prev, [view]: updater(prev[view]) });
      save(next);
      return next;
    });
  }, [view]);

  const toggle = useCallback(
    (group, id) =>
      update((prev) => ({
        ...prev,
        [group]: prev[group].includes(id) ? prev[group].filter((x) => x !== id) : [...prev[group], id],
      })),
    [update],
  );

  const reset = useCallback(() => update(() => EMPTY), [update]);

  // Puts column `id` at `position` (1-based) among the columns currently
  // shown in `group` (the card columns' 'columnOrder' or the opened card's
  // 'detailOrder'); the ones in between shift by one. Hidden columns keep
  // their slots in the order, so they come back where they were.
  const move = useCallback(
    (id, position, group = 'columnOrder') =>
      update((prev) => {
        const first = (group === 'columnOrder' ? FIRST_COLUMN : FIRST_DETAIL_COLUMN)[view];
        if (id === first) return prev;
        const isShown = (col) => col === first || !prev.hiddenColumns.includes(col);
        const shown = prev[group].filter(isShown).filter((col) => col !== id);
        const floor = first ? 2 : 1;
        const index = Math.min(Math.max(position, floor), shown.length + 1) - 1;
        shown.splice(index, 0, id);
        let next = 0;
        return { ...prev, [group]: prev[group].map((col) => (isShown(col) || col === id ? shown[next++] : col)) };
      }),
    [update, view],
  );

  return { prefs: all[view] || EMPTY, toggle, reset, move };
}
