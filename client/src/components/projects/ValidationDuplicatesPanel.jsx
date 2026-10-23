import React, { useMemo, useState } from 'react';
import { AlertTriangle, Copy, DatabaseZap, ChevronDown, ChevronRight } from 'lucide-react';

const TONE_CLASSES = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  duplicate: 'bg-orange-50 border-orange-200 text-orange-800',
  existing: 'bg-blue-50 border-blue-200 text-blue-800',
};
const TONE_ICONS = {
  warning: AlertTriangle,
  duplicate: Copy,
  existing: DatabaseZap,
};

function Section({ title, tone, children }) {
  const [open, setOpen] = useState(false);
  const Icon = TONE_ICONS[tone];

  return (
    <div className={`border rounded-lg ${TONE_CLASSES[tone]}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-left">
          <Icon className="w-4 h-4 shrink-0" />
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-3 max-h-64 overflow-auto">{children}</div>}
    </div>
  );
}

// Small table shared by both duplicate sections below - same six columns
// either way, only the row set and color tone differ.
function DuplicateTable({ rows, tone }) {
  const headerClass = tone === 'existing' ? 'text-blue-700' : 'text-orange-700';
  const borderClass = tone === 'existing' ? 'border-blue-100' : 'border-orange-100';
  return (
    <table className="w-full min-w-[640px] text-xs">
      <thead>
        <tr className={`text-left ${headerClass}`}>
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
        {rows.map((r) => (
          <tr key={r.rowNumber} className={`border-t ${borderClass}`}>
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
  );
}

// Preview-only: surfaces validation issues and duplicate rows for review.
// Nothing here filters or removes data itself - it's purely informational so
// the user can see what a save will actually do. Two distinct kinds of
// duplicate are shown separately since they mean different things: a row
// repeated within this file (isDuplicate) vs. a row that's already saved
// from an earlier upload (existsInDatabase, only possible now that uploads
// are additive instead of replacing the whole dataset) - both are excluded
// from being (re-)added on save except the first kind, which - like today -
// is flagged for review but still saved.
export default function ValidationDuplicatesPanel({
  records,
  invalidCount,
  duplicateCount,
  existingDuplicateCount = 0,
  statusUpdateCount = 0,
  unrecognizedStatusCount = 0,
}) {
  const invalidRows = useMemo(() => records.filter((r) => !r.valid), [records]);
  const duplicateRows = useMemo(() => records.filter((r) => r.isDuplicate), [records]);
  const existingDuplicateRows = useMemo(() => records.filter((r) => r.existsInDatabase), [records]);
  const unrecognizedStatusRows = useMemo(() => records.filter((r) => r.valid && r.unrecognizedStatus), [records]);

  if (invalidCount === 0 && duplicateCount === 0 && existingDuplicateCount === 0 && unrecognizedStatusCount === 0) return null;

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
          title={`${duplicateCount} duplicate row(s) within this file — review below, all still get added on save`}
          tone="duplicate"
        >
          <DuplicateTable rows={duplicateRows} tone="duplicate" />
        </Section>
      )}

      {existingDuplicateCount > 0 && (
        <Section
          title={`${existingDuplicateCount} row(s) already exist in the database — these will be skipped on save${
            statusUpdateCount > 0
              ? `, except ${statusUpdateCount} whose missing Status will be filled in from this file (a Status already saved is never changed)`
              : ', nothing else is affected'
          }`}
          tone="existing"
        >
          <DuplicateTable rows={existingDuplicateRows} tone="existing" />
        </Section>
      )}

      {unrecognizedStatusCount > 0 && (
        <Section
          title={`${unrecognizedStatusCount} row(s) have a Status that isn't one of Delivered, Cancelled, Hold, Review, In Progress, Not Started — they'll be saved without a Status`}
          tone="warning"
        >
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="text-left text-amber-700">
                <th className="py-1 pr-3 font-medium">Row</th>
                <th className="py-1 pr-3 font-medium">Project Name</th>
                <th className="py-1 font-medium">Status in file</th>
              </tr>
            </thead>
            <tbody>
              {unrecognizedStatusRows.map((r) => (
                <tr key={r.rowNumber} className="border-t border-amber-100">
                  <td className="py-1 pr-3">{r.rowNumber}</td>
                  <td className="py-1 pr-3">{r.taskName}</td>
                  <td className="py-1">{r.unrecognizedStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
