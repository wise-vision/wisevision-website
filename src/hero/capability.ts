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
  /**
   * Off-main-thread GPU probe (OffscreenCanvas in a Worker). Resolves undefined when the worker cannot answer
   * (no OffscreenCanvas WebGL), which falls back to the main-thread probe. Used by shouldRunWebGLAsync.
   */
  probeWorker?: () => Promise<RendererProbe | undefined>;
}

export interface RendererProbe {
  webgl2: boolean;
  renderer: string;
}

export type CapabilityReason = 'ok' | 'no-environment' | 'reduced-motion' | 'save-data' | 'low-end' | 'no-webgl2' | 'software-gl';

/** CPU rasterisers: the scene would cost seconds of main thread there, so the poster is the better experience. */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|basic render driver|software rasterizer/i;

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
    probeWorker: () => workerProbe(),
  };
}

/** The cheap, context-free checks. null = passed, probe the GPU next. */
function preChecks(env: CapabilityEnv, opts: { reducedMotion?: boolean }): CapabilityResult | null {
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
  return null;
}

function classify(p: RendererProbe): CapabilityResult {
  if (!p.webgl2) return { ok: false, reason: 'no-webgl2' };
  if (SOFTWARE_GL.test(p.renderer)) return { ok: false, reason: 'software-gl' };
  return { ok: true, reason: 'ok' };
}

type ProbeGL = {
  getExtension?: (n: string) => { UNMASKED_RENDERER_WEBGL?: number; loseContext?: () => void } | null;
  getParameter?: (p: number) => unknown;
  RENDERER?: number;
};

/** Create a throwaway WebGL2 context, read the (unmasked) renderer string, then release the context. */
function probeContext(canvas: { getContext: (kind: string, attrs?: unknown) => unknown }): RendererProbe {
  const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) as ProbeGL | null;
  if (!gl) return { webgl2: false, renderer: '' };
  const dbg = gl.getExtension?.('WEBGL_debug_renderer_info');
  const renderer = String(
    (dbg?.UNMASKED_RENDERER_WEBGL !== undefined ? gl.getParameter?.(dbg.UNMASKED_RENDERER_WEBGL) : gl.RENDERER !== undefined ? gl.getParameter?.(gl.RENDERER) : '') ?? '',
  );
  // release the probe context promptly where supported
  gl.getExtension?.('WEBGL_lose_context')?.loseContext?.();
  return { webgl2: true, renderer };
}

export function shouldRunWebGL(env: CapabilityEnv = browserEnv(), opts: { reducedMotion?: boolean } = {}): CapabilityResult {
  const pre = preChecks(env, opts);
  if (pre) return pre;
  try {
    return classify(probeContext(env.createCanvas!()));
  } catch {
    return { ok: false, reason: 'no-webgl2' };
  }
}

/**
 * Same gate, but the GPU probe runs in a Worker (OffscreenCanvas) when it can. The first WebGL context of a
 * page is a main-thread long task (GPU process / rasteriser start-up); on the phones that end up on the poster
 * anyway, that task is pure Total Blocking Time. The cheap checks run first, so most fallbacks never probe.
 */
export async function shouldRunWebGLAsync(env: CapabilityEnv = browserEnv(), opts: { reducedMotion?: boolean } = {}): Promise<CapabilityResult> {
  const pre = preChecks(env, opts);
  if (pre) return pre;
  if (env.probeWorker) {
    let p: RendererProbe | undefined;
    try {
      p = await env.probeWorker();
    } catch {
      return { ok: false, reason: 'no-webgl2' };
    }
    if (p) return classify(p);
  }
  return shouldRunWebGL(env, opts);
}

// Worker body: self-contained (stringified into a blob URL, no imports). null = "can't tell" (main-thread fallback).
const WORKER_SRC = `onmessage = () => {
  let r = null;
  try {
    if (typeof OffscreenCanvas === 'function') {
      const gl = new OffscreenCanvas(1, 1).getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      if (!gl) r = { webgl2: false, renderer: '' };
      else {
        const d = gl.getExtension('WEBGL_debug_renderer_info');
        r = { webgl2: true, renderer: String(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '') };
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    }
  } catch (e) { r = null; }
  postMessage(r);
};`;

/**
 * Browser worker probe. Resolves undefined (main-thread fallback) when Worker/OffscreenCanvas are missing, the
 * blob worker is refused (e.g. by a CSP), or it does not answer within `timeoutMs`.
 */
export function workerProbe(timeoutMs = 4000): Promise<RendererProbe | undefined> {
  return new Promise((resolve) => {
    if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function' || typeof Blob !== 'function' || typeof URL?.createObjectURL !== 'function') {
      resolve(undefined);
      return;
    }
    let w: Worker | null = null;
    let url = '';
    let t: ReturnType<typeof setTimeout> | undefined;
    const done = (v: RendererProbe | undefined) => {
      if (t !== undefined) clearTimeout(t);
      w?.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve(v);
    };
    t = setTimeout(() => done(undefined), timeoutMs);
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      w = new Worker(url);
      w.onmessage = (e: MessageEvent<RendererProbe | null>) => done(e.data ?? undefined);
      w.onerror = () => done(undefined);
      w.postMessage(0);
    } catch {
      done(undefined);
    }
  });
}
