// Per-page SEO helpers (tested in tests/seo.test.ts).
import { SITE } from './site.mjs';
import type { CopyDoc } from './copy';

export interface PageSeo {
  title: string;
  description: string;
  ogTitle: string;
  ogImage: string;
}

export const ogImagePath = (slug: string): string => `/og/${slug}.png`;

export function pageSeo(slug: string, doc: CopyDoc): PageSeo {
  return {
    title: doc.meta.title ?? SITE.name,
    description: doc.meta.description ?? SITE.description,
    ogTitle: doc.meta.og_title ?? doc.meta.title ?? SITE.name,
    ogImage: ogImagePath(slug),
  };
}

/** Greedy word wrap by character budget (used for the OG card headline). */
export function wrapLines(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ROS2 MCP',
    description:
      'Open-source Model Context Protocol server for ROS 2 (Humble and Jazzy). Connects Claude, Cursor, Codex and other MCP clients to topics, services and actions.',
    url: `${SITE.url}/ros2-mcp/`,
    codeRepository: SITE.repo,
    license: 'https://www.mozilla.org/en-US/MPL/2.0/',
    operatingSystem: 'Linux',
    applicationCategory: 'DeveloperApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  };
}
