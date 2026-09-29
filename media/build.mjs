#!/usr/bin/env node
// media/build.mjs — expand every media/src/<name>.html into two renderable HyperFrames projects:
//   media/compositions/<name>-16x9/   (1920x1080, class "land")
//   media/compositions/<name>-9x16/   (1080x1920, class "port")
// Placeholders in the source: __W__ __H__ __ORIENT__ (land|port) __PORT__ (true|false) __ID__.
// Shared assets are symlinked (tokens.css, fonts, vendor, shared, proof) so every project resolves
// root-relative paths (HyperFrames lint rejects "../" asset paths).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync, lstatSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MEDIA = dirname(fileURLToPath(import.meta.url));
const SRC = join(MEDIA, 'src');
const OUT = join(MEDIA, 'compositions');
const LINKS = ['tokens.css', 'fonts', 'vendor', 'shared', 'proof'];
const VARIANTS = [
  { suffix: '16x9', W: 1920, H: 1080, orient: 'land', port: 'false' },
  { suffix: '9x16', W: 1080, H: 1920, orient: 'port', port: 'true' },
];
const only = process.argv.slice(2);

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.html'))) {
  const name = file.replace(/\.html$/, '');
  if (only.length && !only.includes(name)) continue;
  const src = readFileSync(join(SRC, file), 'utf8');
  for (const v of VARIANTS) {
    const dir = join(OUT, `${name}-${v.suffix}`);
    mkdirSync(dir, { recursive: true });
    const html = src.replaceAll('__W__', String(v.W)).replaceAll('__H__', String(v.H))
      .replaceAll('__ORIENT__', v.orient).replaceAll('__PORT__', v.port).replaceAll('__ID__', 'main');
    writeFileSync(join(dir, 'index.html'), html);
    writeFileSync(join(dir, 'hyperframes.json'), JSON.stringify({
      $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
      registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
      paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
      media: { autoProxy: true },
    }, null, 2) + '\n');
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id: `${name}-${v.suffix}`, name: `${name}-${v.suffix}`, createdAt: '2026-09-29T00:00:00.000Z' }, null, 2) + '\n');
    for (const l of LINKS) {
      const p = join(dir, l);
      if (existsSync(p) || (() => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } })()) unlinkSync(p);
      symlinkSync(join('..', '..', l), p);
    }
    console.log(`built ${name}-${v.suffix}`);
  }
}
