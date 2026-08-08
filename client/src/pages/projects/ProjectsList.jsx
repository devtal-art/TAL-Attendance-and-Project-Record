import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, ListTree, Table2, FolderKanban, Upload as UploadIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import ProjectsFilters from '../../components/projects/ProjectsFilters';
import ProjectsSimpleTable from '../../components/projects/ProjectsSimpleTable';
import HierarchyTree from '../../components/projects/HierarchyTree';
import { getProjects } from '../../services/projectsApi';
import { DEFAULT_FILTERS, filterRecords, getCascadingFilterOptions, sanitizeFilters } from '../../components/projects/dataUtils';

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'hierarchy'

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

  const filterOptions = useMemo(() => getCascadingFilterOptions(projects, filters), [projects, filters]);
  const filteredProjects = useMemo(() => filterRecords(projects, filters), [projects, filters]);
  const searchActive = filters.search.trim() !== '';

  // Every filter change (including a per-field clear or "Clear all", both of
  // which also just call onChange) is sanitized so a dependent Month/Brand/
  // Category/Department selection that's no longer possible under the new
  // combination gets reset to "All" instead of silently showing a filtered
  // set that doesn't match what's displayed.
  const handleFiltersChange = (next) => setFilters(sanitizeFilters(projects, next));

  const handleExport = () => {
    const rows = filteredProjects.map((r) => ({
      Year: r.year,
      Brand: r.brand,
      Category: r.category,
      Department: r.department,
      Month: r.month,
      'Project Name': r.taskName,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 40 }];
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
        <p className="text-gray-500 mt-2 mb-4">Upload a project sheet to get started.</p>
        <Link to="/projects/upload">
          <Button>
            <UploadIcon className="w-4 h-4 mr-2" /> Upload Project Sheet
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col lg:h-[calc(100vh-8rem)]">
      <div className="p-6 pb-0 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Projects</h2>
            <p className="text-sm text-gray-500">{filteredProjects.length} of {projects.length} project(s)</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>

        <div className="mb-6">
          <ProjectsFilters filters={filters} onChange={handleFiltersChange} {...filterOptions} />
        </div>

        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Table2 className="w-4 h-4" /> Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hierarchy')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'hierarchy' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ListTree className="w-4 h-4" /> Hierarchy View
          </button>
        </div>
      </div>

      {/* Below lg the card above is auto-height (its fixed viewport-relative
          height is lg-only), so this box needs its own determinate height
          for HierarchyTree/ProjectsSimpleTable's internal h-full scroll
          regions to size against - otherwise a tall stacked mobile filter
          set can squeeze this down to nothing via flex-1/min-h-0. At lg+
          this is unchanged from the original flex-1/min-h-0 fill-remaining-
          space behavior. */}
      <div className="h-[70vh] lg:h-auto lg:flex-1 lg:min-h-0 p-6 pt-4">
        {viewMode === 'table' ? (
          <ProjectsSimpleTable records={filteredProjects} />
        ) : (
          <HierarchyTree records={filteredProjects} fillHeight searchActive={searchActive} totalCount={projects.length} />
        )}
      </div>
    </div>
  );
}
