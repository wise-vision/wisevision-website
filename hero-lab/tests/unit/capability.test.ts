import { describe, it, expect } from 'vitest';
import { shouldRunWebGL, type CapabilityEnv } from '../../../src/hero/capability';

function env(over: Partial<{ reduced: boolean; saveData: boolean; deviceMemory: number; cores: number; webgl2: boolean; noNav: boolean; renderer: string }> = {}): CapabilityEnv {
  const o = { reduced: false, saveData: false, deviceMemory: 8, cores: 8, webgl2: true, ...over };
  return {
    matchMedia: (q: string) => ({ matches: q.includes('prefers-reduced-motion') ? o.reduced : false }),
    navigator: o.noNav
      ? undefined
      : ({ connection: { saveData: o.saveData }, deviceMemory: o.deviceMemory, hardwareConcurrency: o.cores } as any),
    createCanvas: () =>
      ({
        getContext: (k: string) =>
          k === 'webgl2' && o.webgl2
            ? {
                // WEBGL_debug_renderer_info → UNMASKED_RENDERER_WEBGL (0x9246) when a renderer string is faked
                getExtension: (n: string) => (n === 'WEBGL_debug_renderer_info' && o.renderer ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null),
                getParameter: (p: number) => (p === 0x9246 ? o.renderer : 'WebKit WebGL'),
                RENDERER: 0x1f01,
              }
            : null,
      }) as any,
  };
}

describe('shouldRunWebGL', () => {
  it('runs on a capable desktop', () => {
    expect(shouldRunWebGL(env())).toEqual({ ok: true, reason: 'ok' });
  });
  it('keeps the poster without WebGL2', () => {
    expect(shouldRunWebGL(env({ webgl2: false }))).toEqual({ ok: false, reason: 'no-webgl2' });
  });
  it('keeps the poster with prefers-reduced-motion', () => {
    expect(shouldRunWebGL(env({ reduced: true }))).toEqual({ ok: false, reason: 'reduced-motion' });
  });
  it('honours the reducedMotion option even if media query is false', () => {
    expect(shouldRunWebGL(env(), { reducedMotion: true })).toEqual({ ok: false, reason: 'reduced-motion' });
  });
  it('keeps the poster with saveData', () => {
    expect(shouldRunWebGL(env({ saveData: true }))).toEqual({ ok: false, reason: 'save-data' });
  });
  it('keeps the poster on low memory (deviceMemory <= 2)', () => {
    expect(shouldRunWebGL(env({ deviceMemory: 2 }))).toEqual({ ok: false, reason: 'low-end' });
  });
  it('keeps the poster on low core count (hardwareConcurrency <= 2)', () => {
    expect(shouldRunWebGL(env({ cores: 2 }))).toEqual({ ok: false, reason: 'low-end' });
  });
  it('does not treat unknown deviceMemory as low-end', () => {
    expect(shouldRunWebGL(env({ deviceMemory: undefined as any }))).toEqual({ ok: true, reason: 'ok' });
  });
  it('fails closed when there is no navigator / canvas (SSR)', () => {
    expect(shouldRunWebGL(env({ noNav: true }))).toEqual({ ok: false, reason: 'no-environment' });
  });
  it('fails closed when canvas creation throws', () => {
    const e = env();
    e.createCanvas = () => { throw new Error('boom'); };
    expect(shouldRunWebGL(e)).toEqual({ ok: false, reason: 'no-webgl2' });
  });
  it('keeps the poster on a software rasteriser (SwiftShader / llvmpipe / WARP): WebGL there costs seconds of main thread', () => {
    for (const r of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)',
      'Google SwiftShader',
    ])
      expect(shouldRunWebGL(env({ renderer: r }))).toEqual({ ok: false, reason: 'software-gl' });
  });
  it('runs on real GPUs', () => {
    for (const r of ['ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)', 'Apple GPU', 'Adreno (TM) 740', 'Mali-G78'])
      expect(shouldRunWebGL(env({ renderer: r }))).toEqual({ ok: true, reason: 'ok' });
  });
});
