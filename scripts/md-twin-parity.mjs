#!/usr/bin/env node
// Parity gate for the Markdown twins of the docs (run after `astro build`):
//   node scripts/md-twin-parity.mjs [dist]
// For every dist/docs/**/index.html it checks that
//   1. the twin dist/docs/<path>.md exists,
//   2. the page head has <link rel="alternate" type="text/markdown" href="/docs/<path>.md">,
//   3. the twin's body text equals the text of the page's .sl-markdown-content
//      (whitespace-insensitive, smart punctuation folded, code blocks included).
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { fromHtml } from 'hast-util-from-html';
import { select, selectAll } from 'hast-util-select';
import { toText } from 'hast-util-to-text';
import { remove } from 'unist-util-remove';
import { twinBody } from '../src/lib/md-twin.mjs';

// Starlight's default aside titles (English) when `:::note` has no [label].
const ASIDE_DEFAULT = { note: 'Note', tip: 'Tip', caution: 'Caution', danger: 'Danger' };

/** Fold typographic punctuation (smartypants) and collapse whitespace. Applied to both sides. */
export function normalise(s) {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/-{2,3}|[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlFragmentText(html) {
  return toText(fromHtml(html, { fragment: true }));
}

/** Visible text of a Markdown document as Starlight would render it. */
export function markdownText(md) {
  const tree = fromMarkdown(md, {
    extensions: [gfm(), directive()],
    mdastExtensions: [gfmFromMarkdown(), directiveFromMarkdown()],
  });
  const out = [];
  const walk = (node) => {
    switch (node.type) {
      case 'text':
      case 'inlineCode':
      case 'code':
        out.push(node.value);
        return;
      case 'html':
        out.push(htmlFragmentText(node.value));
        return;
      case 'containerDirective': {
        const hasLabel = node.children[0]?.data?.directiveLabel;
        if (!hasLabel && ASIDE_DEFAULT[node.name]) out.push(ASIDE_DEFAULT[node.name]);
        break;
      }
      case 'textDirective':
      case 'leafDirective':
        // Not a Starlight feature: rendered back as the literal text.
        out.push(node.type === 'textDirective' ? `:${node.name}` : `::${node.name}`);
        break;
      default:
    }
    for (const c of node.children ?? []) walk(c);
    out.push(' ');
  };
  walk(tree);
  return normalise(out.join(''));
}

/** Visible text of a built Starlight page's Markdown content (no header/sidebar/footer/screen-reader chrome). */
export function htmlMainText(html) {
  const tree = fromHtml(html);
  const content = select('.sl-markdown-content', tree);
  if (!content) throw new Error('md-twin-parity: page has no .sl-markdown-content');
  const chrome = new Set(
    selectAll('.sr-only, .sl-anchor-link, figcaption, .copy, button, script, style, template', content),
  );
  remove(content, (n) => chrome.has(n));
  return normalise(toText(content));
}

/** Whitespace-insensitive comparison; on mismatch returns a window around the first difference. */
export function compareTexts(mdText, htmlText) {
  const a = mdText.replace(/\s+/g, '');
  const b = htmlText.replace(/\s+/g, '');
  if (a === b) return { ok: true };
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const win = (s) => s.slice(Math.max(0, i - 60), i + 60);
  return { ok: false, at: i, md: win(a), html: win(b) };
}

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, acc);
    else if (name === 'index.html') acc.push(p);
  }
  return acc;
}

export function checkDist(dist) {
  const docsDir = join(dist, 'docs');
  const pages = existsSync(docsDir) ? walkHtml(docsDir) : [];
  const failures = [];
  if (pages.length === 0) failures.push(`no docs pages under ${docsDir}`);
  for (const page of pages) {
    const route = relative(dist, page).split(sep).slice(0, -1).join('/'); // docs/ros2-mcp/quickstart
    const href = `/${route}.md`;
    const twinFile = join(dist, `${route}.md`);
    if (!existsSync(twinFile)) {
      failures.push(`${route}: missing twin ${href}`);
      continue;
    }
    const html = readFileSync(page, 'utf8');
    const link = selectAll('link[rel=alternate]', fromHtml(html)).find(
      (l) => l.properties.type === 'text/markdown' && l.properties.href === href,
    );
    if (!link) failures.push(`${route}: no <link rel="alternate" type="text/markdown" href="${href}">`);
    const r = compareTexts(markdownText(twinBody(readFileSync(twinFile, 'utf8'))), htmlMainText(html));
    if (!r.ok) failures.push(`${route}: text differs at char ${r.at}\n    md:   …${r.md}…\n    html: …${r.html}…`);
  }
  return { checked: pages.length, failures };
}

/* c8 ignore start */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = process.argv[2] ?? 'dist';
  const { checked, failures } = checkDist(dist);
  if (failures.length) {
    console.error(`md-twin-parity: FAIL (${failures.length} of ${checked} pages)\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`md-twin-parity: OK, ${checked} docs pages have a matching .md twin and alternate link`);
}
/* c8 ignore stop */
