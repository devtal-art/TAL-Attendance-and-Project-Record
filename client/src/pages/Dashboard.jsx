import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReports, getMonthlySummary } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Clock, CalendarDays, AlertTriangle, Monitor, LogIn, Clock3 } from 'lucide-react';
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
  Cell,
  Legend
} from 'recharts';

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

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setSelectedPeriodKey((requested || allPeriods[0]).key);
    } catch (error) {
      console.error('Failed to fetch reports', error);
      setLoading(false);
    }
  };

  const handlePeriodSelect = (key) => {
    setSelectedPeriodKey(key);
    const period = periods.find(p => p.key === key);
    setSearchParams(period ? { month: period.month, year: period.year } : {});
  };

  useEffect(() => {
    const period = periods.find(p => p.key === selectedPeriodKey);
    if (period) {
      fetchSummary(period);
    }
  }, [selectedPeriodKey]);

  const fetchSummary = async (period) => {
    setLoading(true);
    try {
      const data = await getMonthlySummary(period.month, period.year, period.startDate, period.endDate);
      setSummaryData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

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

  const { period, aggregate, employees, employeeCount } = summaryData || {};

  // Prepare chart data - always derived from the merged Active+Inactive employee set
  const deptData = employees?.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + (emp.payrollPresentDays || 0);
    return acc;
  }, {});

  const chartData = deptData ? Object.keys(deptData).map(key => ({ name: key, value: deptData[key] })) : [];
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {period ? `${period.month} ${period.year}` : 'Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">All Employees</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">Select Month:</span>
          <select
            value={selectedPeriodKey}
            onChange={(e) => handlePeriodSelect(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 border"
          >
            {periods.map(p => (
              <option key={p.key} value={p.key}>{p.month} {p.year}</option>
            ))}
          </select>
        </div>
      </div>

      {!loading && summaryData && (
        <>
          {/* Top KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{employeeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Present Days</CardTitle>
                <CalendarDays className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averagePayrollPresentDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Work Duration</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averageWorkDuration} <span className="text-sm font-normal text-gray-500">hrs</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Overtime</CardTitle>
                <Clock3 className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averageOT} <span className="text-sm font-normal text-gray-500">hrs</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Late Time</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averageLateTime}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Remote Days</CardTitle>
                <Monitor className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averageRemoteDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg Working Hours / Day</CardTitle>
                <Clock className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{aggregate?.averageWorkingHours}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Report Duration</CardTitle>
                <CalendarDays className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {period?.startDate} <br/>to<br/> {period?.endDate}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Present Days</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="flex items-center gap-4 h-full">
                  {/* Donut Chart */}
                  <div className="flex-shrink-0" style={{ width: 200, height: '100%' }}>
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
                  <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-72 pr-1">
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
                    data={[...employees].sort((a, b) => {
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
