/**
 * Loader for content/copy/*.md (worker B's page copy).
 *
 * The copy files use a deliberately small Markdown dialect:
 *   - YAML-ish frontmatter (`key: "value"` lines only)
 *   - `## section:<id>` splits the page into sections, in order
 *   - inside a section: `#`..`######` headings, paragraphs, `- ` lists, ``` fences, `> ` quotes
 *   - `key: value` lines are *fields* (eyebrow, consent_label, form, …); `key:` followed by a list is a *field list*
 *   - `- key: Label → href` list items are *links* (CTAs); `- mail: x@y` becomes a mailto link
 *   - `{#c:<id>}` claim anchors (see CLAIMS.md) render as hidden `<span data-claim>` so claims-lint can check dist/
 *
 * Pure functions, no Astro imports: unit-tested in tests/copy.test.ts.
 */

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'quote'; text: string };

export interface CopyLink {
  key: string;
  label: string;
  href: string;
}

export interface Section {
  id: string;
  fields: Record<string, string>;
  links: CopyLink[];
  lists: Record<string, string[]>;
  blocks: Block[];
}

export interface CopyDoc {
  meta: Record<string, string>;
  order: string[];
  sections: Record<string, Section>;
}

const MARKER = /\{#c:([a-z0-9][a-z0-9-]*)\}/g;
const FIELD = /^([a-z][a-z0-9_]*):\s*(.*)$/;
const LINK_ITEM = /^([a-z][a-z0-9_]*):\s*(.+)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function stripClaims(s: string): string {
  return s.replace(MARKER, ' ').replace(/\s+/g, ' ').trim();
}

export function claimIds(s: string): string[] {
  return [...s.matchAll(MARKER)].map((m) => m[1]);
}

/** "Label → /href" → { label, href }. The href is the first token after the arrow. */
export function splitLabelHref(s: string): { label: string; href: string } | null {
  const m = s.match(/^(.*?)\s*→\s*(\S+)\s*$/);
  if (!m || !m[1].trim()) return null;
  return { label: m[1].trim(), href: m[2] };
}

function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    meta[kv[1]] = v;
  }
  return { meta, body: text.slice(m[0].length) };
}

function newSection(id: string): Section {
  return { id, fields: {}, links: [], lists: {}, blocks: [] };
}

function asLink(item: string): CopyLink | null {
  const m = item.match(LINK_ITEM);
  if (!m) return null;
  const rest = stripClaims(m[2]);
  const lh = splitLabelHref(rest);
  if (lh) return { key: m[1], ...lh };
  if (EMAIL.test(rest)) return { key: m[1], label: rest, href: `mailto:${rest}` };
  return null;
}

