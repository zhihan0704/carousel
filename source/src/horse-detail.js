import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU } from './lib.js';

function indexedSurface(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Elliptical loft with a fixed reference axis. Fluting is part of the surface,
// so the locks retain their carved ridges under moving light and in reflection.
function carvedLock(points, profile, {
  steps = 18, sides = 12, flutes = 3, groove = 0.1, twist = 0.7, axis = [1, 0, 0]
} = {}) {
  const guide = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const reference = new THREE.Vector3(...axis).normalize();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const center = new THREE.Vector3();
  const positions = [];
  const indices = [];
  for (let row = 0; row <= steps; row++) {
    const t = row / steps;
    guide.getPoint(t, center);
    guide.getTangent(t, tangent);
    u.copy(reference).addScaledVector(tangent, -reference.dot(tangent));
    if (u.lengthSq() < 0.006) {
      u.set(0, 1, 0).addScaledVector(tangent, -tangent.y);
    }
    u.normalize();
    v.crossVectors(tangent, u);
    const k = t * (profile.length - 1);
    const i = Math.min(Math.floor(k), profile.length - 2);
    const blend = THREE.MathUtils.smoothstep(k - i, 0, 1);
    const width = THREE.MathUtils.lerp(profile[i][0], profile[i + 1][0], blend);
    const depth = THREE.MathUtils.lerp(profile[i][1], profile[i + 1][1], blend);
    for (let j = 0; j < sides; j++) {
      const a = j / sides * TAU;
      const relief = 1 + groove * Math.cos(a * flutes + t * twist) * Math.sin(t * Math.PI);
      const du = Math.cos(a) * width * relief;
      const dv = Math.sin(a) * depth * relief;
      positions.push(
        center.x + u.x * du + v.x * dv,
        center.y + u.y * du + v.y * dv,
        center.z + u.z * du + v.z * dv
      );
      if (row < steps) {
        const aIndex = row * sides + j;
        const bIndex = row * sides + (j + 1) % sides;
        indices.push(aIndex, bIndex, aIndex + sides, bIndex, bIndex + sides, aIndex + sides);
      }
    }
  }
  const start = positions.length / 3;
  positions.push(...points[0].toArray(), ...points.at(-1).toArray());
  for (let j = 0; j < sides; j++) {
    const next = (j + 1) % sides;
    indices.push(start, next, j);
    indices.push(start + 1, steps * sides + j, steps * sides + next);
  }
  return indexedSurface(positions, indices);
}

// Bin triangles by their projected bounds. Surface fitting then only inspects
// local triangles while returning the exact hit on the rendered mesh.
function projectedProbe(geometry, depth, u, v) {
  const positions = geometry.attributes.position.array;
  const indices = geometry.index.array;
  const cellScale = 14;
  const { min, max } = geometry.boundingBox;
  const firstU = Math.floor(min.getComponent(u) * cellScale);
  const firstV = Math.floor(min.getComponent(v) * cellScale);
  const uCount = Math.floor(max.getComponent(u) * cellScale) - firstU + 1;
  const vCount = Math.floor(max.getComponent(v) * cellScale) - firstV + 1;
  const bins = new Array(uCount * vCount);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const minU = Math.floor(Math.min(positions[a + u], positions[b + u], positions[c + u]) * cellScale) - firstU;
    const maxU = Math.floor(Math.max(positions[a + u], positions[b + u], positions[c + u]) * cellScale) - firstU;
    const minV = Math.floor(Math.min(positions[a + v], positions[b + v], positions[c + v]) * cellScale) - firstV;
    const maxV = Math.floor(Math.max(positions[a + v], positions[b + v], positions[c + v]) * cellScale) - firstV;
    for (let j = minU; j <= maxU; j++) {
      for (let k = minV; k <= maxV; k++) {
        const bin = j * vCount + k;
        (bins[bin] ??= []).push(i);
      }
    }
  }
  return (sign, pu, pv) => {
    const cellU = Math.floor(pu * cellScale) - firstU;
    const cellV = Math.floor(pv * cellScale) - firstV;
    if (cellU < 0 || cellU >= uCount || cellV < 0 || cellV >= vCount) return null;
    const candidates = bins[cellU * vCount + cellV];
    if (!candidates) return null;
    let nearest = -Infinity;
    for (const i of candidates) {
      const a = indices[i] * 3;
      const b = indices[i + 1] * 3;
      const c = indices[i + 2] * 3;
      const bu = positions[b + u] - positions[a + u];
      const bv = positions[b + v] - positions[a + v];
      const cu = positions[c + u] - positions[a + u];
      const cv = positions[c + v] - positions[a + v];
      const det = bu * cv - bv * cu;
      if (Math.abs(det) < 1e-12) continue;
      const du = pu - positions[a + u];
      const dv = pv - positions[a + v];
      const wb = (du * cv - dv * cu) / det;
      const wc = (bu * dv - bv * du) / det;
      if (wb < -1e-7 || wc < -1e-7 || wb + wc > 1 + 1e-7) continue;
      const hit = positions[a + depth] * (1 - wb - wc) + positions[b + depth] * wb + positions[c + depth] * wc;
      nearest = Math.max(nearest, hit * sign);
    }
    return Number.isFinite(nearest) ? nearest * sign : null;
  };
}

