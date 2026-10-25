import { monthIndex, STATUSES, QUARTERS, getQuarter } from './constants';

// Inverse of the server parser's Links-cell format (one "Label: https://..."
// pair per line) - used by the Export button so a re-uploaded export round
// trips back into the same links, not lost text.
export const formatLinksForExport = (links) =>
  (links || []).map((l) => `${l.label}: ${l.url}`).join('\n');

// Distinct values actually present in the data for a given field - filter
// dropdowns and chart categories are always derived from this, never a
// hardcoded list, since brands/categories/departments/years/months are all
// sheet-defined and vary upload to upload.
export const getUniqueSorted = (records, field) => {
  const values = Array.from(new Set(records.map((r) => r[field]).filter((v) => v !== '' && v != null)));
  if (field === 'month') {
    return values.sort((a, b) => monthIndex(a) - monthIndex(b));
  }
  if (field === 'year') {
    return values.sort((a, b) => Number(a) - Number(b));
  }
  return values.sort((a, b) => String(a).localeCompare(String(b)));
};

export const computeSummaryCounts = (records) => ({
  tasks: records.length,
  years: getUniqueSorted(records, 'year').length,
  brands: getUniqueSorted(records, 'brand').length,
  categories: getUniqueSorted(records, 'category').length,
  departments: getUniqueSorted(records, 'department').length,
  months: getUniqueSorted(records, 'month').length,
});

export const DEFAULT_FILTERS = {
  search: '',
  year: 'All',
  quarter: 'All',
  month: 'All',
  brand: 'All',
  category: 'All',
  department: 'All',
  status: 'All',
};

// Repairs the filters read from a shared/hand-edited URL (see
// lib/useUrlFilters.js). Quarter and Status are fixed lists, so an
// unrecognized value is reset to "All" here; the data-dependent filters
// (year/month/brand/category/department) are repaired by sanitizeFilters
// below once the project data has loaded. Any extra keys on the object
// (e.g. the Projects list's `view`) pass through untouched.
export const validateProjectFilters = (filters) => ({
  ...filters,
  quarter: filters.quarter === 'All' || QUARTERS.includes(filters.quarter) ? filters.quarter : 'All',
  status: filters.status === 'All' || STATUSES.includes(filters.status) ? filters.status : 'All',
});

// Single source of truth for "does this record match this filter value" -
// used by both the flat filterRecords below and the cascading filter option
// logic, so the two never drift into slightly different matching rules.
const matches = (value, filterValue) =>
  filterValue === 'All' || filterValue == null || String(value) === String(filterValue);

