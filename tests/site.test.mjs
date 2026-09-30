import { describe, it, expect } from 'vitest';
import { NAV, isActive, canonicalFor, organizationJsonLd, SITE, CF_BEACON, CF_BEACON_SRC } from '../src/lib/site.mjs';

describe('site IA', () => {
  it('has exactly the 6 locked IA items in order', () => {
    expect(NAV.map((n) => n.label)).toEqual(['Home', 'ROS2 MCP', 'WiseOS', 'Defence & dual-use', 'Docs', 'Contact']);
    for (const n of NAV) expect(n.href).toMatch(/^\/([a-z0-9-]+\/)*$/);
  });
  it('isActive: home only matches /, sections match their subtree', () => {
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/', '/wiseos/')).toBe(false);
    expect(isActive('/docs/', '/docs/ros2-mcp/quickstart/')).toBe(true);
    expect(isActive('/ros2-mcp/', '/ros2-mcp')).toBe(true);
    expect(isActive('/wiseos/', '/ros2-mcp/')).toBe(false);
  });
  it('canonicalFor builds absolute trailing-slash URLs on wisevision.tech', () => {
    expect(canonicalFor('/')).toBe('https://wisevision.tech/');
    expect(canonicalFor('/wiseos')).toBe('https://wisevision.tech/wiseos/');
    expect(canonicalFor('/llms.txt')).toBe('https://wisevision.tech/llms.txt');
  });
  it('Organization JSON-LD has no people and uses hello@', () => {
    const ld = organizationJsonLd();
    expect(ld['@type']).toBe('Organization');
    expect(ld.email).toBe('hello@wisevision.tech');
    const s = JSON.stringify(ld);
    expect(s).not.toMatch(/founder|employee|Person|office@|dobrza|macuda/i);
    expect(ld.sameAs).toContain(SITE.github);
  });
  it('Cloudflare Web Analytics beacon: official script + a 32-hex public site token', () => {
    expect(CF_BEACON_SRC).toBe('https://static.cloudflareinsights.com/beacon.min.js');
    expect(JSON.parse(CF_BEACON)).toEqual({ token: expect.stringMatching(/^[0-9a-f]{32}$/) });
  });
});