function barrelProbe(geometry) {
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const indices = geometry.index.array;
  const cellScale = 20;
  const first = Math.floor(geometry.boundingBox.min.z * cellScale);
  const last = Math.floor(geometry.boundingBox.max.z * cellScale);
  const slabs = new Array(last - first + 1);
  for (let i = 0; i < indices.length; i += 3) {
    const a = positions[indices[i] * 3 + 2];
    const b = positions[indices[i + 1] * 3 + 2];
    const c = positions[indices[i + 2] * 3 + 2];
    const low = Math.floor(Math.min(a, b, c) * cellScale) - first;
    const high = Math.floor(Math.max(a, b, c) * cellScale) - first;
    for (let slab = low; slab <= high; slab++) (slabs[slab] ??= []).push(i);
  }
  // Trace from inside the barrel in the XY plane at fixed Z, then move the
  // point along the interpolated skin normal to give fitted cloth clearance.
  return (x, y, z, dx, dy, offset = 0) => {
    const candidates = slabs[Math.floor(z * cellScale) - first];
    if (!candidates) return null;
    let distance = Infinity;
    let best;
    let weightB;
    let weightC;
    for (const i of candidates) {
      const a = indices[i] * 3;
      const b = indices[i + 1] * 3;
      const c = indices[i + 2] * 3;
      const e1x = positions[b] - positions[a];
      const e1y = positions[b + 1] - positions[a + 1];
      const e1z = positions[b + 2] - positions[a + 2];
      const e2x = positions[c] - positions[a];
      const e2y = positions[c + 1] - positions[a + 1];
      const e2z = positions[c + 2] - positions[a + 2];
      const px = dy * e2z;
      const py = -dx * e2z;
      const pz = dx * e2y - dy * e2x;
      const determinant = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(determinant) < 1e-12) continue;
      const tx = x - positions[a];
      const ty = y - positions[a + 1];
      const tz = z - positions[a + 2];
      const u = (tx * px + ty * py + tz * pz) / determinant;
      if (u < -1e-7 || u > 1 + 1e-7) continue;
      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const v = (dx * qx + dy * qy) / determinant;
      if (v < -1e-7 || u + v > 1 + 1e-7) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) / determinant;
      if (t < 0 || t >= distance) continue;
      distance = t;
      best = [a, b, c];
      weightB = u;
      weightC = v;
    }
    if (!best) return null;
    const [a, b, c] = best;
    const weightA = 1 - weightB - weightC;
    const n = new THREE.Vector3(
      normals[a] * weightA + normals[b] * weightB + normals[c] * weightC,
      normals[a + 1] * weightA + normals[b + 1] * weightB + normals[c + 1] * weightC,
      normals[a + 2] * weightA + normals[b + 2] * weightB + normals[c + 2] * weightC
    ).normalize();
    const p = new THREE.Vector3(x + dx * distance, y + dy * distance, z).addScaledVector(n, offset);
    return { p, n };
  };
}

