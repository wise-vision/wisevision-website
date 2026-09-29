/** Locked palette (hero-council SYNTHESIS). Linear-ish RGB triples in 0..1 for shaders. */
export const HEX = {
  base0: '#07080B',
  base1: '#0B0E14',
  text: '#F2F5F7',
  accent: '#3CFFB4',
  accentText: '#2EE6A0',
} as const;

export type RGB = [number, number, number];
export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const C = {
  wire: hexToRgb('#E6ECF0'),
  grid: hexToRgb('#9AA6B2'),
  accent: hexToRgb(HEX.accent),
  scan: hexToRgb('#E8F2EE'),
  // RViz TF convention, muted so the only saturated hue on screen stays the accent
  tfX: hexToRgb('#E0605A'),
  tfY: hexToRgb('#6FCF8F'),
  tfZ: hexToRgb('#5F8FE8'),
  // baked lights
  key: hexToRgb('#FFE2C2'), // warm-neutral rim key
  fill: hexToRgb('#6F8FBF'), // dim cool fill
  prism: hexToRgb('#10161E'),
} as const;
