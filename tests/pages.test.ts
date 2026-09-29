import { describe, it, expect } from 'vitest';
import { loadCopy, section, headingOf, bodyOf, groupsOf, DOCS_ROUTES, resolveHref } from '../src/lib/pages';

describe('pages loader (import.meta.glob over content/copy)', () => {
  it('loads every page and exposes the sections pages depend on', () => {
    const home = loadCopy('home');
    for (const id of ['hero', 'beats', 'ros2-mcp', 'wiseos', 'defence', 'docs-cta']) expect(section(home, id).id).toBe(id);
    expect(headingOf(section(home, 'hero'), 1)).toBe('The AI layer for ROS 2 robots.');
    expect(groupsOf(section(home, 'beats')).map((g) => g.title)).toEqual(['See', 'Understand', 'Operate']);
    expect(bodyOf(section(home, 'ros2-mcp'), 3).some((b) => b.type === 'heading')).toBe(false);
    expect(bodyOf(section(home, 'ros2-mcp'), 6)).toEqual(section(home, 'ros2-mcp').blocks);
    expect(headingOf(section(home, 'ros2-mcp'), 6)).toBe('');
  });
  it('fails loudly on a missing page or section, tolerates optional ones', () => {
    expect(() => loadCopy('nope')).toThrow(/not found/);
    expect(() => section(loadCopy('home'), 'nope')).toThrow(/missing/);
    expect(section(loadCopy('home'), 'nope', true).blocks).toEqual([]);
  });
  it('knows the built docs routes and resolves unbuilt docs links to an existing ancestor', () => {
    expect(DOCS_ROUTES).toContain('/docs/');
    expect(DOCS_ROUTES).toContain('/docs/ros2-mcp/quickstart/');
    expect(DOCS_ROUTES).toContain(resolveHref('/docs/ros2-mcp/security/'));
  });
});

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mediaState } from '../src/lib/media';

describe('mediaState (video slot degradation)', () => {
  it('video > poster > none', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'media-'));
    mkdirSync(path.join(root, 'public', 'media'), { recursive: true });
    expect(mediaState('x', root)).toBe('none');
    writeFileSync(path.join(root, 'public', 'media', 'x.poster.jpg'), '');
    expect(mediaState('x', root)).toBe('poster');
    writeFileSync(path.join(root, 'public', 'media', 'x.mp4'), '');
    expect(mediaState('x', root)).toBe('video');
  });
});
