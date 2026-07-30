import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TOTAL_CARD_ICON, normalizeStatus, getStatusColor, getStatusIcon } from './constants';

// Cards are driven entirely by whatever status values actually appear in the
// uploaded sheet - not a fixed keyword list - so a custom status vocabulary
// (e.g. "5 - Review - Client") gets its own card instead of being invisible.
export default function ProjectsSummaryCards({ projects }) {
  const statusCounts = useMemo(() => {
    const counts = new Map();
    projects.forEach((p) => {
      const status = normalizeStatus(p.status) || 'Unspecified';
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [projects]);

  const TotalIcon = TOTAL_CARD_ICON;

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Projects</CardTitle>
          <TotalIcon className="h-4 w-4 text-gray-700" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
        </CardContent>
      </Card>

      {statusCounts.map(({ status, count }) => {
        const color = getStatusColor(status);
        const Icon = getStatusIcon(status);
        return (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-gray-500 truncate" title={status}>
                {status}
              </CardTitle>
              <Icon className="h-4 w-4 shrink-0" style={{ color }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
