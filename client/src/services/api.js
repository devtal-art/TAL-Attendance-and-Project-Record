import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const uploadReports = async (files, employeeType, replace = false) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('employeeType', employeeType);
  formData.append('replace', replace);

  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getReports = async () => {
  const response = await axios.get(`${API_URL}/reports`);
  return response.data;
};

export const getReportById = async (id) => {
  const response = await axios.get(`${API_URL}/reports/${id}`);
  return response.data;
};

export const getMonthlySummary = async (month, year, startDate, endDate) => {
  const params = new URLSearchParams({ month, year });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const response = await axios.get(`${API_URL}/reports/monthly-summary?${params.toString()}`);
  return response.data;
};

export const deleteReport = async (id) => {
  const response = await axios.delete(`${API_URL}/reports/${id}`);
  return response.data;
};

export const getEmployees = async (reportId) => {
  const url = reportId ? `${API_URL}/employees?reportId=${reportId}` : `${API_URL}/employees`;
  const response = await axios.get(url);
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await axios.get(`${API_URL}/employees/${id}`);
  return response.data;
};

// Downloads an Excel file for the employee for the selected month
export const exportEmployeeMonth = (id, month, year, startDate, endDate) => {
  const params = new URLSearchParams({ month, year });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const url = `${API_URL}/employees/${id}/export/month?${params.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Downloads an Excel file for the employee across all months
export const exportEmployeeAll = (id) => {
  const url = `${API_URL}/employees/${id}/export/all`;
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