export function buildHorseSurfaceSampler(geometry) {
  geometry.computeBoundingBox();
  const sideDepth = projectedProbe(geometry, 0, 1, 2);
  const topDepth = projectedProbe(geometry, 1, 0, 2);
  const frontDepth = projectedProbe(geometry, 2, 0, 1);
  return {
    barrel: barrelProbe(geometry),
    side(sign, y, z, lift = 0) {
      const x = sideDepth(sign, y, z);
      return x === null ? null : new THREE.Vector3(x + sign * lift, y, z);
    },
    top(x, z) {
      const y = topDepth(1, x, z);
      return y === null ? null : new THREE.Vector3(x, y, z);
    },
    front(x, y) {
      const z = frontDepth(1, x, y);
      return z === null ? null : new THREE.Vector3(x, y, z);
    }
  };
}

function earPair(sampler, pose, ivory, inset) {
  for (const side of [-1, 1]) {
    const root = sampler.top(side * 0.083, 0.99) ?? new THREE.Vector3(side * 0.083, 3.145, 0.99);
    root.y -= 0.025;
    const forwardEar = side === (pose ? 1 : -1);
    const height = forwardEar ? 0.256 : 0.232;
    const lean = forwardEar ? 0.051 : 0.082;
    const centerline = new THREE.CatmullRomCurve3([
      root,
      root.clone().add(new THREE.Vector3(side * 0.022, height * 0.36, 0.025)),
      root.clone().add(new THREE.Vector3(side * lean * 0.64, height * 0.73, 0.018)),
      root.clone().add(new THREE.Vector3(side * lean, height, forwardEar ? 0.019 : -0.029))
    ]);
    const width = [0.042, 0.058, 0.059, 0.050, 0.033, 0.0035];
    const yaw = side * (forwardEar ? 0.18 : 0.38);
    const pointAt = (t, across, face, lift = 0) => {
      const center = centerline.getPoint(t);
      const k = t * (width.length - 1);
      const i = Math.min(Math.floor(k), width.length - 2);
      const w = THREE.MathUtils.lerp(width[i], width[i + 1], THREE.MathUtils.smoothstep(k - i, 0, 1));
      const x = w * across;
      const arc = Math.sqrt(Math.max(0, 1 - across * across));
      const thickness = (0.026 - t * 0.015) * arc;
      const scoop = 0.030 * Math.pow(arc, 3) * Math.sin(t * Math.PI);
      const z = face > 0 ? thickness - scoop + lift : -thickness * 0.93;
      return [
        center.x + x * Math.cos(yaw) + z * Math.sin(yaw),
        center.y - x * side * 0.22,
        center.z - x * Math.sin(yaw) + z * Math.cos(yaw)
      ];
    };
    const positions = [];
    const indices = [];
    const rows = 15;
    const sides = 18;
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j < sides; j++) {
        const a = j / sides * TAU;
        positions.push(...pointAt(i / rows, Math.cos(a), Math.sin(a)));
        if (i < rows) {
          const p = i * sides + j;
          const q = i * sides + (j + 1) % sides;
          indices.push(p, p + sides, q, q, p + sides, q + sides);
        }
      }
    }
    const cap = positions.length / 3;
    positions.push(...centerline.getPoint(0).toArray(), ...centerline.getPoint(1).toArray());
    for (let j = 0; j < sides; j++) {
      const next = (j + 1) % sides;
      indices.push(cap, j, next, cap + 1, rows * sides + next, rows * sides + j);
    }
    ivory.push(indexedSurface(positions, indices));

    const lining = [];
    const liningIndices = [];
    const liningRows = 12;
    const columns = 8;
    for (let i = 0; i <= liningRows; i++) {
      const s = i / liningRows;
      const t = 0.2 + s * 0.7;
      const edge = 0.68 * Math.pow(Math.sin(s * Math.PI) + 0.01, 0.42);
      for (let j = 0; j <= columns; j++) {
        lining.push(...pointAt(t, (j / columns * 2 - 1) * edge, 1, 0.0025));
        if (i < liningRows && j < columns) {
          const a = i * (columns + 1) + j;
          const c = a + columns + 1;
          liningIndices.push(a, a + 1, c, a + 1, c + 1, c);
        }
      }
    }
    inset.push(indexedSurface(lining, liningIndices));
  }
}

