import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, CalendarDays, FolderOpen } from 'lucide-react';
import { getTagChipStyle, getDepartmentChipStyle, getStatusChipStyle, getFrequencyChipStyle, getWorkCountColor, FREQUENCIES, BRAND_CHIP_STYLE } from './constants';
import { buildCompactTasks } from './dataUtils';
import ProjectLinks from './ProjectLinks';

const PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 150, 200];

const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });

// Date sorts by when the task was last seen (then first seen), so the most
// recently active tasks sort together; tasks with no placeable month go last
// when ascending.
const SORTERS = {
  taskName: (a, b) => compareText(a.taskName, b.taskName),
  brand: (a, b) => compareText(a.brand, b.brand),
  category: (a, b) => compareText(a.category, b.category),
  date: (a, b) =>
    (a.lastPeriod ?? Infinity) - (b.lastPeriod ?? Infinity) ||
    (a.firstPeriod ?? Infinity) - (b.firstPeriod ?? Infinity),
  frequency: (a, b) => FREQUENCIES.indexOf(a.frequency) - FREQUENCIES.indexOf(b.frequency),
  workCount: (a, b) => a.workCount - b.workCount,
};

const SORT_COLUMNS = [
  { id: 'taskName', label: 'Project Name' },
  { id: 'brand', label: 'Brand' },
  { id: 'category', label: 'Category' },
  { id: 'date', label: 'Date' },
  { id: 'frequency', label: 'Frequency' },
  { id: 'workCount', label: 'Work Count' },
];

const INK = 'text-[#1e2b4d]';

// Shared by the sort bar and every task card header so their columns line up:
// Project Name | Brand | Category | Date | Frequency | Work Count. Below md the columns
// stop being a grid and simply wrap (name on its own line, then the pills).
// The md track list comes from the --cols variable (see gridColumns), so
// columns switched off in Customize view drop out of it.
const ROW_GRID =
  'flex flex-wrap items-center gap-x-3 gap-y-2 md:grid md:[grid-template-columns:var(--cols)] md:gap-x-4';

const COLUMN_TRACKS = {
  taskName: 'minmax(0,26fr)',
  brand: 'minmax(0,17fr)',
  category: 'minmax(0,26fr)',
  date: 'minmax(0,21fr)',
  frequency: 'minmax(0,12fr)',
  workCount: '2.75rem',
};
const gridColumns = (columns) => columns.map((c) => COLUMN_TRACKS[c.id]).join(' ');

// Opened-card table columns with their relative widths; '#' is always shown.
const DETAIL_COLUMNS = [
  { id: 'monthYear', label: 'Month/Year', width: 18 },
  { id: 'weekNo', label: 'Week No.', width: 17 },
  { id: 'department', label: 'Department', width: 22 },
  { id: 'status', label: 'Status', width: 20 },
  { id: 'links', label: 'Links', width: 17 },
];
const NUMBER_COLUMN_WIDTH = 6;