export const filterRecords = (records, filters) => {
  const search = (filters.search || '').trim().toLowerCase();
  return records.filter((r) => {
    if (!matches(r.year, filters.year)) return false;
    if (!matches(getQuarter(r.month), filters.quarter)) return false;
    if (!matches(r.month, filters.month)) return false;
    if (!matches(r.brand, filters.brand)) return false;
    if (!matches(r.category, filters.category)) return false;
    if (!matches(r.department, filters.department)) return false;
    if (!matches(r.status ?? '', filters.status)) return false;
    if (search) {
      const haystack = `${r.taskName ?? ''} ${r.brand ?? ''} ${r.category ?? ''} ${r.department ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

// The Project Records hierarchy, fixed: Year -> Month -> Brand -> Category
// -> Project. Department is deliberately not a level - it's metadata shown
// alongside each Project (see HierarchyTree) - but it still narrows/is
// narrowed by every level below, via getCascadingFilterOptions.
export const DEFAULT_HIERARCHY_LEVELS = ['year', 'month', 'brand', 'category'];
const OPTION_KEY_FOR_FIELD = { year: 'years', month: 'months', brand: 'brands', category: 'categories' };

// Each chain field's available options are derived only from its ancestors
// in the Year -> Month -> Brand -> Category chain (e.g. Brand options only
// ever depend on the selected Year + Month, never on Category), which is
// what makes the filters cascade in one direction like the hierarchy tree
// itself. Department sits outside the chain but narrows, and is narrowed
// by, the full chain, since it's a cross-cutting facet rather than a level.
export const getCascadingFilterOptions = (records, filters) => {
  // Quarter, like Department, sits outside the Year -> Month -> Brand ->
  // Category chain but narrows every option below it, so e.g. Month only
  // offers the months of the selected quarter and Year only offers years
  // that actually have records in it.
  const byDepartment = records.filter(
    (r) => matches(r.department, filters.department) && matches(getQuarter(r.month), filters.quarter),
  );
  const byYear = byDepartment.filter((r) => matches(r.year, filters.year));
  const byMonth = byYear.filter((r) => matches(r.month, filters.month));
  const byBrand = byMonth.filter((r) => matches(r.brand, filters.brand));

  const byChain = records.filter(
    (r) =>
      matches(getQuarter(r.month), filters.quarter) &&
      matches(r.year, filters.year) &&
      matches(r.month, filters.month) &&
      matches(r.brand, filters.brand) &&
      matches(r.category, filters.category),
  );

  return {
    years: getUniqueSorted(byDepartment, 'year'),
    months: getUniqueSorted(byYear, 'month'),
    brands: getUniqueSorted(byMonth, 'brand'),
    categories: getUniqueSorted(byBrand, 'category'),
    departments: getUniqueSorted(byChain, 'department'),
    // Status is a fixed list of six, not derived from the data, and a plain
    // flat filter: it doesn't narrow the other dropdowns or get narrowed by
    // them, so sanitizeFilters has nothing to repair for it.
    statuses: STATUSES,
    // Fixed four, always valid, so sanitizeFilters never has to repair it.
    quarters: QUARTERS,
  };
};

const isValidSelection = (options, value) => value === 'All' || options.some((o) => String(o) === String(value));

// Repairs a filters object after any change so a selection that's no longer
// possible (e.g. a Month with no records under the newly-picked Year) gets
// reset to "All" - while a selection that's still valid is left alone.
// Resetting every descendant unconditionally on any parent change would
// throw away a perfectly good Month/Brand/Category pick every time; this
// only clears what's actually gone stale. Chain fields are checked in
// Year -> Month -> Brand -> Category order so each check already sees its
// ancestors' corrected values; Department is checked last against the full
// (now-corrected) chain.
export const sanitizeFilters = (records, filters) => {
  let next = filters;

  DEFAULT_HIERARCHY_LEVELS.forEach((field) => {
    const options = getCascadingFilterOptions(records, next)[OPTION_KEY_FOR_FIELD[field]];
    if (!isValidSelection(options, next[field])) {
      next = { ...next, [field]: 'All' };
    }
  });

  const departmentOptions = getCascadingFilterOptions(records, next).departments;
  if (!isValidSelection(departmentOptions, next.department)) {
    next = { ...next, department: 'All' };
  }

  return next;
};

const compareGroupKeys = (field, a, b) => {
  if (field === 'year') return Number(b) - Number(a);
  if (field === 'month') return monthIndex(a) - monthIndex(b);
  return String(a).localeCompare(String(b));
};

// Nests records by an arbitrary ordered list of fields (default
// Year -> Month -> Brand -> Category), each level sorted for stable,
// predictable rendering. The last field's groups hold the raw project
// records (`tasks`); every other level holds nested nodes (`children`).
// Reordering levelFields changes what's grouped together without any other
// code needing to change.
export const buildHierarchy = (records, levelFields = DEFAULT_HIERARCHY_LEVELS) => {
  const nest = (recs, depth) => {
    const field = levelFields[depth];
    const groups = new Map();
    recs.forEach((record) => {
      const key = record[field];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });

    const entries = Array.from(groups.entries()).sort((a, b) => compareGroupKeys(field, a[0], b[0]));
    const isLeafLevel = depth === levelFields.length - 1;

    return entries.map(([key, groupRecords]) => ({
      key,
      label: String(key),
      taskCount: groupRecords.length,
      ...(isLeafLevel ? { tasks: groupRecords } : { children: nest(groupRecords, depth + 1) }),
    }));
  };

  return nest(records, 0);
};
