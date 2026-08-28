#!/usr/bin/env node
/**
 * Route-existence check.
 *
 * The largest single defect class in this app has been calling endpoints
 * that do not exist. Eight were found by reading the API by hand:
 * POST /orders, /wishlist, /reviews*, /sellers/setup, /coupons/validate,
 * /artist-services/:id/book, /artist-services/my-bookings and
 * /events/:id/register. Every one compiled, typechecked and bundled
 * cleanly, and failed only at runtime with a 404 the UI swallowed.
 *
 * This parses the Express routers to build the real route table, extracts
 * the paths the mobile services call, and reports any that cannot match.
 *
 *   node scripts/check-routes.mjs [--api ../paznwise]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const apiDir = args[args.indexOf('--api') + 1] ?? '../paznwise';
const mobileDir = '.';

// ── Collect files ────────────────────────────────────────

function walk(dir, test, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === '.expo') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, test, out);
    else if (test(name)) out.push(full);
  }
  return out;
}

// ── Build the real route table ───────────────────────────

/**
 * `app.use('/api/foo', barRouter)` → mount prefix per router file.
 *
 * Most routers are required into a variable at the top of server.js and
 * mounted by name later, so the variable → file map has to be resolved
 * first; only a few are required inline at the mount site.
 */
function readMounts(serverSource) {
  const varToFile = new Map();

  // const xRouter = require('./src/x/x.routes')
  const requireRe = /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"`]\.\/([^'"`]+)['"`]\s*\)/g;
  let r;
  while ((r = requireRe.exec(serverSource))) varToFile.set(r[1], r[2]);

  // Several files export more than one router and are destructured:
  //   const { clientRouter: aRouter, adminRouter: bRouter } = require('./…')
  const destructureRe =
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\(\s*['"`]\.\/([^'"`]+)['"`]\s*\)/g;
  let d;
  while ((d = destructureRe.exec(serverSource))) {
    for (const part of d[1].split(',')) {
      const alias = part.includes(':') ? part.split(':')[1] : part;
      const name = alias.trim();
      if (name) varToFile.set(name, d[2]);
    }
  }

  const mounts = [];
  const useRe = /app\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*((?:[^()]|\([^()]*\))*)\)/g;
  let m;
  while ((m = useRe.exec(serverSource))) {
    const [, prefix, rest] = m;
    if (!prefix.startsWith('/api')) continue;

    // Inline: app.use('/api/x', require('./src/x/x.routes'))
    const inline = /require\(\s*['"`]\.\/([^'"`]+)['"`]\s*\)/.exec(rest);
    if (inline) {
      mounts.push({ prefix, file: inline[1] });
      continue;
    }
    // By variable, possibly after middleware: app.use('/api/x', authenticate, xRouter)
    for (const token of rest.split(',').map(t => t.trim())) {
      const file = varToFile.get(token);
      if (file) mounts.push({ prefix, file });
    }
  }
  return mounts;
}

/** `router.get('/foo/:id', ...)` inside one router file. */
function readRoutes(source) {
  const routes = [];
  const re = /\b(?:router|clientRouter|adminRouter|publicRouter)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(source))) routes.push({ method: m[1].toUpperCase(), path: m[2] });
  return routes;
}

const serverFile = join(apiDir, 'server.js');
const server = readFileSync(serverFile, 'utf8');
const mounts = readMounts(server);

// Router files are matched to mounts by filename, since server.js requires
// some of them through intermediate variables rather than inline.
const routerFiles = walk(apiDir, n => /\.(routes|router)\.js$/.test(n));

