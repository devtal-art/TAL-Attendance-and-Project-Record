import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import { MONTHS, CATEGORICAL_PALETTE, normalizeStatus, getStatusColor } from './constants';

const GRIDLINE = '#e1e0d9';
const AXIS_TEXT = '#898781';
const OTHER_COLOR = '#c3c2b7';
const MAX_BRAND_SLICES = 7;

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{label ?? payload[0].payload.name}</p>
      <p className="text-gray-600">
        <span className="font-medium text-gray-900">{payload[0].value}</span> project(s)
      </p>
    </div>
  );
};

const buildCountsByKey = (projects, keyFn, order) => {
  const counts = new Map();
  projects.forEach((p) => {
    const key = keyFn(p);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  if (order) {
    return order.map((key) => ({ name: key, value: counts.get(key) || 0 }));
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
};

export default function ProjectsCharts({ projects }) {
  const byMonth = useMemo(() => buildCountsByKey(projects, (p) => p.month, MONTHS), [projects]);

  const byYear = useMemo(() => {
    const data = buildCountsByKey(projects, (p) => String(p.year));
    return data.sort((a, b) => Number(a.name) - Number(b.name));
  }, [projects]);

  // Driven by whatever status values are actually in the data - not a fixed
  // keyword list - same as the summary cards, so the two never disagree.
  const byStatus = useMemo(() => {
    const counts = buildCountsByKey(projects, (p) => normalizeStatus(p.status) || 'Unspecified');
    return counts.sort((a, b) => b.value - a.value);
  }, [projects]);

  const byBrand = useMemo(() => {
    const counts = buildCountsByKey(projects, (p) => p.brand || 'Unknown');
    const sorted = counts.sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, MAX_BRAND_SLICES);
    const rest = sorted.slice(MAX_BRAND_SLICES);
    const restTotal = rest.reduce((sum, d) => sum + d.value, 0);
    return restTotal > 0 ? [...top, { name: 'Other', value: restTotal }] : top;
  }, [projects]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Projects by Month</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRIDLINE} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="value" position="top" fontSize={11} fill="#52514e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Brand</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <div className="flex items-center gap-4 h-full">
            <div className="flex-shrink-0" style={{ width: 190, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byBrand}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                  >
                    {byBrand.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === 'Other' ? OTHER_COLOR : CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
                        stroke="#fcfcfb"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CountTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-64 pr-1">
              {byBrand.length === 0 && <p className="text-sm text-gray-400 text-center">No data available</p>}
              {byBrand.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex-shrink-0 w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.name === 'Other' ? OTHER_COLOR : CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] }}
                  />
                  <span className="flex-1 text-sm text-gray-700 truncate" title={entry.name}>{entry.name}</span>
                  <span className="flex-shrink-0 text-sm font-semibold text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Status</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRIDLINE} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={{ stroke: GRIDLINE }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {byStatus.map((entry) => (
                  <Cell key={entry.name} fill={getStatusColor(entry.name)} />
                ))}
                <LabelList dataKey="value" position="top" fontSize={11} fill="#52514e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Year</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byYear} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRIDLINE} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={24}>
                <LabelList dataKey="value" position="top" fontSize={11} fill="#52514e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
