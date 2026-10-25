import { useEffect, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';

// Filter state that is also mirrored into the page's URL query string, so a
// copied link reopens with the same filters applied.
//
// `defaults` is the filter object (all string values) - a filter is only
// written to the URL when it differs from its default, which keeps links
// short ("/projects/all?year=2026&quarter=Q4") and means a page with nothing
// filtered has a clean URL. Both `defaults` and `validate` must be stable
// (module-level) values.
//
// Why state-first rather than reading straight from useSearchParams: React
// Router applies navigations as low-priority transitions, so a text input
// whose value came back through the URL would drop/lag keystrokes. State
// stays synchronous exactly as it was before, and the URL follows it:
//   - state -> URL: any change is written with `replace` (no history entry
//     per keystroke/selection). Query params the hook doesn't own are kept.
//   - URL -> state: on first render, and whenever something other than this
//     hook navigates (a sidebar link, browser back/forward, a pasted link in
//     the same tab - i.e. any PUSH/POP), the URL is read back into state.
//     The hook's own writes are REPLACEs, so they never echo back and
//     overwrite what's being typed.
//
// validate(state) -> state: repairs anything read from the URL that can't be
// valid (an unknown status, a malformed date, ...) so a hand-edited or
// outdated link falls back to defaults instead of putting the page in an
// impossible state.
//
// dropKeys: legacy/one-shot query params to strip whenever the hook writes
// the URL (they've already been consumed by the page).
const readFromSearch = (search, defaults, validate) => {
  const params = new URLSearchParams(search);
  const state = { ...defaults };
  Object.keys(defaults).forEach((key) => {
    const value = params.get(key);
    if (value !== null && value !== '') state[key] = value;
  });
  return validate ? validate(state) : state;
};

export default function useUrlFilters(defaults, { validate, dropKeys = [] } = {}) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [, setSearchParams] = useSearchParams();
  const keys = Object.keys(defaults);

  const [state, setState] = useState(() => readFromSearch(location.search, defaults, validate));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const current = params.toString();
    keys.forEach((key) => params.delete(key));
    dropKeys.forEach((key) => params.delete(key));
    keys.forEach((key) => {
      if (state[key] !== defaults[key]) params.set(key, state[key]);
    });
    if (params.toString() !== current) setSearchParams(params, { replace: true });
    // Only a change to the filters themselves should write the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (navigationType === 'REPLACE') return;
    const incoming = readFromSearch(location.search, defaults, validate);
    setState((prev) => (keys.every((key) => prev[key] === incoming[key]) ? prev : incoming));
    // Re-evaluated only when the location actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return [state, setState];
}
