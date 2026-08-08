import React, { useState, useEffect } from 'react';
import { getReports, deleteReport } from '../services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const [reports, setReports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report? All associated employee data will be lost.')) {
      try {
        await deleteReport(id);
        setReports(reports.filter(r => r._id !== id));
      } catch (error) {
        console.error('Failed to delete report', error);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Upload History</h2>
      
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Month / Year</TableHead>
            <TableHead>Employee Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length > 0 ? (
            reports.map((report) => (
              <TableRow key={report._id}>
                <TableCell className="font-medium">{report.month} {report.year}</TableCell>
                <TableCell>
                  {report.employeeType === 'ACTIVE' ? '🟢 Active Employees' : '🔴 Inactive Employees'}
                </TableCell>
                <TableCell>{report.startDate} to {report.endDate}</TableCell>
                <TableCell>{report.employeeCount}</TableCell>
                <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/?month=${report.month}&year=${report.year}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(report._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                No reports uploaded yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
