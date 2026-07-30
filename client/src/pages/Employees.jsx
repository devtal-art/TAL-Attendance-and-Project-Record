import React, { useState, useEffect, useMemo } from 'react';
import { getReports, getMonthlySummary, exportEmployeeMonth, exportEmployeeAll } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/input';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

// Groups the flat report list into one entry per calendar period, since a
// month can have both an Active and an Inactive report underneath it.
const buildPeriods = (reports) => {
  const map = new Map();
  reports.forEach(r => {
    const key = `${r.month}|${r.year}|${r.startDate}|${r.endDate}`;
    if (!map.has(key)) {
      map.set(key, { key, month: r.month, year: r.year, startDate: r.startDate, endDate: r.endDate });
    }
  });
  return Array.from(map.values());
};

export default function Employees() {
  const [reports, setReports] = useState([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [employees, setEmployees] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const navigate = useNavigate();

  const periods = useMemo(() => buildPeriods(reports), [reports]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
      const allPeriods = buildPeriods(data);
      if (allPeriods.length > 0) {
        setSelectedPeriodKey(allPeriods[0].key);
      }
    } catch (error) {
      console.error('Failed to fetch reports', error);
    }
  };

  useEffect(() => {
    const period = periods.find(p => p.key === selectedPeriodKey);
    if (period) {
      fetchEmployees(period);
    }
  }, [selectedPeriodKey]);

  const fetchEmployees = async (period) => {
    try {
      const data = await getMonthlySummary(period.month, period.year, period.startDate, period.endDate);
      setEmployees(data.employees);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const columns = useMemo(
    () => [
      { accessorKey: 'employeeName', header: 'Employee' },
      { accessorKey: 'employeeId', header: 'Employee ID' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => (info.getValue() === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'),
      },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'location', header: 'Location' },
      { accessorKey: 'payrollPresentDays', header: 'Present Days' },
      { accessorKey: 'totalOT', header: 'OT' },
      { accessorKey: 'lateBy', header: 'Late By' },
      { accessorKey: 'remoteDays', header: 'Remote Days' },
      { accessorKey: 'leavesTaken', header: 'Leaves' },
      { accessorKey: 'totalWorkDuration', header: 'Working Hours' },
      {
        id: 'actions',
        header: 'Export',
        cell: ({ row }) => {
          const emp = row.original;
          const period = periods.find(p => p.key === selectedPeriodKey);
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                title={`Download ${period?.month} ${period?.year}`}
                onClick={() =>
                  period &&
                  exportEmployeeMonth(
                    emp._id,
                    period.month,
                    period.year,
                    period.startDate,
                    period.endDate
                  )
                }
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-3 h-3" />
                Month
              </button>
              <button
                title="Download all months"
                onClick={() => exportEmployeeAll(emp._id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3 h-3" />
                All
              </button>
            </div>
          );
        },
      },
    ],
    [selectedPeriodKey, periods]
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">Employees List</h2>

        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search employees..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={selectedPeriodKey}
            onChange={(e) => setSelectedPeriodKey(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-primary focus:border-primary"
          >
            {periods.map(p => (
              <option key={p.key} value={p.key}>{p.month} {p.year}</option>
            ))}
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/employees/${row.original._id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No employees found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-gray-600 px-2">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
