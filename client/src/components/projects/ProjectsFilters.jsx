import React, { useEffect, useId, useRef, useState } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { Input } from '../ui/input';
import { DEFAULT_FILTERS } from './dataUtils';
import { getFullMonthName, getQuarterLabel } from './constants';

// A rounded "pill" with the field name inline ("Year  All Years") that opens
// a styled list. It replaces the browser's native <select> popup, which
// can't be styled and looks different on every OS. Behaves like a standard
// select-only combobox: click/Enter/Space/arrows open it, arrows/Home/End/
// first-letter move through the options, Enter/Space picks, Escape/Tab/
// outside click close. onChange receives { target: { value } } like a native
// change event, so callers are unchanged. The active value is also surfaced
// as a removable chip (see FilterChip below).
function FilterSelect({ label, value, onChange, options, allLabel, getOptionLabel = (o) => o }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const items = [{ value: 'All', text: allLabel }, ...options.map((o) => ({ value: String(o), text: getOptionLabel(o) }))];
  const selectedIndex = Math.max(0, items.findIndex((i) => i.value === String(value)));
  const current = items[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const pick = (index) => {
    setOpen(false);
    if (items[index].value !== String(value)) onChange({ target: { value: items[index].value } });
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1) {
      const letter = e.key.toLowerCase();
      const from = items.findIndex((item, i) => i > active && item.text.toLowerCase().startsWith(letter));
      const found = from !== -1 ? from : items.findIndex((item) => item.text.toLowerCase().startsWith(letter));
      if (found !== -1) setActive(found);
    }
  };

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current.text}`}
        data-value={items[selectedIndex].value}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`relative flex h-10 w-full min-w-0 items-center gap-2 rounded-full border bg-white pl-4 pr-9 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="shrink-0 text-xs font-medium text-slate-500">{label}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{current.text}</span>
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-2 max-h-72 w-max min-w-full max-w-[22rem] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {items.map((item, i) => {
            const selected = i === selectedIndex;
            return (
              <li
                key={item.value}
                role="option"
                aria-selected={selected}
                data-value={item.value}
                // mousedown would move focus off the trigger before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm ${
                  i === active ? 'bg-slate-100' : ''
                } ${selected ? 'font-semibold text-primary' : 'text-slate-700'}`}
              >
                <span className="truncate">{item.text}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// A titled cluster of related filters. Its pills share equal-width columns
// (one per visible pill, side by side from sm up), and on wide screens the
// groups' widths are proportional to their pill counts (see the grid in
// ProjectsFilters), so every pill on the panel ends up the same width and the
// groups line up in one tidy row.
function FilterGroup({ title, dotClass, tintClass, count, children }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${tintClass}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {title}
      </div>
      <div
        className="grid grid-cols-1 gap-2 sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
        style={{ '--n': count }}
      >
        {children}
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
  quarters = [],
  months,
  brands,
  categories,
  departments,
  statuses = [],
  frequencies = [],
  hideBrand = false,
  hiddenFilters = [],
}) {
  const shown = (key) => !hiddenFilters.includes(key);
  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const clear = (key) => () => onChange({ ...filters, [key]: DEFAULT_FILTERS[key] });
  // `?? default`: a page whose filter state has no key for a filter (the
  // dashboard has no Frequency) counts as unfiltered for it.
  const isFiltered = Object.keys(DEFAULT_FILTERS).some((key) => (filters[key] ?? DEFAULT_FILTERS[key]) !== DEFAULT_FILTERS[key]);

  // Only the filters this page offers and the user hasn't hidden; a group
  // with none left is dropped, and the rest share the row.
  const groups = [
    {
      title: 'Period',
      dotClass: 'bg-blue-500',
      tintClass: 'border-blue-100 bg-blue-50/70',
      items: [
        shown('year') && <FilterSelect key="year" label="Year" value={filters.year} onChange={update('year')} options={years} allLabel="All Years" />,
        shown('quarter') && <FilterSelect key="quarter" label="Quarter" value={filters.quarter} onChange={update('quarter')} options={quarters} allLabel="All Quarters" getOptionLabel={getQuarterLabel} />,
        shown('month') && <FilterSelect key="month" label="Month" value={filters.month} onChange={update('month')} options={months} allLabel="All Months" getOptionLabel={getFullMonthName} />,
      ],
    },
    {
      title: 'Project',
      dotClass: 'bg-green-500',
      tintClass: 'border-green-100 bg-green-50/70',
      items: [
        !hideBrand && shown('brand') && <FilterSelect key="brand" label="Brand" value={filters.brand} onChange={update('brand')} options={brands} allLabel="All Brands" />,
        shown('category') && <FilterSelect key="category" label="Category" value={filters.category} onChange={update('category')} options={categories} allLabel="All Categories" />,
        shown('department') && <FilterSelect key="department" label="Department" value={filters.department} onChange={update('department')} options={departments} allLabel="All Departments" />,
      ],
    },
    {
      title: 'Work',
      dotClass: 'bg-orange-500',
      tintClass: 'border-orange-100 bg-orange-50/70',
      items: [
        shown('status') && <FilterSelect key="status" label="Status" value={filters.status} onChange={update('status')} options={statuses} allLabel="All Statuses" />,
        // Only on pages that supply frequencies (the Projects list).
        frequencies.length > 0 && shown('frequency') && <FilterSelect key="frequency" label="Frequency" value={filters.frequency} onChange={update('frequency')} options={frequencies} allLabel="All Frequencies" />,
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter(Boolean) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="relative w-full">
        <label className="sr-only" htmlFor="projects-search">Search</label>
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="projects-search"
          placeholder="Search projects..."
          value={filters.search}
          onChange={update('search')}
          className="h-10 rounded-full border-slate-200 bg-white pl-10 pr-9 shadow-sm"
        />
        {filters.search !== DEFAULT_FILTERS.search && (
          <button
            type="button"
            onClick={clear('search')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 lg:[grid-template-columns:var(--groups)]"
        style={{ '--groups': groups.map((g) => `minmax(0,${g.items.length}fr)`).join(' ') }}
      >
        {groups.map((g) => (
          <FilterGroup key={g.title} title={g.title} dotClass={g.dotClass} tintClass={g.tintClass} count={g.items.length}>
            {g.items}
          </FilterGroup>
        ))}
      </div>

      {isFiltered && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3">
          <span className="text-xs font-medium text-gray-500 mr-0.5">Active filters:</span>
          {filters.search && <FilterChip label={`"${filters.search}"`} onRemove={clear('search')} />}
          {filters.year !== 'All' && <FilterChip label={filters.year} onRemove={clear('year')} />}
          {filters.quarter !== 'All' && <FilterChip label={getQuarterLabel(filters.quarter)} onRemove={clear('quarter')} />}
          {filters.month !== 'All' && <FilterChip label={getFullMonthName(filters.month)} onRemove={clear('month')} />}
          {!hideBrand && filters.brand !== 'All' && <FilterChip label={filters.brand} onRemove={clear('brand')} />}
          {filters.category !== 'All' && <FilterChip label={filters.category} onRemove={clear('category')} />}
          {filters.department !== 'All' && <FilterChip label={filters.department} onRemove={clear('department')} />}
          {filters.status !== 'All' && <FilterChip label={filters.status} onRemove={clear('status')} />}
          {filters.frequency != null && filters.frequency !== 'All' && <FilterChip label={filters.frequency} onRemove={clear('frequency')} />}
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
