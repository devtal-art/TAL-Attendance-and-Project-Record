import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/projects`;

export const uploadProjectsExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getProjects = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const updateProjectLinks = async (id, links) => {
  const response = await axios.patch(`${API_URL}/${id}/links`, { links });
  return response.data;
};
