import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, History, FileSpreadsheet, FolderKanban } from 'lucide-react';

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

export default function Layout() {
  const location = useLocation();

  // '/projects' has a nested '/projects/upload' child route, so (like the root
  // '/' entry) it must only highlight on an exact match - otherwise both nav
  // items would light up together while on the upload page.
  const isNavItemActive = (href) =>
    location.pathname === href || (href !== '/' && href !== '/projects' && location.pathname.startsWith(href));

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <FileSpreadsheet className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg text-gray-900 tracking-tight">TAL Analytics</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">
            {FLAT_NAV.find(n => isNavItemActive(n.href))?.name || 'Analytics'}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
