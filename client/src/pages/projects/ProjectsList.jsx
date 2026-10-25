import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, ListTree, Table2, FolderKanban, Upload as UploadIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import ProjectsFilters from '../../components/projects/ProjectsFilters';
import ProjectsSimpleTable from '../../components/projects/ProjectsSimpleTable';
import HierarchyTree from '../../components/projects/HierarchyTree';
import { getProjects } from '../../services/projectsApi';
import { DEFAULT_FILTERS, filterRecords, getCascadingFilterOptions, sanitizeFilters, formatLinksForExport, validateProjectFilters } from '../../components/projects/dataUtils';
import useUrlFilters from '../../lib/useUrlFilters';

// The filters plus which view is open ('table' | 'hierarchy') all live in
// the URL, so a copied link reopens exactly what's on screen.
const URL_DEFAULTS = { ...DEFAULT_FILTERS, view: 'table' };
const validateUrlState = (state) => ({
  ...validateProjectFilters(state),
  view: state.view === 'hierarchy' ? 'hierarchy' : 'table',
});

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urlState, setUrlState] = useUrlFilters(URL_DEFAULTS, { validate: validateUrlState });
  const viewMode = urlState.view;
  const filters = useMemo(() => {
    const rest = { ...urlState };
    delete rest.view;
    return rest;
  }, [urlState]);
  const setFilters = (next) => setUrlState((prev) => ({ ...next, view: prev.view }));
  const setViewMode = (view) => setUrlState((prev) => ({ ...prev, view }));

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
  const searchActive = filters.search.trim() !== '';

  // Every filter change (including a per-field clear or "Clear all", both of
  // which also just call onChange) is sanitized so a dependent Month/Brand/
  // Category/Department selection that's no longer possible under the new
  // combination gets reset to "All" instead of silently showing a filtered
  // set that doesn't match what's displayed.
  const handleFiltersChange = (next) => setFilters(sanitizeFilters(projects, next));

  // Column headers here match the import format exactly (see
  // projectExcelParser.service.js's HEADER_ALIASES / OPTIONAL_HEADER_ALIASES)
  // so an exported file can be re-uploaded as-is - including 'Task Name'
  // rather than 'Project Name', which the parser would otherwise resolve to
  // Category (its own accepted alias), not Task Name.
  const handleExport = () => {
    const rows = filteredProjects.map((r) => ({
      Year: r.year,
      Brand: r.brand,
      Category: r.category,
      Department: r.department,
      'Week No.': r.weekNo || '',
      Month: r.month,
      'Task Name': r.taskName,
      Links: formatLinksForExport(r.links),
      Status: r.status || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 9 }, { wch: 8 }, { wch: 40 }, { wch: 55 }, { wch: 14 }];
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
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${
        viewMode === 'table' ? '' : 'lg:h-[calc(100vh-8rem)]'
      }`}
    >
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

      {viewMode === 'table' ? (
        // Table view isn't clamped to the viewport: ProjectsSimpleTable
        // sets its own min-height (enough for ~20 rows) so the page scrolls
        // naturally instead of cramming rows into a short internal-scroll box.
        <div className="p-6 pt-4">
          <ProjectsSimpleTable records={filteredProjects} />
        </div>
      ) : (
        // Below lg the card above is auto-height (its fixed viewport-relative
        // height is lg-only), so this box needs its own determinate height
        // for HierarchyTree's internal h-full scroll region to size against -
        // otherwise a tall stacked mobile filter set can squeeze this down to
        // nothing via flex-1/min-h-0. At lg+ this is unchanged from the
        // original flex-1/min-h-0 fill-remaining-space behavior.
        <div className="h-[70vh] lg:h-auto lg:flex-1 lg:min-h-0 p-6 pt-4">
          <HierarchyTree records={filteredProjects} fillHeight searchActive={searchActive} totalCount={projects.length} />
        </div>
      )}
    </div>
  );
}
