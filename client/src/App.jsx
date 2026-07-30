import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Employees from './pages/Employees';
import EmployeeDetails from './pages/EmployeeDetails';
import History from './pages/History';
import ProjectsDashboard from './pages/projects/ProjectsDashboard';
import ProjectsUpload from './pages/projects/ProjectsUpload';
import ProjectsList from './pages/projects/ProjectsList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetails />} />
          <Route path="history" element={<History />} />
          <Route path="projects" element={<ProjectsDashboard />} />
          <Route path="projects/upload" element={<ProjectsUpload />} />
          <Route path="projects/all" element={<ProjectsList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
