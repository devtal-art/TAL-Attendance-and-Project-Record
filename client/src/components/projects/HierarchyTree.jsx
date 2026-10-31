import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, ListTree } from 'lucide-react';
import { buildHierarchy, DEFAULT_HIERARCHY_LEVELS, getUniqueSorted } from './dataUtils';
import { getTagChipStyle, getDepartmentChipStyle, getFrequencyChipStyle, getFullMonthName } from './constants';
import ProjectLinks from './ProjectLinks';

// Month is stored/grouped by its short form (Jan, Feb, ...) so sorting and
// keys stay simple, but it reads better spelled out in the tree.
const labelForField = (field, label) => (field === 'month' ? getFullMonthName(label) : label);

// "5 - Norris Hauz Cafe" -> "N": strips a common "<code> - " sheet prefix so
// the avatar initial reads as the brand's actual name, not its row code.
const brandInitial = (label) => {
  const stripped = String(label).replace(/^\d+\s*-\s*/, '').trim();
  const source = stripped || String(label);
  return source.charAt(0).toUpperCase() || '?';
};

// Each hierarchy level gets a deliberately different visual weight - Year
// strongest, Month medium, Brand a plain row with a subtle identity avatar,
// Category the lightest (a small accent badge) - so depth is legible from
// typography alone without leaning on borders or color for every row.
function LevelLabel({ field, label }) {
  if (field === 'year') {
    return <span className="text-[15px] font-semibold text-gray-900">{label}</span>;
  }
  if (field === 'month') {
    return <span className="text-sm font-medium text-gray-700">{label}</span>;
  }
  if (field === 'brand') {
    return (
      <span className="inline-flex items-center gap-2 min-w-0">
        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
          {brandInitial(label)}
        </span>
        <span className="text-sm text-gray-700 truncate">{label}</span>
      </span>
    );
  }
  if (field === 'category') {
    return (
      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium" style={getTagChipStyle(label)}>
        {label}
      </span>
    );
  }
  return <span className="text-sm text-gray-700">{label}</span>;
}

const ROW_PADDING = { year: 'py-2', month: 'py-1.5', brand: 'py-1.5', category: 'py-1.5' };
const INDENT = { year: 'pl-2 sm:pl-3', month: 'pl-5 sm:pl-7', brand: 'pl-8 sm:pl-11', category: 'pl-11 sm:pl-14' };
const COUNT_STYLE = { year: 'text-xs font-medium text-gray-500', month: 'text-xs text-gray-400', brand: 'text-xs text-gray-400', category: 'text-xs text-gray-400' };

