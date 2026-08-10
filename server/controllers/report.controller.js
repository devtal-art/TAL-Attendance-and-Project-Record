const Report = require('../models/Report');
const ExcelJS = require('exceljs');
const Employee = require('../models/Employee');

const REPORT_POPULATE_FIELDS = 'reportName month year employeeType startDate endDate';

// Helper to convert HH:MM string to total minutes
const parseDurationStr = (str) => {
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
};

// Helper to convert total minutes back to HH:MM string
const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Computes dashboard KPI averages across a set of employee records,
// regardless of which report(s) they came from.
const computeAggregate = (employees) => {
  let totalPayrollPresent = 0;
  let totalWorkMins = 0;
  let totalOTMins = 0;
  let totalLateMins = 0;
  let totalRemoteDays = 0;

  employees.forEach(emp => {
    totalPayrollPresent += emp.payrollPresentDays || 0;
    totalWorkMins += parseDurationStr(emp.totalWorkDuration);
    totalOTMins += parseDurationStr(emp.totalOT);
    totalLateMins += parseDurationStr(emp.lateBy);
    totalRemoteDays += emp.remoteDays || 0;
  });

  const count = employees.length || 1; // avoid division by zero
  return {
    averagePayrollPresentDays: (totalPayrollPresent / count).toFixed(2),
    averageWorkDuration: formatDuration(Math.floor(totalWorkMins / count)),
    averageOT: formatDuration(Math.floor(totalOTMins / count)),
    averageLateTime: formatDuration(Math.floor(totalLateMins / count)),
    averageRemoteDays: (totalRemoteDays / count).toFixed(2),
    averageWorkingHours: formatDuration(Math.floor((totalWorkMins / count) / (totalPayrollPresent / count || 1)))
  };
};

// Derives each employee's status (Active/Inactive) from the report they
// were imported from. Status is never stored on the Employee document.
const attachStatus = (employees) => employees.map(emp => ({
  ...emp,
  status: emp.reportId?.employeeType || null,
}));

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reports', error: error.message });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const employees = await Employee.find({ reportId: report._id });
    const aggregate = computeAggregate(employees);

    res.json({ report, aggregate });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch report', error: error.message });
  }
};

// Combines the Active and Inactive reports (if both exist) for a given
// month into one merged dataset, so the dashboard never has to choose a type.
exports.getMonthlySummary = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const filter = { month, year };
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;

    const reports = await Report.find(filter);
    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for the selected month' });
    }

    const reportIds = reports.map(r => r._id);
    const employees = await Employee.find({ reportId: { $in: reportIds } })
      .populate('reportId', REPORT_POPULATE_FIELDS)
      .lean();
    const employeesWithStatus = attachStatus(employees);

    res.json({
      period: {
        month,
        year,
        startDate: reports[0].startDate,
        endDate: reports[0].endDate,
      },
      reports,
      employeeCount: employeesWithStatus.length,
      aggregate: computeAggregate(employeesWithStatus),
      employees: employeesWithStatus,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch monthly summary', error: error.message });
  }
};

