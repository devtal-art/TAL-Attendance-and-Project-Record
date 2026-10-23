import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '../ui/input';
import { DEFAULT_FILTERS } from './dataUtils';
import { getFullMonthName } from './constants';

const SELECT_CLASS =
  'w-full border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white appearance-none cursor-pointer';

// A select styled as a plain dropdown - the active value is surfaced
// separately as a removable chip (see FilterChip below) rather than an "x"
// overlaid on the control itself, so removal always happens in one place.
// The field label is only shown below lg: once every filter is stacked
// full-width on its own row, "All Years"/"All Months"/etc alone in a select
// isn't enough to tell the fields apart at a glance, so a small caption is
// added there. Desktop keeps the original unlabeled inline row untouched.
function FilterSelect({ label, value, onChange, options, allLabel, getOptionLabel = (o) => o }) {
  return (
    <div className="w-full">
      <label className="block lg:hidden text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative w-full">
        <select className={SELECT_CLASS} value={value} onChange={onChange}>
          <option value="All">{allLabel}</option>
          {options.map((o) => (
            <option key={o} value={o}>{getOptionLabel(o)}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  );
}

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

export default function ProjectsFilters({
  filters,
  onChange,
  years,
  months,
  brands,
  categories,
  departments,
  statuses = [],
  hideBrand = false,
}) {
  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const clear = (key) => () => onChange({ ...filters, [key]: DEFAULT_FILTERS[key] });
  const isFiltered = Object.keys(DEFAULT_FILTERS).some((key) => filters[key] !== DEFAULT_FILTERS[key]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="w-full lg:w-64">
          <label className="block lg:hidden text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search projects..."
              value={filters.search}
              onChange={update('search')}
              className="pl-9 pr-8"
            />
            {filters.search !== DEFAULT_FILTERS.search && (
              <button
                type="button"
                onClick={clear('search')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-1 gap-3 lg:gap-3">
          <FilterSelect label="Year" value={filters.year} onChange={update('year')} options={years} allLabel="All Years" />
          <FilterSelect label="Month" value={filters.month} onChange={update('month')} options={months} allLabel="All Months" getOptionLabel={getFullMonthName} />
          {!hideBrand && (
            <FilterSelect label="Brand" value={filters.brand} onChange={update('brand')} options={brands} allLabel="All Brands" />
          )}
          <FilterSelect label="Category" value={filters.category} onChange={update('category')} options={categories} allLabel="All Categories" />
          <FilterSelect label="Department" value={filters.department} onChange={update('department')} options={departments} allLabel="All Departments" />
          <FilterSelect label="Status" value={filters.status} onChange={update('status')} options={statuses} allLabel="All Statuses" />
        </div>
      </div>

      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 mr-0.5">Active filters:</span>
          {filters.search && <FilterChip label={`"${filters.search}"`} onRemove={clear('search')} />}
          {filters.year !== 'All' && <FilterChip label={filters.year} onRemove={clear('year')} />}
          {filters.month !== 'All' && <FilterChip label={getFullMonthName(filters.month)} onRemove={clear('month')} />}
          {!hideBrand && filters.brand !== 'All' && <FilterChip label={filters.brand} onRemove={clear('brand')} />}
          {filters.category !== 'All' && <FilterChip label={filters.category} onRemove={clear('category')} />}
          {filters.department !== 'All' && <FilterChip label={filters.department} onRemove={clear('department')} />}
          {filters.status !== 'All' && <FilterChip label={filters.status} onRemove={clear('status')} />}
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
