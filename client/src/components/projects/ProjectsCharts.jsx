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
import { getUniqueSorted } from './dataUtils';
import { getTagColor, getDepartmentColor, getDistinctColorMap } from './constants';

const GRIDLINE = '#e1e0d9';
const AXIS_TEXT = '#898781';
const OTHER_COLOR = '#c3c2b7';
const MAX_SLICES = 7;

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

const buildCountsByKey = (records, keyFn, order) => {
  const counts = new Map();
  records.forEach((r) => {
    const key = keyFn(r);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  if (order) {
    return order.map((key) => ({ name: key, value: counts.get(key) || 0 }));
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
};

// Keeps high-cardinality dimensions (brand, category can have arbitrarily
// many distinct values) readable by collapsing the long tail into "Other".
const groupTopN = (data, n) => {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const restTotal = rest.reduce((sum, d) => sum + d.value, 0);
  return restTotal > 0 ? [...top, { name: 'Other', value: restTotal }] : top;
};

function BarCard({ title, data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRIDLINE} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={{ stroke: GRIDLINE }} tickLine={false} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 50 : 30} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="value" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={28}>
              <LabelList dataKey="value" position="top" fontSize={11} fill="#52514e" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PieCard({ title, data, colorFn }) {
  const colorMap = useMemo(
    () => getDistinctColorMap(data.filter((d) => d.name !== 'Other').map((d) => d.name), colorFn),
    [data, colorFn],
  );
  const colorFor = (name) => (name === 'Other' ? OTHER_COLOR : colorMap.get(name));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-auto sm:h-72">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:h-full">
          {/* Fixed width on sm+ (matches existing desktop layout exactly);
              full-width/capped-height on mobile so it doesn't get squeezed
              beside the legend in a narrow row. */}
          <div className="shrink-0 w-full h-48 sm:w-[190px] sm:h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" labelLine={false}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={colorFor(entry.name)}
                      stroke="#fcfcfb"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CountTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-64 pr-1">
            {data.length === 0 && <p className="text-sm text-gray-400 text-center">No data available</p>}
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="flex-shrink-0 w-3 h-3 rounded-full"
                  style={{ backgroundColor: colorFor(entry.name) }}
                />
                <span className="flex-1 text-sm text-gray-700 truncate" title={entry.name}>{entry.name}</span>
                <span className="flex-shrink-0 text-sm font-semibold text-gray-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectsCharts({ records }) {
  const byMonth = useMemo(
    () => buildCountsByKey(records, (r) => r.month, getUniqueSorted(records, 'month')),
    [records],
  );

  const byYear = useMemo(
    () => buildCountsByKey(records, (r) => String(r.year), getUniqueSorted(records, 'year').map(String)),
    [records],
  );

  const byDepartment = useMemo(() => {
    const counts = buildCountsByKey(records, (r) => r.department || 'Unspecified');
    return groupTopN(counts, MAX_SLICES).sort((a, b) => b.value - a.value);
  }, [records]);

  const byCategory = useMemo(() => {
    const counts = buildCountsByKey(records, (r) => r.category || 'Unspecified');
    return groupTopN(counts, MAX_SLICES);
  }, [records]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BarCard title="Projects by Month" data={byMonth} />
      <BarCard title="Projects by Year" data={byYear} />
      <PieCard title="Projects by Department" data={byDepartment} colorFn={getDepartmentColor} />
      <PieCard title="Projects by Category" data={byCategory} colorFn={getTagColor} />
    </div>
  );
}