function radialRelief(pointAt, side, rings = 4, sides = 20) {
  const positions = [...pointAt(0, 0).toArray()];
  const indices = [];
  function triangle(a, b, c) {
    if (side > 0) indices.push(a, c, b);
    else indices.push(a, b, c);
  }
  for (let i = 1; i <= rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = j / sides * TAU;
      positions.push(...pointAt(i / rings, a).toArray());
      const p = 1 + (i - 1) * sides + j;
      const q = 1 + (i - 1) * sides + (j + 1) % sides;
      if (i === 1) {
        triangle(0, p, q);
      } else {
        triangle(p - sides, p, q);
        triangle(p - sides, q, q - sides);
      }
    }
  }
  return indexedSurface(positions, indices);
}

function addFacialRelief(sampler, ivory, inset, dark) {
  for (const side of [-1, 1]) {
    const eye = (r, a, lift) => {
      const uz = r * Math.cos(a);
      const uy = r * Math.sin(a);
      const z = 1.21 + uz * 0.064;
      const y = 2.90 + uy * (0.029 + 0.006 * Math.sin(a)) - uz * 0.009;
      return sampler.side(side, y, z, lift) ?? new THREE.Vector3(side * (0.14 + lift), y, z);
    };
    inset.push(radialRelief((r, a) => eye(r * 1.19, a, 0.0025), side));
    // The dark cornea is a shallow curved lens seated inside the socket.
    dark.push(radialRelief((r, a) => eye(r * 0.84, a, 0.004 + 0.023 * Math.pow(1 - r * r, 0.8)), side));
    for (const upper of [true, false]) {
      const edge = Array.from({ length: 10 }, (_, j) => {
        const angle = (upper ? 0 : Math.PI) + Math.PI * j / 9;
        return eye(0.92, angle, 0.004);
      });
      ivory.push(carvedLock(edge, [[0.0025, 0.0025], [0.006, upper ? 0.009 : 0.006], [0.0025, 0.0025]], {
        axis: [1, 0, 0], steps: 12, sides: 7, groove: 0
      }));
    }
    // A small ivory reflection embedded in the cornea keeps the dark eye readable in portrait.
    const glint = eye(0.22, 0.85, 0.026);
    const highlight = new THREE.SphereGeometry(0.005, 8, 6);
    highlight.deleteAttribute('uv');
    highlight.scale(0.4, 0.72, 1.0);
    highlight.translate(glint.x, glint.y, glint.z);
    ivory.push(highlight);

    const nostril = (r, a, lift) => {
      const p = r * Math.cos(a);
      const q = r * Math.sin(a) * (0.88 + 0.17 * Math.cos(a));
      const z = 1.615 + p * 0.041 + q * 0.012;
      const y = 2.555 - p * 0.023 + q * 0.021 - 0.007 * p * p;
      return sampler.side(side, y, z, lift) ?? new THREE.Vector3(side * (0.079 + lift), y, z);
    };
    inset.push(radialRelief((r, a) => nostril(r * 0.98, a, 0.0035), side, 5, 24));
    dark.push(radialRelief((r, a) => nostril(r * 0.72, a, 0.005), side, 4, 20));

    const mouth = [
      [2.464, 1.406], [2.452, 1.457], [2.441, 1.512], [2.442, 1.568],
      [2.452, 1.614], [2.464, 1.653], [2.471, 1.677]
    ].map(([y, z]) => sampler.side(side, y, z, 0.0025)).filter(Boolean);
    if (mouth.length >= 3) {
      inset.push(carvedLock(mouth, [[0.003, 0.003], [0.004, 0.007], [0.004, 0.005]], {
        axis: [1, 0, 0], steps: 17, sides: 7, groove: 0
      }));
    }
  }
  // Connect the side creases around the muzzle with a fitted shallow lip seam.
  const frontLip = Array.from({ length: 9 }, (_, i) => {
    const x = (i / 8 * 2 - 1) * 0.082;
    const point = sampler.front(x, 2.469 + Math.abs(x) * 0.035);
    if (point) point.z += 0.0025;
    return point;
  }).filter(Boolean);
  if (frontLip.length >= 3) {
    inset.push(carvedLock(frontLip, [[0.003, 0.003], [0.006, 0.004], [0.003, 0.003]], {
      axis: [0, 1, 0], steps: 14, sides: 7, groove: 0
    }));
  }
}

