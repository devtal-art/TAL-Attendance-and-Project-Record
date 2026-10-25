import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Upload as UploadIcon } from 'lucide-react';
import { getProjects } from '../../services/projectsApi';
import { Button } from '../../components/ui/button';
import ProjectsSummaryCards from '../../components/projects/ProjectsSummaryCards';
import ProjectsCharts from '../../components/projects/ProjectsCharts';
import ProjectsFilters from '../../components/projects/ProjectsFilters';
import { DEFAULT_FILTERS, filterRecords, getCascadingFilterOptions, sanitizeFilters, validateProjectFilters } from '../../components/projects/dataUtils';
import useUrlFilters from '../../lib/useUrlFilters';

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // Filters live in the URL too, so a copied link reopens filtered.
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS, { validate: validateProjectFilters });

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filters read from a shared link are checked against the real data once
  // it has loaded: a year/month/brand/category/department that doesn't exist
  // here (or no longer does) resets to "All" instead of leaving the page
  // showing an empty result under a dropdown that can't display the value.
  // Held back until then since, before the load, every option looks invalid.
  useEffect(() => {
    if (loading || projects.length === 0) return;
    const fixed = sanitizeFilters(projects, filters);
    if (fixed !== filters) setFilters(fixed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, projects]);

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

  const filterOptions = useMemo(() => getCascadingFilterOptions(projects, filters), [projects, filters]);
  const filteredProjects = useMemo(() => filterRecords(projects, filters), [projects, filters]);
  const handleFiltersChange = (next) => setFilters(sanitizeFilters(projects, next));

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
        <p className="text-sm text-gray-500">{filteredProjects.length} of {projects.length} project(s)</p>
      </div>

      <ProjectsFilters filters={filters} onChange={handleFiltersChange} {...filterOptions} hideBrand />

      <ProjectsSummaryCards records={filteredProjects} hideBrand />

      <ProjectsCharts records={filteredProjects} />
    </div>
  );
}
