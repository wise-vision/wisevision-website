/**
 * Procedural, unlicensed robot geometry → feature-edge line segments.
 * Every robot is authored in its own frame (x = forward, y = up, z = left, like ROS REP-103 rotated to three's y-up),
 * then placed with a Matrix4. Units are metres.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  Matrix4,
  Quaternion,
  Vector3,
  Euler,
} from 'three';
import { Segs } from './lines';
import type { RGB } from './palette';

const M = (px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  new Matrix4().compose(new Vector3(px, py, pz), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(...s));

export interface Anchor {
  /** local position of the TF triad origin / signal endpoint */
  tf: Vector3;
}

/** Six-wheel lead rover with lidar puck on a short mast. Returns lidar anchor (local). Yields between part groups (it is the heaviest build step). */
export function* leadRover(s: Segs, base: Matrix4, col: RGB, a = 1): Generator<void, { lidar: Vector3; footprint: [number, number] }> {
  const part = (g: import('three').BufferGeometry, m: Matrix4, alpha = a, th = 25) => s.edges(g, base.clone().multiply(m), col, alpha, th);
  // chassis: lower tub + upper deck with chamfered nose
  part(new BoxGeometry(1.24, 0.22, 0.66), M(0, 0.36, 0));
  part(new BoxGeometry(0.9, 0.12, 0.54), M(-0.06, 0.53, 0));
  part(new BoxGeometry(0.2, 0.16, 0.6), M(0.66, 0.35, 0, 0, 0, 0.5));
  // bogie rails
  for (const z of [-0.39, 0.39]) part(new BoxGeometry(1.1, 0.05, 0.05), M(0, 0.25, z));
  // six wheels (12-seg cylinders: rim circles + hub)
  for (const x of [-0.46, 0, 0.46]) {
    yield;
    for (const z of [-0.43, 0.43]) {
      part(new CylinderGeometry(0.17, 0.17, 0.12, 14, 1), M(x, 0.17, z, Math.PI / 2, 0, 0), a, 40);
      part(new CylinderGeometry(0.07, 0.07, 0.13, 8, 1), M(x, 0.17, z, Math.PI / 2, 0, 0), a * 0.6, 40);
    }
  }
  yield;
  // front sensor bar + camera pods
  part(new BoxGeometry(0.06, 0.07, 0.5), M(0.56, 0.5, 0));
  for (const z of [-0.18, 0.18]) part(new BoxGeometry(0.08, 0.06, 0.08), M(0.6, 0.5, z), a * 0.8);
  // mast + lidar puck
  part(new BoxGeometry(0.06, 0.34, 0.06), M(0.18, 0.76, 0));
  part(new CylinderGeometry(0.1, 0.11, 0.1, 18, 1), M(0.18, 0.98, 0), a, 30);
  part(new CylinderGeometry(0.075, 0.1, 0.035, 18, 1), M(0.18, 1.05, 0), a * 0.8, 30);
  // GNSS antenna rod
  part(new CylinderGeometry(0.008, 0.008, 0.42, 4, 1), M(-0.44, 0.8, 0.2), a * 0.7, 30);
  part(new SphereGeometry(0.025, 6, 4), M(-0.44, 1.02, 0.2), a * 0.7, 30);
  return { lidar: new Vector3(0.18, 0.98, 0), footprint: [1.5, 1.0] };
}