function flowingMane(sampler, pose, hair, gold) {
  const sweptSide = pose ? -1 : 1;
  const crestZ = [0.23, 0.32, 0.42, 0.53, 0.64, 0.75, 0.84, 0.92, 0.99];
  const crest = crestZ.map((z, i) => sampler.top(0, z) ?? new THREE.Vector3(0, 2.19 + i * 0.121, z));
  const spine = crest.map((p, i) => p.clone().add(new THREE.Vector3(sweptSide * 0.018, 0.025, -0.022 - 0.003 * i)));
  hair.push(carvedLock(spine, [[0.041, 0.042], [0.086, 0.075], [0.083, 0.065], [0.066, 0.055], [0.031, 0.031]], {
    steps: 30, sides: 14, flutes: 5, groove: 0.13
  }));

  for (let i = 0; i < crest.length; i++) {
    const root = crest[i];
    const side = i === 0 || i === 7 ? -sweptSide : sweptSide;
    const depth = 0.222 + 0.063 * Math.sin(i * 1.04) + 0.087 * (1 - i / crest.length);
    const sweep = 0.12 + 0.043 * Math.cos(i * 1.73);
    const pointOnNeck = (fraction, trailing, lift) => {
      const y = root.y - depth * fraction;
      const z = root.z - sweep * trailing;
      return sampler.side(side, y, z, lift) ?? new THREE.Vector3(side * (0.10 + lift), y, z);
    };
    const lay = [
      root.clone().add(new THREE.Vector3(side * 0.016, 0.004, -0.027)),
      root.clone().add(new THREE.Vector3(side * 0.085, 0.012, -0.031)),
      pointOnNeck(0.33, 0.12, 0.029),
      pointOnNeck(0.73, 0.63, 0.025),
      pointOnNeck(1.0, 1.2, 0.008)
    ];
    const bulk = 0.053 + 0.011 * Math.cos(i * 1.6);
    hair.push(carvedLock(lay, [[0.028, 0.022], [bulk, 0.031], [bulk * 0.88, 0.028], [0.003, 0.003]], {
      axis: [0.35, 0.18, 1], steps: 15, sides: 10, flutes: 3, groove: 0.145, twist: 2.2
    }));
  }

  // Three folded forelock lobes follow the facial plane between the ears and brow.
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.038;
    const fall = 0.185 + (2 - i) * 0.026;
    const forehead = (t) => {
      const y = 3.171 - fall * t;
      const offset = x + sweptSide * (0.05 * t * t - 0.01 * t);
      const point = sampler.front(offset, y) ?? new THREE.Vector3(offset, y, 1.12 + 0.17 * t);
      point.z += 0.012 + 0.02 * Math.sin(t * Math.PI);
      return point;
    };
    hair.push(carvedLock([forehead(0), forehead(0.24), forehead(0.5), forehead(0.76), forehead(1)], [
      [0.028, 0.019], [0.037 - i * 0.003, 0.024], [0.025, 0.018], [0.002, 0.003]
    ], { steps: 13, sides: 9, groove: 0.15 }));
  }

  // A restrained gilt crest preserves the carousel's unicorn motif.
  const root = sampler.top(0, 1.245) ?? new THREE.Vector3(0, 3.045, 1.245);
  root.y -= 0.012;
  const horn = [
    root,
    root.clone().add(new THREE.Vector3(0, 0.034, 0.015)),
    root.clone().add(new THREE.Vector3(0, 0.119, 0.063)),
    root.clone().add(new THREE.Vector3(0, 0.197, 0.113))
  ];
  gold.push(carvedLock(horn, [[0.036, 0.036], [0.037, 0.037], [0.026, 0.026], [0.014, 0.014], [0.0015, 0.0015]], {
    steps: 19, sides: 14, flutes: 2, groove: 0.17, twist: 18
  }));
}

