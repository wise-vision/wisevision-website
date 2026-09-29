#!/usr/bin/env node
// Imports the generated ROS2 MCP tool reference into the docs.
//
// Source: https://raw.githubusercontent.com/wise-vision/ros2_mcp/<PIN_TAG>/docs/generated/tools.{json,md}
// These files are generated from the real tool registry by scripts/gen_tool_docs.py in ros2_mcp, and a CI drift gate there checks them.
//
// Rules:
// - The build FAILS if PIN_TAG is not the latest ros2_mcp release (GitHub API): bump the pin on every release.
// - Offline (the network or the API is unreachable): locally, fall back to the committed cache in src/data/tool-docs/ with a
//   loud warning. In CI (env CI set), the build fails instead, so a deploy never ships an unverified pin.
// Output: src/content/docs/docs/ros2-mcp/tools.md (generated, gitignored) + a refreshed cache.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = 'wise-vision/ros2_mcp';
export const PIN_TAG = '2610';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_CACHE_DIR = join(ROOT, 'src/data/tool-docs');
export const DEFAULT_PAGE_PATH = join(ROOT, 'src/content/docs/docs/ros2-mcp/tools.md');

const ALLOWED_TAG = /^<(\/?(details|summary)\b|!--)/;

/** Escape `<` in prose so Markdown does not treat `/<action>/...` as HTML; leave code, comments and <details>/<summary> alone. */
export function escapeMdHtml(md) {
  let fence = null;
  return md
    .split('\n')
    .map((line) => {
      const f = line.match(/^\s*(`{3,}|~{3,})/);
      if (f) {
        if (!fence) fence = f[1];
        else if (f[1].startsWith(fence[0]) && f[1].length >= fence.length) fence = null;
        return line;
      }
      if (fence) return line;
      // gen_tool_docs.py (ros2_mcp 2610) escapes `|` twice inside table cells, writing `\\|`: Markdown reads that as a
      // literal backslash followed by a cell break, which splits the row. Repair it to a single escaped pipe.
      const isRow = /^\s*\|/.test(line);
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, i) => {
          if (i % 2 === 1) return part; // inline code span
          const fixed = isRow ? part.replace(/\\\\\|/g, '\\|') : part;
          return fixed.replace(/</g, (lt, off, s) => (ALLOWED_TAG.test(s.slice(off)) ? lt : '&lt;'));
        })
        .join('');
    })
    .join('\n');
}

/** Turn the generated tools.md into a Starlight page with provenance in the frontmatter. */
export function toStarlightPage(md, { tag, sha }) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('sync-tool-docs: generated tools.md has no frontmatter');
  const body = escapeMdHtml(m[2].replace(/<!-- GENERATED[^\n]*-->\n*/, ''));
  const front = [
    m[1],
    'editUrl: false',
    `toolDocsTag: "${tag}"`,
    `toolDocsSha: "${sha}"`,
  ].join('\n');
  const pin =
    `Pinned to ROS2 MCP release [\`${tag}\`](https://github.com/${REPO}/releases/tag/${tag}). ` +
    `This page is generated from the server's tool registry: do not edit it by hand.\n`;
  return `---\n${front}\n---\n\n${pin}\n${body.replace(/^\n+/, '')}`;
}

export function checkProvenance(pinTag, latestTag) {
  if (pinTag !== latestTag) {
    throw new Error(
      `sync-tool-docs: pinned tag ${pinTag} is not the latest release (${latestTag}). ` +
        `Bump PIN_TAG in scripts/sync-tool-docs.mjs to ${latestTag}.`,
    );
  }
}

async function getJson(fetch, url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.json();
}
async function getText(fetch, url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.text();
}

async function fetchRemote(fetch, env) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'wisevision-docs-sync' };
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  const latest = (await getJson(fetch, `https://api.github.com/repos/${REPO}/releases/latest`, headers)).tag_name;
  const sha = (await getJson(fetch, `https://api.github.com/repos/${REPO}/commits/${PIN_TAG}`, headers)).sha;
  const raw = `https://raw.githubusercontent.com/${REPO}/${PIN_TAG}/docs/generated`;
  const toolsJson = await getText(fetch, `${raw}/tools.json`, {});
  const toolsMd = await getText(fetch, `${raw}/tools.md`, {});
  JSON.parse(toolsJson); // must be valid JSON
  return { latest, sha, toolsJson, toolsMd };
}

export async function syncToolDocs({
  cacheDir = DEFAULT_CACHE_DIR,
  pagePath = DEFAULT_PAGE_PATH,
  fetch = globalThis.fetch,
  env = process.env,
  log = console.log,
} = {}) {
  let remote;
  try {
    remote = await fetchRemote(fetch, env);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    if (env.CI) {
      throw new Error(`sync-tool-docs: CI cannot reach GitHub to verify the ${PIN_TAG} pin (${why}). Refusing the offline cache in CI.`);
    }
    const provPath = join(cacheDir, 'provenance.json');
    if (!existsSync(provPath) || !existsSync(join(cacheDir, 'tools.md'))) {
      throw new Error(`sync-tool-docs: GitHub unreachable (${why}) and no cache in ${cacheDir}.`);
    }
    const prov = JSON.parse(readFileSync(provPath, 'utf8'));
    if (prov.tag !== PIN_TAG) throw new Error(`sync-tool-docs: offline, and the cache is for ${prov.tag}, not ${PIN_TAG}.`);
    log(`\n!!! sync-tool-docs OFFLINE: ${why}\n!!! Using the cached tool reference for ${PIN_TAG} (NOT verified as the latest release).\n`);
    mkdirSync(dirname(pagePath), { recursive: true });
    writeFileSync(pagePath, toStarlightPage(readFileSync(join(cacheDir, 'tools.md'), 'utf8'), prov));
    return { source: 'cache', tag: PIN_TAG };
  }

  checkProvenance(PIN_TAG, remote.latest);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, 'tools.json'), remote.toolsJson);
  writeFileSync(join(cacheDir, 'tools.md'), remote.toolsMd);
  const prov = { repo: REPO, tag: PIN_TAG, sha: remote.sha, latest_release: remote.latest };
  writeFileSync(join(cacheDir, 'provenance.json'), `${JSON.stringify(prov, null, 2)}\n`);
  mkdirSync(dirname(pagePath), { recursive: true });
  writeFileSync(pagePath, toStarlightPage(remote.toolsMd, prov));
  log(`sync-tool-docs: ${REPO}@${PIN_TAG} (${remote.sha.slice(0, 7)}) is the latest release; tool reference written.`);
  return { source: 'network', tag: PIN_TAG, sha: remote.sha };
}

/* c8 ignore start */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  syncToolDocs().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
/* c8 ignore stop */
