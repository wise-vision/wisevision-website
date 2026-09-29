/**
 * three.js runtime: renderer, on-demand loop, resize, visibility/offscreen pause, pointer parallax.
 * Loaded lazily by index.ts only after the capability gate passes.
 */
import { WebGLRenderer, PerspectiveCamera, Vector3, Color } from 'three';
import { buildScene, RIGS, applyRig, type Layout } from './scene';
import { beatState } from './beats';
import { HEX } from './palette';
import type { HeroOptions } from './index';

export function startHero(container: HTMLElement, opts: HeroOptions) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'wv-hero-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    opacity: '0',
    transition: 'opacity 700ms cubic-bezier(.16,1,.3,1)',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', premultipliedAlpha: false });
  } catch {
    container.dataset.hero = 'poster:context-failed';
    opts.onFallback?.({ ok: false, reason: 'no-webgl2' });
    return { destroy() {}, invalidate() {} };
  }
  renderer.setClearColor(new Color(HEX.base0), 1);
  // the poster sits underneath; insert the canvas right after it so HTML copy stays on top
  const posterEl = container.querySelector('[data-hero-poster]');
  if (posterEl?.nextSibling) container.insertBefore(canvas, posterEl.nextSibling);
  else container.prepend(canvas);

  const hero = buildScene();
  const cam = new PerspectiveCamera(30, 1, 0.05, 200);

  let label: HTMLElement | null = null;
  if (opts.label === 'base_link') {
    label = document.createElement('span');
    label.textContent = 'base_link';
    label.setAttribute('aria-hidden', 'true');
    label.className = 'wv-hero-label';
    Object.assign(label.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      font: '500 11px/1 "JetBrains Mono", ui-monospace, monospace',
      letterSpacing: '0.02em',
      color: 'rgba(242,245,247,0.72)',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 700ms cubic-bezier(.16,1,.3,1)',
      whiteSpace: 'nowrap',
    } satisfies Partial<CSSStyleDeclaration>);
    canvas.after(label);
  }

  let layout: Layout = 'desktop';
  let w = 0, h = 0;
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const parallaxOn = opts.parallax !== false && fine;
  const target: [number, number] = [0, 0];
  const cur: [number, number] = [0, 0];
  let visible = true;
  let pageVisible = document.visibilityState !== 'hidden';
  let raf = 0;
  let lastProgress = -1;
  let ready = false;
  let dead = false;

  const progress = () => {
    const p = opts.scrollProgress ? opts.scrollProgress() : 0;
    return Number.isFinite(p) ? p : 0;
  };

  function resize() {
    const r = container.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    layout = opts.layout && opts.layout !== 'auto' ? opts.layout : w < 768 || h > w * 1.05 ? 'mobile' : 'desktop';
    const cap = opts.maxDpr ?? (layout === 'mobile' ? 1.25 : 1.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    hero.shared.uRes.value = [renderer.domElement.width, renderer.domElement.height];
    hero.shared.uPx.value = renderer.getPixelRatio();
    lastProgress = -1;
    invalidate();
  }

  const tmp = new Vector3();
  function frame() {
    raf = 0;
    if (dead || !visible || !pageVisible) return;
    const p = progress();
    const s = beatState(p);
    // critically damped parallax toward the pointer target
    cur[0] += (target[0] - cur[0]) * 0.12;
    cur[1] += (target[1] - cur[1]) * 0.12;
    hero.apply(s);
    applyRig(cam, RIGS[layout], s.dolly, parallaxOn ? cur : [0, 0]);
    const rig = RIGS[layout];
    hero.setVanishingPoint(layout === 'desktop' ? 0.5 + rig.vp[0] * 0.5 : 0.55, layout === 'desktop' ? 0.5 - rig.vp[1] * 0.5 : 0.62);
    renderer.render(hero.scene, cam);
    if (label) {
      tmp.copy(hero.lidarWorld).add(new Vector3(0.05, 0.47, 0)).project(cam);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      label.style.opacity = String(0.9 * (1 - s.dolly));
    }
    if (!ready) {
      ready = true;
      canvas.style.opacity = '1';
      container.dataset.hero = 'webgl';
      opts.onReady?.({ layout, points: hero.pointCount });
    }
    lastProgress = p;
    const moving = Math.abs(target[0] - cur[0]) + Math.abs(target[1] - cur[1]) > 1e-3;
    if (moving) invalidate();
  }

  function invalidate() {
    if (!raf && !dead) raf = requestAnimationFrame(frame);
  }

  // scroll: re-render only when the progress actually moved (Lenis drives native scroll events)
  const onScroll = () => {
    if (Math.abs(progress() - lastProgress) > 1e-5) invalidate();
  };
  const onPointer = (e: PointerEvent) => {
    if (!parallaxOn) return;
    target[0] = (e.clientX / window.innerWidth) * 2 - 1;
    target[1] = -((e.clientY / window.innerHeight) * 2 - 1);
    invalidate();
  };
  const onVis = () => {
    pageVisible = document.visibilityState !== 'hidden';
    if (pageVisible) invalidate();
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) invalidate();
  });
  io.observe(container);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  const onLost = (e: Event) => {
    e.preventDefault();
    canvas.style.opacity = '0'; // poster shows through
  };
  canvas.addEventListener('webglcontextlost', onLost);
  resize();

  // test/poster hook: exposes the same scene at an explicit progress
  (container as HTMLElement & { __hero?: unknown }).__hero = {
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, programs: renderer.info.programs?.length }),
    render: (p?: number) => {
      if (p !== undefined) opts.scrollProgress = () => p;
      lastProgress = -1;
      frame();
    },
  };

  return {
    invalidate,
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      hero.dispose();
      renderer.dispose();
      canvas.remove();
      label?.remove();
      delete container.dataset.hero;
    },
  };
}