/** Quadruped: body, head, four two-segment legs in a mid stride. */
export function quadruped(s: Segs, base: Matrix4, col: RGB, a = 1): Vector3 {
  const part = (g: import('three').BufferGeometry, m: Matrix4, alpha = a) => s.edges(g, base.clone().multiply(m), col, alpha);
  part(new BoxGeometry(0.82, 0.18, 0.3), M(0, 0.6, 0));
  part(new BoxGeometry(0.16, 0.12, 0.22), M(0.48, 0.64, 0, 0, 0, -0.15));
  const legs: [number, number, number, number][] = [
    [0.3, 0.17, 0.35, -0.6],
    [0.3, -0.17, -0.2, 0.55],
    [-0.3, 0.17, -0.25, 0.6],
    [-0.3, -0.17, 0.3, -0.55],
  ];
  for (const [x, z, hip, knee] of legs) {
    const upperLen = 0.32, lowerLen = 0.34;
    const hipP = new Vector3(x, 0.55, z);
    const kneeP = hipP.clone().add(new Vector3(Math.sin(hip) * upperLen, -Math.cos(hip) * upperLen, 0));
    const footA = hip + knee;
    const footP = kneeP.clone().add(new Vector3(Math.sin(footA) * lowerLen, -Math.cos(footA) * lowerLen, 0));
    const seg = (p: Vector3, q: Vector3, w: number) => {
      const mid = p.clone().add(q).multiplyScalar(0.5);
      const len = p.distanceTo(q);
      const ang = Math.atan2(q.x - p.x, -(q.y - p.y));
      part(new BoxGeometry(w, len, w), M(mid.x, mid.y, mid.z, 0, 0, ang));
    };
    seg(hipP, kneeP, 0.07);
    seg(kneeP, footP, 0.045);
  }
  return new Vector3(0, 0.6, 0);
}

/** Quadcopter: X frame, four rotor discs, body pod, landing skids. */
export function drone(s: Segs, base: Matrix4, col: RGB, a = 1): Vector3 {
  const part = (g: import('three').BufferGeometry, m: Matrix4, alpha = a, th = 25) => s.edges(g, base.clone().multiply(m), col, alpha, th);
  part(new BoxGeometry(0.26, 0.09, 0.2), M(0, 0, 0));
  for (const r of [Math.PI / 4, -Math.PI / 4]) part(new BoxGeometry(0.72, 0.025, 0.035), M(0, 0.02, 0, 0, r, 0));
  for (const [x, z] of [[0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [-0.25, -0.25]]) {
    const m = base.clone().multiply(M(x, 0.05, z));
    const c = new Vector3().setFromMatrixPosition(m);
    s.circle(c, 0.17, 'y', 24, col, a * 0.8);
    part(new CylinderGeometry(0.025, 0.025, 0.05, 8, 1), M(x, 0.03, z), a * 0.8, 40);
  }
  for (const z of [-0.09, 0.09]) {
    part(new BoxGeometry(0.02, 0.1, 0.02), M(0.05, -0.08, z), a * 0.7);
    part(new BoxGeometry(0.02, 0.1, 0.02), M(-0.05, -0.08, z), a * 0.7);
    part(new BoxGeometry(0.3, 0.015, 0.015), M(0, -0.13, z), a * 0.7);
  }
  return new Vector3(0, 0, 0);
}

/** Sensor mast: tripod, pole, sensor head (camera + radome). */
export function sensorMast(s: Segs, base: Matrix4, col: RGB, a = 1): Vector3 {
  const part = (g: import('three').BufferGeometry, m: Matrix4, alpha = a, th = 25) => s.edges(g, base.clone().multiply(m), col, alpha, th);
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * Math.PI * 2;
    const foot = new Vector3(Math.cos(t) * 0.42, 0, Math.sin(t) * 0.42);
    const top = new Vector3(0, 0.62, 0);
    const mid = foot.clone().add(top).multiplyScalar(0.5);
    const len = foot.distanceTo(top);
    const dir = top.clone().sub(foot).normalize();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
    s.edges(new BoxGeometry(0.03, len, 0.03), base.clone().multiply(new Matrix4().compose(mid, q, new Vector3(1, 1, 1))), col, a);
  }
  part(new CylinderGeometry(0.025, 0.03, 1.55, 6, 1), M(0, 1.32, 0), a, 40);
  part(new BoxGeometry(0.28, 0.16, 0.2), M(0.02, 2.14, 0));
  part(new CylinderGeometry(0.05, 0.05, 0.08, 10, 1), M(0.18, 2.14, 0, 0, 0, Math.PI / 2), a, 30);
  part(new SphereGeometry(0.13, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M(0, 2.23, 0), a * 0.75, 30);
  return new Vector3(0, 2.14, 0);
}