// Attendance data is stored as one aggregate record per employee per
// uploaded monthly report - there's no daily granularity to slice by exact
// dates. A "date range" therefore means: find every uploaded report whose
// own [startDate, endDate] overlaps the requested range, and merge all of
// their employees (Active + Inactive, across however many months that
// spans) into one combined dataset, the same way getMonthlySummary already
// merges Active+Inactive for a single month.
//
// Report.startDate/endDate are free-text strings like "01 Jun 2026" (as
// extracted verbatim from the source Excel), not Date-typed fields, so they
// can't be range-queried in Mongo directly. The report count is small
// (one document per uploaded month), so it's fetched in full and the
// overlap test is done in JS via `new Date(...)`, which parses this
// "DD Mon YYYY" format correctly - verified against real stored data.
exports.getRangeSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'from and to are required' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: 'Invalid from/to date.' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ message: '"From" date must be on or before "To" date.' });
    }

    const allReports = await Report.find().sort({ createdAt: -1 });
    const matchingReports = allReports.filter((r) => {
      const reportStart = new Date(r.startDate);
      const reportEnd = new Date(r.endDate);
      if (Number.isNaN(reportStart.getTime()) || Number.isNaN(reportEnd.getTime())) return false;
      return reportStart <= toDate && reportEnd >= fromDate;
    });

    if (matchingReports.length === 0) {
      return res.status(404).json({ message: 'No reports found for the selected date range.' });
    }

    const reportIds = matchingReports.map((r) => r._id);
    const employees = await Employee.find({ reportId: { $in: reportIds } })
      .populate('reportId', REPORT_POPULATE_FIELDS)
      .lean();
    const employeesWithStatus = attachStatus(employees);

    res.json({
      range: { from, to },
      reports: matchingReports,
      employeeCount: employeesWithStatus.length,
      aggregate: computeAggregate(employeesWithStatus),
      employees: employeesWithStatus,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch date range summary', error: error.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    await Employee.deleteMany({ reportId });
    await Report.findByIdAndDelete(reportId);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete report', error: error.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const { reportId } = req.query;
    let filter = {};
    if (reportId) filter.reportId = reportId;

    const employees = await Employee.find(filter).populate('reportId', REPORT_POPULATE_FIELDS).lean();
    res.json(attachStatus(employees));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('reportId').lean();
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json({ ...employee, status: employee.reportId?.employeeType || null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
  }
};

// Column definitions shared by every export: header text, source key and
// display width, so the sheet layout stays consistent across exports.
const EXPORT_COLUMNS = [
  { header: 'Employee ID', key: 'employeeId', width: 14 },
  { header: 'Employee Name', key: 'employeeName', width: 24 },
  { header: 'Company', key: 'company', width: 18 },
  { header: 'Department', key: 'department', width: 18 },
  { header: 'Location', key: 'location', width: 16 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Month', key: 'month', width: 12 },
  { header: 'Year', key: 'year', width: 10 },
  { header: 'Total Work Duration', key: 'totalWorkDuration', width: 16 },
  { header: 'Total OT', key: 'totalOT', width: 12 },
  { header: 'Total Duration (+OT)', key: 'totalDurationOT', width: 16 },
  { header: 'Late By', key: 'lateBy', width: 12 },
  { header: 'Remote Days', key: 'remoteDays', width: 12 },
  { header: 'Clock In Days', key: 'clockInDays', width: 14 },
  { header: 'Payroll Present Days', key: 'payrollPresentDays', width: 16 },
  { header: 'Absent', key: 'absent', width: 10 },
  { header: 'Early Out', key: 'earlyOut', width: 12 },
  { header: 'Remote Hours', key: 'remoteHours', width: 12 },
  { header: 'Week Off', key: 'weekOff', width: 10 },
  { header: 'Holidays', key: 'holidays', width: 10 },
  { header: 'Hourly Leaves', key: 'hourlyLeaves', width: 14 },
  { header: 'Leaves Taken', key: 'leavesTaken', width: 14 },
  { header: 'Average Working Hours', key: 'averageWorkingHours', width: 18 },
];

// Builds a formatted row object from an employee + populated report
const buildRow = (emp) => ({
  employeeId: emp.employeeId,
  employeeName: emp.employeeName,
  company: emp.company,
  department: emp.department,
  location: emp.location,
  status: emp.reportId?.employeeType || '',
  month: emp.reportId?.month || '',
  year: emp.reportId?.year || '',
  totalWorkDuration: emp.totalWorkDuration,
  totalOT: emp.totalOT,
  totalDurationOT: emp.totalDurationOT,
  lateBy: emp.lateBy,
  remoteDays: emp.remoteDays,
  clockInDays: emp.clockInDays,
  payrollPresentDays: emp.payrollPresentDays,
  absent: emp.absent,
  earlyOut: emp.earlyOut,
  remoteHours: emp.remoteHours,
  weekOff: emp.weekOff,
  holidays: emp.holidays,
  hourlyLeaves: emp.hourlyLeaves,
  leavesTaken: emp.leavesTaken,
  averageWorkingHours: emp.averageWorkingHours,
});

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
const THIN_BORDER = { style: 'thin', color: { argb: 'FFD0D7DE' } };

const sendExcel = async (res, rows, filename) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Employee Attendance System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Attendance', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = EXPORT_COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  ws.addRows(rows);

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER, bottom: THIN_BORDER };
  });

  // Body styling: borders, centered numeric-looking columns, zebra striping
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = { top: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER, bottom: THIN_BORDER };
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 5 ? 'left' : 'center' };
      if (i % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
      }
    });
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_COLUMNS.length } };

  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(Buffer.from(buf));
};

// Export: single employee — selected month only
exports.exportEmployeeMonth = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'month and year are required' });

    const filter = { month, year };
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;

    const reports = await Report.find(filter);
    if (reports.length === 0) return res.status(404).json({ message: 'No reports found for that month' });

    const reportIds = reports.map(r => r._id);
    const employees = await Employee.find({
      _id: req.params.id,
      reportId: { $in: reportIds },
    }).populate('reportId', 'month year employeeType').lean();

    if (employees.length === 0) return res.status(404).json({ message: 'Employee not found for that month' });

    const rows = employees.map(buildRow);
    const emp = employees[0];
    await sendExcel(res, rows, `${emp.employeeName}_${month}_${year}.xlsx`);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
};

// Export: single employee — all months
exports.exportEmployeeAll = async (req, res) => {
  try {
    // Find the target employee first to get its employeeId
    const target = await Employee.findById(req.params.id).lean();
    if (!target) return res.status(404).json({ message: 'Employee not found' });

    const allRecords = await Employee
      .find({ employeeId: target.employeeId })
      .populate('reportId', 'month year employeeType startDate endDate')
      .lean();

    if (allRecords.length === 0) return res.status(404).json({ message: 'No records found' });

    // Sort by year then month name
    const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    allRecords.sort((a, b) => {
      const yearDiff = parseInt(a.reportId?.year || 0) - parseInt(b.reportId?.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return MONTH_ORDER.indexOf(a.reportId?.month) - MONTH_ORDER.indexOf(b.reportId?.month);
    });

    const rows = allRecords.map(buildRow);
    await sendExcel(res, rows, `${target.employeeName}_All_Months.xlsx`);
  } catch (error) {
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
};
