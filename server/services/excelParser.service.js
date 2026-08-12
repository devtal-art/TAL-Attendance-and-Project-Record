const xlsx = require('xlsx');
const { normalizeDepartment } = require('../utils/departmentMap');

function extractMetrics(rows) {
  const metrics = {};
  
  // A mapping of labels to model fields
  const keyMapping = {
    'Total Work Duration': 'totalWorkDuration',
    'Total OT': 'totalOT',
    'Total Duration (+OT)': 'totalDurationOT',
    'Late By': 'lateBy',
    'Remote Days': 'remoteDays',
    'Clock In Days': 'clockInDays',
    'Payroll Present Days': 'payrollPresentDays',
    'Absent': 'absent',
    'Early Out': 'earlyOut',
    'Remote Hours': 'remoteHours',
    'Week Off': 'weekOff',
    'Holidays': 'holidays',
    'Hourly Leaves': 'hourlyLeaves',
    'Leaves Taken': 'leavesTaken',
    'Average Working Hours': 'averageWorkingHours'
  };

  // Scan through the provided rows block
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cellValue = row[c];
      if (typeof cellValue === 'string' && keyMapping[cellValue]) {
        // Value is typically at c+2 because of the empty column in between
        let value = row[c + 2];
        
        // Sometimes it might just be c+1 if no null exists, so let's check
        if (value === undefined || value === null || String(value).trim() === '') {
           if (row[c+1] !== undefined && row[c+1] !== null) {
              value = row[c+1];
           }
        }

        const key = keyMapping[cellValue];
        metrics[key] = value;
      }
    }
  }

  return metrics;
}

exports.parseAttendanceReport = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to 2D array
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  let reportName = "Attendance Report";
  let startDate = "";
  let endDate = "";
  let month = "";
  let year = "";

  // 1. Find Header Information
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row[0] && typeof row[0] === 'string') {
      if (row[0].toLowerCase().includes('monthly status report')) {
        reportName = row[0];
      } else if (row[0].includes(' To ')) {
        const parts = row[0].split(' To ');
        if (parts.length === 2) {
          startDate = parts[0].trim();
          endDate = parts[1].trim();
          
          const dateParts = startDate.split(' ');
          if (dateParts.length >= 3) {
             month = dateParts[1];
             year = dateParts[2];
          }
        }
      }
    }
  }

  // 2. Extract Employees
  const employees = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] === 'Company' && row[2] === 'Employee ID') {
      // We found a company header row, the values are in the next row
      const valRow = data[i + 1];
      if (valRow) {
        const company = valRow[0];
        const employeeId = valRow[2];
        const department = normalizeDepartment(valRow[4]);
        const location = valRow[6];
        const employeeName = valRow[8];

        // The metrics are in the next few rows (e.g. i+2 to i+6)
        const metricsBlock = data.slice(i + 2, i + 8);
        const metrics = extractMetrics(metricsBlock);

        employees.push({
          company,
          employeeId,
          department,
          location,
          employeeName,
          ...metrics
        });
      }
    }
  }

  return {
    reportData: {
      reportName,
      month,
      year,
      startDate,
      endDate,
      employeeCount: employees.length
    },
    employeesData: employees
  };
};
