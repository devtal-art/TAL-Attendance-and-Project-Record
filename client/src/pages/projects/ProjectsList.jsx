import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { FolderKanban, Download, Upload as UploadIcon } from 'lucide-react';
import { getProjects } from '../../services/projectsApi';
import { Button } from '../../components/ui/button';
import ProjectsFilters from '../../components/projects/ProjectsFilters';
import ProjectsTable from '../../components/projects/ProjectsTable';

const DEFAULT_FILTERS = { search: '', month: 'All', year: 'All', brand: 'All', status: 'All' };

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

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

  const years = useMemo(
    () => Array.from(new Set(projects.map((p) => p.year))).sort((a, b) => a - b),
    [projects],
  );
  const brands = useMemo(
    () => Array.from(new Set(projects.map((p) => p.brand).filter(Boolean))).sort(),
    [projects],
  );
  const statuses = useMemo(
    () => Array.from(new Set(projects.map((p) => p.status).filter(Boolean))).sort(),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return projects.filter((p) => {
      if (filters.month !== 'All' && p.month !== filters.month) return false;
      if (filters.year !== 'All' && String(p.year) !== String(filters.year)) return false;
      if (filters.brand !== 'All' && p.brand !== filters.brand) return false;
      if (filters.status !== 'All' && p.status !== filters.status) return false;
      if (search) {
        const haystack = `${p.projectName ?? ''} ${p.brand ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [projects, filters]);

  const handleLinksSaved = (id, links) => {
    setProjects((prev) => prev.map((p) => (p._id === id ? { ...p, links } : p)));
  };

  const handleExport = () => {
    const rows = filteredProjects.map((p) => ({
      Month: p.month,
      Year: p.year,
      Brand: p.brand,
      'Project Name': p.projectName,
      'Project Status': p.status,
      Links: (p.links || []).join('; '),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 18 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, `projects_export_${Date.now()}.xlsx`);
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
        <p className="text-gray-500 mt-2 mb-4">Upload a project sheet to see your projects here.</p>
        <Link to="/projects/upload">
          <Button>
            <UploadIcon className="w-4 h-4 mr-2" /> Upload Project Sheet
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Projects</h2>
          <p className="text-sm text-gray-500">{projects.length} project(s) loaded</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="mb-6">
        <ProjectsFilters filters={filters} onChange={setFilters} years={years} brands={brands} statuses={statuses} />
      </div>

      <ProjectsTable projects={filteredProjects} onLinksSaved={handleLinksSaved} />
    </div>
  );
}
