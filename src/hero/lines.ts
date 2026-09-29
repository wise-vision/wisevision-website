/**
 * Screen-space thick lines with baked lighting (fresnel edge + warm rim key + cool fill),
 * near-plane clipping, min-pixel-length clamp (TF triads), draw-in, floor mirror and the
 * beat-100 "collapse into one horizontal line". One shader, many material instances.
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  ShaderMaterial,
  Vector3,
  NormalBlending,
  AdditiveBlending,
  DoubleSide,
  EdgesGeometry,
  type IUniform,
} from 'three';
import type { RGB } from './palette';

export interface Shared {
  uRes: IUniform<[number, number]>; // drawing-buffer pixels
  uPx: IUniform<number>; // device pixel ratio
  uCollapse: IUniform<number>;
  uCollapseY: IUniform<number>; // NDC y of the accent line
  uKey: IUniform<Vector3>;
  uFill: IUniform<Vector3>;
  uKeyCol: IUniform<Vector3>;
  uFillCol: IUniform<Vector3>;
}

export function createShared(): Shared {
  return {
    uRes: { value: [1, 1] },
    uPx: { value: 1 },
    uCollapse: { value: 0 },
    uCollapseY: { value: -0.78 },
    uKey: { value: new Vector3(1.0, 0.9, -0.9).normalize() },
    uFill: { value: new Vector3(-1.0, 0.35, 0.9).normalize() },
    uKeyCol: { value: new Vector3(1, 0.886, 0.76) },
    uFillCol: { value: new Vector3(0.435, 0.56, 0.75) },
  };
}

const VERT = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute vec2 aSide;
attribute vec4 aColor;
attribute vec3 aNormal;
attribute float aDraw;
uniform vec2 uRes;
uniform float uPx;
uniform float uWidth;
uniform float uMirror;
uniform float uMinPx;
uniform float uCollapse;
uniform float uCollapseY;
uniform float uGrow;
uniform vec3 uGrowOrigin;
varying vec4 vColor;
varying float vAcross;
varying float vHalf;
varying vec3 vWorld;
varying vec3 vN;
varying float vDraw;
varying float vDepth;
void main() {
  vec3 a = mix(uGrowOrigin, aA, uGrow);
  vec3 b = mix(uGrowOrigin, aB, uGrow);
  vec4 wA = modelMatrix * vec4(a, 1.0);
  vec4 wB = modelMatrix * vec4(b, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * aNormal);
  if (uMirror > 0.5) { wA.y = -wA.y; wB.y = -wB.y; n.y = -n.y; }
  vec4 vA = viewMatrix * wA;
  vec4 vB = viewMatrix * wB;
  float near = 0.06;
  if (vA.z > -near && vB.z > -near) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (vA.z > -near) vA = mix(vA, vB, (vA.z + near) / (vA.z - vB.z));
  if (vB.z > -near) vB = mix(vB, vA, (vB.z + near) / (vB.z - vA.z));
  vec4 cA = projectionMatrix * vA;
  vec4 cB = projectionMatrix * vB;
  vec2 hr = 0.5 * uRes;
  vec2 sA = cA.xy / cA.w * hr;
  vec2 sB = cB.xy / cB.w * hr;
  vec2 d = sB - sA;
  float L = length(d);
  float minPx = uMinPx * uPx;
  if (minPx > 0.0 && L < minPx) { sB = sA + (L > 1e-4 ? d / L : vec2(1.0, 0.0)) * minPx; d = sB - sA; L = minPx; }
  vec2 dir = L > 1e-5 ? d / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  bool atB = aSide.x > 0.5;
  vec4 c = atB ? cB : cA;
  vec2 s = atB ? sB : sA;
  float hw = uWidth * uPx * 0.5 + 1.0;
  s += nrm * aSide.y * hw + dir * (atB ? 1.0 : -1.0) * min(hw, L * 0.5) * 0.5;
  vec2 ndc = s / hr;
  float cy = uCollapseY + aSide.y * hw / hr.y;
  ndc = mix(ndc, vec2(ndc.x, cy), uCollapse);
  gl_Position = vec4(ndc * c.w, c.z, c.w);
  vColor = aColor;
  vAcross = aSide.y * hw;
  vHalf = uWidth * uPx * 0.5;
  vWorld = atB ? wB.xyz : wA.xyz;
  vN = n;
  vDraw = aDraw;
  vDepth = -(atB ? vB.z : vA.z);
}`;

const FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uLit;
uniform float uDraw;
uniform float uMirror;
uniform vec2 uFog;
uniform vec2 uNearBand;
uniform float uCollapse;
uniform float uKeepOnCollapse;
uniform vec3 uKey;
uniform vec3 uFill;
uniform vec3 uKeyCol;
uniform vec3 uFillCol;
varying vec4 vColor;
varying float vAcross;
varying float vHalf;
varying vec3 vWorld;
varying vec3 vN;
varying float vDraw;
varying float vDepth;
void main() {
  if (vDraw > uDraw) discard;
  float aa = 1.0 - smoothstep(vHalf - 0.5, vHalf + 0.75, abs(vAcross));
  vec3 col = vColor.rgb;
  float alpha = vColor.a * uOpacity * aa;
  if (uLit > 0.5) {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = abs(dot(N, V));
    float fres = pow(1.0 - ndv, 1.6);
    float key = max(dot(N, uKey), 0.0);
    float fill = max(dot(N, uFill), 0.0);
    // edge-on silhouette lines carry the light; face-on lines recede
    col = col * (0.42 + 0.22 * fill * uFillCol) + uKeyCol * (0.85 * key * (0.35 + fres)) ;
    alpha *= 0.38 + 0.62 * clamp(fres + 0.6 * key, 0.0, 1.0);
  }
  // distance fog into the base colour + near band at 2x opacity (grid)
  alpha *= 1.0 - smoothstep(uFog.x, uFog.y, vDepth);
  alpha *= mix(1.0, 0.5, smoothstep(uNearBand.x, uNearBand.y, vDepth));
  if (uMirror > 0.5) alpha *= 0.05 * smoothstep(-1.6, 0.0, vWorld.y);
  alpha *= mix(1.0, uKeepOnCollapse, uCollapse);
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(col, alpha);
}`;

export interface LineMatOpts {
  width?: number; // css px
  opacity?: number;
  lit?: boolean;
  minPx?: number;
  fog?: [number, number];
  nearBand?: [number, number];
  mirror?: boolean;
  additive?: boolean;
  keepOnCollapse?: number;
  depthTest?: boolean;
}

export function lineMaterial(shared: Shared, o: LineMatOpts = {}): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    side: DoubleSide, // screen-space quads: winding depends on segment direction
    depthWrite: false,
    depthTest: o.depthTest ?? true,
    blending: o.additive ? AdditiveBlending : NormalBlending,
    uniforms: {
      ...shared,
      uWidth: { value: o.width ?? 1 },
      uOpacity: { value: o.opacity ?? 1 },
      uLit: { value: o.lit ? 1 : 0 },
      uMinPx: { value: o.minPx ?? 0 },
      uFog: { value: o.fog ?? [60, 120] },
      uNearBand: { value: o.nearBand ?? [1e4, 2e4] },
      uMirror: { value: o.mirror ? 1 : 0 },
      uDraw: { value: 1 },
      uGrow: { value: 1 },
      uGrowOrigin: { value: new Vector3() },
      uKeepOnCollapse: { value: o.keepOnCollapse ?? 0 },
    },
  });
}

/** Accumulates segments, emits one BufferGeometry (6 verts per segment). */
export class Segs {
  private a: number[] = [];
  private b: number[] = [];
  private side: number[] = [];
  private col: number[] = [];
  private nrm: number[] = [];
  private draw: number[] = [];
  count = 0;
  /** triangles of every solid part (world space), for the depth-only hidden-line occluder */
  private occ: number[] = [];
  collectOccluders = false;