function Node({ node, level, levelFields, path, expanded, onToggle, hiddenDetails }) {
  const nodeKey = `${path}/${node.key}`;
  const isOpen = expanded.has(nodeKey);
  const isLastLevel = level === levelFields.length - 1;
  const hasChildren = isLastLevel ? node.tasks.length > 0 : Boolean(node.children?.length);
  const field = levelFields[level];
  const label = labelForField(field, node.label);
  const countText = `${node.taskCount} project${node.taskCount === 1 ? '' : 's'}`;

  return (
    <div>
      <button
        type="button"
        disabled={!hasChildren}
        onClick={() => hasChildren && onToggle(nodeKey)}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label} (${countText})`}
        className={`w-full flex items-center gap-2 pr-3 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${ROW_PADDING[field]} ${INDENT[field]} ${
          hasChildren ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className={`text-gray-400 shrink-0 ${level === 0 ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
          ) : (
            <ChevronRight className={`text-gray-400 shrink-0 ${level === 0 ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
          )
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <LevelLabel field={field} label={label} />
        <span className={`ml-auto shrink-0 ${COUNT_STYLE[field]}`}>{countText}</span>
      </button>

      {isOpen && !isLastLevel && (
        <div className="animate-hierarchy-fade-in">
          {node.children.map((child) => (
            <Node key={child.key} node={child} level={level + 1} levelFields={levelFields} path={nodeKey} expanded={expanded} onToggle={onToggle} hiddenDetails={hiddenDetails} />
          ))}
        </div>
      )}

      {isOpen && isLastLevel && (
        <ul className="pb-1.5 pl-14 sm:pl-[4.5rem] pr-3 space-y-0.5 animate-hierarchy-fade-in">
          {node.tasks.map((project, i) => (
            <li key={project._id || i} className="text-sm text-gray-700 py-1 flex items-start gap-2">
              <span className="text-gray-300 shrink-0 mt-0.5">&bull;</span>
              <span className="flex-1 min-w-0 break-words">{project.taskName}</span>
              {!hiddenDetails.includes('weekNo') && (
                <span className="shrink-0 whitespace-nowrap text-xs text-gray-400 mt-0.5">Week no. {project.weekNo || '-'}</span>
              )}
              {!hiddenDetails.includes('links') && (
                <span className="shrink-0 mt-0.5"><ProjectLinks links={project.links} /></span>
              )}
              {project.frequency && !hiddenDetails.includes('frequency') && (
                <span
                  className="shrink-0 whitespace-nowrap inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={getFrequencyChipStyle(project.frequency)}
                >
                  {project.frequency}
                </span>
              )}
              {project.department && !hiddenDetails.includes('department') && (
                <span
                  className="shrink-0 whitespace-nowrap inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={getDepartmentChipStyle(project.department)}
                >
                  {project.department}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// levelFields controls both the grouping order and the depth of the tree -
// fixed to the Year > Month > Brand > Category hierarchy by default
// (DEFAULT_HIERARCHY_LEVELS); Department is intentionally left out of the
// tree and shown as a badge on each Project instead (see Node above),
// since it's metadata on a project rather than a grouping level.
// fillHeight: when true, the tree fills its parent's height (parent must
// establish one, e.g. a flex container) instead of capping at a fixed
// max-height - used on pages like ProjectsList where everything above the
// tree is fixed and only the tree itself should scroll.
// searchActive: when true, every node is force-expanded so the (typically
// few) matching Projects are immediately visible instead of buried behind
// four collapsed levels the user would otherwise have to click through.
// totalCount: the unfiltered project total, used only to show "X of Y" in
// the summary line above the tree when filters/search have narrowed
// `records`; when omitted (e.g. the Upload preview, which has no filters)
// the summary simply reads "X projects".
// hiddenDetails: ids (weekNo, links, frequency, department) of project-line details
// switched off in Customize view.
export default function HierarchyTree({ records, levelFields = DEFAULT_HIERARCHY_LEVELS, fillHeight = false, searchActive = false, totalCount, hiddenDetails = [] }) {
  const tree = useMemo(() => buildHierarchy(records, levelFields), [records, levelFields]);
  const [expanded, setExpanded] = useState(() => new Set());

  const onToggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allKeys = useMemo(() => {
    const keys = [];
    const lastLevel = levelFields.length - 1;
    const walk = (nodes, level, path) => {
      nodes.forEach((node) => {
        const key = `${path}/${node.key}`;
        keys.push(key);
        if (level < lastLevel && node.children) walk(node.children, level + 1, key);
      });
    };
    walk(tree, 0, '');
    return keys;
  }, [tree, levelFields]);

  useEffect(() => {
    if (searchActive) setExpanded(new Set(allKeys));
  }, [searchActive, allKeys]);

  const summaryCounts = useMemo(() => ({
    months: getUniqueSorted(records, 'month').length,
    brands: getUniqueSorted(records, 'brand').length,
    categories: getUniqueSorted(records, 'category').length,
  }), [records]);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400 py-10">
        <ListTree className="w-8 h-8 mb-1" />
        <span className="text-sm font-medium text-gray-600">No projects found</span>
        <span className="text-xs">Try adjusting your filters or search.</span>
      </div>
    );
  }

  return (
    <div className={fillHeight ? 'h-full flex flex-col' : ''}>
      <div className={fillHeight ? 'shrink-0' : ''}>
        <p className="text-xs text-gray-400 mb-2">Explore projects by year, month, brand and category.</p>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{records.length}</span>
            {totalCount != null && totalCount !== records.length && <> of {totalCount}</>}
            {' '}project{records.length === 1 ? '' : 's'}
            <span className="mx-1.5 text-gray-300">&middot;</span>
            {summaryCounts.months} month{summaryCounts.months === 1 ? '' : 's'}
            <span className="mx-1.5 text-gray-300">&middot;</span>
            {summaryCounts.brands} brand{summaryCounts.brands === 1 ? '' : 's'}
            <span className="mx-1.5 text-gray-300">&middot;</span>
            {summaryCounts.categories} categor{summaryCounts.categories === 1 ? 'y' : 'ies'}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setExpanded(new Set(allKeys))} className="text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
              Expand all
            </button>
            <button type="button" onClick={() => setExpanded(new Set())} className="text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
              Collapse all
            </button>
          </div>
        </div>
      </div>
      <div
        className={`border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-auto ${
          fillHeight ? 'flex-1 min-h-0' : 'max-h-[600px]'
        }`}
      >
        {tree.map((node) => (
          <Node key={node.key} node={node} level={0} levelFields={levelFields} path="" expanded={expanded} onToggle={onToggle} hiddenDetails={hiddenDetails} />
        ))}
      </div>
    </div>
  );
}
