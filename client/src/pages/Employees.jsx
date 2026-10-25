import React, { useState, useEffect, useMemo } from 'react';
import { getReports, getEmployees, getRangeSummary, exportEmployeeMonth, exportEmployeeAll } from '../services/api';
import { useNavigate } from 'react-router-dom';
import useUrlFilters from '../lib/useUrlFilters';
import AttendanceFilters from '../components/attendance/AttendanceFilters';
import {
  buildPeriods,
  toDateInputValue,
  ATTENDANCE_URL_DEFAULTS,
  validateEmployeesUrlState,
  getUniqueSorted,
  filterEmployees,
  sanitizeFacetFilters,
  aggregateEmployeesByIdentity,
} from '../components/attendance/attendanceUtils';
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
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';

// Default view: every employee consolidated into a single row (OT/Remote
// Days/Working Hours totalled across all their uploaded months - see
// aggregateEmployeesByIdentity) so nobody appears more than once. Picking a
// date (From/To or the quick-month shortcut) switches to the detailed,
// per-month view instead - one row per uploaded record, with the
// Month/Status/Location columns that only make sense once you're looking
// at a specific period rather than an employee's totals.
const AGGREGATED_COLUMNS = [
  { accessorKey: 'employeeName', header: 'Employee' },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'totalOT', header: 'OT' },
  { accessorKey: 'remoteDays', header: 'Remote Days' },
  { accessorKey: 'totalWorkDuration', header: 'Working Hours' },
];

const DETAILED_COLUMNS = [
  { accessorKey: 'employeeName', header: 'Employee' },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  {
    id: 'period',
    header: 'Month',
    accessorFn: (row) => `${row.reportId?.month ?? ''} ${row.reportId?.year ?? ''}`,
  },
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
];

export default function Employees() {
  const [reports, setReports] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The date range and the Department/Search filters live in the URL, so a
  // copied link reopens with the same filters - and coming back from an
  // employee's details page (navigate(-1)) restores them too.
  const [urlState, setUrlState] = useUrlFilters(ATTENDANCE_URL_DEFAULTS, { validate: validateEmployeesUrlState });
  const { from, to } = urlState;
  const facetFilters = useMemo(
    () => ({ search: urlState.search, department: urlState.department }),
    [urlState.search, urlState.department],
  );
  const setFrom = (value) => setUrlState((prev) => ({ ...prev, from: value }));
  const setTo = (value) => setUrlState((prev) => ({ ...prev, to: value }));
  const [rangeData, setRangeData] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const navigate = useNavigate();

  const periods = useMemo(() => buildPeriods(reports), [reports]);
  const isDateFilterActive = Boolean(from && to);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reportsData, employeesData] = await Promise.all([getReports(), getEmployees()]);
      setReports(reportsData);
      setAllEmployees(employeesData);
    } catch (err) {
      setError('Failed to load employees.');
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isDateFilterActive) {
      setRangeData(null);
      setRangeError('');
      return;
    }
    fetchRange(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const fetchRange = async (rangeFrom, rangeTo) => {
    setRangeError('');
    try {
      const data = await getRangeSummary(rangeFrom, rangeTo);
      setRangeData(data);
    } catch (err) {
      setRangeData(null);
      setRangeError(err.response?.data?.message || 'Failed to fetch employees for this date range.');
    }
  };

  const handleSelectPeriod = (period) => {
    setFrom(toDateInputValue(period.startDate));
    setTo(toDateInputValue(period.endDate));
  };

  const handleClearDateRange = () => {
    setUrlState((prev) => ({ ...prev, from: '', to: '' }));
  };

  const baseRows = useMemo(() => {
    if (isDateFilterActive) return rangeData?.employees || [];
    return aggregateEmployeesByIdentity(allEmployees);
  }, [isDateFilterActive, rangeData, allEmployees]);

  const departmentOptions = useMemo(() => getUniqueSorted(baseRows, 'department'), [baseRows]);

  // A Department from a shared link that doesn't exist in the data being
  // shown resets to "All". Held back until that data has actually loaded
  // (the employees, plus the date range's own data when one is set) -
  // before that, baseRows is empty and every department would look invalid.
  useEffect(() => {
    if (loading || (isDateFilterActive && !rangeData)) return;
    const fixed = sanitizeFacetFilters(baseRows, facetFilters);
    if (fixed !== facetFilters) setUrlState((prev) => ({ ...prev, department: fixed.department }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rangeData, allEmployees]);

  const employees = useMemo(() => filterEmployees(baseRows, facetFilters), [baseRows, facetFilters]);

  const columns = useMemo(() => {
    const base = isDateFilterActive ? DETAILED_COLUMNS : AGGREGATED_COLUMNS;
    return [
      ...base,
      {
        id: 'actions',
        header: 'Export',
        cell: ({ row }) => {
          const emp = row.original;
          const period = emp.reportId;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {isDateFilterActive && (
                <button
                  title={period ? `Download ${period.month} ${period.year}` : 'Download this month'}
                  onClick={() =>
                    period &&
                    exportEmployeeMonth(emp._id, period.month, period.year, period.startDate, period.endDate)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Month
                </button>
              )}
              <button
                title="Download all months"
                onClick={() => exportEmployeeAll(emp._id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3 h-3" />
                {isDateFilterActive ? 'All' : 'Export'}
              </button>
            </div>
          );
        },
      },
    ];
  }, [isDateFilterActive]);

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Employees List</h2>

      <div className="bg-gray-50/70 p-4 sm:p-5 rounded-xl border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-primary" /> Filters
        </div>
        <AttendanceFilters
          showDateRange
          dateRangeOptional
          onClearDateRange={handleClearDateRange}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          periods={periods}
          onSelectPeriod={handleSelectPeriod}
          facetFilters={facetFilters}
          onFacetChange={(next) => setUrlState((prev) => ({ ...prev, ...sanitizeFacetFilters(baseRows, next) }))}
          departments={departmentOptions}
        />
        {!isDateFilterActive && (
          <p className="text-xs text-gray-400 mt-3">
            Showing every employee's overall totals across all uploaded months. Pick a date above to see individual monthly records instead.
          </p>
        )}
      </div>

      {(error || rangeError) && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error || rangeError}</div>
      )}

      {!loading && (
        <p className="text-sm text-gray-500 mb-3">
          {employees.length} of {baseRows.length} {isDateFilterActive ? 'employee record(s)' : 'employee(s)'}
        </p>
      )}

      <Table className="min-w-[1080px]">
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
                onClick={() => {
                  const query = isDateFilterActive ? `?from=${from}&to=${to}` : '';
                  navigate(`/employees/${row.original.employeeId}${query}`);
                }}
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
                {loading ? 'Loading...' : 'No employees found.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-end gap-2 py-4">
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
