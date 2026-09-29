import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCopy, inline, stripClaims, claimIds, splitLabelHref } from '../src/lib/copy';

const SAMPLE = `---
title: "Hello: world"
description: "A page."
og_title: "OG hello"
---

<!-- a comment that must vanish -->

## section:hero

eyebrow: Open source · MPL-2.0

# The AI layer for ROS 2 robots.

Agents that see, understand and operate your fleet. {#c:hero-layer}

- primary_cta: Try ROS2 MCP → /ros2-mcp/#install
- secondary_cta: Read the docs → /docs/
- mail: hello@wisevision.tech

## section:beats

### See

Your agent **lists** live topics with \`ros2 topic list\`. {#c:mcp-see}

- plain item one {#c:a}
- Source → https://example.com/x

\`\`\`bash
docker run -i --rm mcp/ros2
\`\`\`

> Why did unit 7 stop?

topics:
- One
- Two

consent_label: I agree. See the privacy notice → /privacy/
`;

describe('parseCopy', () => {
  const doc = parseCopy(SAMPLE);
  it('reads frontmatter', () => {
    expect(doc.meta).toEqual({ title: 'Hello: world', description: 'A page.', og_title: 'OG hello' });
  });
  it('splits sections in order and drops HTML comments', () => {
    expect(doc.order).toEqual(['hero', 'beats']);
    expect(JSON.stringify(doc)).not.toContain('comment that must vanish');
  });
  it('lifts key: value fields and CTA list items out of the prose', () => {
    const hero = doc.sections.hero;
    expect(hero.fields.eyebrow).toBe('Open source · MPL-2.0');
    expect(hero.links).toEqual([
      { key: 'primary_cta', label: 'Try ROS2 MCP', href: '/ros2-mcp/#install' },
      { key: 'secondary_cta', label: 'Read the docs', href: '/docs/' },
      { key: 'mail', label: 'hello@wisevision.tech', href: 'mailto:hello@wisevision.tech' },
    ]);
    expect(hero.blocks.map((b) => b.type)).toEqual(['heading', 'paragraph']);
    expect(hero.blocks[0]).toMatchObject({ type: 'heading', level: 1, text: 'The AI layer for ROS 2 robots.' });
  });
  it('keeps headings, lists, code, quotes; key list after a field becomes a field list', () => {
    const b = doc.sections.beats;
    expect(b.blocks.map((x) => x.type)).toEqual(['heading', 'paragraph', 'list', 'code', 'quote']);
    expect(b.blocks[3]).toMatchObject({ type: 'code', lang: 'bash', code: 'docker run -i --rm mcp/ros2' });
    expect(b.lists.topics).toEqual(['One', 'Two']);
    expect(b.fields.consent_label).toBe('I agree. See the privacy notice → /privacy/');
  });
  it('a list item with an arrow but no key is a labelled link', () => {
    const list = doc.sections.beats.blocks[2];
    expect(list.type).toBe('list');
    if (list.type === 'list') expect(list.items[1]).toBe('Source → https://example.com/x');
  });
});

describe('inline', () => {
  it('escapes HTML, renders bold and code', () => {
    expect(inline('a <b> **bold** `x<y`')).toBe('a &lt;b&gt; <strong>bold</strong> <code>x&lt;y</code>');
  });
  it('turns claim markers into hidden data-claim spans at the same position', () => {
    expect(inline('It works. {#c:a-b} {#c:c}')).toBe(
      'It works.<span data-claim="a-b" hidden></span><span data-claim="c" hidden></span>',
    );
  });
  it('turns "label → href" into a link, external links get rel noopener', () => {
    expect(inline('Source → https://ex.com/a')).toBe('<a href="https://ex.com/a" rel="noopener">Source</a>');
    expect(inline('See the privacy notice → /privacy/')).toBe('<a href="/privacy/">See the privacy notice</a>');
  });
  it('links a bare internal path after a colon', () => {
    expect(inline('Full lock-down steps: /docs/ros2-mcp/security/')).toBe(
      'Full lock-down steps: <a href="/docs/ros2-mcp/security/">/docs/ros2-mcp/security/</a>',
    );
  });
  it('keeps [Source] citations as muted cite spans', () => {
    expect(inline('A fact. [CSIS, March 2025] {#c:x}')).toBe(
      'A fact. <cite class="src">CSIS, March 2025</cite><span data-claim="x" hidden></span>',
    );
  });
  it('rewrites internal hrefs through the resolver', () => {
    expect(inline('Go → /docs/ros2-mcp/connect/', { resolve: () => '/docs/' })).toBe('<a href="/docs/">Go</a>');
  });
});

describe('helpers', () => {
  it('stripClaims removes markers and collapses space', () => {
    expect(stripClaims('A. {#c:x} {#c:y}')).toBe('A.');
  });
  it('claimIds lists anchors', () => {
    expect(claimIds('A {#c:x} B {#c:y-z}')).toEqual(['x', 'y-z']);
  });
  it('splitLabelHref', () => {
    expect(splitLabelHref('Talk → /contact/?topic=defence')).toEqual({ label: 'Talk', href: '/contact/?topic=defence' });
    expect(splitLabelHref('no arrow')).toBeNull();
  });
});

describe('real copy files', () => {
  for (const name of ['home', 'ros2-mcp', 'wiseos', 'defence', 'contact', 'privacy']) {
    it(`${name}.md parses with a hero section, title and description`, () => {
      const doc = parseCopy(readFileSync(`content/copy/${name}.md`, 'utf8'));
      expect(doc.meta.title).toBeTruthy();
      expect(doc.meta.description).toBeTruthy();
      expect(doc.order[0]).toBe('hero');
      const h1 = doc.sections.hero.blocks.find((b) => b.type === 'heading' && b.level === 1);
      expect(h1).toBeTruthy();
    });
  }
});
