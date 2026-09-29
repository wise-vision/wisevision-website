/**
 * The hero scene: ROS grid + mirror, lead rover, fleet in three opacity bands, TF triads, LaserScan ring,
 * signal paths, WiseOS prism. Pure construction + an `apply(state)` that only touches uniforms.
 */
import {
  Scene,
  Mesh,
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  PlaneGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Matrix4,
  Quaternion,
  Vector3,
  Euler,
  AdditiveBlending,
  NormalBlending,
  PerspectiveCamera,
  MeshBasicMaterial,
} from 'three';
import { Segs, lineMaterial, createShared, type Shared } from './lines';
import { leadRover, quadruped, drone, sensorMast } from './robots';
import { C, hexToRgb, HEX } from './palette';
import { UNIT_DISTANCES, type BeatState } from './beats';

export type Layout = 'desktop' | 'mobile';

/**
 * Per-layout composition. Desktop is the approved A/B winner (unchanged). Mobile is composed separately:
 * the rover is turned so its six-wheel profile faces the camera (unambiguous "rover", not an arm), and the
 * fleet is spread so the quadruped, drone and mast each own a clear patch of the portrait frame.
 * Bearings are measured from the rover's lidar (rad, 0 = -Z, + toward +X); ranges are UNIT_DISTANCES.
 */
export interface Composition {
  roverPos: Vector3;
  roverYaw: number;
  bearings: number[];
  heights: number[];
  yaws: number[];
  prismPos: Vector3;
  /** base_link label position relative to the projected base_link origin, CSS px (text baseline-left) */
  label: [number, number];
}
export const COMPOSITIONS: Record<Layout, Composition> = {
  // composed so that at the desktop rig: quadruped ≈ (86%, 60%), drone ≈ (78%, 18%), sensor mast ≈ (51%, 23–53%)
  desktop: {
    roverPos: new Vector3(1.48, 0, -4.8),
    roverYaw: 0.62,
    bearings: [0.587, 0.448, 0.1],
    heights: [0, 2.2, 0],
    yaws: [2.3, 0.5, 0.3],
    prismPos: new Vector3(3.4, 0, -15.5),
    label: [128, 58],
  },
  mobile: {
    roverPos: new Vector3(-0.35, 0, -5.4),
    roverYaw: -0.32,
    bearings: [0.43, -0.2, 0.1],
    heights: [0, 1.9, 0],
    yaws: [2.6, 0.4, 0.2],
    prismPos: new Vector3(0.3, 0, -17),
    label: [96, 40],
  },
};
/** kept for back-compat with the harness/tests */
export const ROVER_POS = COMPOSITIONS.desktop.roverPos;
export const ROVER_YAW = COMPOSITIONS.desktop.roverYaw;
const UNIT_BAND = [0.9, 0.66, 0.4]; // near, mid, far floor 40%

const Q = (x: number, y: number, z: number) => new Quaternion().setFromEuler(new Euler(x, y, z));
const pose = (p: Vector3, yaw: number) => new Matrix4().compose(p, Q(0, yaw, 0), new Vector3(1, 1, 1));

const POINT_VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSize;
attribute float aJit;
uniform float uPx;
uniform float uRadius;
uniform float uRing;
uniform vec3 uCentre;
uniform float uCollapse;
uniform float uCollapseY;
uniform vec2 uArc;
varying vec4 vColor;
varying float vArc;
void main() {
  vArc = 1.0;
  vec3 p = position;
  if (uRing > 0.5) {
    float r = uRadius * (1.0 + aJit) ;
    p = uCentre + vec3(cos(position.x) * r, position.y, sin(position.x) * r);
    // scan front: only the arc ahead of the lead rover, right of the type column, reads
    float b = atan(cos(position.x), -sin(position.x)); // bearing, 0 = -Z
    vArc = smoothstep(uArc.x, uArc.x + 0.35, b) * (1.0 - smoothstep(uArc.y - 0.35, uArc.y, b));
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  if (mv.z > -0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  gl_Position = projectionMatrix * mv;
  gl_Position.y = mix(gl_Position.y, uCollapseY * gl_Position.w, uCollapse);
  gl_PointSize = aSize * uPx * clamp(6.0 / -mv.z, 0.55, 1.6);
  vColor = aColor;
  vColor.a *= 1.0 - smoothstep(22.0, 40.0, -mv.z);
}`;
const POINT_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec4 vColor;
varying float vArc;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, 0.55, r);
  float core = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vColor.rgb + core * 0.25, vColor.a * a * uOpacity * vArc);
  if (gl_FragColor.a < 0.003) discard;
}`;

function pointMaterial(shared: Shared, ring: boolean, additive = true): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: additive ? AdditiveBlending : NormalBlending,
    uniforms: {
      uPx: shared.uPx,
      uCollapse: shared.uCollapse,
      uCollapseY: shared.uCollapseY,
      uOpacity: { value: 1 },
      uRadius: { value: 1 },
      uRing: { value: ring ? 1 : 0 },
      uCentre: { value: new Vector3() },
      uArc: { value: [-0.3, 1.9] },
    },
  });
}

