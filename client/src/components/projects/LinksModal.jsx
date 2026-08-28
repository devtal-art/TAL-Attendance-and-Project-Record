import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

// Backdrop + Escape-to-close + scroll-lock, matching the pattern already
// used for the mobile nav drawer (Layout.jsx) so modal behavior stays
// consistent across the app.
export default function LinksModal({ links, onClose }) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Links"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Links</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-auto">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
              Links
            </div>
            {links.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No links added for this project.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm text-gray-700 shrink-0">{link.label}:</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate text-sm text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${link.label}`}
                      className="shrink-0 text-gray-400 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
