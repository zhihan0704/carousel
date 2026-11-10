import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rand, arr) { return arr[Math.floor(rand() * arr.length) % arr.length]; }

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function makeCanvasTexture(width, height, draw, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.noColor ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = options.wrapS ?? THREE.RepeatWrapping;
  texture.wrapT = options.wrapT ?? THREE.ClampToEdgeWrapping;
  texture.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  texture.anisotropy = options.anisotropy ?? 8;
  texture.needsUpdate = true;
  return texture;
}

export function makeGlowTexture(stops = null, size = 128) {
  return makeCanvasTexture(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    const list = stops || [
      [0, 'rgba(255,255,255,1)'],
      [0.16, 'rgba(255,244,211,.95)'],
      [0.38, 'rgba(255,206,125,.38)'],
      [0.7, 'rgba(185,120,255,.08)'],
      [1, 'rgba(0,0,0,0)']
    ];
    for (const [p, c] of list) g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { noColor: false, wrapS: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
}

export function makeSmokeTexture(seed = 1, size = 512) {
  const rand = mulberry32(seed);
  return makeCanvasTexture(size, size, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 42; i++) {
      const a = rand() * TAU;
      const rr = Math.pow(rand(), 0.65) * w * 0.27;
      const x = w / 2 + Math.cos(a) * rr;
      const y = h / 2 + Math.sin(a) * rr * 0.58;
      const rad = w * (0.10 + rand() * 0.22);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const alpha = 0.055 + rand() * 0.08;
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.48})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // erase the border so the sprite quad never shows a straight edge
    const fade = ctx.createRadialGradient(w / 2, h / 2, w * 0.26, w / 2, h / 2, w * 0.5);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.72, 'rgba(0,0,0,.12)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
  }, { noColor: false, wrapS: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
}

export function makeEnvTexture() {
  const rand = mulberry32(20261110);
  return makeCanvasTexture(1024, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#211b24');
    bg.addColorStop(0.36, '#332b34');
    bg.addColorStop(0.52, '#3e343a');
    bg.addColorStop(0.63, '#282129');
    bg.addColorStop(1, '#130f15');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const blobs = [
      [w * 0.23, h * 0.42, w * 0.18, 'rgba(233,220,197,.72)'],
      [w * 0.73, h * 0.39, w * 0.21, 'rgba(255,240,214,.82)'],
      [w * 0.52, h * 0.64, w * 0.26, 'rgba(118,91,120,.40)'],
      [w * 0.90, h * 0.64, w * 0.14, 'rgba(198,164,119,.40)']
    ];
    for (const [x, y, r, color] of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(0.45, color.replace(/[\d.]+\)$/, '0.18)'));
      g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 220; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() * 1.7 + 0.2;
      ctx.fillStyle = `rgba(255,240,214,${0.08 + rand() * 0.28})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    // a warm band around the horizon for long metallic reflections
    const band = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.66);
    band.addColorStop(0, 'rgba(198,164,119,0)');
    band.addColorStop(0.5, 'rgba(198,164,119,.19)');
    band.addColorStop(1, 'rgba(198,164,119,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.42, w, h * 0.24);
  }, { noColor: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
}

export function lathe(points, segments = 128) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segments);
}

export function tube(points, radius, tubularSegments = 80, radialSegments = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5);
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
}

export function taperedTube(points, radiusStart, radiusEnd, tubularSegments = 48, radialSegments = 6, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(tubularSegments, closed);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const segments = tubularSegments + 1;
  for (let i = 0; i < segments; i++) {
    const t = i / tubularSegments;
    const p = curve.getPointAt(t);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const radius = THREE.MathUtils.lerp(radiusStart, radiusEnd, t) * (1 + Math.sin(t * Math.PI * 3) * 0.08);
    for (let j = 0; j <= radialSegments; j++) {
      const a = j / radialSegments * TAU;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const normal = new THREE.Vector3().addScaledVector(n, nx).addScaledVector(b, ny).normalize();
      positions.push(p.x + normal.x * radius, p.y + normal.y * radius, p.z + normal.z * radius);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(t, j / radialSegments);
    }
  }
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = a + radialSegments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function cylinderBetween(a, b, rA, rB, radialSegments = 10) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(vb, va);
  const length = delta.length();
  const geo = new THREE.CylinderGeometry(rB, rA, length, radialSegments, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  geo.applyQuaternion(q);
  geo.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
  return geo;
}

export function sphereAt(pos, scale, widthSegments = 18, heightSegments = 12) {
  const geo = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  geo.scale(scale[0], scale[1], scale[2]);
  geo.translate(pos[0], pos[1], pos[2]);
  return geo;
}

export function merge(geos) {
  if (!geos.length) return null;
  const clean = geos.filter(Boolean);
  // Polyhedra are non-indexed while lathes/tubes are indexed. Normalise before merging.
  const normalised = clean.map((g) => (g.index ? g.toNonIndexed() : g));
  const result = mergeGeometries(normalised, false);
  if (!result) throw new Error('geometry merge failed');
  normalised.forEach((g, i) => {
    if (g !== clean[i]) g.dispose();
  });
  return result;
}

