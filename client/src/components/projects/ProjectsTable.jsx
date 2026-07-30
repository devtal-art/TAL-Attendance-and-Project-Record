import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, FolderOpen, Pencil, ExternalLink } from 'lucide-react';
import { monthIndex, getStatusColor } from './constants';
import { updateProjectLinks } from '../../services/projectsApi';

const PAGE_SIZE = 50;

const monthSortingFn = (rowA, rowB) => monthIndex(rowA.original.month) - monthIndex(rowB.original.month);

// Inline editable "Links" cell - view mode shows saved links as clickable
// pills, edit mode swaps in a textarea (one link per line) with Save/Cancel.
function LinksCell({ project, onSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const links = project.links || [];

  const startEdit = () => {
    setDraft(links.join('\n'));
    setIsEditing(true);
  };

  const save = async () => {
    const cleaned = draft.split('\n').map((l) => l.trim()).filter(Boolean);
    setSaving(true);
    try {
      const updated = await updateProjectLinks(project._id, cleaned);
      onSaved(project._id, updated.links ?? cleaned);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save links', error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[220px] py-1" onClick={(e) => e.stopPropagation()}>
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste one link per line..."
          className="w-full text-xs rounded-md border border-gray-300 p-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex gap-1.5">
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
      {links.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[220px]"
              title={link}
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              {link}
            </a>
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-400">No links</span>
      )}
      <button onClick={startEdit} className="text-gray-400 hover:text-primary shrink-0" title="Edit links">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ProjectsTable({ projects, onLinksSaved }) {
  const [sorting, setSorting] = useState([{ id: 'month', desc: false }]);

  const columns = useMemo(
    () => [
      { accessorKey: 'month', header: 'Month', sortingFn: monthSortingFn },
      { accessorKey: 'year', header: 'Year', sortingFn: 'basic' },
      { accessorKey: 'brand', header: 'Brand', sortingFn: 'alphanumeric' },
      { accessorKey: 'projectName', header: 'Project Name', sortingFn: 'alphanumeric' },
      {
        accessorKey: 'status',
        header: 'Status',
        sortingFn: 'alphanumeric',
        cell: (info) => {
          const status = info.getValue();
          const color = getStatusColor(status);
          return (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {status || '—'}
            </span>
          );
        },
      },
      {
        id: 'links',
        header: 'Links',
        enableSorting: false,
        cell: ({ row }) => <LinksCell project={row.original} onSaved={onLinksSaved} />,
      },
    ],
    [onLinksSaved],
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    state: { sorting },
  });

  const rows = table.getRowModel().rows;

  return (
    <div>
      <div className="max-h-[600px] overflow-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="bg-gray-50">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 select-none hover:text-gray-900"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
                        {sortDir === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
                        {!sortDir && <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />}
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                    <FolderOpen className="w-8 h-8" />
                    <span className="text-sm">No projects match the current filters.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-4">
        <span className="text-sm text-gray-500">
          {projects.length} project{projects.length === 1 ? '' : 's'} total
        </span>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
