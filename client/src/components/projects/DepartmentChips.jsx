import React from 'react';
import { getDepartmentChipStyle, splitDepartments } from './constants';

// One chip per department, so "Des,Dev" shows as a green "Des" chip next to a
// blue "Dev" chip rather than one combined chip. `chipClassName` is the chip
// look of the view it's in (each listing uses its own size).
export default function DepartmentChips({ department, chipClassName, className = '' }) {
  const parts = splitDepartments(department);
  if (parts.length === 0) return <span className="text-slate-400">-</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {parts.map((part) => (
        <span key={part} className={chipClassName} style={getDepartmentChipStyle(part)}>
          {part}
        </span>
      ))}
    </span>
  );
}
