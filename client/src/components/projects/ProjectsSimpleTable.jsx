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
import { getTagChipStyle, getDepartmentChipStyle, BRAND_CHIP_STYLE, monthIndex } from './constants';

const PAGE_SIZE = 50;

const monthYearSortingFn = (rowA, rowB) => {
  const a = rowA.original;
  const b = rowB.original;
  if (Number(a.year) !== Number(b.year)) return Number(a.year) - Number(b.year);
  return monthIndex(a.month) - monthIndex(b.month);
};

// A plain, literal table: one row per task, five columns (Category, Project
// Name, Brand, Department, Month/Year) - no grouping, no merged cells, no
// drill-down.
export default function ProjectsSimpleTable({ records }) {
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
        id: 'monthYear',
        header: 'Month/Year',
        accessorFn: (row) => `${row.month} ${row.year}`,
        sortingFn: monthYearSortingFn,
        cell: (info) => <span className="text-sm text-gray-700">{info.getValue()}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    state: { sorting },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[640px] caption-bottom text-sm">
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '36%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm">
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const sortDir = header.column.getIsSorted();
                return (
                  <TableHead key={header.id} className="bg-gray-50 px-4 py-3">
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
                <TableCell colSpan={5} className="h-48 text-center">
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
        <span className="text-sm text-gray-500">
          {records.length} project{records.length === 1 ? '' : 's'} total
        </span>
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
