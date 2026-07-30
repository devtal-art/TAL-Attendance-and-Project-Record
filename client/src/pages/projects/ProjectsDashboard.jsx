import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Upload as UploadIcon } from 'lucide-react';
import { getProjects } from '../../services/projectsApi';
import { Button } from '../../components/ui/button';
import ProjectsSummaryCards from '../../components/projects/ProjectsSummaryCards';
import ProjectsCharts from '../../components/projects/ProjectsCharts';

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <FolderKanban className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">No Projects Found</h2>
        <p className="text-gray-500 mt-2 mb-4">Upload a project sheet to see the dashboard.</p>
        <Link to="/projects/upload">
          <Button>
            <UploadIcon className="w-4 h-4 mr-2" /> Upload Project Sheet
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Projects Overview</h2>
        <p className="text-sm text-gray-500">{projects.length} project(s) loaded</p>
      </div>

      <ProjectsSummaryCards projects={projects} />

      <ProjectsCharts projects={projects} />
    </div>
  );
}
