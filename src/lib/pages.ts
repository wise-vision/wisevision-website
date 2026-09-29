// Build-time access to content/copy/*.md for Astro pages. Parsing lives in ./copy (unit-tested).
import { parseCopy, docsResolver, docsRoutesFromFiles, type CopyDoc, type Section } from './copy';

const RAW = import.meta.glob('/content/copy/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const DOCS = Object.keys(import.meta.glob('/src/content/docs/docs/**/*.{md,mdx}'));

export const DOCS_ROUTES = docsRoutesFromFiles(DOCS);
/** Rewrites links to docs pages that are not built yet to the nearest built ancestor (keeps the link audit at 0). */
export const resolveHref = docsResolver(DOCS_ROUTES);

export function loadCopy(slug: string): CopyDoc {
  const raw = RAW[`/content/copy/${slug}.md`];
  if (!raw) throw new Error(`content/copy/${slug}.md not found`);
  return parseCopy(raw);
}

const EMPTY: Section = { id: '', fields: {}, links: [], lists: {}, blocks: [] };

/** Section by id; throws at build time if the copy lost a section a page depends on. */
export function section(doc: CopyDoc, id: string, optional = false): Section {
  const s = doc.sections[id];
  if (!s && !optional) throw new Error(`copy section "${id}" missing (have: ${doc.order.join(', ')})`);
  return s ?? EMPTY;
}

/** First heading text in a section (optionally of a given level). */
export function headingOf(s: Section, level?: number): string {
  const h = s.blocks.find((b) => b.type === 'heading' && (level === undefined || b.level === level));
  return h && h.type === 'heading' ? h.text : '';
}

/** Blocks without the first heading (the heading is usually rendered separately, bigger). */
export function bodyOf(s: Section, level?: number) {
  const i = s.blocks.findIndex((b) => b.type === 'heading' && (level === undefined || b.level === level));
  return i < 0 ? s.blocks : [...s.blocks.slice(0, i), ...s.blocks.slice(i + 1)];
}

/** Split a section into groups at each heading of `level` (e.g. the "### See / ### Understand" beats). */
export function groupsOf(s: Section, level = 3) {
  const groups: { title: string; blocks: Section['blocks'] }[] = [];
  for (const b of s.blocks) {
    if (b.type === 'heading' && b.level === level) groups.push({ title: b.text, blocks: [] });
    else if (groups.length) groups[groups.length - 1].blocks.push(b);
  }
  return groups;
}
