import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getEmployees, getRangeSummary } from '../services/api';
import { aggregateEmployeeDetail } from '../components/attendance/attendanceUtils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Building2, MapPin, Briefcase } from 'lucide-react';

// The route param is the employee's stable business employeeId (not a
// per-month Mongo _id), and from/to are optional query params carried over
// from whatever date scope was active on the Employees screen when the row
// was clicked. That's what makes this page dynamic: with no from/to it
// aggregates every uploaded month for this employee (mirroring the
// Employees screen's default consolidated view - see
// aggregateEmployeesByIdentity); with from/to present it aggregates only
// the records whose report period overlaps that range (mirroring the
// screen's detailed/range-filtered view), rather than always showing
// whichever single month's record happened to be clicked.
export default function EmployeeDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const isRangeScoped = Boolean(from && to);

  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = isRangeScoped
          ? (await getRangeSummary(from, to)).employees
          : await getEmployees();
        const matching = data.filter((e) => e.employeeId === id);
        if (!matching.length) {
          setNotFound(true);
          setEmployee(null);
          setRecords([]);
          return;
        }
        setRecords(matching);
        setEmployee(aggregateEmployeeDetail(matching));
      } catch (error) {
        console.error('Failed to fetch employee details', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, from, to, isRangeScoped]);

  if (loading) return <div className="p-8">Loading employee details...</div>;
  if (notFound || !employee) return <div className="p-8">Employee not found.</div>;

  const sortedRecords = [...records].sort((a, b) => {
    const aDate = new Date(a.reportId?.startDate || 0);
    const bDate = new Date(b.reportId?.startDate || 0);
    return bDate - aDate;
  });

  const metrics = [
    { label: 'Total Work Duration', value: employee.totalWorkDuration },
    { label: 'Total OT', value: employee.totalOT },
    { label: 'Total Duration (+OT)', value: employee.totalDurationOT },
    { label: 'Late By', value: employee.lateBy },
    { label: 'Remote Days', value: employee.remoteDays },
    { label: 'Clock In Days', value: employee.clockInDays },
    { label: 'Payroll Present Days', value: employee.payrollPresentDays },
    { label: 'Absent', value: employee.absent },
    { label: 'Early Out', value: employee.earlyOut },
    { label: 'Remote Hours', value: employee.remoteHours },
    { label: 'Week Off', value: employee.weekOff },
    { label: 'Holidays', value: employee.holidays },
    { label: 'Hourly Leaves', value: employee.hourlyLeaves },
    { label: 'Leaves Taken', value: employee.leavesTaken },
    { label: 'Average Working Hours', value: employee.averageWorkingHours },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-gray-600">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      {isRangeScoped && (
        <div className="text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          {`Showing totals for ${from} to ${to}`}
        </div>
      )}

      {/* Employee Summary Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{employee.employeeName}</h2>
          <p className="text-gray-500 font-medium">ID: {employee.employeeId}</p>
          {employee.status && (
            <p className="text-sm font-medium text-gray-500 mt-1">
              Latest status: {employee.status === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-primary" />
            {employee.company}
          </div>
          <div className="flex items-center">
            <Briefcase className="w-4 h-4 mr-2 text-primary" />
            {employee.department}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            {employee.location}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">Attendance Key Performance Indicators</h3>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m, idx) => (
          <Card key={idx} className="bg-white border border-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{m.label}</span>
              <span className="text-xl font-bold text-gray-900">{m.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">Monthly Breakdown</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Month</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Working Hours</th>
              <th className="text-left px-4 py-3 font-medium">OT</th>
              <th className="text-left px-4 py-3 font-medium">Remote Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRecords.map((r) => (
              <tr key={r._id}>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {r.reportId ? `${r.reportId.month} ${r.reportId.year}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {r.status === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'}
                </td>
                <td className="px-4 py-3 text-gray-700">{r.totalWorkDuration}</td>
                <td className="px-4 py-3 text-gray-700">{r.totalOT}</td>
                <td className="px-4 py-3 text-gray-700">{r.remoteDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