function flowingTail(pose, hair) {
  const bias = pose ? -0.055 : 0.065;
  const arc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.975, -1.00),
    new THREE.Vector3(bias * 0.4, 1.95, -1.26),
    new THREE.Vector3(bias, 1.78 + pose * 0.05, -1.55),
    new THREE.Vector3(bias * 1.6, 1.48 + pose * 0.075, -1.79),
    new THREE.Vector3(bias * 0.8, 1.13 + pose * 0.08, -1.99),
    new THREE.Vector3(bias * 1.4, 0.79 + pose * 0.09, -2.065)
  ]);
  const guide = Array.from({ length: 7 }, (_, i) => arc.getPoint(i / 6));
  hair.push(carvedLock(guide, [[0.054, 0.057], [0.104, 0.096], [0.139, 0.101], [0.124, 0.088], [0.082, 0.071], [0.009, 0.01]], {
    steps: 28, sides: 14, flutes: 5, groove: 0.13, twist: 2.0
  }));
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * TAU;
    const length = 0.79 + 0.17 * (0.5 + 0.5 * Math.cos(i * 2.18));
    const spread = 0.110 + 0.045 * (0.5 + 0.5 * Math.sin(i * 1.7));
    const strand = Array.from({ length: 6 }, (_, j) => {
      const u = j / 5;
      const t = 0.04 + u * length;
      const p = arc.getPoint(t);
      const fan = spread * Math.sin(t * Math.PI * 0.76);
      p.x += Math.cos(angle + u * 0.68) * fan;
      p.y += Math.sin(angle) * fan * 0.72 - 0.034 * u * u;
      p.z += Math.sin(angle + u * 0.41) * fan * 0.56 - 0.018 * u * u;
      return p;
    });
    const width = 0.044 + 0.018 * (0.5 + 0.5 * Math.sin(i * 1.3));
    hair.push(carvedLock(strand, [[0.027, 0.029], [width, 0.052], [width * 0.88, 0.045], [width * 0.61, 0.032], [0.004, 0.004]], {
      steps: 18, sides: 10, groove: 0.125, twist: 1.8 + i * 0.25
    }));
  }
}

export function buildHorseDetail(pose, { body }, sampler = buildHorseSurfaceSampler(body)) {
  const parts = { ivory: [], hair: [], inset: [], dark: [], gold: [] };
  earPair(sampler, pose, parts.ivory, parts.inset);
  addFacialRelief(sampler, parts.ivory, parts.inset, parts.dark);
  flowingMane(sampler, pose, parts.hair, parts.gold);
  flowingTail(pose, parts.hair);
  return Object.fromEntries(Object.entries(parts).map(([material, geometries]) => [material, mergeGeometries(geometries)]));
}
