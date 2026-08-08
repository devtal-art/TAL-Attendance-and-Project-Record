import React, { useMemo, useState } from 'react';
import { AlertTriangle, Copy, ChevronDown, ChevronRight } from 'lucide-react';

function Section({ title, tone, children }) {
  const [open, setOpen] = useState(false);
  const toneClasses = tone === 'warning'
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-orange-50 border-orange-200 text-orange-800';

  return (
    <div className={`border rounded-lg ${toneClasses}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-left">
          {tone === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-3 max-h-64 overflow-auto">{children}</div>}
    </div>
  );
}

// Preview-only: surfaces validation issues and duplicate rows for review.
// Nothing here filters or removes data - it's purely informational so the
// user can decide whether to fix the sheet and re-upload before saving.
export default function ValidationDuplicatesPanel({ records, invalidCount, duplicateCount }) {
  const invalidRows = useMemo(() => records.filter((r) => !r.valid), [records]);
  const duplicateRows = useMemo(() => records.filter((r) => r.isDuplicate), [records]);

  if (invalidCount === 0 && duplicateCount === 0) return null;

  return (
    <div className="space-y-3">
      {invalidCount > 0 && (
        <Section
          title={`${invalidCount} invalid row(s) found — missing required fields, these will be skipped on save`}
          tone="warning"
        >
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="text-left text-amber-700">
                <th className="py-1 pr-3 font-medium">Row</th>
                <th className="py-1 pr-3 font-medium">Project Name</th>
                <th className="py-1 font-medium">Missing Fields</th>
              </tr>
            </thead>
            <tbody>
              {invalidRows.map((r) => (
                <tr key={r.rowNumber} className="border-t border-amber-100">
                  <td className="py-1 pr-3">{r.rowNumber}</td>
                  <td className="py-1 pr-3">{r.taskName || <span className="italic text-amber-400">(blank)</span>}</td>
                  <td className="py-1">{r.missingFields.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {duplicateCount > 0 && (
        <Section
          title={`${duplicateCount} duplicate project(s) found — review below, nothing is removed automatically`}
          tone="duplicate"
        >
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-orange-700">
                <th className="py-1 pr-3 font-medium">Row</th>
                <th className="py-1 pr-3 font-medium">Year</th>
                <th className="py-1 pr-3 font-medium">Brand</th>
                <th className="py-1 pr-3 font-medium">Category</th>
                <th className="py-1 pr-3 font-medium">Department</th>
                <th className="py-1 pr-3 font-medium">Month</th>
                <th className="py-1 font-medium">Project Name</th>
              </tr>
            </thead>
            <tbody>
              {duplicateRows.map((r) => (
                <tr key={r.rowNumber} className="border-t border-orange-100">
                  <td className="py-1 pr-3">{r.rowNumber}</td>
                  <td className="py-1 pr-3">{r.year}</td>
                  <td className="py-1 pr-3">{r.brand}</td>
                  <td className="py-1 pr-3">{r.category}</td>
                  <td className="py-1 pr-3">{r.department}</td>
                  <td className="py-1 pr-3">{r.month}</td>
                  <td className="py-1">{r.taskName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
