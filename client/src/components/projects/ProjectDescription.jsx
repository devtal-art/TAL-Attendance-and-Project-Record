import React, { useState } from 'react';
import { Info } from 'lucide-react';
import DescriptionModal from './DescriptionModal';

// Self-contained like ProjectLinks: manages its own popup state. The button
// shows for every occurrence regardless of whether it has a description -
// one without simply opens the popup with an empty description section.
export default function ProjectDescription({ record }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <Info className="h-4 w-4" aria-hidden="true" /> Details
      </button>
      {open && <DescriptionModal record={record} onClose={() => setOpen(false)} />}
    </>
  );
}
