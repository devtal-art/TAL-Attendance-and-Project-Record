// Groups the flat report list into one entry per calendar period, since a
// month can have both an Active and an Inactive report underneath it.
// Shared by Dashboard and Employees so the two pages can't drift. Sorted by
// actual calendar date (newest first) rather than insertion/upload order,
// since reports aren't necessarily uploaded in chronological order (e.g. a
// backfilled earlier month uploaded after later months already exist).
export const buildPeriods = (reports) => {
  const map = new Map();
  reports.forEach((r) => {
    const key = `${r.month}|${r.year}|${r.startDate}|${r.endDate}`;
    if (!map.has(key)) {
      map.set(key, { key, month: r.month, year: r.year, startDate: r.startDate, endDate: r.endDate });
    }
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
};

// Collapses periods into one entry per calendar year, spanning that year's
// earliest report start to its latest report end - used for the "Quick
// select year" shortcut. Shares the same {key, startDate, endDate} shape as
// buildPeriods entries (minus `month`) so it can be fed straight into the
// same onSelectPeriod handler Dashboard/Employees already use for months;
// those handlers only ever read startDate/endDate off the period object.
export const buildYearPeriods = (periods) => {
  const map = new Map();
  periods.forEach((p) => {
    const existing = map.get(p.year);
    if (!existing) {
      map.set(p.year, { key: `year|${p.year}`, year: p.year, startDate: p.startDate, endDate: p.endDate });
      return;
    }
    if (new Date(p.startDate) < new Date(existing.startDate)) existing.startDate = p.startDate;
    if (new Date(p.endDate) > new Date(existing.endDate)) existing.endDate = p.endDate;
  });
  return Array.from(map.values()).sort((a, b) => Number(b.year) - Number(a.year));
};

// 'YYYY-MM-DD' string for a native <input type="date"> from a stored
// "DD Mon YYYY" report date string (e.g. "01 Jun 2026").
export const toDateInputValue = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

// Department + Search are the only remaining facet filters (Location,
// Company and Status were removed from both Dashboard and Employees).
export const DEFAULT_FACET_FILTERS = {
  search: '',
  department: 'All',
};

const matches = (value, filterValue) =>
  filterValue === 'All' || filterValue == null || String(value) === String(filterValue);

export const getUniqueSorted = (employees, field) =>
  Array.from(new Set(employees.map((e) => e[field]).filter((v) => v !== '' && v != null)))
    .sort((a, b) => String(a).localeCompare(String(b)));

export const filterEmployees = (employees, filters) => {
  const search = (filters.search || '').trim().toLowerCase();
  return employees.filter((e) => {
    if (!matches(e.department, filters.department)) return false;
    if (search) {
      const haystack = `${e.employeeName ?? ''} ${e.employeeId ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

// Resets the Department selection to "All" only once it's genuinely no
// longer possible for the current employee set (e.g. the Dashboard's date
// range changed and nobody in that department is left) - a still-valid
// selection is left untouched.
export const sanitizeFacetFilters = (employees, filters) => {
  const options = getUniqueSorted(employees, 'department');
  if (filters.department !== 'All' && !options.includes(filters.department)) {
    return { ...filters, department: 'All' };
  }
  return filters;
};

const parseDurationStr = (str) => {
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
};

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Consolidates every monthly record for the same employee (matched by
// employeeId, which stays stable across uploads while each monthly record
// gets its own _id) into a single summary row - this is the Employees
// screen's default view. OT, Remote Days and Working Hours are totalled
// across every month they have a record for; Name/Department come from
// their most-recently-uploaded record, since those can legitimately change
// over time (e.g. a department transfer).
export const aggregateEmployeesByIdentity = (employees) => {
  const groups = new Map();
  employees.forEach((emp) => {
    const key = emp.employeeId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(emp);
  });

  return Array.from(groups.values()).map((records) => {
    const latest = [...records].sort((a, b) => {
      const aDate = new Date(a.reportId?.startDate || 0);
      const bDate = new Date(b.reportId?.startDate || 0);
      return bDate - aDate;
    })[0];

    const totalOTMinutes = records.reduce((sum, r) => sum + parseDurationStr(r.totalOT), 0);
    const totalWorkMinutes = records.reduce((sum, r) => sum + parseDurationStr(r.totalWorkDuration), 0);
    const totalRemoteDays = records.reduce((sum, r) => sum + (r.remoteDays || 0), 0);

    return {
      _id: latest._id,
      employeeId: latest.employeeId,
      employeeName: latest.employeeName,
      department: latest.department,
      totalOT: formatDuration(totalOTMinutes),
      totalWorkDuration: formatDuration(totalWorkMinutes),
      remoteDays: totalRemoteDays,
      monthsReported: records.length,
    };
  });
};

// Full per-employee aggregation for the Employee Details page. Unlike
// aggregateEmployeesByIdentity (which only totals the 3 fields shown on the
// Employees list), this sums every numeric/duration metric across whatever
// record set is passed in - callers decide the scope (all of an employee's
// records for the default all-time view, or just the records overlapping a
// selected date range) so the details page stays in sync with whatever
// filter was active on the Employees screen when it was opened.
export const aggregateEmployeeDetail = (records) => {
  const sorted = [...records].sort((a, b) => {
    const aDate = new Date(a.reportId?.startDate || 0);
    const bDate = new Date(b.reportId?.startDate || 0);
    return bDate - aDate;
  });
  const latest = sorted[0];

  const sumDuration = (field) => records.reduce((sum, r) => sum + parseDurationStr(r[field]), 0);
  const sumNumber = (field) => records.reduce((sum, r) => sum + (r[field] || 0), 0);

  const totalWorkMins = sumDuration('totalWorkDuration');
  const totalPresentDays = sumNumber('payrollPresentDays');

  return {
    _id: latest._id,
    employeeId: latest.employeeId,
    employeeName: latest.employeeName,
    company: latest.company,
    department: latest.department,
    location: latest.location,
    status: latest.status,
    recordCount: records.length,
    totalWorkDuration: formatDuration(totalWorkMins),
    totalOT: formatDuration(sumDuration('totalOT')),
    totalDurationOT: formatDuration(sumDuration('totalDurationOT')),
    lateBy: formatDuration(sumDuration('lateBy')),
    earlyOut: formatDuration(sumDuration('earlyOut')),
    hourlyLeaves: formatDuration(sumDuration('hourlyLeaves')),
    remoteDays: sumNumber('remoteDays'),
    clockInDays: sumNumber('clockInDays'),
    payrollPresentDays: totalPresentDays,
    absent: sumNumber('absent'),
    remoteHours: sumNumber('remoteHours'),
    weekOff: sumNumber('weekOff'),
    holidays: sumNumber('holidays'),
    leavesTaken: sumNumber('leavesTaken'),
    averageWorkingHours: formatDuration(totalPresentDays ? Math.floor(totalWorkMins / totalPresentDays) : 0),
  };
};

// Client-side mirror of the backend's computeAggregate (report.controller.js)
// - needed because facet filters (Department/Search) narrow the employee
// set in the browser, after the date-range fetch, so the KPI averages/
// charts have to be recomputed from whatever's currently visible rather
// than reusing the server's aggregate for the full unfiltered range.
export const computeAggregate = (employees) => {
  let totalPayrollPresent = 0;
  let totalWorkMins = 0;
  let totalOTMins = 0;
  let totalLateMins = 0;
  let totalRemoteDays = 0;

  employees.forEach((emp) => {
    totalPayrollPresent += emp.payrollPresentDays || 0;
    totalWorkMins += parseDurationStr(emp.totalWorkDuration);
    totalOTMins += parseDurationStr(emp.totalOT);
    totalLateMins += parseDurationStr(emp.lateBy);
    totalRemoteDays += emp.remoteDays || 0;
  });

  const count = employees.length || 1;
  return {
    averagePayrollPresentDays: (totalPayrollPresent / count).toFixed(2),
    averageWorkDuration: formatDuration(Math.floor(totalWorkMins / count)),
    averageOT: formatDuration(Math.floor(totalOTMins / count)),
    averageLateTime: formatDuration(Math.floor(totalLateMins / count)),
    averageRemoteDays: (totalRemoteDays / count).toFixed(2),
    averageWorkingHours: formatDuration(Math.floor((totalWorkMins / count) / (totalPayrollPresent / count || 1))),
  };
};
