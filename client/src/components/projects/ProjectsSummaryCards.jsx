import React, { useMemo } from 'react';
import { ListChecks, CalendarRange, Tag, Building2, Layers, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { computeSummaryCounts } from './dataUtils';

const CARD_DEFS = [
  { key: 'tasks', label: 'Total Projects', icon: ListChecks, color: '#2a78d6' },
  { key: 'years', label: 'Total Years', icon: CalendarRange, color: '#4a3aa7' },
  { key: 'brands', label: 'Total Brands', icon: Building2, color: '#1baf7a' },
  { key: 'categories', label: 'Total Categories', icon: Tag, color: '#eb6834' },
  { key: 'departments', label: 'Total Departments', icon: Layers, color: '#e87ba4' },
  { key: 'months', label: 'Total Months', icon: CalendarDays, color: '#eda100' },
];

// Six generic, dynamically-computed metrics reused for both the upload
// preview and the dashboard - nothing here assumes a fixed vocabulary of
// brands/categories/departments/etc.
export default function ProjectsSummaryCards({ records, hideBrand = false }) {
  const counts = useMemo(() => computeSummaryCounts(records), [records]);
  const cardDefs = hideBrand ? CARD_DEFS.filter((c) => c.key !== 'brands') : CARD_DEFS;

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cardDefs.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
            <Icon className="h-4 w-4" style={{ color }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{counts[key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
