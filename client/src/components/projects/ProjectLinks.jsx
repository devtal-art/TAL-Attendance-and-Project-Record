import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import LinksModal from './LinksModal';

// Self-contained: manages its own popup state so every table/tree cell that
// renders it doesn't need to. The icon shows for every project regardless
// of whether it has links - clicking one with none just opens the popup in
// its empty state (see LinksModal) rather than being a dead/missing control.
export default function ProjectLinks({ links }) {
  const [open, setOpen] = useState(false);
  const count = links?.length || 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={count > 0 ? `${count} link${count === 1 ? '' : 's'}` : 'No links'}
        aria-label="View links"
        className="inline-flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
      >
        <Link2 className="w-4 h-4" />
      </button>
      {open && <LinksModal links={links || []} onClose={() => setOpen(false)} />}
    </>
  );
}