function parseSection(sec: Section, lines: string[]): void {
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) sec.blocks.push({ type: 'paragraph', text: para.join(' ') });
    para = [];
  };
  const readList = (): string[] => {
    const items: string[] = [];
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
      i++;
    }
    return items;
  };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flush(); i++; continue; }
    const fence = t.match(/^(```|~~~)\s*([\w-]*)/);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++]);
      i++; // closing fence
      sec.blocks.push({ type: 'code', lang: fence[2] || 'text', code: code.join('\n').replace(/\s+$/, '') });
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); sec.blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim() }); i++; continue; }
    if (t.startsWith('>')) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) q.push(lines[i++].trim().replace(/^>\s?/, ''));
      sec.blocks.push({ type: 'quote', text: q.join(' ') });
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      flush();
      const items = readList();
      const plain: string[] = [];
      for (const it of items) {
        const link = asLink(it);
        if (link) sec.links.push(link);
        else plain.push(it);
      }
      if (plain.length) sec.blocks.push({ type: 'list', items: plain });
      continue;
    }
    const f = para.length === 0 ? t.match(FIELD) : null;
    if (f) {
      flush();
      i++;
      if (f[2] === '') {
        while (i < lines.length && !lines[i].trim()) i++;
        sec.lists[f[1]] = readList();
      } else {
        sec.fields[f[1]] = f[2].trim();
      }
      continue;
    }
    para.push(t);
    i++;
  }
  flush();
}

export function parseCopy(text: string): CopyDoc {
  const { meta, body } = parseFrontmatter(text);
  const clean = body.replace(/<!--[\s\S]*?-->/g, '');
  const doc: CopyDoc = { meta, order: [], sections: {} };
  let current: Section | null = null;
  let buf: string[] = [];
  const close = () => {
    if (current) parseSection(current, buf);
    buf = [];
  };
  for (const line of clean.split(/\r?\n/)) {
    const s = line.match(/^##\s+section:([a-z0-9-]+)\s*$/);
    if (s) {
      close();
      current = newSection(s[1]);
      doc.order.push(s[1]);
      doc.sections[s[1]] = current;
      continue;
    }
    if (current) buf.push(line);
  }
  close();
  return doc;
}

// ---------------------------------------------------------------- inline → HTML

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface InlineOptions {
  /** Rewrite internal (/-rooted) hrefs, e.g. to fall back from a docs page that is not built yet. */
  resolve?: (href: string) => string;
}

/** Render one line of copy to safe HTML: escape, **bold**, `code`, [cite], `label → href` links, claim anchors. */
export function inline(text: string, opts: InlineOptions = {}): string {
  const tokens: string[] = [];
  const tok = (html: string) => `\u0001${tokens.push(html) - 1}\u0001`;
  const href = (h: string) => (h.startsWith('/') && opts.resolve ? opts.resolve(h) : h);
  const open = (h: string) => {
    const r = href(h);
    return tok(`<a href="${escapeHtml(r)}"${/^https?:\/\//.test(r) ? ' rel="noopener"' : ''}>`);
  };

  let s = text;
  s = s.replace(/`([^`]+)`/g, (_, c: string) => tok(`<code>${escapeHtml(c)}</code>`));
  s = s.replace(/\s*\{#c:([a-z0-9][a-z0-9-]*)\}/g, (_, id: string) => tok(`<span data-claim="${id}" hidden></span>`));
  s = s.replace(/\[([^\]]+)\](?!\()/g, (_, c: string) => tok(`<cite class="src">${escapeHtml(c)}</cite>`));

  // label → href (label = text since the last sentence boundary before the arrow)
  let out = '';
  let rest = s;
  for (;;) {
    const m = rest.match(/\s*→\s*(\S+)/);
    if (!m || m.index === undefined) break;
    const pre = rest.slice(0, m.index);
    const target = m[1].replace(/\u0001\d+\u0001$/, '');
    const trailing = m[1].slice(target.length);
    const b = [...pre.matchAll(/[.!?:]\s+/g)].pop();
    const cut = b ? (b.index as number) + b[0].length : 0;
    const label = pre.slice(cut);
    if (!label.trim()) { out += rest.slice(0, m.index + m[0].length); rest = rest.slice(m.index + m[0].length); continue; }
    out += pre.slice(0, cut) + open(target) + label + tok('</a>') + trailing;
    rest = rest.slice(m.index + m[0].length);
  }
  s = out + rest;

  // "…steps: /docs/x/" → link the bare internal path
  s = s.replace(/(:\s+)(\/[\w\-./#?=&]*)/g, (_, pre: string, p: string) => `${pre}${open(p)}${escapeHtml(href(p))}${tok('</a>')}`);

  s = escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0001(\d+)\u0001/g, (_, n: string) => tokens[Number(n)]);
}

// ---------------------------------------------------------------- helpers for pages

/** Plain text for <title>, meta and OG cards: no anchors, no markdown, no arrows. */
export function plainText(s: string): string {
  return stripClaims(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s*→\s*\S+/g, '').trim();
}

/** src/content/docs/docs/a/b.mdx → /docs/a/b/ ; …/index.mdx → the folder route. */
export function docsRoutesFromFiles(files: string[]): string[] {
  return files.map((f) => {
    const rel = f.replace(/^.*\/src\/content\/docs\//, '').replace(/\.(md|mdx)$/, '');
    const route = '/' + rel.replace(/(^|\/)index$/, '');
    return route.endsWith('/') ? route : route + '/';
  });
}

/**
 * Copy links to docs pages that another worker has not built yet would 404.
 * Rewrite /docs/* hrefs to the nearest built ancestor; leave everything else alone.
 */
export function docsResolver(routes: string[]): (href: string) => string {
  const set = new Set(routes);
  return (href) => {
    if (!href.startsWith('/docs/')) return href;
    const path = href.replace(/[?#].*$/, '');
    if (set.has(path)) return href;
    const parts = path.split('/').filter(Boolean);
    while (parts.length) {
      parts.pop();
      const p = '/' + parts.join('/') + (parts.length ? '/' : '');
      if (set.has(p)) return p;
    }
    return '/docs/';
  };
}
