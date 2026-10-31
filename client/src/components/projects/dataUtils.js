import { MONTHS, monthIndex, STATUSES, QUARTERS, getQuarter, FREQUENCIES } from './constants';

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
  frequency: 'All',
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
  // Only where the filter exists (the Projects list); other pages' states
  // carry no frequency key and are left that way.
  ...(filters.frequency === undefined ? {} : {
    frequency: filters.frequency === 'All' || FREQUENCIES.includes(filters.frequency) ? filters.frequency : 'All',
  }),
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
    // Frequency is derived (see attachFrequency); pages whose records don't
    // carry it also don't carry the filter.
    if (filters.frequency != null && !matches(r.frequency ?? '', filters.frequency)) return false;
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
    // Fixed five as well, and flat like Status.
    frequencies: FREQUENCIES,
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

// Compact View ---------------------------------------------------------

// A month as a single sortable number (year * 12 + month 0-11), so "the next
// month" is always +1 even across a year boundary (Dec 2025 -> Jan 2026).
// null when the year or month isn't recognizable - those records still count
// and are still listed, they just can't be placed on the timeline.
const periodOf = (record) => {
  const year = Number(record.year);
  const month = monthIndex(record.month);
  return Number.isFinite(year) && month < MONTHS.length ? year * 12 + month : null;
};

const periodLabel = (period) => `${MONTHS[period % 12]} ${Math.floor(period / 12)}`;

// Turns the distinct months a task appeared in (ascending period numbers)
// into its frequency label. Each unbroken run of consecutive months becomes
// "Jan 2026 - May 2026" (or just "Oct 2026" for a single month); runs
// separated by a gap are joined with ", ", e.g.
// "Jan 2026 - May 2026, Oct 2026" = every month Jan-May, nothing Jun-Sep,
// then Oct.
export const formatFrequency = (periods) => {
  if (periods.length === 0) return '';
  const runs = [];
  let start = periods[0];
  let prev = periods[0];
  periods.slice(1).forEach((period) => {
    if (period === prev + 1) {
      prev = period;
      return;
    }
    runs.push([start, prev]);
    start = period;
    prev = period;
  });
  runs.push([start, prev]);
  return runs.map(([from, to]) => (from === to ? periodLabel(from) : `${periodLabel(from)} - ${periodLabel(to)}`)).join(', ');
};

// Same normalization the upload's duplicate check uses (trim + lowercase,
// plus collapsing inner whitespace) so "LitW - BYM and LD" and
// "litw - bym  and ld" are one task.
const normalizePart = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const taskKeyOf = (record) => [record.brand, record.category, record.taskName].map(normalizePart).join('|');

const weekNumber = (record) => {
  const n = parseInt(record.weekNo, 10);
  return Number.isNaN(n) ? Infinity : n;
};

// Collapses the flat record list into one entry per task, where a task is
// the same Brand + Category + Task Name (not Task Name alone: the same name
// is reused across different brands/categories, and those are different
// work). Department and Year are deliberately not part of the key - a task
// can move between e.g. "Des" and "Des + Dev", and a recurring task spans
// years; each occurrence keeps its own department/status/links.
//
// Per task: workCount = every record (a task can repeat several times,
// even weekly, within one month); dateLabel/first/lastPeriod come from the
// distinct months it appears in; occurrences are the records in
// chronological order (month, then week no., then original order).
export const buildCompactTasks = (records) => {
  const groups = new Map();
  records.forEach((record, index) => {
    const key = taskKeyOf(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ record, index, period: periodOf(record) });
  });

  return Array.from(groups.entries()).map(([key, entries]) => {
    const sorted = [...entries].sort(
      (a, b) =>
        (a.period ?? Infinity) - (b.period ?? Infinity) ||
        weekNumber(a.record) - weekNumber(b.record) ||
        a.index - b.index,
    );
    const periods = Array.from(new Set(sorted.map((e) => e.period).filter((p) => p !== null)));
    const first = sorted[0].record;
    return {
      key,
      taskName: first.taskName,
      brand: first.brand,
      category: first.category,
      frequency: first.frequency ?? '',
      workCount: sorted.length,
      occurrences: sorted.map((e) => e.record),
      dateLabel: formatFrequency(periods),
      firstPeriod: periods.length ? periods[0] : null,
      lastPeriod: periods.length ? periods[periods.length - 1] : null,
    };
  });
};

