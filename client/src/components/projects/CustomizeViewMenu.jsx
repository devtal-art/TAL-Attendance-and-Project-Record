import React, { useEffect, useRef, useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { Button } from '../ui/button';
import { VIEW_SECTIONS, FILTER_FIELDS } from './viewPrefs';

function Option({ label, checked, disabled, onChange }) {
  return (
    <label className={`flex items-center gap-2.5 py-1.5 text-sm ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-800'}`}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/50 ${
          checked ? (disabled ? 'border-gray-200 bg-gray-200' : 'border-green-600 bg-green-600') : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

// Popover listing every table column and filter with a checkbox. Unchecking
// one hides it from the screen; Project Name is locked on. The column
// sections depend on which view is open; the filters are the same for all.
export default function CustomizeViewMenu({ view, prefs, onToggle, onReset, onMove }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        <Settings2 className="w-4 h-4 mr-2" /> Customize view
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Customize view"
          className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,34rem)] rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="space-y-4">
              {VIEW_SECTIONS[view].map((section, sectionIndex) => {
                // Table and Compact: the first section's columns are listed in
                // their current order, each with a position number to change.
                const orderable = prefs.columnOrder.length > 0 && sectionIndex === 0;
                const isShown = (item) => item.locked || !prefs.hiddenColumns.includes(item.id);
                const byId = (id) => section.items.find((i) => i.id === id);
                const items = orderable ? prefs.columnOrder.map(byId) : section.items;
                const shownIds = orderable ? prefs.columnOrder.filter((id) => isShown(byId(id))) : [];
                const pinnedFirst = view === 'compact';
                return (
                  <div key={section.title}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{section.title}</p>
                    {orderable && (
                      <div className="mb-2 text-xs leading-snug text-gray-400">
                        Use the number to set where a column goes{pinnedFirst ? '. Project Name always stays first.' : '.'}
                      </div>
                    )}
                    {items.map((item) => {
                      const position = shownIds.indexOf(item.id) + 1;
                      const pinned = pinnedFirst && item.id === 'taskName';
                      return (
                        <div key={item.id} className="flex items-center gap-2.5">
                          {orderable && (
                            position > 0 ? (
                              <select
                                aria-label={`${item.label} position`}
                                title={pinned ? 'Fixed as the first column' : 'Column position'}
                                value={position}
                                disabled={pinned}
                                onChange={(e) => onMove(item.id, Number(e.target.value))}
                                className="h-7 w-12 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white px-1.5 text-center text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                              >
                                {shownIds.map((_, i) => (
                                  <option key={i} value={i + 1} disabled={pinnedFirst && i === 0 && !pinned}>{i + 1}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="w-12 shrink-0 text-center text-sm text-gray-300" title="Hidden">-</span>
                            )
                          )}
                          <Option
                            label={item.label}
                            checked={isShown(item)}
                            disabled={item.locked}
                            onChange={() => onToggle('hiddenColumns', item.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Filters</p>
              {FILTER_FIELDS.map((f) => (
                <Option
                  key={f.id}
                  label={f.label}
                  checked={!prefs.hiddenFilters.includes(f.id)}
                  onChange={() => onToggle('hiddenFilters', f.id)}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onReset}
              className="text-sm font-semibold text-green-700 underline underline-offset-2 hover:text-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 rounded"
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
