// Turns CLIENT_URL (comma-separated) into the `origin` option for cors().
// An entry may contain '*' as a wildcard for one subdomain label, e.g.
//   https://my-app-*.vercel.app
// to also allow Vercel's per-deployment / preview URLs.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toMatcher = (pattern) =>
  pattern.includes('*')
    ? new RegExp(`^${pattern.split('*').map(escapeRegex).join('[a-z0-9-]+')}$`, 'i')
    : pattern;

const parseAllowedOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map(toMatcher);

module.exports = { parseAllowedOrigins };
