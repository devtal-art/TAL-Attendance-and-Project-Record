import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarRange, ChevronRight, ChevronsDownUp, ChevronsUpDown, ListTree, Tag } from 'lucide-react';
import { buildHierarchy, DEFAULT_HIERARCHY_LEVELS, getUniqueSorted } from './dataUtils';
import { getTagChipStyle, getDepartmentChipStyle, getFrequencyChipStyle, getFullMonthName } from './constants';
import ProjectLinks from './ProjectLinks';

// Month is stored/grouped by its short form (Jan, Feb, ...) so sorting and
// keys stay simple, but it reads better spelled out in the tree.
const labelForField = (field, label) => (field === 'month' ? getFullMonthName(label) : label);

// Short brand badge text, 2-3 letters so brands are recognisable:
// "5 - Norris Hauz Cafe" -> "NHC", "3 - Lit Retail" -> "LR",
// "Starbucks" -> "STA". The common "<code> - " sheet prefix is stripped
// first so the badge reads as the brand's name, not its row code.
const brandAbbr = (label) => {
  const stripped = String(label).replace(/^\d+\s*-\s*/, '').trim() || String(label);
  const words = stripped.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
};

// One shared brand badge look (tree rows, trail, legend): a single calm blue
// for every brand - brands stay uncolored-by-identity like elsewhere in the
// app (see BRAND_CHIP_STYLE), and it stays clear of the near-black primary.
const BRAND_BADGE_CLASS = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';