/** Deterministic PRNG so the poster and the live scene are pixel-identical. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export interface HeroScene {
  scene: Scene;
  shared: Shared;
  layout: Layout;
  comp: Composition;
  lidarWorld: Vector3;
  /** base_link: chassis centre on the ground plane (REP-105) */
  baseLinkWorld: Vector3;
  pointCount: number;
  setVanishingPoint(x: number, y: number): void;
  apply(s: BeatState): void;
  dispose(): void;
}

export function buildScene(layout: Layout = 'desktop'): HeroScene {
  const comp = COMPOSITIONS[layout];
  const ROVER_POS = comp.roverPos, ROVER_YAW = comp.roverYaw;
  const UNIT_BEARINGS = comp.bearings, UNIT_HEIGHTS = comp.heights, UNIT_YAW = comp.yaws;
  const scene = new Scene();
  const shared = createShared();
  const disposables: { dispose(): void }[] = [];
  const add = <T extends Mesh | Points>(o: T, order: number) => {
    o.frustumCulled = false;
    o.renderOrder = order;
    scene.add(o);
    disposables.push(o.geometry, o.material as ShaderMaterial);
    return o;
  };

  // ---------- base: radial #0B0E14 → #07080B centred on the vanishing point (screen space) ----------
  const bgMat = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: { uVp: { value: [0.3, 0.41] }, uRes: shared.uRes, uA: { value: new Vector3(...hexToRgb(HEX.base1)) }, uB: { value: new Vector3(...hexToRgb(HEX.base0)) } },
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform vec2 uVp; uniform vec2 uRes; uniform vec3 uA; uniform vec3 uB;
      void main(){ vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y; vec2 d = (uv - uVp) * vec2(uRes.x / uRes.y, 1.0);
        float t = smoothstep(0.0, 1.05, length(d * vec2(0.8, 1.25)));
        // 1/255 dither so the gradient never bands in the AVIF poster
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 255.0;
        gl_FragColor = vec4(mix(uA, uB, t) + n, 1.0); }`,
  });
  const bg = new Mesh(new PlaneGeometry(2, 2), bgMat);
  add(bg, -10);
  const bgUniforms = bgMat.uniforms;

  // warm key pool on the floor around the lead rover (product-shot lighting, no shadow maps, no bloom)
  const poolMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uCol: { value: new Vector3(...C.key) }, uCool: { value: new Vector3(...C.fill) }, uOpacity: { value: 1 }, uCollapse: shared.uCollapse },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uCol; uniform vec3 uCool; uniform float uOpacity; uniform float uCollapse; varying vec2 vUv;
      void main(){ vec2 d = (vUv - vec2(0.5, 0.5)) * 2.0; float r = length(d);
        float warm = exp(-r * r * 3.0) * 0.12; float cool = exp(-dot(d - vec2(-0.55, 0.3), d - vec2(-0.55, 0.3)) * 2.5) * 0.035;
        gl_FragColor = vec4(uCol * warm + uCool * cool, 1.0) * uOpacity * (1.0 - uCollapse); }`,
  });
  const pool = new Mesh(new PlaneGeometry(11, 9), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(ROVER_POS.x + 0.8, 0.002, ROVER_POS.z - 1.6);
  add(pool, 0);

  // ---------- ROS grid (1 m cells, 5 m majors), near band 2x opacity ----------
  const grid = new Segs();
  const ext = 36, zNear = 3, zFar = -70;
  for (let x = -ext; x <= ext; x++) {
    const major = x % 5 === 0;
    grid.seg(new Vector3(x, 0, zNear), new Vector3(x, 0, zFar), C.grid, major ? 0.5 : 0.26);
  }
  for (let z = zNear; z >= zFar; z--) {
    const major = z % 5 === 0;
    grid.seg(new Vector3(-ext, 0, z), new Vector3(ext, 0, z), C.grid, major ? 0.5 : 0.26);
  }
  const gridMat = lineMaterial(shared, { width: 1, fog: [14, 46], nearBand: [5, 11] });
  add(new Mesh(grid.build(), gridMat), 0);

  // ---------- contact shadow sprite under the lead rover ----------
  const shadowMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uCol: { value: new Vector3(...hexToRgb(HEX.base0)) }, uOpacity: { value: 0.9 }, uCollapse: shared.uCollapse },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: `uniform vec3 uCol; uniform float uOpacity; uniform float uCollapse; varying vec2 vUv;
      void main(){ vec2 d = (vUv-0.5)*2.0; float r = length(d); float a = smoothstep(1.0, 0.15, r);
      gl_FragColor = vec4(uCol, a*uOpacity*(1.0-uCollapse)); }`,
  });
  const shadow = new Mesh(new PlaneGeometry(2.1, 1.5), shadowMat);
  shadow.rotation.set(-Math.PI / 2, 0, ROVER_YAW);
  shadow.position.copy(ROVER_POS).setY(0.004);
  add(shadow, 1);

  // ---------- robots ----------
  const rover = new Segs();
  rover.collectOccluders = true;
  const roverM = pose(ROVER_POS, ROVER_YAW);
  const { lidar } = leadRover(rover, roverM, C.wire, 1);
  const lidarWorld = lidar.clone().applyMatrix4(roverM);
  const lidarGround = lidarWorld.clone().setY(0);

  const fleet = new Segs();
  fleet.collectOccluders = true;
  const unitAnchors: Vector3[] = [];
  const unitBases: Vector3[] = [];
  UNIT_DISTANCES.forEach((d, i) => {
    const b = UNIT_BEARINGS[i];
    const p = new Vector3(lidarGround.x + Math.sin(b) * d, UNIT_HEIGHTS[i], lidarGround.z - Math.cos(b) * d);
    const m = pose(p, UNIT_YAW[i]);
    const build = [quadruped, drone, sensorMast][i];
    const anchor = build(fleet, m, C.wire, UNIT_BAND[i]).applyMatrix4(m);
    unitAnchors.push(anchor);
    unitBases.push(p.clone());
  });

  const roverGeo = rover.build();
  const fleetGeo = fleet.build();
  const roverMat = lineMaterial(shared, { width: 1.35, lit: true, fog: [30, 60] });
  const fleetMat = lineMaterial(shared, { width: 1.1, lit: true, fog: [30, 60] });
  // hidden-line removal: depth-only solids, pushed back so their own edges survive
  const occMat = new MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
  const occ = new Mesh(rover.buildOccluder(), occMat);
  occ.frustumCulled = false;
  occ.renderOrder = 2.5;
  scene.add(occ);
  const occF = new Mesh(fleet.buildOccluder(), occMat);
  occF.frustumCulled = false;
  occF.renderOrder = 2.5;
  scene.add(occF);
  disposables.push(occ.geometry, occF.geometry, occMat);
  add(new Mesh(roverGeo, roverMat), 3);
  add(new Mesh(fleetGeo, fleetMat), 3);
  // floor mirror (~4% reflection below y=0)
  const roverMir = lineMaterial(shared, { width: 1.35, lit: true, mirror: true, fog: [20, 40] });
  const fleetMir = lineMaterial(shared, { width: 1.1, lit: true, mirror: true, fog: [20, 40] });
  add(new Mesh(roverGeo, roverMir), 2);
  add(new Mesh(fleetGeo, fleetMir), 2);

  // ---------- aux: rover footprint (RViz footprint polygon) + drone altitude tether (ground anchor) ----------
  const aux = new Segs();
  {
    const fq = Q(0, ROVER_YAW, 0);
    const hx = 0.78, hz = 0.52;
    const corners = [[hx, hz], [hx, -hz], [-hx, -hz], [-hx, hz]].map(([x, z]) => new Vector3(x, 0.006, z).applyQuaternion(fq).add(ROVER_POS));
    for (let i = 0; i < 4; i++) aux.seg(corners[i], corners[(i + 1) % 4], C.grid, 0.55);
    const d = unitAnchors[1];
    const g = d.clone().setY(0.006);
    const n = 9;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * (d.y - 0.16), a1 = ((k + 0.5) / n) * (d.y - 0.16);
      aux.seg(g.clone().setY(0.006 + a0), g.clone().setY(0.006 + a1), C.grid, 0.5 * UNIT_BAND[1]);
    }
    aux.circle(g, 0.32, 'y', 28, C.grid, 0.6 * UNIT_BAND[1]);
  }
  add(new Mesh(aux.build(), lineMaterial(shared, { width: 1, fog: [30, 60] })), 2);

  // ---------- TF triads (unlabelled; clamped to >= 16 px) ----------
  const triad = (s: Segs, o: Vector3, len: number, yaw: number) => {
    const q = Q(0, yaw, 0);
    s.seg(o, o.clone().add(new Vector3(len, 0, 0).applyQuaternion(q)), C.tfX, 1);
    s.seg(o, o.clone().add(new Vector3(0, len, 0)), C.tfY, 1);
    s.seg(o, o.clone().add(new Vector3(0, 0, len).applyQuaternion(q)), C.tfZ, 1);
  };
  const leadTriad = new Segs();
  // laser frame at the sensor head, base_link at the chassis centre on the ground plane (never at a wheel)
  triad(leadTriad, lidarWorld.clone().add(new Vector3(0, 0.1, 0)), 0.34, ROVER_YAW);
  const baseLinkWorld = ROVER_POS.clone().add(new Vector3(0, 0.02, 0));
  triad(leadTriad, baseLinkWorld, 0.3, ROVER_YAW);
  add(new Mesh(leadTriad.build(), lineMaterial(shared, { width: 2, minPx: 16, fog: [40, 80], depthTest: false })), 6);

  const unitTriadMats: ShaderMaterial[] = [];
  unitAnchors.forEach((a, i) => {
    const s = new Segs();
    // each unit's frame sits at its body / sensor head (the signal endpoint), never at a foot
    const base = a.clone();
    triad(s, base, 0.3, UNIT_YAW[i]);
    const mat = lineMaterial(shared, { width: 1.8, minPx: 16, fog: [40, 80], depthTest: false, opacity: 0 });
    mat.uniforms.uGrow.value = 0;
    mat.uniforms.uGrowOrigin.value = base.clone();
    unitTriadMats.push(mat);
    add(new Mesh(s.build(), mat), 6);
  });

  // ---------- signal paths: lead lidar → unit anchor, accent, draw-in, green endpoint ----------
  const pathMats: ShaderMaterial[] = [];
  unitAnchors.forEach((end) => {
    const s = new Segs();
    const start = lidarWorld.clone().add(new Vector3(0, 0.1, 0));
    const mid = start.clone().lerp(end, 0.5);
    mid.y = Math.max(start.y, end.y) + 0.35 + start.distanceTo(end) * 0.06;
    const pts: Vector3[] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const a = start.clone().lerp(mid, t);
      const b = mid.clone().lerp(end, t);
      pts.push(a.lerp(b, t));
    }
    s.poly(pts, C.accent, 1);
    const mat = lineMaterial(shared, { width: 2, fog: [40, 80], depthTest: false, keepOnCollapse: 1 });
    mat.uniforms.uDraw.value = 0;
    pathMats.push(mat);
    add(new Mesh(s.build(), mat), 7);
  });

  // ---------- WiseOS node: the only solid-shaded prism ----------
  const prismPos = comp.prismPos.clone();
  const prismGeo = new CylinderGeometry(0.9, 0.9, 1.9, 6, 1);
  prismGeo.translate(0, 0.95, 0);
  const prismMat = new ShaderMaterial({
    transparent: true,
    uniforms: {
      uReveal: { value: 0 },
      uCollapse: shared.uCollapse,
      uKey: shared.uKey,
      uFill: shared.uFill,
      uKeyCol: shared.uKeyCol,
      uFillCol: shared.uFillCol,
      uBase: { value: new Vector3(...C.prism) },
      uAccent: { value: new Vector3(...C.accent) },
    },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; varying float vY;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vY = position.y;
      gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `uniform float uReveal; uniform float uCollapse; uniform vec3 uKey; uniform vec3 uFill; uniform vec3 uKeyCol; uniform vec3 uFillCol; uniform vec3 uBase; uniform vec3 uAccent;
      varying vec3 vN; varying vec3 vW; varying float vY;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        float key = max(dot(N,uKey),0.0); float fill = max(dot(N,uFill),0.0); float fres = pow(1.0-abs(dot(N,V)),3.0);
        vec3 c = uBase + uKeyCol*key*0.22 + uFillCol*fill*0.12 + uAccent*fres*0.35;
        // top cap glows faintly with the accent: the node is "on"
        c += uAccent * smoothstep(0.9, 1.0, N.y) * 0.18;
        if (vY / 1.9 > uReveal) discard;
        gl_FragColor = vec4(c, uReveal*(1.0-uCollapse)); }`,
  });
  const prism = new Mesh(prismGeo, prismMat);
  prism.position.copy(prismPos);
  add(prism, 4);
  const prismEdges = new Segs();
  {
    const eg = new EdgesGeometry(prismGeo, 20);
    const p = eg.getAttribute('position');
    for (let i = 0; i < p.count; i += 2) {
      const A = new Vector3().fromBufferAttribute(p, i).add(prismPos);
      const B = new Vector3().fromBufferAttribute(p, i + 1).add(prismPos);
      prismEdges.seg(A, B, C.accent, 0.9);
    }
    eg.dispose();
  }
  const prismEdgeMat = lineMaterial(shared, { width: 1.4, fog: [60, 90], opacity: 0 });
  add(new Mesh(prismEdges.build(), prismEdgeMat), 5);
  // uplinks: every unit + the rover → the prism top
  const up = new Segs();
  const prismTop = prismPos.clone().add(new Vector3(0, 1.9, 0));
  [lidarWorld, ...unitAnchors].forEach((a) => {
    const mid = a.clone().lerp(prismTop, 0.5);
    mid.y += 0.8;
    const pts: Vector3[] = [];
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      pts.push(a.clone().lerp(mid, t).lerp(mid.clone().lerp(prismTop, t), t));
    }
    up.poly(pts, C.accent, 0.55);
  });
  const upMat = lineMaterial(shared, { width: 1.2, fog: [60, 90], depthTest: false, opacity: 0 });
  upMat.uniforms.uDraw.value = 0;
  add(new Mesh(up.build(), upMat), 7);

  // ---------- LaserScan ring (point sprites) + endpoints ----------
  const R = rng(7);
  const ringPos: number[] = [], ringCol: number[] = [], ringSize: number[] = [], ringJit: number[] = [];
  const RING_N = 1400;
  const TRAIL = [0, -0.035, -0.075, -0.12];
  TRAIL.forEach((off, ti) => {
    for (let i = 0; i < RING_N; i++) {
      const t = (i / RING_N) * Math.PI * 2 + R() * 0.004;
      ringPos.push(t, 0.03, 0);
      const fade = [1, 0.5, 0.26, 0.12][ti];
      const c = C.scan;
      ringCol.push(c[0], c[1], c[2], fade * (0.55 + R() * 0.45));
      ringSize.push(ti === 0 ? 4.2 : 3.0);
      ringJit.push(off + (R() - 0.5) * (ti === 0 ? 0.012 : 0.02));
    }
  });
  const ringGeo = new BufferGeometry();
  ringGeo.setAttribute('position', new Float32BufferAttribute(ringPos, 3));
  ringGeo.setAttribute('aColor', new Float32BufferAttribute(ringCol, 4));
  ringGeo.setAttribute('aSize', new Float32BufferAttribute(ringSize, 1));
  ringGeo.setAttribute('aJit', new Float32BufferAttribute(ringJit, 1));
  const ringMat = pointMaterial(shared, true);
  ringMat.uniforms.uCentre.value.copy(lidarGround);
  add(new Points(ringGeo, ringMat), 8);

  const epPos: number[] = [], epCol: number[] = [], epSize: number[] = [], epJit: number[] = [];
  unitAnchors.forEach((a) => {
    epPos.push(a.x, a.y, a.z);
    epCol.push(...C.accent, 1);
    epSize.push(11);
    epJit.push(0);
  });
  // lidar origin dot
  epPos.push(lidarWorld.x, lidarWorld.y + 0.1, lidarWorld.z);
  epCol.push(...C.accent, 0.9);
  epSize.push(7);
  epJit.push(0);
  const epGeo = new BufferGeometry();
  epGeo.setAttribute('position', new Float32BufferAttribute(epPos, 3));
  epGeo.setAttribute('aColor', new Float32BufferAttribute(epCol, 4));
  epGeo.setAttribute('aSize', new Float32BufferAttribute(epSize, 1));
  epGeo.setAttribute('aJit', new Float32BufferAttribute(epJit, 1));
  const epMat = pointMaterial(shared, false, false);
  add(new Points(epGeo, epMat), 9);
  const epColAttr = epGeo.getAttribute('aColor') as Float32BufferAttribute;

  const pointCount = RING_N * TRAIL.length + unitAnchors.length + 1;

  function apply(s: BeatState) {
    shared.uCollapse.value = s.collapse;
    ringMat.uniforms.uRadius.value = s.ringRadius;
    ringMat.uniforms.uOpacity.value = s.ringOpacity * s.fleet;
    s.found.forEach((f, i) => {
      unitTriadMats[i].uniforms.uOpacity.value = f * UNIT_BAND[i] + f * (1 - UNIT_BAND[i]) * 0.5;
      unitTriadMats[i].uniforms.uGrow.value = f;
    });
    s.paths.forEach((p, i) => {
      pathMats[i].uniforms.uDraw.value = p;
      pathMats[i].uniforms.uOpacity.value = p > 0 ? 1 - s.collapse : 0;
      epColAttr.setW(i, p >= 1 ? 1 - s.collapse : 0);
    });
    epColAttr.setW(unitAnchors.length, 0.9 * (1 - s.collapse));
    epColAttr.needsUpdate = true;
    prismMat.uniforms.uReveal.value = s.wiseos;
    prismEdgeMat.uniforms.uOpacity.value = s.wiseos;
    upMat.uniforms.uDraw.value = s.uplinks;
    upMat.uniforms.uOpacity.value = s.uplinks > 0 ? 1 : 0;
  }

  return {
    scene,
    shared,
    setVanishingPoint(x: number, y: number) {
      bgUniforms.uVp.value = [x, y];
    },
    layout,
    comp,
    lidarWorld,
    baseLinkWorld,
    pointCount,
    apply,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Camera rigs. Pure translation during the dolly keeps the vanishing point locked. */
export interface Rig {
  pos: Vector3;
  dollyPos: Vector3;
  fov: number;
  /** principal point in NDC: where the grid's Z family converges */
  vp: [number, number];
  /** optional look-at target (mobile); desktop looks straight down -Z so the VP is exactly the principal point */
  target?: Vector3;
}

export const RIGS: Record<Layout, Rig> = {
  // VP at x=30%, y=41% from top: under the headline's first line in the left column
  desktop: { pos: new Vector3(0, 0.9, 0), dollyPos: new Vector3(0.9, 2.2, 6.5), fov: 30, vp: [-0.4, 0.18] },
  // separate mobile composition: looks across the fleet from front-left, scene sits under the stacked type
  mobile: { pos: new Vector3(-0.6, 1.5, 1.2), dollyPos: new Vector3(-0.2, 2.8, 7.5), fov: 50, vp: [0, -0.28], target: new Vector3(3.0, 0.9, -9.0) },
};

export function applyRig(cam: PerspectiveCamera, rig: Rig, dolly: number, parallax: [number, number]) {
  cam.fov = rig.fov;
  cam.position.copy(rig.pos).lerp(rig.dollyPos, dolly);
  cam.position.x += parallax[0] * 0.18;
  cam.position.y += parallax[1] * 0.07;
  if (rig.target) cam.lookAt(rig.target.x + parallax[0] * 0.18, rig.target.y, rig.target.z);
  else cam.quaternion.identity();
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const e = cam.projectionMatrix.elements;
  e[8] = -rig.vp[0];
  e[9] = -rig.vp[1];
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}
