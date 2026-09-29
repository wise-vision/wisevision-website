/**
 * Capability gate: should the WebGL hero run at all, or should the poster stay?
 * Fails closed: anything unknown/throwing keeps the poster.
 */

export interface CapabilityEnv {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  createCanvas?: () => { getContext: (kind: string, attrs?: unknown) => unknown };
}

export type CapabilityReason = 'ok' | 'no-environment' | 'reduced-motion' | 'save-data' | 'low-end' | 'no-webgl2';

export interface CapabilityResult {
  ok: boolean;
  reason: CapabilityReason;
}

export function browserEnv(): CapabilityEnv {
  if (typeof window === 'undefined' || typeof document === 'undefined') return {};
  return {
    matchMedia: typeof window.matchMedia === 'function' ? (q) => window.matchMedia(q) : undefined,
    navigator: window.navigator as CapabilityEnv['navigator'],
    createCanvas: () => document.createElement('canvas'),
  };
}

export function shouldRunWebGL(env: CapabilityEnv = browserEnv(), opts: { reducedMotion?: boolean } = {}): CapabilityResult {
  const nav = env.navigator;
  if (!nav || !env.createCanvas) return { ok: false, reason: 'no-environment' };

  const reduced = opts.reducedMotion === true || !!env.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return { ok: false, reason: 'reduced-motion' };

  if (nav.connection?.saveData === true) return { ok: false, reason: 'save-data' };

  const mem = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  if ((typeof mem === 'number' && mem <= 2) || (typeof cores === 'number' && cores <= 2)) {
    return { ok: false, reason: 'low-end' };
  }

  try {
    const gl = env.createCanvas().getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return { ok: false, reason: 'no-webgl2' };
    // release the probe context promptly where supported
    (gl as { getExtension?: (n: string) => { loseContext?: () => void } | null }).getExtension?.('WEBGL_lose_context')?.loseContext?.();
  } catch {
    return { ok: false, reason: 'no-webgl2' };
  }
  return { ok: true, reason: 'ok' };
}
