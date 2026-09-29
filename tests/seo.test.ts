import { describe, it, expect } from 'vitest';
import { softwareApplicationJsonLd, ogImagePath, pageSeo, wrapLines } from '../src/lib/seo';
import { ogCardElement, OG_SIZE } from '../src/lib/og';
import { fieldErrors, topicFromSearch, formKindFor } from '../src/lib/lead-ui';
import { parseCopy } from '../src/lib/copy';
import { readFileSync } from 'node:fs';

describe('SoftwareApplication JSON-LD for ROS2 MCP', () => {
  const ld = softwareApplicationJsonLd();
  it('has the locked facts: MPL-2.0, Linux, DeveloperApplication, repo', () => {
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.name).toBe('ROS2 MCP');
    expect(ld.license).toBe('https://www.mozilla.org/en-US/MPL/2.0/');
    expect(ld.operatingSystem).toBe('Linux');
    expect(ld.applicationCategory).toBe('DeveloperApplication');
    expect(ld.url).toBe('https://wisevision.tech/ros2-mcp/');
    expect(ld.codeRepository).toBe('https://github.com/wise-vision/ros2_mcp');
    expect(JSON.stringify(ld)).not.toMatch(/\bMIT\b/);
  });
  it('declares it free (no paid tier)', () => {
    expect(ld.offers).toMatchObject({ '@type': 'Offer', price: '0' });
  });
});

describe('pageSeo', () => {
  const doc = parseCopy(readFileSync('content/copy/ros2-mcp.md', 'utf8'));
  it('takes title/description/og_title from the copy frontmatter and names the OG image by slug', () => {
    const seo = pageSeo('ros2-mcp', doc);
    expect(seo.title).toBe(doc.meta.title);
    expect(seo.description).toBe(doc.meta.description);
    expect(seo.ogTitle).toBe(doc.meta.og_title);
    expect(seo.ogImage).toBe('/og/ros2-mcp.png');
  });
  it('ogImagePath maps home to /og/home.png', () => {
    expect(ogImagePath('home')).toBe('/og/home.png');
  });
});

describe('OG card', () => {
  it('wrapLines wraps on word boundaries within a char budget', () => {
    expect(wrapLines('The AI layer for ROS 2 robots', 12)).toEqual(['The AI layer', 'for ROS 2', 'robots']);
  });
  it('ogCardElement is a 1200x630 satori tree: dark base, accent line, Space Grotesk headline (raw text, satori escapes)', () => {
    const el = ogCardElement({ title: 'Robots & <agents>', eyebrow: 'ROS2 MCP' });
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
    const json = JSON.stringify(el);
    expect(el.props.style).toMatchObject({ width: 1200, height: 630, fontFamily: 'Space Grotesk' });
    expect(json).toContain('#07080B');
    expect(json).toContain('#3CFFB4');
    expect(json).toContain('Robots & <agents>');
    expect(json).toContain('ROS2 MCP');
  });
  it('long titles get a smaller headline size', () => {
    const size = (t: string) => JSON.stringify(ogCardElement({ title: t })).match(/"fontSize":(\d+),"lineHeight"/)?.[1];
    expect(Number(size('Short title'))).toBeGreaterThan(Number(size('Robots now do the most dangerous work. Keep a human in command.')));
  });
});

describe('lead form UI helpers', () => {
  it('maps server field codes to human messages', () => {
    expect(fieldErrors({ email: 'invalid', consent: 'required', use_case: 'too_long' })).toEqual({
      email: 'Enter a valid email address.',
      consent: 'Please tick the box so we can store your message.',
      use_case: 'This is too long. Please shorten it.',
    });
    expect(fieldErrors(undefined)).toEqual({});
    expect(fieldErrors({ org: 'weird' }).org).toBe('Please check this field.');
  });
  it('reads ?topic= for the contact form topic and demo variant', () => {
    expect(topicFromSearch('?topic=defence')).toBe('defence');
    expect(topicFromSearch('?topic=<x>')).toBeNull();
    expect(topicFromSearch('')).toBeNull();
    expect(formKindFor('demo')).toBe('demo');
    expect(formKindFor('defence')).toBe('contact');
    expect(formKindFor(null)).toBe('contact');
  });
});