// Each level has its own fixed identity so it can be told apart at a glance:
// Year = tinted card header with a calendar tile, Month = calendar icon +
// medium text, Brand = initial avatar + name, Category = colored tag chip,
// Project = plain line with a dot. The same icons are reused in the legend
// above the tree.
function LevelLabel({ field, label, active = false }) {
  if (field === 'year') {
    return (
      <span className="inline-flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
          <CalendarRange className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-gray-900">{label}</span>
      </span>
    );
  }
  if (field === 'month') {
    return (
      <span className="inline-flex items-center gap-2 min-w-0">
        <CalendarDays className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </span>
    );
  }
  if (field === 'brand') {
    return (
      <span className="inline-flex items-center gap-2 min-w-0">
        {/* active = the brand the trail marks as current: same solid blue
            as its circle, so the two are visibly linked. */}
        <span
          className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-semibold tracking-tight transition-colors ${
            active ? 'bg-blue-600 text-white ring-[3px] ring-blue-100' : BRAND_BADGE_CLASS
          }`}
        >
          {brandAbbr(label)}
        </span>
        <span className={`text-sm truncate ${active ? 'font-semibold text-blue-900' : 'font-medium text-gray-800'}`}>{label}</span>
      </span>
    );
  }
  if (field === 'category') {
    return (
      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium" style={getTagChipStyle(label)}>
        {label}
      </span>
    );
  }
  return <span className="text-sm text-gray-700">{label}</span>;
}

// Fixed row heights let the Year, Month and Brand headers stack as sticky
// headers (Month 3rem below Year, an open Brand 5.5rem below), so while
// scrolling the user always sees which year / month / brand they're in -
// and the pinned brand is exactly the one the trail marks as current.
// --tree-top is the space already taken at the top of the scroll area (the
// sticky brand trail when the tree scrolls with the page, else 0).
// Brand backgrounds are set in Node (they change when the brand is active).
const ROW_STYLE = {
  year: 'sticky top-[var(--tree-top,0px)] z-20 h-12 pl-3 bg-slate-50 hover:bg-slate-100',
  month: 'sticky top-[calc(var(--tree-top,0px)+3rem)] z-10 h-10 pl-4 bg-white hover:bg-gray-50',
  brand: 'sticky top-[calc(var(--tree-top,0px)+5.5rem)] z-[5] h-11 pl-2',
  category: 'h-9 pl-2 hover:bg-gray-50',
};

// Months sit flat inside their year card (separated by dividers); every
// deeper level is indented by a bordered container whose left edge lines up
// with the parent's chevron, drawing a guide line down the open subtree.
const CHILDREN_CLASS = {
  // Last closed month gets rounded corners so it doesn't square off the card.
  year: 'divide-y divide-gray-100 [&>div:last-child>button:not([aria-expanded=true])]:rounded-b-lg',
  month: 'ml-6 mb-1.5 border-l border-gray-200',
  brand: 'ml-4 border-l border-gray-200',
  category: 'ml-4 border-l border-gray-200',
};

const CHIP_CLASS = 'shrink-0 whitespace-nowrap inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium';

// Brand trail: combined height of the sticky Year (h-12) + Month (h-10)
// headers, i.e. the slot where a brand row pins under them. A brand counts
// as reached the moment it arrives in that slot (2px slack for sub-pixel
// rounding), so the solid circle always matches the pinned brand row.
const STICKY_OFFSET = 88;
const REACH_TOLERANCE = 2;
// A brand opened by clicking its row stays the trail's current brand until
// the user scrolls more than this away from where they clicked.
const CLICK_HOLD_PX = 48;
// Height of the brand trail bar when it sticks to the top of the page
// (pageScroll mode); the Year/Month headers stick right below it.
const TRAIL_BAR_HEIGHT = 56;

// Visible top of a scroll area in viewport coordinates.
const scrollerTop = (scroller) => (scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top);
const EMPTY_TRAIL = { group: null, context: '', items: [], total: 0 };

function Node({ node, level, levelFields, path, expanded, onToggle, hiddenDetails, ancestors = [], activeBrandKey = null, onBrandClick }) {
  const nodeKey = `${path}/${node.key}`;
  const isOpen = expanded.has(nodeKey);
  const isLastLevel = level === levelFields.length - 1;
  const hasChildren = isLastLevel ? node.tasks.length > 0 : Boolean(node.children?.length);
  const field = levelFields[level];
  const label = labelForField(field, node.label);
  const countText = `${node.taskCount} project${node.taskCount === 1 ? '' : 's'}`;
  const isTopLevel = level === 0;
  const childrenClass = CHILDREN_CLASS[field] || 'ml-4 border-l border-gray-200';
  const isActiveBrand = field === 'brand' && activeBrandKey === nodeKey;
  // Opaque backgrounds only: the brand row is sticky and rows scroll under it.
  const brandRowClass = isActiveBrand
    ? 'bg-blue-50 hover:bg-blue-100 shadow-[inset_3px_0_0_var(--color-blue-500)]'
    : 'bg-white hover:bg-gray-50';

  return (
    // Each year is its own card; no overflow-hidden here, it would break the
    // sticky headers inside.
    <div className={isTopLevel ? 'rounded-lg border border-gray-200 bg-white shadow-sm' : ''}>
      <button
        type="button"
        disabled={!hasChildren}
        onClick={() => {
          if (!hasChildren) return;
          onToggle(nodeKey);
          if (field === 'brand') onBrandClick?.(nodeKey, !isOpen);
        }}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label} (${countText})`}
        // Read by the brand trail in HierarchyTree (DOM order = visual order).
        {...(field === 'brand' && {
          'data-brand-key': nodeKey,
          'data-brand-label': label,
          'data-brand-group': path,
          'data-brand-context': [...ancestors].reverse().join(' '),
        })}
        className={`w-full flex items-center gap-2 pr-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
          ROW_STYLE[field] || 'h-9 pl-2 hover:bg-gray-50'
        } ${field === 'brand' ? brandRowClass : ''} ${isTopLevel ? (isOpen ? 'rounded-t-lg border-b border-gray-200' : 'rounded-lg') : ''} ${
          hasChildren ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center">
          {hasChildren && (
            <ChevronRight
              className={`transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-90 text-gray-600' : 'text-gray-400'} ${
                isTopLevel ? 'w-4 h-4' : 'w-3.5 h-3.5'
              }`}
              aria-hidden="true"
            />
          )}
        </span>
        <LevelLabel field={field} label={label} active={isActiveBrand} />
        <span
          title={countText}
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
            isTopLevel ? 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isTopLevel ? countText : node.taskCount}
        </span>
      </button>

      {isOpen && !isLastLevel && (
        <div className={`${childrenClass} animate-hierarchy-fade-in`}>
          {node.children.map((child) => (
            <Node key={child.key} node={child} level={level + 1} levelFields={levelFields} path={nodeKey} expanded={expanded} onToggle={onToggle} hiddenDetails={hiddenDetails} ancestors={[...ancestors, label]} activeBrandKey={activeBrandKey} onBrandClick={onBrandClick} />
          ))}
        </div>
      )}

      {isOpen && isLastLevel && (
        <ul className={`${childrenClass} pl-1 pr-2 py-1 space-y-px animate-hierarchy-fade-in`}>
          {node.tasks.map((project, i) => (
            <li
              key={project._id || i}
              className="flex flex-col gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex items-start gap-2 flex-1 min-w-0">
                <span className="mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
                <span className="text-sm text-gray-800 break-words">{project.taskName}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5 pl-3.5 sm:pl-0 sm:shrink-0 sm:justify-end">
                {!hiddenDetails.includes('weekNo') && (
                  <span title="Week no." className="shrink-0 whitespace-nowrap inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 bg-gray-100 tabular-nums">
                    Week {project.weekNo || '-'}
                  </span>
                )}
                {project.frequency && !hiddenDetails.includes('frequency') && (
                  <span className={CHIP_CLASS} style={getFrequencyChipStyle(project.frequency)}>
                    {project.frequency}
                  </span>
                )}
                {project.department && !hiddenDetails.includes('department') && (
                  <span className={CHIP_CLASS} style={getDepartmentChipStyle(project.department)}>
                    {project.department}
                  </span>
                )}
                {!hiddenDetails.includes('links') && (
                  <span className="shrink-0 inline-flex items-center justify-center w-6 h-6">
                    <ProjectLinks links={project.links} />
                  </span>
                )}
              </span>
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
// pageScroll: when true the tree has no scroll box of its own - it grows to
// full height and scrolls with the page like the other views; the brand
// trail then sticks to the top of the page with Year/Month headers below it.
export default function HierarchyTree({ records, levelFields = DEFAULT_HIERARCHY_LEVELS, fillHeight = false, searchActive = false, totalCount, hiddenDetails = [], pageScroll = false }) {
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

  // Keys of every brand node, for the one-brand-open-at-a-time rule below.
  const brandKeys = useMemo(() => {
    const keys = new Set();
    const brandLevel = levelFields.indexOf('brand');
    const walk = (nodes, level, path) => {
      nodes.forEach((node) => {
        const key = `${path}/${node.key}`;
        if (level === brandLevel) keys.add(key);
        else if (level < brandLevel && node.children) walk(node.children, level + 1, key);
      });
    };
    if (brandLevel !== -1) walk(tree, 0, '');
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

  // Brand trail: one circle per brand of the month currently being read,
  // from its first brand up to the one that has scrolled to the top (just
  // below the sticky Year/Month headers). Scrolling forward adds circles,
  // scrolling back removes them, and entering another month starts over.
  // Derived purely from the rendered rows, so it follows expand/collapse,
  // filters and search without any extra bookkeeping.
  const scrollRef = useRef(null);
  const trailRef = useRef(null);
  const [trail, setTrail] = useState(EMPTY_TRAIL);
  const treeTop = pageScroll ? TRAIL_BAR_HEIGHT : 0;
  // The trail's last (solid) circle, highlighted on its tree row as well.
  const currentBrand = trail.items[trail.items.length - 1] || null;
  const activeBrandKey = currentBrand?.key ?? null;

  // The element that actually scrolls: the tree's own box, or in pageScroll
  // mode the nearest scrolling ancestor (the app's <main>), else the page.
  const getScroller = useCallback(() => {
    if (!pageScroll) return scrollRef.current;
    let el = scrollRef.current?.parentElement;
    while (el && el !== document.body) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return document.scrollingElement;
  }, [pageScroll]);

  // Sticky elements stop at the scroller's padding edge, not its visible
  // top - with the app's padded <main> that left a gap above the stuck
  // trail where rows showed through. Measured (it changes per breakpoint)
  // and used as a negative offset so the trail sits flush at the top.
  const [scrollPadTop, setScrollPadTop] = useState(0);
  const measureScrollPad = useCallback(() => {
    const scroller = pageScroll ? getScroller() : null;
    const pad = scroller && scroller !== document.scrollingElement ? parseFloat(getComputedStyle(scroller).paddingTop) || 0 : 0;
    setScrollPadTop((prev) => (prev === pad ? prev : pad));
  }, [pageScroll, getScroller]);

  // Brand row click: opening a brand makes it the trail's current brand
  // (its month's circles up to it, solid circle, progress bar) even when
  // it hasn't been scrolled to the top; closing it drops that hold. The
  // trail is re-read by the effect that follows every expand/collapse.
  // Only one brand is open at a time: opening one closes every other open
  // brand (their category open/closed state is kept for next time). Expand
  // all and search still open everything. Closing brands above the clicked
  // one would shift it up, so its on-screen position is remembered here and
  // restored right after the re-render (see the layout effect below).
  const clickedBrandRef = useRef(null);
  const scrollAnchorRef = useRef(null);
  const pendingGoToRef = useRef(null);
  const findBrandRow = (key) => Array.from(scrollRef.current?.querySelectorAll('[data-brand-key]') || []).find((r) => r.dataset.brandKey === key);
  const onBrandClick = (key, opening) => {
    const scroller = getScroller();
    if (opening && scroller) clickedBrandRef.current = { key, scrollTop: scroller.scrollTop };
    else if (clickedBrandRef.current?.key === key) clickedBrandRef.current = null;
    if (!opening) return;
    const row = findBrandRow(key);
    if (row) scrollAnchorRef.current = { key, top: row.getBoundingClientRect().top };
    setExpanded((prev) => {
      const next = new Set(prev);
      brandKeys.forEach((k) => {
        if (k !== key) next.delete(k);
      });
      return next;
    });
  };

  useLayoutEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;

    // Circle click (goToBrand): scroll the brand to its pinned slot.
    const goTo = pendingGoToRef.current;
    pendingGoToRef.current = null;
    const goToRow = goTo && findBrandRow(goTo);
    if (goToRow) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      scroller.scrollTo({
        top: goToRow.getBoundingClientRect().top - scrollerTop(scroller) + scroller.scrollTop - treeTop - STICKY_OFFSET,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }

    // Row click: keep the clicked brand where it was on screen.
    const anchor = scrollAnchorRef.current;
    scrollAnchorRef.current = null;
    const row = anchor && findBrandRow(anchor.key);
    if (!row) return;
    const delta = row.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 1) return;
    scroller.scrollTop += delta;
    // Keep the click hold measured from the corrected position.
    if (clickedBrandRef.current?.key === anchor.key) clickedBrandRef.current.scrollTop = scroller.scrollTop;
  }, [expanded, getScroller, treeTop]);

  const updateTrail = useCallback(() => {
    const el = scrollRef.current;
    const scroller = getScroller();
    if (!el || !scroller) return;
    const rows = Array.from(el.querySelectorAll('[data-brand-key]'));
    const top = scrollerTop(scroller);
    // At the very bottom the last brands can never reach the top, so
    // everything on screen counts as reached instead.
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
    const line = atBottom ? top + scroller.clientHeight : top + treeTop + STICKY_OFFSET + REACH_TOLERANCE;

    let current = null;
    // A brand just opened by clicking wins while the user stays roughly
    // where they clicked; scrolling away hands back to the position rule.
    const clicked = clickedBrandRef.current;
    if (clicked) {
      const row = rows.find((r) => r.dataset.brandKey === clicked.key);
      if (row && Math.abs(scroller.scrollTop - clicked.scrollTop) < CLICK_HOLD_PX) current = row;
      else clickedBrandRef.current = null;
    }

    if (!current) {
      for (const row of rows) {
        if (row.getBoundingClientRect().top < line) current = row;
        else break;
      }
    }

    if (!current) {
      setTrail((prev) => (prev.items.length ? EMPTY_TRAIL : prev));
      return;
    }

    const group = current.dataset.brandGroup;
    const groupRows = rows.filter((row) => row.dataset.brandGroup === group);
    const items = groupRows
      .slice(0, groupRows.indexOf(current) + 1)
      .map((row) => ({ key: row.dataset.brandKey, label: row.dataset.brandLabel }));

    setTrail((prev) => {
      const unchanged =
        prev.group === group &&
        prev.total === groupRows.length &&
        prev.items.length === items.length &&
        prev.items.every((item, i) => item.key === items[i].key);
      return unchanged ? prev : { group, context: current.dataset.brandContext, items, total: groupRows.length };
    });
  }, [getScroller, treeTop]);

  // Re-read after every render that can move rows (expand/collapse, new
  // records), on scroll (one read per frame) and when the box resizes.
  useEffect(() => {
    updateTrail();
  }, [updateTrail, expanded, tree]);

  // The scroll box only exists once the tree is non-empty (see the early
  // return below), so the listener is (re)attached when that flips.
  const isEmpty = tree.length === 0;
  useEffect(() => {
    const el = scrollRef.current;
    const scroller = getScroller();
    if (!el || !scroller) return undefined;
    // The document's scrolling element fires its scroll events on window.
    const target = scroller === document.scrollingElement ? window : scroller;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateTrail();
      });
    };
    // Padding is breakpoint-based, so re-measure whenever the size changes.
    const onResize = () => {
      measureScrollPad();
      onScroll();
    };
    measureScrollPad();
    target.addEventListener('scroll', onScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(el);
    if (scroller !== el) resizeObserver?.observe(scroller);
    return () => {
      target.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [updateTrail, getScroller, measureScrollPad, isEmpty]);

  // Keep the newest circle in view when the trail overflows horizontally.
  useEffect(() => {
    const strip = trailRef.current;
    if (strip) strip.scrollLeft = strip.scrollWidth;
  }, [trail]);

  // Circle click: open that brand (closing any other, same one-at-a-time
  // rule) and bring it to the top, just below the sticky headers; the
  // circles after it then drop off via updateTrail. The scroll happens in
  // the layout effect above, once the other brands have actually closed.
  const goToBrand = (key) => {
    // The scroll itself now decides the current brand, not an older row click.
    clickedBrandRef.current = null;
    pendingGoToRef.current = key;
    setExpanded((prev) => {
      const next = new Set(prev);
      brandKeys.forEach((k) => {
        if (k !== key) next.delete(k);
      });
      next.add(key);
      return next;
    });
  };

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
    <div
      className={fillHeight ? 'h-full flex flex-col' : ''}
      style={{ '--trail-top': `${-scrollPadTop}px`, '--tree-top': `${treeTop - scrollPadTop}px` }}
    >
      <div className={fillHeight ? 'shrink-0' : ''}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          {/* Summary doubling as a legend: the levels in tree order, each
              with the same marker its rows use below. */}
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500" aria-label="Hierarchy levels">
            <li className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary">
                <CalendarRange className="w-3 h-3" aria-hidden="true" />
              </span>
              <span><span className="font-semibold text-gray-800">{tree.length}</span> year{tree.length === 1 ? '' : 's'}</span>
            </li>
            <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-300" /></li>
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span><span className="font-semibold text-gray-800">{summaryCounts.months}</span> month{summaryCounts.months === 1 ? '' : 's'}</span>
            </li>
            <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-300" /></li>
            <li className="inline-flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-semibold ${BRAND_BADGE_CLASS}`} aria-hidden="true">B</span>
              <span><span className="font-semibold text-gray-800">{summaryCounts.brands}</span> brand{summaryCounts.brands === 1 ? '' : 's'}</span>
            </li>
            <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-300" /></li>
            <li className="inline-flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span><span className="font-semibold text-gray-800">{summaryCounts.categories}</span> categor{summaryCounts.categories === 1 ? 'y' : 'ies'}</span>
            </li>
            <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-300" /></li>
            <li className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" aria-hidden="true" />
              <span>
                <span className="font-semibold text-gray-800">{records.length}</span>
                {totalCount != null && totalCount !== records.length && <> of {totalCount}</>}
                {' '}project{records.length === 1 ? '' : 's'}
              </span>
            </li>
          </ol>
          <div className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setExpanded(new Set(allKeys))}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" aria-hidden="true" /> Expand all
            </button>
            <button
              type="button"
              onClick={() => setExpanded(new Set())}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" aria-hidden="true" /> Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* Brand trail - fixed height so the tree below never jumps. A direct
          child of the root so that, in pageScroll mode, it stays stuck to the
          top of the page for as long as the tree is on screen. Reads left to
          right: month, the brands passed (solid = the brand pinned in the
          tree right now), its full name, and how far through the month. */}
      <nav
        aria-label="Brands passed in this month"
        className={`relative flex items-center gap-2.5 min-w-0 shrink-0 ${pageScroll ? 'sticky top-[var(--trail-top,0px)] z-30 bg-white' : 'mb-2'}`}
        style={{ height: pageScroll ? TRAIL_BAR_HEIGHT : 44 }}
      >
        {trail.items.length > 0 ? (
          <>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              {trail.context}
            </span>
            <ol ref={trailRef} className="flex items-center min-w-0 overflow-x-auto py-1 px-0.5 [scrollbar-width:none]">
              {trail.items.map((item, i) => {
                const isCurrent = i === trail.items.length - 1;
                return (
                  <li key={item.key} className="flex items-center shrink-0 animate-trail-pop">
                    {i > 0 && <span className="w-3 sm:w-4 h-px bg-blue-200" aria-hidden="true" />}
                    <button
                      type="button"
                      onClick={() => goToBrand(item.key)}
                      title={item.label}
                      aria-label={`Go to ${item.label}`}
                      aria-current={isCurrent ? 'location' : undefined}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-semibold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-[3px] ring-blue-100'
                          : `${BRAND_BADGE_CLASS} hover:bg-blue-100`
                      }`}
                    >
                      {brandAbbr(item.label)}
                    </button>
                  </li>
                );
              })}
            </ol>
            {/* Full name of the current brand - the circles only fit 2-3 letters. */}
            <span className="hidden sm:block min-w-0 truncate text-sm font-semibold text-blue-900" title={currentBrand.label}>
              {currentBrand.label}
            </span>
            <span className="shrink-0 ml-auto text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
              Brand <span className="font-semibold text-gray-800">{trail.items.length}</span> of {trail.total}
            </span>
            {/* Thin progress bar along the bottom edge: share of this month's
                brands passed, animating as each new brand pins. */}
            <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-gray-100" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-blue-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${(trail.items.length / trail.total) * 100}%` }}
              />
            </span>
          </>
        ) : (
          <span className="text-[11px] text-gray-400">Open a month and scroll — each brand you reach shows up here.</span>
        )}
      </nav>
      <div
        ref={scrollRef}
        // Own scroll box: bottom padding only, since top padding would leave
        // a gap above the sticky year headers. pageScroll: no box at all.
        className={`space-y-2.5 pb-1 ${
          pageScroll ? '' : `overflow-auto overscroll-contain ${fillHeight ? 'flex-1 min-h-0' : 'max-h-[600px]'}`
        }`}
      >
        {tree.map((node) => (
          <Node key={node.key} node={node} level={0} levelFields={levelFields} path="" expanded={expanded} onToggle={onToggle} hiddenDetails={hiddenDetails} activeBrandKey={activeBrandKey} onBrandClick={onBrandClick} />
        ))}
      </div>
    </div>
  );
}
