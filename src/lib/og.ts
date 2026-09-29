// OG card (1200x630): dark base, eyebrow in accent, headline in Space Grotesk 700, accent line.
// Returns a satori element tree (plain objects, no React). Rendered to PNG at build time by
// src/pages/og/[slug].png.ts: satori (text → glyph paths with the real font) → sharp (SVG → PNG).

export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface OgCard {
  title: string;
  eyebrow?: string;
}

type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): El => ({ type, props: { style, children } });

export function ogCardElement({ title, eyebrow = 'WiseVision' }: OgCard): El {
  const size = title.length > 48 ? 64 : title.length > 30 ? 76 : 92;
  return el(
    'div',
    {
      width: OG_SIZE.width,
      height: OG_SIZE.height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '80px',
      fontFamily: 'Space Grotesk',
      color: '#F2F5F7',
      backgroundColor: '#07080B',
      backgroundImage:
        'radial-gradient(circle at 92% 0%, rgba(60,255,180,0.20) 0%, rgba(60,255,180,0) 55%), linear-gradient(180deg, #07080B 0%, #0B0E14 100%)',
    },
    [
      el('div', { display: 'flex', fontSize: 24, letterSpacing: 4, color: '#2EE6A0', textTransform: 'uppercase' }, eyebrow),
      el('div', { display: 'flex', fontSize: size, lineHeight: 1.04, letterSpacing: -2, maxWidth: 1000 }, title),
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { width: 160, height: 6, borderRadius: 3, backgroundColor: '#3CFFB4' }),
        el('div', { display: 'flex', fontSize: 24, color: '#A3ACB9' }, 'wisevision.tech'),
      ]),
    ],
  );
}
