import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { MONTHS } from './constants';

const SELECT_CLASS = 'border border-gray-300 rounded-md p-2 text-sm focus:ring-primary focus:border-primary bg-white';

export default function ProjectsFilters({
  filters,
  onChange,
  years,
  brands,
  statuses,
}) {
  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="relative w-full lg:w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by project name or brand..."
          value={filters.search}
          onChange={update('search')}
          className="pl-9"
        />
      </div>

      <select className={SELECT_CLASS} value={filters.month} onChange={update('month')}>
        <option value="All">All Months</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select className={SELECT_CLASS} value={filters.year} onChange={update('year')}>
        <option value="All">All Years</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select className={SELECT_CLASS} value={filters.brand} onChange={update('brand')}>
        <option value="All">All Brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      <select className={SELECT_CLASS} value={filters.status} onChange={update('status')}>
        <option value="All">All Statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