const realRoutes = new Set();
for (const file of routerFiles) {
  const rel = relative(apiDir, file).replace(/\\/g, '/');
  const source = readFileSync(file, 'utf8');
  // A router can be mounted at more than one prefix (e.g. organizer events),
  // and /api/orders is deliberately mounted twice.
  const prefixes = mounts
    .filter(mt => {
      const want = mt.file.replace(/^\.\//, '').replace(/\.js$/, '');
      return rel.replace(/\.js$/, '') === want;
    })
    .map(mt => mt.prefix);

  if (prefixes.length === 0) continue;

  for (const { method, path } of readRoutes(source)) {
    for (const prefix of prefixes) {
      const full = (prefix + (path === '/' ? '' : path)).replace(/\/+$/, '') || '/';
      realRoutes.add(`${method} ${full}`);
    }
  }
}

// ── Collect the paths mobile calls ───────────────────────

const serviceFiles = walk(join(mobileDir, 'src/services'), n => n.endsWith('.ts'));
const called = [];

for (const file of serviceFiles) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  lines.forEach((line, i) => {
    // fetchApi<...>('/path', { method: 'POST' })  — method may be on a later line
    const open = /fetchApi[^(]*\(\s*([`'"])/.exec(line);
    if (!open) return;
    const quote = open[1];
    const start = open.index + open[0].length;

    // A template literal can nest another one inside `${…}` (a query-string
    // builder does exactly that), so scan for the closing quote at depth 0
    // rather than taking the first one.
    let end = -1;
    let depth = 0;
    for (let k = start; k < line.length; k++) {
      if (line[k] === '$' && line[k + 1] === '{') { depth++; k++; continue; }
      if (line[k] === '}' && depth > 0) { depth--; continue; }
      if (line[k] === quote && depth === 0) { end = k; break; }
    }
    if (end === -1) return;

    const path = normalizeInterpolations(line.slice(start, end));
    if (!path.startsWith('/')) return;

    const window = lines.slice(i, i + 6).join(' ');
    const methodMatch = /method:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i.exec(window);
    const method = (methodMatch?.[1] ?? 'GET').toUpperCase();

    called.push({ method, path, file: relative(mobileDir, file), line: i + 1 });
  });
}

/**
 * Replaces every `${…}` with a `:p` placeholder, matching nesting so a
 * query-string builder collapses to one segment. Done before anything
 * splits on "?", since a ternary inside an interpolation contains one.
 */
function normalizeInterpolations(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '$' && raw[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < raw.length && depth > 0) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') depth--;
        i++;
      }
      i--;
      out += ':p';
      continue;
    }
    out += raw[i];
  }
  // A trailing placeholder not preceded by "/" is a query-string concat
  // (`/products${qs ? `?${qs}` : ''}`), not another path segment.
  return out.replace(/(?<!\/):p$/, '');
}

// ── Compare ──────────────────────────────────────────────

/** `/products/:p/reviews` → a regex matching `/products/:id/reviews`. */
function toMatcher(path) {
  const clean = path.split('?')[0];
  const pattern = clean
    .split('/')
    .map(seg => (seg === ':p' || seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${pattern}$`);
}

const realList = [...realRoutes].map(r => {
  const [method, path] = r.split(' ');
  return { method, path, re: toMatcher(path) };
});

const missing = [];
for (const call of called) {
  const full = `/api${call.path.split('?')[0]}`;
  const matcher = toMatcher(full);
  const hit = realList.some(
    r => r.method === call.method && (r.re.test(full) || matcher.test(r.path)),
  );
  if (!hit) missing.push({ ...call, full });
}

// ── Report ───────────────────────────────────────────────

console.log(`Parsed ${realRoutes.size} routes from ${relative('.', apiDir)}`);
console.log(`Checked ${called.length} calls across ${serviceFiles.length} service files\n`);

if (missing.length === 0) {
  console.log('✓ Every endpoint the app calls exists on the API.');
  process.exit(0);
}

console.log(`✗ ${missing.length} call${missing.length === 1 ? '' : 's'} with no matching route:\n`);
for (const m of missing) {
  console.log(`  ${m.method.padEnd(6)} ${m.full}`);
  console.log(`         ${m.file}:${m.line}\n`);
}
process.exit(1);