  seg(A: Vector3, B: Vector3, color: RGB, alpha = 1, normal?: Vector3, d0 = 0, d1 = 0): this {
    const n = normal ?? new Vector3(0, 1, 0);
    const corners: [number, number][] = [
      [0, -1], [0, 1], [1, -1],
      [1, -1], [0, 1], [1, 1],
    ];
    for (const [t, s] of corners) {
      this.a.push(A.x, A.y, A.z);
      this.b.push(B.x, B.y, B.z);
      this.side.push(t, s);
      this.col.push(color[0], color[1], color[2], alpha);
      this.nrm.push(n.x, n.y, n.z);
      this.draw.push(t ? d1 : d0);
    }
    this.count++;
    return this;
  }

  /** Polyline with draw-in parameter running 0..1 along its length. */
  poly(pts: Vector3[], color: RGB, alpha = 1, normal?: Vector3): this {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = pts[i].distanceTo(pts[i - 1]);
      this.seg(pts[i - 1], pts[i], color, alpha, normal, acc / total, (acc + l) / total);
      acc += l;
    }
    return this;
  }

  /** Feature edges of a mesh geometry, transformed; normals approximated from the part centre. */
  edges(geom: BufferGeometry, m: Matrix4, color: RGB, alpha = 1, threshold = 25): this {
    geom.computeBoundingBox();
    const centre = geom.boundingBox!.getCenter(new Vector3());
    const eg = new EdgesGeometry(geom, threshold);
    const p = eg.getAttribute('position');
    const nm = new Matrix3().getNormalMatrix(m);
    const A = new Vector3(), B = new Vector3(), mid = new Vector3(), n = new Vector3();
    for (let i = 0; i < p.count; i += 2) {
      A.fromBufferAttribute(p, i);
      B.fromBufferAttribute(p, i + 1);
      mid.addVectors(A, B).multiplyScalar(0.5);
      n.subVectors(mid, centre);
      if (n.lengthSq() < 1e-8) n.set(0, 1, 0);
      n.normalize().applyMatrix3(nm).normalize();
      this.seg(A.clone().applyMatrix4(m), B.clone().applyMatrix4(m), color, alpha, n.clone());
    }
    eg.dispose();
    if (this.collectOccluders) {
      const tri = geom.index ? geom.toNonIndexed() : geom;
      const tp = tri.getAttribute('position');
      const v = new Vector3();
      for (let i = 0; i < tp.count; i++) {
        v.fromBufferAttribute(tp, i).applyMatrix4(m);
        this.occ.push(v.x, v.y, v.z);
      }
      if (tri !== geom) tri.dispose();
    }
    geom.dispose();
    return this;
  }

  /** Depth-only solid of everything added via edges(): gives CAD-style hidden-line removal. */
  buildOccluder(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.occ, 3));
    return g;
  }

  circle(c: Vector3, r: number, axis: 'x' | 'y' | 'z', n: number, color: RGB, alpha = 1): this {
    const pts: Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const u = Math.cos(t) * r, v = Math.sin(t) * r;
      pts.push(axis === 'y' ? new Vector3(c.x + u, c.y, c.z + v) : axis === 'x' ? new Vector3(c.x, c.y + u, c.z + v) : new Vector3(c.x + u, c.y + v, c.z));
    }
    for (let i = 1; i < pts.length; i++) {
      const mid = pts[i].clone().add(pts[i - 1]).multiplyScalar(0.5).sub(c).normalize();
      this.seg(pts[i - 1], pts[i], color, alpha, mid);
    }
    return this;
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('aA', new Float32BufferAttribute(this.a, 3));
    g.setAttribute('aB', new Float32BufferAttribute(this.b, 3));
    g.setAttribute('aSide', new Float32BufferAttribute(this.side, 2));
    g.setAttribute('aColor', new Float32BufferAttribute(this.col, 4));
    g.setAttribute('aNormal', new Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aDraw', new Float32BufferAttribute(this.draw, 1));
    // three needs a 'position' attribute for draw range / frustum; aA works as a proxy
    g.setAttribute('position', new Float32BufferAttribute(this.a, 3));
    return g;
  }
}
