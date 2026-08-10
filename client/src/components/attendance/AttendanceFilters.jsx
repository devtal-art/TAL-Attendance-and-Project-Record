import React from 'react';
import { Search, X, ChevronDown, CalendarRange } from 'lucide-react';
import { Input } from '../ui/input';
import { DEFAULT_FACET_FILTERS } from './attendanceUtils';

const SELECT_CLASS =
  'w-full border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white appearance-none cursor-pointer';
const DATE_CLASS =
  'w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium pl-2.5 pr-1.5 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// Department + Search, matching the Project Records filter bar's visual
// language (chevron select, chip row, mobile-only labels with true
// single-column stacking). Kept self-contained rather than sharing
// components with ProjectsFilters.jsx - Attendance and Project Records are
// deliberately independent modules throughout this app.
//
// showDateRange: Dashboard scopes data to a From/To range (server-side,
// merging whichever uploaded report periods it overlaps - see
// attendanceUtils.buildPeriods / the range-summary API), so it always
// renders the date controls with a value. Employees defaults to showing
// every employee's data consolidated into one row (see
// aggregateEmployeesByIdentity) with From/To left empty; picking a date
// there is what switches it into the detailed per-month view, so its date
// fields are optional and removable via dateRangeOptional + onClearDateRange.
export default function AttendanceFilters({
  showDateRange = false,
  dateRangeOptional = false,
  onClearDateRange,
  from,
  to,
  onFromChange,
  onToChange,
  periods,
  onSelectPeriod,
  facetFilters,
  onFacetChange,
  departments,
}) {
  const updateFacet = (key) => (e) => onFacetChange({ ...facetFilters, [key]: e.target.value });
  const clearFacet = (key) => () => onFacetChange({ ...facetFilters, [key]: DEFAULT_FACET_FILTERS[key] });
  const isFacetFiltered = Object.keys(DEFAULT_FACET_FILTERS).some((key) => facetFilters[key] !== DEFAULT_FACET_FILTERS[key]);
  const isDateRangeActive = dateRangeOptional && from && to;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        {showDateRange && (
          <>
            <div className="w-full lg:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                From{dateRangeOptional && <span className="text-gray-400"> (optional)</span>}
              </label>
              <input type="date" className={DATE_CLASS} value={from} max={to || undefined} onChange={(e) => onFromChange(e.target.value)} />
            </div>
            <div className="w-full lg:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                To{dateRangeOptional && <span className="text-gray-400"> (optional)</span>}
              </label>
              <input type="date" className={DATE_CLASS} value={to} min={from || undefined} onChange={(e) => onToChange(e.target.value)} />
            </div>

            <div className="w-full lg:w-56">
              <label className="block text-xs font-medium text-gray-500 mb-1">Quick select month</label>
              <div className="relative w-full">
                <select
                  className={SELECT_CLASS}
                  value=""
                  onChange={(e) => {
                    const period = periods.find((p) => p.key === e.target.value);
                    if (period) onSelectPeriod(period);
                  }}
                >
                  <option value="" disabled>
                    {periods.length ? 'Jump to a month...' : 'No uploaded months'}
                  </option>
                  {periods.map((p) => (
                    <option key={p.key} value={p.key}>{p.month} {p.year}</option>
                  ))}
                </select>
                <CalendarRange className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
          </>
        )}

        <div className="w-full lg:w-64">
          <label className="block lg:hidden text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search employees..."
              value={facetFilters.search}
              onChange={updateFacet('search')}
              className="pl-9 pr-8"
            />
            {facetFilters.search !== DEFAULT_FACET_FILTERS.search && (
              <button
                type="button"
                onClick={clearFacet('search')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full lg:w-64">
          <label className="block lg:hidden text-xs font-medium text-gray-500 mb-1">Department</label>
          <div className="relative w-full">
            <select className={SELECT_CLASS} value={facetFilters.department} onChange={updateFacet('department')}>
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {(isFacetFiltered || isDateRangeActive) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 mr-0.5">Active filters:</span>
          {isDateRangeActive && <FilterChip label={`${from} to ${to}`} onRemove={onClearDateRange} />}
          {facetFilters.search && <FilterChip label={`"${facetFilters.search}"`} onRemove={clearFacet('search')} />}
          {facetFilters.department !== 'All' && <FilterChip label={facetFilters.department} onRemove={clearFacet('department')} />}
          <button
            type="button"
            onClick={() => {
              onFacetChange(DEFAULT_FACET_FILTERS);
              if (isDateRangeActive) onClearDateRange();
            }}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
