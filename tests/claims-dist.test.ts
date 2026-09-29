// RED proof for the dist/ claims gate: a page rendered through the REAL copy pipeline (src/lib/copy.ts)
// that contains "MIT" must fail scripts/claims-lint.mjs; the same page without it (and with its claim anchor
// rendered as a hidden data-claim span) must pass.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCopy, inline } from '../src/lib/copy';

const COPY = (licence: string) => `---
title: "Fixture"
description: "Fixture page."
og_title: "Fixture"
---

## section:hero

# Fixture

ROS2 MCP is open source under the ${licence} licence. {#c:mcp-license}
`;

function buildSite(licence: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'claims-dist-'));
  const doc = parseCopy(COPY(licence));
  const body = doc.sections.hero.blocks
    .map((b) => (b.type === 'heading' ? `<h1>${inline(b.text)}</h1>` : b.type === 'paragraph' ? `<p>${inline(b.text)}</p>` : ''))
    .join('\n');
  mkdirSync(path.join(root, 'dist'), { recursive: true });
  mkdirSync(path.join(root, 'content', 'copy'), { recursive: true });
  writeFileSync(path.join(root, 'dist', 'index.html'), `<!doctype html><html><body><main>${body}</main></body></html>`);
  writeFileSync(
    path.join(root, 'CLAIMS.md'),
    '| id | claim | page | evidence | status |\n|---|---|---|---|---|\n| mcp-license | open source | / | ros2_mcp/LICENSE | shipped |\n',
  );
  return root;
}

const lint = (root: string) =>
  spawnSync(process.execPath, ['scripts/claims-lint.mjs', '--root', root], { encoding: 'utf8' });

describe('claims-lint on built dist/', () => {
  it('RED: a rendered page containing "MIT" fails with banned-term at dist/index.html', () => {
    const root = buildSite('MIT');
    try {
      const r = lint(root);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/^dist\/index\.html:\d+ banned-term "MIT"/m);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('GREEN: the same page with MPL-2.0 passes (anchor survives rendering as data-claim)', () => {
    const root = buildSite('MPL-2.0');
    try {
      const r = lint(root);
      expect(r.stdout).toBe('');
      expect(r.status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
