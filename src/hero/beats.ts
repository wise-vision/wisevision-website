/**
 * Pure scroll → storyboard mapping for the wisevision.tech hero.
 *
 * Beats (hero-council SYNTHESIS, "Final hero spec" §4):
 *   0   poster: fleet visible, exactly ONE signal path (lead rover → nearest unit, green endpoint), ring mid-sweep
 *   25  the LaserScan ring expands, chip asks the question
 *   50  the ring has found every unit: triad + signal line drawn for each
 *   75  dolly back, the WiseOS prism is revealed
 *   100 everything resolves into one horizontal accent line
 *
 * No three.js import here: this module must stay testable in node and tree-shakeable.
 */

export const BEATS = [0, 25, 50, 75, 100] as const;
export type Beat = (typeof BEATS)[number];

/**
 * Ground distance (world units, metres) from the lead rover's lidar to each fleet unit, in sweep order.
 * The scene places units at exactly these ranges so the ring "finds" them when it crosses them.
 *   0 = sensor mast, 1 = quadruped, 2 = drone
 */
export const UNIT_DISTANCES = [4.6, 5.6, 7.4] as const;
export const UNIT_COUNT = UNIT_DISTANCES.length;

/** Ring radius at the poster frame: past unit 0, before unit 1 (mid-sweep). */
export const RING_POSTER = 5.0;
/** Ring radius once every unit has been found (beat 50). */
export const RING_FOUND_ALL = UNIT_DISTANCES[UNIT_COUNT - 1] + 1.4;
/** Ring radius at the end of the sweep (beat 75+), where it has left the frame. */
export const RING_MAX = 13.5;
/** Ring must be this far past a unit before its triad/line is fully drawn. */
export const FIND_RAMP = 0.35;

export type ChipState = 'none' | 'question' | 'answer';

export interface BeatState {
  /** clamped progress 0..1 */
  progress: number;
  /** nearest storyboard beat */
  beat: Beat;
  /** LaserScan ring radius, world units */
  ringRadius: number;
  /** ring visibility 0..1 (fades during the final collapse) */
  ringOpacity: number;
  /** per unit 0..1: TF triad draw-in */
  found: number[];
  /** per unit 0..1: signal line draw progress (lead rover → unit), green endpoint at 1 */
  paths: number[];
  /** 0..1 fleet visibility (1 = fully visible; never withheld at beat 0) */
  fleet: number;
  /** 0..1 camera dolly-back amount */
  dolly: number;
  /** 0..1 WiseOS prism reveal */
  wiseos: number;
  /** 0..1 lines from each unit into the WiseOS node */
  uplinks: number;
  /** 0..1 scene collapsing toward the accent line */
  collapse: number;
  /** 0..1 horizontal accent line draw */
  accentLine: number;
  /** H6 question chip state (answer text itself is owned by W3 and must come from a real transcript) */
  chip: ChipState;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** smoothstep, monotonic non-decreasing in x */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function clampProgress(p: number): number {
  return Number.isFinite(p) ? clamp01(p) : 0;
}

/** Ring radius: poster radius at 0, all units found by 0.5, out of frame by 0.75. Monotonic. */
export function ringRadiusAt(p: number): number {
  if (p <= 0.5) return lerp(RING_POSTER, RING_FOUND_ALL, smoothstep(0, 0.5, p));
  return lerp(RING_FOUND_ALL, RING_MAX, smoothstep(0.5, 0.75, p));
}

export function beatState(progress: number): BeatState {
  const p = clampProgress(progress);
  const ringRadius = ringRadiusAt(p);
  const found = UNIT_DISTANCES.map((d) => clamp01((ringRadius - d) / FIND_RAMP));
  const paths = found.slice();
  const collapse = smoothstep(0.8, 1.0, p);
  let chip: ChipState = 'none';
  if (p >= 0.12 && p < 0.4) chip = 'question';
  else if (p >= 0.4 && p < 0.68) chip = 'answer';
  return {
    progress: p,
    beat: BEATS[Math.round(p * 4)],
    ringRadius,
    ringOpacity: 1 - smoothstep(0.6, 0.78, p),
    found,
    paths,
    fleet: 1 - collapse,
    dolly: smoothstep(0.5, 0.75, p),
    wiseos: smoothstep(0.56, 0.75, p),
    uplinks: smoothstep(0.62, 0.75, p),
    collapse,
    accentLine: smoothstep(0.84, 1.0, p),
    chip,
  };
}
