#!/usr/bin/env node
// link-audit: crawl a built dist/ and check that every internal href/src/srcset/poster/action resolves
// to a file, and that every /_redirects target exists. External links are listed, never fetched.
//
// Usage: node scripts/link-audit.mjs [distDir=dist] [--list-external]
// Output: `FILE broken URL` per finding; exit 1 if any. Zero dependencies (Node >= 20).
//
// Runtime paths that do not exist as files in dist/ by design are allowed via RUNTIME_PREFIXES:
//   /api/    Pages Functions (PR #2: /api/lead)
//   /media/  videos + posters downloaded from the GitHub Release `media-v1` in CI (never in git);
//            the <VideoSlot> component only emits these when the files are present at build time.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RUNTIME_PREFIXES = ['/api/', '/media/', '/cdn-cgi/'];
const ATTR = /\s(href|src|srcset|poster|action)\s*=\s*("([^"]*)"|'([^']*)')/gi;

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function extractRefs(html) {
  const out = [];
  const noScripts = html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of noScripts.matchAll(ATTR)) {
    const attr = m[1].toLowerCase();
    const val = decode((m[3] ?? m[4] ?? '').trim());
    if (!val) continue;
    const urls = attr === 'srcset' ? val.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : [val];
    for (const url of urls) {
      if (/^(data|javascript|blob):/i.test(url)) continue;
      out.push({ attr, url });
    }
  }
  return out;
}

/** Classify a URL found on the page at route `pageRoute` (e.g. "/a/b/"). */
export function resolveRef(url, pageRoute) {
  if (/^(mailto|tel|sms):/i.test(url) || url.startsWith('#')) return { kind: 'skip' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
    try {
      const u = new URL(url, 'https://wisevision.tech/');
      if (u.hostname === 'wisevision.tech' && /^https?:$/.test(u.protocol)) return { kind: 'self', path: decodeURI(u.pathname), url };
    } catch { /* fallthrough */ }
    return { kind: 'external' };
  }
  const u = new URL(url, `https://local.invalid${pageRoute}`);
  return { kind: 'internal', path: decodeURI(u.pathname) };
}

function exists(dist, p) {
  const f = path.join(dist, p);
  if (p.endsWith('/')) return existsSync(path.join(f, 'index.html'));
  if (existsSync(f) && statSync(f).isFile()) return true;
  return existsSync(path.join(f, 'index.html')) || existsSync(`${f}.html`);
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out.sort();
}

const routeOf = (rel) => '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '/');

export function audit(dist) {
  const broken = [];
  const external = new Set();
  let checked = 0;
  const check = (from, url, p) => {
    checked++;
    if (RUNTIME_PREFIXES.some((x) => p.startsWith(x))) return;
    if (!exists(dist, p)) broken.push({ from, url });
  };
  for (const file of walk(dist)) {
    const rel = path.relative(dist, file).split(path.sep).join('/');
    for (const { url } of extractRefs(readFileSync(file, 'utf8'))) {
      const r = resolveRef(url, routeOf(rel));
      if (r.kind === 'external') external.add(url);
      else if (r.kind === 'internal') check(rel, url, r.path);
      else if (r.kind === 'self') {
        // absolute links to our own domain (canonical, og:url, og:image) must exist too — except the canonical host root forms
        check(rel, url, r.path);
      }
    }
  }
  const redirects = path.join(dist, '_redirects');
  if (existsSync(redirects)) {
    for (const raw of readFileSync(redirects, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [, to] = line.split(/\s+/);
      if (!to) continue;
      const r = resolveRef(to, '/');
      if (r.kind === 'internal' || r.kind === 'self') check('_redirects', to, r.path);
      else if (r.kind === 'external') external.add(to);
    }
  }
  return { broken, external: [...external].sort(), checked };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const dist = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
  if (!existsSync(dist)) {
    console.error(`link-audit: ${dist} not found (run npm run build first)`);
    process.exit(2);
  }
  const { broken, external, checked } = audit(dist);
  for (const b of broken) console.log(`${b.from} broken ${b.url}`);
  if (args.includes('--list-external')) for (const e of external) console.log(`external ${e}`);
  console.error(`link-audit — ${checked} internal ref(s) checked, ${broken.length} broken, ${external.length} external (listed, not fetched)`);
  process.exit(broken.length ? 1 : 0);
}
