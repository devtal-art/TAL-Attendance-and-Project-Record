import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, History, FileSpreadsheet, FolderKanban, Menu, X } from 'lucide-react';

// Per-module color accents - purely presentational (panel background, label
// tint, active state, icon tint). Navigation targets and active-match logic
// are untouched. Each module's whole section sits on a tinted background
// panel so the two modules read as distinct blocks, not just colored text.
const ACCENT_STYLES = {
  blue: {
    panelBg: 'bg-blue-50/70',
    label: 'text-blue-700',
    hoverBg: 'hover:bg-blue-100/70',
    activeBg: 'bg-white shadow-sm',
    activeText: 'text-blue-700',
    activeBorder: 'border-blue-600',
    activeIcon: 'text-blue-600',
    mutedIcon: 'text-blue-400',
  },
  green: {
    panelBg: 'bg-green-50/70',
    label: 'text-green-700',
    hoverBg: 'hover:bg-green-100/70',
    activeBg: 'bg-white shadow-sm',
    activeText: 'text-green-700',
    activeBorder: 'border-green-600',
    activeIcon: 'text-green-600',
    mutedIcon: 'text-green-400',
  },
};

const NAV_GROUPS = [
  {
    label: 'Attendance Records',
    accent: 'blue',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Upload Report', href: '/upload', icon: Upload },
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Upload History', href: '/history', icon: History },
    ],
  },
  {
    label: 'Project Records',
    accent: 'green',
    items: [
      { name: 'Dashboard', href: '/projects', icon: LayoutDashboard },
      { name: 'Upload Report', href: '/projects/upload', icon: Upload },
      { name: 'Projects', href: '/projects/all', icon: FolderKanban },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((group) => group.items);

// Shared between the permanent desktop sidebar and the mobile slide-out
// drawer so the nav markup/logic only exists once (isNavItemActive and
// NAV_GROUPS stay the single source of truth for both).
function SidebarNav({ isNavItemActive, onNavigate }) {
  return (
    <nav className="px-4">
      {NAV_GROUPS.map((group, groupIndex) => {
        const accent = ACCENT_STYLES[group.accent];
        return (
          <div
            key={group.label}
            className={`rounded-xl p-3 ${accent.panelBg} ${groupIndex > 0 ? 'mt-6' : ''}`}
          >
            <p className={`px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider ${accent.label}`}>
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onNavigate}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border-l-2 transition-colors ${
                      isActive
                        ? `${accent.activeBg} ${accent.activeText} ${accent.activeBorder}`
                        : `text-gray-700 border-transparent ${accent.hoverBg} hover:text-gray-900`
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? accent.activeIcon : accent.mutedIcon}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center min-w-0">
      <FileSpreadsheet className="w-6 h-6 text-primary mr-2 shrink-0" />
      <span className="font-bold text-lg text-gray-900 tracking-tight truncate">TAL Analytics</span>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // '/projects' has a nested '/projects/upload' child route, so (like the root
  // '/' entry) it must only highlight on an exact match - otherwise both nav
  // items would light up together while on the upload page.
  const isNavItemActive = (href) =>
    location.pathname === href || (href !== '/' && href !== '/projects' && location.pathname.startsWith(href));

  // Close the mobile drawer on navigation, Escape, and lock background
  // scroll while it's open - all cheap, JS is only used for behavior CSS
  // alone can't express (route changes, keyboard, scroll lock).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop sidebar - unchanged from the original always-visible layout,
          just hidden below lg where the mobile drawer takes over. */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav isNavItemActive={isNavItemActive} />
        </div>
      </div>

      {/* Mobile nav backdrop + drawer - always mounted (cheap: one nav list)
          so the slide/fade is a real CSS transition instead of a hard cut. */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200 ${
          mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col transform transition-transform duration-200 lg:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!mobileNavOpen}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <BrandMark />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="p-2 -mr-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav isNavItemActive={isNavItemActive} onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 lg:px-8 shadow-sm gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden -ml-1 p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate min-w-0">
            {FLAT_NAV.find(n => isNavItemActive(n.href))?.name || 'Analytics'}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-2 text-center">
          <p className="text-[11px] sm:text-xs text-gray-400">
            For the best experience with large datasets and detailed views, use a desktop or switch your browser to Desktop View.
          </p>
        </footer>
      </div>
    </div>
  );
}
