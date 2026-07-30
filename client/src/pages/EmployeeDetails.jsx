import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployeeById } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Building2, MapPin, Briefcase } from 'lucide-react';

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await getEmployeeById(id);
        setEmployee(data);
      } catch (error) {
        console.error('Failed to fetch employee details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <div className="p-8">Loading employee details...</div>;
  if (!employee) return <div className="p-8">Employee not found.</div>;

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

      {/* Employee Summary Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{employee.employeeName}</h2>
          <p className="text-gray-500 font-medium">ID: {employee.employeeId}</p>
          {employee.status && (
            <p className="text-sm font-medium text-gray-500 mt-1">
              Status: {employee.status === 'ACTIVE' ? '🟢 Active' : '🔴 Inactive'}
              {employee.reportId && ` — ${employee.reportId.month} ${employee.reportId.year}`}
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
    </div>
  );
}