// What an open card adds on top of its header: just the individual
// occurrences. The task's name, brand, category, date range and count are
// already in the header directly above, so none of that is repeated here.
function DetailPanel({ task, hiddenColumns }) {
  const columns = DETAIL_COLUMNS.filter((c) => !hiddenColumns.includes(c.id));
  const widthTotal = NUMBER_COLUMN_WIDTH + columns.reduce((sum, c) => sum + c.width, 0);
  const pct = (w) => `${(w / widthTotal) * 100}%`;
  const cells = {
    monthYear: (r) => <span className="whitespace-nowrap">{r.month} {r.year}</span>,
    weekNo: (r) => r.weekNo || '-',
    department: (r) => (
      <span className="inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1 text-sm font-medium" style={getDepartmentChipStyle(r.department)}>
        {r.department}
      </span>
    ),
    status: (r) =>
      r.status ? (
        <span className="inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1 text-sm font-medium" style={getStatusChipStyle(r.status)}>
          {r.status}
        </span>
      ) : (
        <span className="text-slate-400">-</span>
      ),
    links: (r) => <ProjectLinks links={r.links} className="text-slate-400 hover:text-primary" />,
  };

  return (
    <div className="bg-[#f1f6ff] px-4 pb-4 pt-1 sm:px-5">
      <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
        <table className={`w-full text-sm ${columns.length > 3 ? 'min-w-[560px]' : ''} ${INK}`}>
          <colgroup>
            <col style={{ width: pct(NUMBER_COLUMN_WIDTH) }} />
            {columns.map((c) => <col key={c.id} style={{ width: pct(c.width) }} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-blue-100 bg-[#f8fbff] text-left">
              <th className="px-4 py-3 font-medium">#</th>
              {columns.map((c) => <th key={c.id} className="px-4 py-3 font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {task.occurrences.map((r, i) => (
              <tr key={r._id ?? i} className="border-b border-[#eef2f8] last:border-b-0">
                <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                {columns.map((c) => <td key={c.id} className="px-4 py-2.5">{cells[c.id](r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// The open card is set apart from the collapsed ones as one unified block:
// a blue border and slightly stronger shadow, a single light-blue tint
// shared by its header and detail panel (so they read as one surface, with
// the white table sitting on it), a blue title/chevron, and a slim blue
// accent along the left edge. overflow-hidden clips that accent to the
// card's rounded corners so it follows the card's shape. Collapsed cards
// stay plain white.
function TaskCard({ task, isOpen, onToggle, columns, hiddenColumns }) {
  const cells = {
    taskName: (
      <div key="taskName" className="flex min-w-0 basis-full items-center gap-3 md:basis-auto">
        {isOpen
          ? <ChevronDown className="h-5 w-5 shrink-0 text-blue-700" strokeWidth={2.75} />
          : <ChevronRight className={`h-5 w-5 shrink-0 ${INK}`} strokeWidth={2.5} />}
        <span className={`text-[17px] font-semibold leading-snug ${isOpen ? 'text-blue-800' : INK}`}>{task.taskName}</span>
      </div>
    ),
    brand: (
      <div key="brand" className="min-w-0">
        <span className="block w-fit max-w-full truncate rounded-full px-4 py-1.5 text-sm font-medium" style={BRAND_CHIP_STYLE} title={task.brand}>
          {task.brand}
        </span>
      </div>
    ),
    category: (
      <div key="category" className="min-w-0">
        <span className="block w-fit max-w-full truncate rounded-full px-4 py-1.5 text-sm font-medium" style={getTagChipStyle(task.category)} title={task.category}>
          {task.category}
        </span>
      </div>
    ),
    date: (
      <div key="date" className={`flex items-center gap-2.5 text-sm ${INK}`}>
        <CalendarDays className="h-5 w-5 shrink-0 text-blue-700" />
        <span>{task.dateLabel || '-'}</span>
      </div>
    ),
    frequency: (
      <div key="frequency" className="min-w-0">
        <span className="block w-fit max-w-full truncate rounded-full px-3.5 py-1 text-sm font-medium" style={getFrequencyChipStyle(task.frequency)}>
          {task.frequency || '-'}
        </span>
      </div>
    ),
    workCount: (
      <div key="workCount" className="ml-auto flex justify-end md:ml-0">
        <span
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-base font-bold ${INK}`}
          style={{ backgroundColor: getWorkCountColor(task.workCount) }}
        >
          {task.workCount}
        </span>
      </div>
    ),
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white transition-shadow ${
        isOpen ? 'border-blue-300 shadow-md' : 'border-[#dfe6f2] shadow-sm'
      }`}
    >
      {isOpen && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-blue-600" />}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`${ROW_GRID} cursor-pointer px-4 py-3.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 ${
          isOpen ? 'bg-[#f1f6ff]' : 'rounded-xl hover:bg-[#f8faff]'
        }`}
      >
        {columns.map((col) => cells[col.id])}
      </div>

      {isOpen && <DetailPanel task={task} hiddenColumns={hiddenColumns} />}
    </div>
  );
}

// One card per task instead of one row per record: the same Brand +
// Category + Task Name that repeats month after month (or week after week)
// collapses into a single card showing when it ran (Date) and how many times
// (Work Count). Clicking a card opens it to list every occurrence in
// chronological order; only one card is open at a time.
export default function ProjectsCompactView({ records, hiddenColumns = [], columnOrder = [] }) {
  const tasks = useMemo(() => buildCompactTasks(records), [records]);
  // Most-repeated tasks first by default; ties fall back to name order.
  const [sort, setSort] = useState({ id: 'workCount', desc: true });
  const [openKey, setOpenKey] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const show = (id) => !hiddenColumns.includes(id);
  // Shown columns in the user's chosen order (default order if none), with
  // Project Name always first.
  const ordered = columnOrder.length
    ? columnOrder.map((id) => SORT_COLUMNS.find((c) => c.id === id)).filter(Boolean)
    : SORT_COLUMNS;
  const columns = [
    ...ordered.filter((c) => c.id === 'taskName'),
    ...ordered.filter((c) => c.id !== 'taskName' && show(c.id)),
  ];
  // Sorting by a column that's now hidden would reorder cards with nothing
  // showing why, so it falls back to name order until the column returns.
  const activeSort = show(sort.id) ? sort : { id: 'taskName', desc: false };

  const sortedTasks = useMemo(() => {
    const compare = SORTERS[activeSort.id];
    const direction = activeSort.desc ? -1 : 1;
    return [...tasks].sort((a, b) => direction * compare(a, b) || compareText(a.taskName, b.taskName));
  }, [tasks, activeSort.id, activeSort.desc]);

  // A new record set (filters changed) or sort order starts back at page 1.
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [tasks, activeSort.id, activeSort.desc]);

  const pageCount = Math.max(1, Math.ceil(sortedTasks.length / pagination.pageSize));
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pageTasks = sortedTasks.slice(pageIndex * pagination.pageSize, (pageIndex + 1) * pagination.pageSize);

  const toggleSort = (id) =>
    setSort((prev) => (prev.id === id ? { id, desc: !prev.desc } : { id, desc: false }));

  const toggleOpen = (key) => setOpenKey((prev) => (prev === key ? null : key));

  return (
    <div className="flex flex-col">
      <div className="rounded-xl bg-[#f2f6fc] p-3 sm:p-4" style={{ '--cols': gridColumns(columns) }}>
        {/* Quiet sort bar - the cards themselves carry no column headers. */}
        <div className={`${ROW_GRID} px-4 pb-2`}>
          {columns.map((col, i) => {
            const active = activeSort.id === col.id;
            return (
              <div
                key={col.id}
                className={`${i === 0 ? 'md:pl-8' : ''} ${col.id === 'workCount' ? 'md:justify-self-end' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.id)}
                  className={`inline-flex select-none items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:text-[#1e2b4d] ${
                    active ? INK : 'text-slate-500'
                  }`}
                >
                  {col.label}
                  {active && !activeSort.desc && <ArrowUp className="h-3.5 w-3.5" />}
                  {active && activeSort.desc && <ArrowDown className="h-3.5 w-3.5" />}
                  {!active && <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />}
                </button>
              </div>
            );
          })}
        </div>

        {pageTasks.length ? (
          <div className="flex flex-col gap-2.5">
            {pageTasks.map((task) => (
              <TaskCard key={task.key} task={task} isOpen={openKey === task.key} onToggle={() => toggleOpen(task.key)} columns={columns} hiddenColumns={hiddenColumns} />
            ))}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-[#dfe6f2] bg-white text-gray-400">
            <FolderOpen className="h-8 w-8" />
            <span className="text-sm">No projects match the current filters.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} · {records.length} work item{records.length === 1 ? '' : 's'}
          </span>
          <label className="flex items-center gap-1.5 text-sm text-gray-500">
            Show
            <select
              className="border border-gray-300 rounded-md py-1 pl-2 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white cursor-pointer"
              value={pagination.pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, pageIndex: pageIndex - 1 }))} disabled={pageIndex <= 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-600 px-2">Page {pageIndex + 1} of {pageCount}</span>
          <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, pageIndex: pageIndex + 1 }))} disabled={pageIndex >= pageCount - 1}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