// How often a task recurs - derived, never entered. The sheet has Year,
// Month and an optional Week No. (no day), so the rule works from those,
// over ALL of a task's records (same Brand + Category + Task Name):
//
//   One record -> One-time.
//
//   If the records carry week numbers (at least two, covering half or more
//   of them), the cadence is measured in weeks. A month is NOT a limit: a
//   task done every week can run to 5 or 6 weeks in a calendar month.
//     - on average 2+ records per active week -> Daily
//     - otherwise by the typical (median) gap between its weeks:
//         up to 2.5 weeks  -> Weekly (fortnightly counts)
//         up to 8.5 weeks  -> Monthly
//         up to 32.5 weeks -> Quarterly
//         beyond           -> Yearly
//
//   Otherwise the cadence is measured in months:
//     - on average more than 5 records per active month -> Daily
//     - on average 2-5 per active month                 -> Weekly
//     - else, with 2+ months, by the median gap in months:
//         up to 1.5 -> Monthly, up to 7.5 -> Quarterly, beyond -> Yearly
//     - only one placeable month -> One-time
const MAX_WEEKLY_PER_MONTH = 5;
const WEEK_GAP_LIMITS = [[2.5, 'Weekly'], [8.5, 'Monthly'], [32.5, 'Quarterly']];
const MONTH_GAP_LIMITS = [[1.5, 'Monthly'], [7.5, 'Quarterly']];
const WEEKS_PER_YEAR = 53;

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const frequencyFromGaps = (positions, limits) => {
  const gaps = positions.slice(1).map((p, i) => p - positions[i]);
  const typical = median(gaps);
  const hit = limits.find(([limit]) => typical <= limit);
  return hit ? hit[1] : 'Yearly';
};

// Absolute week position (year * 53 + week no.), or null without a usable
// year / week number.
const weekPeriodOf = (record) => {
  const year = Number(record.year);
  const week = parseInt(record.weekNo, 10);
  return Number.isFinite(year) && !Number.isNaN(week) && week > 0 ? year * WEEKS_PER_YEAR + week : null;
};

export const computeFrequency = (records) => {
  if (records.length <= 1) return 'One-time';

  const weekly = records.map(weekPeriodOf).filter((p) => p !== null);
  if (weekly.length >= 2 && weekly.length * 2 >= records.length) {
    const weeks = Array.from(new Set(weekly)).sort((a, b) => a - b);
    if (weekly.length / weeks.length >= 2) return 'Daily';
    if (weeks.length >= 2) return frequencyFromGaps(weeks, WEEK_GAP_LIMITS);
  }

  const months = records.map(periodOf).filter((p) => p !== null);
  const periods = Array.from(new Set(months)).sort((a, b) => a - b);
  if (periods.length === 0) return 'One-time';
  const perMonth = months.length / periods.length;
  if (perMonth > MAX_WEEKLY_PER_MONTH) return 'Daily';
  if (perMonth >= 2) return 'Weekly';
  if (periods.length < 2) return 'One-time';
  return frequencyFromGaps(periods, MONTH_GAP_LIMITS);
};

// Adds `frequency` to every record. Computed from the full record list the
// caller passes (not a filtered subset), so filtering to one month doesn't
// turn every task into "One-time".
export const attachFrequency = (records) => {
  const groups = new Map();
  records.forEach((record) => {
    const key = taskKeyOf(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });
  const frequencyByKey = new Map();
  groups.forEach((group, key) => frequencyByKey.set(key, computeFrequency(group)));
  return records.map((record) => ({ ...record, frequency: frequencyByKey.get(taskKeyOf(record)) }));
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
