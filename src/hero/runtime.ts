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

  let hero = buildScene('desktop');
  const cam = new PerspectiveCamera(30, 1, 0.05, 200);

  // base_link callout: mono label parked in empty floor space, joined to the base_link origin by a leader line
  let label: SVGSVGElement | null = null;
  let leader: SVGPolylineElement | null = null;
  let labelText: SVGTextElement | null = null;
  if (opts.label === 'base_link') {
    const NS = 'http://www.w3.org/2000/svg';
    label = document.createElementNS(NS, 'svg');
    label.setAttribute('aria-hidden', 'true');
    label.setAttribute('class', 'wv-hero-label');
    Object.assign(label.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 700ms cubic-bezier(.16,1,.3,1)',
      overflow: 'visible',
    } satisfies Partial<CSSStyleDeclaration>);
    leader = document.createElementNS(NS, 'polyline');
    leader.setAttribute('fill', 'none');
    leader.setAttribute('stroke', 'rgba(242,245,247,0.42)');
    leader.setAttribute('stroke-width', '1');
    labelText = document.createElementNS(NS, 'text');
    labelText.textContent = 'base_link';
    labelText.setAttribute('fill', 'rgba(242,245,247,0.78)');
    labelText.setAttribute('style', 'font: 500 11px "JetBrains Mono", ui-monospace, monospace; letter-spacing: .02em');
    label.append(leader, labelText);
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
    if (hero.layout !== layout) {
      const shared = hero.shared;
      hero.dispose();
      hero = buildScene(layout);
      hero.shared.uCollapseY.value = shared.uCollapseY.value;
    }
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
    if (label && leader && labelText) {
      tmp.copy(hero.baseLinkWorld).project(cam);
      const ox = (tmp.x * 0.5 + 0.5) * w, oy = (-tmp.y * 0.5 + 0.5) * h;
      const [dx, dy] = hero.comp.label;
      const lx = ox + dx, ly = oy + dy;
      // leader: starts just clear of the triad origin, elbows into a short horizontal shelf under the text
      const len = Math.hypot(dx - 18, dy) || 1;
      const sx = ox + ((dx - 18) / len) * 10, sy = oy + (dy / len) * 10;
      leader.setAttribute('points', `${sx.toFixed(1)},${sy.toFixed(1)} ${(lx - 18).toFixed(1)},${(ly + 4).toFixed(1)} ${(lx + 66).toFixed(1)},${(ly + 4).toFixed(1)}`);
      labelText.setAttribute('x', lx.toFixed(1));
      labelText.setAttribute('y', (ly - 1).toFixed(1));
      label.style.opacity = String(0.95 * (1 - s.dolly * 1.6 > 0 ? 1 - s.dolly * 1.6 : 0));
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
