import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, FolderOpen } from 'lucide-react';
import { getTagChipStyle, getDepartmentChipStyle, getStatusChipStyle, getFrequencyChipStyle, BRAND_CHIP_STYLE, FREQUENCIES, monthIndex } from './constants';
import ProjectLinks from './ProjectLinks';

const PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 150, 200];

const monthYearSortingFn = (rowA, rowB) => {
  const a = rowA.original;
  const b = rowB.original;
  if (Number(a.year) !== Number(b.year)) return Number(a.year) - Number(b.year);
  return monthIndex(a.month) - monthIndex(b.month);
};

// A plain, literal table: one row per task (Category, Project Name, Brand,
// Department, Week No., Month/Year, Links, Status, Frequency) - no grouping, no merged
// cells, no drill-down.
// Relative width of each column; only the visible ones are used (see below).
const COLUMN_WIDTHS = { category: 12, taskName: 24, brand: 12, department: 12, weekNo: 8, monthYear: 11, links: 7, status: 14, frequency: 11 };

export default function ProjectsSimpleTable({ records, hiddenColumns = [], columnOrder = [] }) {
  const [sorting, setSorting] = useState([{ id: 'category', desc: false }]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'category',
        header: 'Category',
        sortingFn: 'alphanumeric',
        cell: (info) => (
          <span className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold" style={getTagChipStyle(info.getValue())}>
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'taskName',
        header: 'Project Name',
        sortingFn: 'alphanumeric',
        cell: (info) => <span className="text-sm text-gray-800">{info.getValue()}</span>,
      },
      {
        accessorKey: 'brand',
        header: 'Brand',
        sortingFn: 'alphanumeric',
        cell: (info) => (
          <span className="inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs" style={BRAND_CHIP_STYLE}>
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department',
        sortingFn: 'alphanumeric',
        cell: (info) => (
          <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={getDepartmentChipStyle(info.getValue())}>
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'weekNo',
        header: 'Week No.',
        sortingFn: 'alphanumeric',
        cell: (info) => <span className="text-sm text-gray-700">{info.getValue() || '-'}</span>,
      },
      {
        id: 'monthYear',
        header: 'Month/Year',
        accessorFn: (row) => `${row.month} ${row.year}`,
        sortingFn: monthYearSortingFn,
        cell: (info) => <span className="text-sm text-gray-700">{info.getValue()}</span>,
      },
      {
        id: 'links',
        header: 'Links',
        enableSorting: false,
        cell: ({ row }) => <ProjectLinks links={row.original.links} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        sortingFn: 'alphanumeric',
        // Projects saved before Status existed have none - shown as '-'
        // like an empty Week No., not as an invented default status.
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-sm text-gray-400">-</span>;
          return (
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={getStatusChipStyle(value)}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        sortingFn: (a, b) => FREQUENCIES.indexOf(a.original.frequency) - FREQUENCIES.indexOf(b.original.frequency),
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-sm text-gray-400">-</span>;
          return (
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={getFrequencyChipStyle(value)}>
              {value}
            </span>
          );
        },
      },
    ],
    [],
  );

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const columnVisibility = useMemo(
    () => Object.fromEntries(hiddenColumns.map((id) => [id, false])),
    [hiddenColumns],
  );
  // A sort on a column that's now hidden would reorder rows with no header
  // showing why, so it's ignored until the column comes back.
  const activeSorting = useMemo(() => sorting.filter((s) => !hiddenColumns.includes(s.id)), [sorting, hiddenColumns]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting: activeSorting, pagination, columnVisibility, columnOrder },
  });

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const widthTotal = visibleColumns.reduce((sum, c) => sum + (COLUMN_WIDTHS[c.id] || 10), 0);

  return (
    <div className="flex flex-col">
      <div className="min-h-[920px] overflow-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[640px] caption-bottom text-sm">
          <colgroup>
            {visibleColumns.map((c) => (
              <col key={c.id} style={{ width: `${((COLUMN_WIDTHS[c.id] || 10) / widthTotal) * 100}%` }} />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const sortDir = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <TableHead key={header.id} className="bg-gray-50 px-4 py-3">
                    {canSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 select-none hover:text-gray-900"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
                        {sortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
                        {!sortDir && <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <FolderOpen className="w-8 h-8" />
                    <span className="text-sm">No projects match the current filters.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {records.length} project{records.length === 1 ? '' : 's'} total
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
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
