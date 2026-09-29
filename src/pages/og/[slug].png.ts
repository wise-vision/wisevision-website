// Build-time OG image per page: dark card, Space Grotesk 700 headline, accent line.
// satori turns text into glyph paths with the real (self-hosted) font, sharp rasterises → 1200x630 PNG at /og/<slug>.png.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { ogCardElement, OG_SIZE } from '../../lib/og';
import { loadCopy, section } from '../../lib/pages';
import { plainText } from '../../lib/copy';

const SLUGS = ['home', 'ros2-mcp', 'wiseos', 'defence', 'contact', 'privacy'];

export const getStaticPaths: GetStaticPaths = () => SLUGS.map((slug) => ({ params: { slug } }));

let font: Buffer | undefined;
const fontData = () =>
  (font ??= readFileSync(path.join(process.cwd(), 'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff')));

export const GET: APIRoute = async ({ params }) => {
  const doc = loadCopy(String(params.slug));
  const eyebrow = plainText(section(doc, 'hero').fields.eyebrow ?? 'WiseVision');
  const title = plainText(doc.meta.og_title ?? doc.meta.title);
  // satori accepts plain {type, props} objects; its types expect ReactNode.
  const svg = await satori(ogCardElement({ title, eyebrow }) as unknown as Parameters<typeof satori>[0], {
    ...OG_SIZE,
    fonts: [{ name: 'Space Grotesk', data: fontData(), weight: 700, style: 'normal' }],
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
