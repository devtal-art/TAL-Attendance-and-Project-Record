import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, FolderOpen, AlertTriangle, Copy } from 'lucide-react';
import { getDepartmentChipStyle, getStatusChipStyle, monthIndex } from './constants';

const PAGE_SIZE = 50;

const monthSortingFn = (rowA, rowB) => monthIndex(rowA.original.month) - monthIndex(rowB.original.month);

// getRowFlags: optional (record) => { invalid, duplicate } - only used by the
// upload preview to highlight problem rows. Omitted for the production
// Dashboard/List tables, which render as a plain sortable/paginated table.
export default function ProjectsTable({ records, getRowFlags }) {
  const [sorting, setSorting] = useState([{ id: 'year', desc: true }]);

  const columns = useMemo(() => {
    const base = [
      { accessorKey: 'year', header: 'Year', sortingFn: 'basic' },
      { accessorKey: 'brand', header: 'Brand', sortingFn: 'alphanumeric' },
      { accessorKey: 'category', header: 'Category', sortingFn: 'alphanumeric' },
      {
        accessorKey: 'department',
        header: 'Department',
        sortingFn: 'alphanumeric',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-gray-400">—</span>;
          return (
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={getDepartmentChipStyle(value)}>
              {value}
            </span>
          );
        },
      },
      { accessorKey: 'month', header: 'Month', sortingFn: monthSortingFn },
      { accessorKey: 'taskName', header: 'Project Name', sortingFn: 'alphanumeric' },
      {
        accessorKey: 'status',
        header: 'Status',
        sortingFn: 'alphanumeric',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return <span className="text-gray-400">—</span>;
          return (
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={getStatusChipStyle(value)}>
              {value}
            </span>
          );
        },
      },
    ];

    if (!getRowFlags) return base;

    return [
      {
        id: 'flags',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const { invalid, duplicate } = getRowFlags(row.original) || {};
          if (!invalid && !duplicate) return null;
          return (
            <div className="flex items-center gap-1">
              {invalid && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-label="Invalid row" />}
              {duplicate && <Copy className="w-3.5 h-3.5 text-orange-500" aria-label="Duplicate row" />}
            </div>
          );
        },
      },
      ...base,
    ];
  }, [getRowFlags]);

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

  const rowClassName = (record) => {
    if (!getRowFlags) return '';
    const { invalid, duplicate } = getRowFlags(record) || {};
    if (invalid) return 'bg-amber-50/60';
    if (duplicate) return 'bg-orange-50/60';
    return '';
  };

  return (
    <div>
      <div className="max-h-[600px] overflow-auto rounded-lg border border-gray-200">
        <Table className="min-w-[720px]">
          <TableHeader className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id} className="bg-gray-50">
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
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className={rowClassName(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <FolderOpen className="w-8 h-8" />
                    <span className="text-sm">No projects match the current filters.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
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
