import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReports, getRangeSummary } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import AttendanceFilters from '../components/attendance/AttendanceFilters';
import {
  buildPeriods,
  toDateInputValue,
  DEFAULT_FACET_FILTERS,
  getUniqueSorted,
  filterEmployees,
  sanitizeFacetFilters,
  computeAggregate,
} from '../components/attendance/attendanceUtils';
import { Users, Clock, CalendarDays, AlertTriangle, Monitor, Clock3, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rangeData, setRangeData] = useState(null);
  const [facetFilters, setFacetFilters] = useState(DEFAULT_FACET_FILTERS);
  const [loading, setLoading] = useState(true);
  const [rangeError, setRangeError] = useState('');

  const periods = useMemo(() => buildPeriods(reports), [reports]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
      if (data.length === 0) {
        setLoading(false);
        return;
      }

      const allPeriods = buildPeriods(data);
      const requestedMonth = searchParams.get('month');
      const requestedYear = searchParams.get('year');
      const requested = allPeriods.find(p => p.month === requestedMonth && p.year === requestedYear);
      const initial = requested || allPeriods[0];
      setFrom(toDateInputValue(initial.startDate));
      setTo(toDateInputValue(initial.endDate));
    } catch (error) {
      console.error('Failed to fetch reports', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!from || !to) return;
    fetchRange(from, to);
  }, [from, to]);

  const fetchRange = async (rangeFrom, rangeTo) => {
    setLoading(true);
    setRangeError('');
    try {
      const data = await getRangeSummary(rangeFrom, rangeTo);
      setRangeData(data);
      setFacetFilters((prev) => sanitizeFacetFilters(data.employees, prev));
    } catch (error) {
      setRangeData(null);
      setRangeError(error.response?.data?.message || 'Failed to fetch attendance data for this date range.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPeriod = (period) => {
    setFrom(toDateInputValue(period.startDate));
    setTo(toDateInputValue(period.endDate));
  };

  const departmentOptions = useMemo(
    () => getUniqueSorted(rangeData?.employees || [], 'department'),
    [rangeData],
  );

  const filteredEmployees = useMemo(
    () => filterEmployees(rangeData?.employees || [], facetFilters),
    [rangeData, facetFilters],
  );

  const aggregate = useMemo(() => computeAggregate(filteredEmployees), [filteredEmployees]);

  // filteredEmployees is one row per employee per matching monthly report,
  // so a range spanning several periods counts the same person multiple
  // times. The "Total Employees" KPI should reflect unique people, not
  // records - dedupe by employeeId (stable across uploads).
  const uniqueEmployeeCount = useMemo(
    () => new Set(filteredEmployees.map((e) => e.employeeId)).size,
    [filteredEmployees],
  );

  // rangeData.reports is raw Report documents - a single month can have both
  // an Active and an Inactive report, so it's deduped into calendar periods
  // (like buildPeriods) before counting/labeling, otherwise one ordinary
  // month with both types uploaded would misleadingly read as "2 periods".
  const matchedPeriods = useMemo(() => buildPeriods(rangeData?.reports || []), [rangeData]);

  if (loading && !reports.length) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <CalendarDays className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">No Reports Found</h2>
        <p className="text-gray-500 mt-2">Upload an attendance sheet to see the dashboard.</p>
      </div>
    );
  }

  // Prepare chart data - derived from the merged, filtered employee set
  const deptData = filteredEmployees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + (emp.payrollPresentDays || 0);
    return acc;
  }, {});

  // Fixed display order for the "Department-wise Present Days" chart/legend.
  // Any department present in the data but not listed here (e.g. one added
  // later) is appended after, so it's never silently dropped.
  const DEPARTMENT_ORDER = ['Management', 'Human Resources', 'Admin', 'IT', 'Design', 'Visual Design', 'Development', 'Business Management'];
  const orderIndex = (name) => {
    const idx = DEPARTMENT_ORDER.indexOf(name);
    return idx === -1 ? DEPARTMENT_ORDER.length : idx;
  };

  const chartData = Object.keys(deptData)
    .map(key => ({ name: key, value: deptData[key] }))
    .sort((a, b) => orderIndex(a.name) - orderIndex(b.name));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'];
  const totalPresentDays = chartData.reduce((sum, d) => sum + d.value, 0);

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      const pct = totalPresentDays > 0 ? ((value / totalPresentDays) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm">
          <p className="font-semibold text-gray-800">{name}</p>
          <p className="text-gray-600"><span className="font-medium text-gray-900">{value}</span> present days</p>
          <p className="text-gray-500">{pct}% of total</p>
        </div>
      );
    }
    return null;
  };

  const matchedPeriodCount = matchedPeriods.length;
  const rangeTitle = matchedPeriodCount === 1
    ? `${matchedPeriods[0].month} ${matchedPeriods[0].year}`
    : matchedPeriodCount > 1
      ? `${matchedPeriodCount} report periods`
      : 'Dashboard';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{rangeTitle}</h2>
        <p className="text-sm text-gray-500">
          {rangeData ? `${filteredEmployees.length} of ${rangeData.employeeCount} employee record(s)` : 'All Employees'}
        </p>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-primary" /> Filters
        </div>
        <AttendanceFilters
          showDateRange
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          periods={periods}
          onSelectPeriod={handleSelectPeriod}
          facetFilters={facetFilters}
          onFacetChange={(next) => setFacetFilters(sanitizeFacetFilters(rangeData?.employees || [], next))}
          departments={departmentOptions}
        />
      </div>

      {rangeError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{rangeError}</div>
      )}

      {!loading && rangeData && filteredEmployees.length === 0 && !rangeError && (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400 py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-8 h-8" />
          <span className="text-sm font-medium text-gray-600">No employees found</span>
          <span className="text-xs">Try adjusting your date range or filters.</span>
        </div>
      )}

      {!loading && rangeData && filteredEmployees.length > 0 && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{uniqueEmployeeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Present Days</CardTitle>
                <CalendarDays className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averagePayrollPresentDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Work Duration</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averageWorkDuration} <span className="text-sm font-normal text-gray-500">hrs</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Overtime</CardTitle>
                <Clock3 className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averageOT} <span className="text-sm font-normal text-gray-500">hrs</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Late Time</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averageLateTime}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Remote Days</CardTitle>
                <Monitor className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averageRemoteDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Working Hours / Day</CardTitle>
                <Clock className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate.averageWorkingHours}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Report Periods</CardTitle>
                <CalendarDays className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {matchedPeriodCount} period{matchedPeriodCount === 1 ? '' : 's'} <br/>
                  {from} to {to}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Present Days</CardTitle>
              </CardHeader>
              <CardContent className="h-auto sm:h-80">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:h-full">
                  {/* Donut Chart - fixed width on sm+ (matches existing desktop
                      layout exactly); full-width/capped-height on mobile so it
                      doesn't get squeezed beside the legend in a narrow row. */}
                  <div className="shrink-0 w-full h-56 sm:w-[200px] sm:h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={false}
                          labelLine={false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="w-full flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-72 pr-1">
                    {chartData.map((entry, index) => {
                      const pct = totalPresentDays > 0 ? ((entry.value / totalPresentDays) * 100).toFixed(1) : 0;
                      return (
                        <div key={entry.name} className="flex items-center gap-2 min-w-0">
                          <span
                            className="flex-shrink-0 w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="flex-1 text-sm text-gray-700 truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="flex-shrink-0 text-sm font-semibold text-gray-900">{entry.value}</span>
                          <span className="flex-shrink-0 text-xs text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                    {chartData.length === 0 && (
                      <p className="text-sm text-gray-400 text-center">No data available</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Overtime Employees</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...filteredEmployees].sort((a, b) => {
                      const aOT = parseInt(a.totalOT.split(':')[0]) * 60 + parseInt(a.totalOT.split(':')[1]);
                      const bOT = parseInt(b.totalOT.split(':')[0]) * 60 + parseInt(b.totalOT.split(':')[1]);
                      return bOT - aOT;
                    }).slice(0, 5)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="employeeName" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name, props) => [props.payload.totalOT, 'Total OT']}
                    />
                    <Bar dataKey={(emp) => parseInt(emp.totalOT.split(':')[0]) + parseInt(emp.totalOT.split(':')[1])/60} fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
