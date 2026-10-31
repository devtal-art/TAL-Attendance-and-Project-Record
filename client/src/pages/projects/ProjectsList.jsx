import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, ListTree, Table2, LayoutList, FolderKanban, Upload as UploadIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import ProjectsFilters from '../../components/projects/ProjectsFilters';
import ProjectsSimpleTable from '../../components/projects/ProjectsSimpleTable';
import HierarchyTree from '../../components/projects/HierarchyTree';
import ProjectsCompactView from '../../components/projects/ProjectsCompactView';
import { getProjects } from '../../services/projectsApi';
import { DEFAULT_FILTERS, filterRecords, getCascadingFilterOptions, sanitizeFilters, attachFrequency, formatLinksForExport, validateProjectFilters } from '../../components/projects/dataUtils';
import CustomizeViewMenu from '../../components/projects/CustomizeViewMenu';
import useProjectViewPrefs from '../../components/projects/viewPrefs';
import useUrlFilters from '../../lib/useUrlFilters';

// The filters plus which view is open ('table' | 'hierarchy' | 'compact') all
// live in the URL, so a copied link reopens exactly what's on screen.
const VIEWS = ['table', 'hierarchy', 'compact'];
const VIEW_HINTS = {
  table: 'One row per project',
  hierarchy: 'Browse by year, month, brand and category',
  compact: 'One card per repeated task',
};
const URL_DEFAULTS = { ...DEFAULT_FILTERS, view: 'table' };
const validateUrlState = (state) => ({
  ...validateProjectFilters(state),
  view: VIEWS.includes(state.view) ? state.view : 'table',
});

export default function ProjectsList() {
  const [rawProjects, setProjects] = useState([]);
  // Frequency is derived from the whole data set, never stored or uploaded.
  const projects = useMemo(() => attachFrequency(rawProjects), [rawProjects]);
  const [loading, setLoading] = useState(true);
  const [urlState, setUrlState] = useUrlFilters(URL_DEFAULTS, { validate: validateUrlState });
  const viewMode = urlState.view;
  const { prefs, toggle: togglePref, reset: resetPrefs, move: moveColumn } = useProjectViewPrefs(viewMode);
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

  // A filter switched off in Customize view must not keep narrowing the rows
  // unseen, so its value goes back to "All" (also covers a shared link that
  // carries a filter this browser has hidden).
  const hiddenFilters = prefs.hiddenFilters;
  useEffect(() => {
    const stale = hiddenFilters.filter((key) => filters[key] !== DEFAULT_FILTERS[key]);
    if (stale.length === 0) return;
    const next = { ...filters };
    stale.forEach((key) => { next[key] = DEFAULT_FILTERS[key]; });
    setFilters(projects.length ? sanitizeFilters(projects, next) : next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenFilters, filters]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
      <div className="p-6 pb-0 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Projects</h2>
            <p className="text-sm text-gray-500">{filteredProjects.length} of {projects.length} project(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomizeViewMenu view={viewMode} prefs={prefs} onToggle={togglePref} onReset={resetPrefs} onMove={moveColumn} />
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="mb-5">
          <ProjectsFilters filters={filters} onChange={handleFiltersChange} hiddenFilters={hiddenFilters} {...filterOptions} />
        </div>

        {/* Segmented view switcher */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table2 className="w-4 h-4" /> Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              aria-pressed={viewMode === 'hierarchy'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'hierarchy' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListTree className="w-4 h-4" /> Hierarchy View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              aria-pressed={viewMode === 'compact'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'compact' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="w-4 h-4" /> Compact View
            </button>
          </div>
          <span className="text-xs text-slate-400">{VIEW_HINTS[viewMode]}</span>
        </div>
      </div>

      {viewMode === 'compact' ? (
        // Like the table view, not clamped to the viewport - the page scrolls.
        <div className="p-6 pt-4">
          <ProjectsCompactView records={filteredProjects} hiddenColumns={prefs.hiddenColumns} columnOrder={prefs.columnOrder} />
        </div>
      ) : viewMode === 'table' ? (
        // Table view isn't clamped to the viewport: ProjectsSimpleTable
        // sets its own min-height (enough for ~20 rows) so the page scrolls
        // naturally instead of cramming rows into a short internal-scroll box.
        <div className="p-6 pt-4">
          <ProjectsSimpleTable records={filteredProjects} hiddenColumns={prefs.hiddenColumns} columnOrder={prefs.columnOrder} />
        </div>
      ) : (
        // Like the other views, not clamped to the viewport - the tree grows
        // to full height and the page scrolls (pageScroll keeps its sticky
        // brand trail and Year/Month headers working against the page).
        <div className="p-6 pt-4">
          <HierarchyTree records={filteredProjects} hiddenDetails={prefs.hiddenColumns} pageScroll searchActive={searchActive} totalCount={projects.length} />
        </div>
      )}
    </div>
  );
}
