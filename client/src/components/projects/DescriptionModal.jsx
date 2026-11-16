import React, { useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { getStatusChipStyle } from './constants';
import DepartmentChips from './DepartmentChips';

const CHIP_CLASS = 'inline-flex items-center whitespace-nowrap rounded-full px-3 py-0.5 text-sm font-medium';

// Same backdrop + Escape-to-close + scroll-lock behavior as LinksModal. A
// project with no description (saved before the column existed, or a blank
// cell) keeps the section but leaves it empty, so the popup's layout doesn't
// change.
export default function DescriptionModal({ record, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const title = `Work Description — ${record.month} ${record.year}${record.weekNo ? ` · Week ${record.weekNo}` : ''}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 px-5 py-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Info className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {record.department && (
                <DepartmentChips department={record.department} chipClassName={CHIP_CLASS} className="gap-2" />
              )}
              {record.status && (
                <span className={CHIP_CLASS} style={getStatusChipStyle(record.status)}>{record.status}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-24 overflow-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-relaxed text-gray-700">
          {record.description}
        </div>
      </div>
    </div>
  );
}
