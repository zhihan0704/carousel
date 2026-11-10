import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Horse-local coordinates: +Z forward, +Y up. Each cross section stores axial
// position, two center coordinates, lateral radius, and upper/lower radii.
const barrel = [
  [-1.13, 0, 1.84, 0.002, 0.005, 0.005],
  [-1.08, 0, 1.86, 0.168, 0.14, 0.145],
  [-0.96, 0, 1.86, 0.312, 0.245, 0.277],
  [-0.79, 0, 1.83, 0.366, 0.320, 0.347],
  [-0.59, 0, 1.80, 0.372, 0.327, 0.385],
  [-0.38, 0, 1.77, 0.379, 0.331, 0.468],
  [-0.14, 0, 1.75, 0.407, 0.352, 0.503],
  [0.10, 0, 1.75, 0.422, 0.380, 0.499],
  [0.31, 0, 1.77, 0.401, 0.440, 0.475],
  [0.51, 0, 1.75, 0.351, 0.458, 0.407],
  [0.65, 0, 1.73, 0.289, 0.417, 0.327],
  [0.75, 0, 1.72, 0.197, 0.306, 0.214],
  [0.82, 0, 1.75, 0.104, 0.202, 0.112],
  [0.87, 0, 1.76, 0.002, 0.004, 0.005]
];

const neck = [
  [-0.28, 0, 0.05, 0.002, 0.005, 0.005],
  [-0.12, 0, 0.05, 0.209, 0.314, 0.303],
  [0.10, 0, 0.03, 0.320, 0.438, 0.387],
  [0.36, 0, 0.05, 0.279, 0.452, 0.355],
  [0.57, 0, 0.07, 0.232, 0.421, 0.312],
  [0.80, 0, 0.09, 0.182, 0.367, 0.253],
  [1.02, 0, 0.11, 0.143, 0.295, 0.188],
  [1.22, 0, 0.115, 0.110, 0.244, 0.139],
  [1.41, 0, 0.11, 0.094, 0.174, 0.107],
  [1.52, 0, 0.12, 0.043, 0.096, 0.060],
  [1.58, 0, 0.12, 0.002, 0.005, 0.005]
];

const head = [
  [-0.19, 0, 0, 0.002, 0.004, 0.004],
  [-0.14, 0, 0, 0.102, 0.105, 0.077],
  [-0.04, 0, 0, 0.145, 0.140, 0.143],
  [0.10, 0, 0, 0.163, 0.163, 0.206],
  [0.23, 0, 0, 0.164, 0.150, 0.238],
  [0.34, 0, 0, 0.143, 0.132, 0.206],
  [0.48, 0, 0, 0.119, 0.116, 0.156],
  [0.59, 0, 0, 0.117, 0.109, 0.125],
  [0.69, 0, 0, 0.131, 0.110, 0.123],
  [0.76, 0, 0, 0.128, 0.098, 0.114],
  [0.83, 0, 0, 0.086, 0.072, 0.078],
  [0.875, 0, 0, 0.002, 0.005, 0.005]
];

// The upper ends sit inside the barrel. Below the shoulder/hip the positions
// distinguish elbow/carpus from stifle/hock, then cannon, fetlock and pastern.
const frontRaised = [
  [0.69, 0.25, 0.66, 0.043, 0.049, 0.043],
  [0.77, 0.25, 0.68, 0.059, 0.070, 0.063],
  [0.86, 0.25, 0.74, 0.045, 0.055, 0.052],
  [0.97, 0.25, 0.83, 0.044, 0.057, 0.062],
  [1.07, 0.25, 0.90, 0.069, 0.080, 0.077],
  [1.15, 0.246, 0.83, 0.070, 0.112, 0.080],
  [1.25, 0.240, 0.64, 0.090, 0.147, 0.102],
  [1.38, 0.233, 0.41, 0.112, 0.153, 0.109],
  [1.50, 0.222, 0.43, 0.136, 0.161, 0.140],
  [1.68, 0.209, 0.51, 0.161, 0.192, 0.191],
  [1.85, 0.172, 0.53, 0.159, 0.181, 0.163],
  [2.00, 0.145, 0.51, 0.003, 0.005, 0.005]
];

const frontExtended = [
  [0.33, 0.245, 1.32, 0.044, 0.047, 0.043],
  [0.43, 0.246, 1.27, 0.056, 0.069, 0.064],
  [0.54, 0.249, 1.22, 0.044, 0.056, 0.051],
  [0.79, 0.250, 1.08, 0.044, 0.055, 0.051],
  [0.99, 0.250, 0.968, 0.064, 0.075, 0.067],
  [1.12, 0.249, 0.835, 0.074, 0.098, 0.079],
  [1.24, 0.240, 0.66, 0.091, 0.126, 0.091],
  [1.40, 0.234, 0.445, 0.113, 0.140, 0.120],
  [1.52, 0.224, 0.449, 0.138, 0.164, 0.143],
  [1.69, 0.210, 0.52, 0.162, 0.196, 0.194],
  [1.85, 0.172, 0.53, 0.159, 0.185, 0.166],
  [2.00, 0.145, 0.51, 0.003, 0.005, 0.005]
];

const hindExtended = [
  [0.30, 0.246, -1.28, 0.046, 0.048, 0.048],
  [0.39, 0.246, -1.27, 0.058, 0.066, 0.070],
  [0.50, 0.248, -1.225, 0.044, 0.052, 0.050],
  [0.74, 0.250, -1.10, 0.043, 0.060, 0.052],
  [0.92, 0.252, -1.005, 0.069, 0.074, 0.089],
  [1.02, 0.252, -0.921, 0.064, 0.115, 0.102],
  [1.17, 0.249, -0.744, 0.094, 0.138, 0.132],
  [1.38, 0.238, -0.499, 0.128, 0.152, 0.156],
  [1.52, 0.228, -0.55, 0.157, 0.202, 0.219],
  [1.68, 0.207, -0.70, 0.180, 0.256, 0.245],
  [1.85, 0.182, -0.78, 0.178, 0.241, 0.212],
  [2.03, 0.120, -0.78, 0.004, 0.006, 0.006]
];

const hindCollected = [
  [0.45, 0.242, -0.44, 0.044, 0.047, 0.046],
  [0.54, 0.244, -0.515, 0.058, 0.068, 0.062],
  [0.62, 0.245, -0.591, 0.045, 0.052, 0.049],
  [0.75, 0.248, -0.73, 0.044, 0.059, 0.059],
  [0.88, 0.251, -0.817, 0.066, 0.082, 0.088],
  [0.97, 0.250, -0.789, 0.069, 0.098, 0.091],
  [1.15, 0.248, -0.688, 0.095, 0.135, 0.132],
  [1.36, 0.240, -0.474, 0.131, 0.166, 0.150],
  [1.51, 0.228, -0.55, 0.157, 0.207, 0.218],
  [1.68, 0.207, -0.70, 0.180, 0.256, 0.243],
  [1.85, 0.182, -0.78, 0.177, 0.240, 0.211],
  [2.03, 0.120, -0.78, 0.004, 0.006, 0.006]
];

function interpolate(keys, segment, channel, t) {
  const before = keys[Math.max(0, segment - 1)];
  const left = keys[segment];
  const right = keys[segment + 1];
  const after = keys[Math.min(keys.length - 1, segment + 2)];
  const span = right[0] - left[0];
  const slope = (right[channel] - left[channel]) / span;
  const leftSlope = (right[channel] - before[channel]) / (right[0] - before[0]);
  const rightSlope = (after[channel] - left[channel]) / (after[0] - left[0]);
  const tangent = (estimate) => (estimate * slope <= 0 ? 0 : Math.sign(slope) * Math.min(Math.abs(estimate), 2 * Math.abs(slope)));
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * left[channel] + (t3 - 2 * t2 + t) * span * tangent(leftSlope)
    + (-2 * t3 + 3 * t2) * right[channel] + (t3 - t2) * span * tangent(rightSlope);
}

function crossSections(keys, axisY, axisZ, originY, originZ, side = 1) {
  const first = keys[0][0];
  const last = keys.at(-1)[0];
  const length = last - first;
  const intervals = Math.ceil(length / 0.008);
  const sections = new Float64Array((intervals + 1) * 5);
  let segment = 0;
  for (let i = 0; i <= intervals; i++) {
    const axial = first + i / intervals * length;
    while (axial > keys[segment + 1][0] && segment < keys.length - 2) segment++;
    const t = (axial - keys[segment][0]) / (keys[segment + 1][0] - keys[segment][0]);
    for (let channel = 1; channel <= 5; channel++) {
      sections[i * 5 + channel - 1] = interpolate(keys, segment, channel, t);
    }
  }
  const factor = intervals / length;
  return (x, y, z) => {
    const dy = y - originY;
    const dz = z - originZ;
    const axial = dy * axisY + dz * axisZ;
    const clamped = Math.max(first, Math.min(last, axial));
    const at = (clamped - first) * factor;
    const floor = Math.min(intervals - 1, Math.floor(at));
    const f = at - floor;
    const i = floor * 5;
    const centerX = sections[i] + (sections[i + 5] - sections[i]) * f;
    const centerB = sections[i + 1] + (sections[i + 6] - sections[i + 1]) * f;
    const transverse = x * side - centerX;
    const sagittal = dy * axisZ - dz * axisY - centerB;
    const radiusX = sections[i + 2] + (sections[i + 7] - sections[i + 2]) * f;
    const upper = sections[i + 3] + (sections[i + 8] - sections[i + 3]) * f;
    const lower = sections[i + 4] + (sections[i + 9] - sections[i + 4]) * f;
    const radiusB = sagittal >= 0 ? upper : lower;
    const a = transverse / radiusX;
    const b = sagittal / radiusB;
    // Use the same distance scale on both halves, so a blend can cross the
    // profile midline without picking up a crease at the radius change.
    const radial = (Math.sqrt(a * a + b * b) - 1) * Math.min(radiusX, (upper + lower) * 0.5);
    return axial === clamped ? radial : Math.max(radial, Math.abs(axial - clamped));
  };
}

function blend(a, b, width) {
  const overlap = Math.max(width - Math.abs(a - b), 0) / width;
  return Math.min(a, b) - overlap * overlap * width * 0.25;
}

const barrelField = crossSections(barrel, 0, 1, 0, 0);
const neckField = crossSections(neck, 0.863, 0.5052, 1.68, 0.48);
const headField = crossSections(head, -Math.SQRT1_2, Math.SQRT1_2, 3.025, 1.04);

function muscleSculpture(x, y, z) {
  const lateral = THREE.MathUtils.smoothstep(Math.abs(x), 0.14, 0.36);
  const withers = (z - (0.31 + (2.09 - y) * 0.65)) / 0.19;
  const haunch = (z - (-0.79 + (1.85 - y) * 0.32)) / 0.21;
  const flank = (z - (-0.58 + (1.60 - y) * 0.49)) / 0.14;
  const ribs = (z + 0.12) / 0.51;
  const shoulder = 0.022 * Math.exp(-withers * withers - Math.pow((y - 1.85) / 0.31, 2));
  const croup = 0.026 * Math.exp(-haunch * haunch - Math.pow((y - 1.79) / 0.31, 2));
  const flankHollow = 0.028 * Math.exp(-flank * flank - Math.pow((y - 1.62) / 0.22, 2));
  const chest = 0.012 * Math.exp(-ribs * ribs - Math.pow((y - 1.53) / 0.21, 2));
  return lateral * (shoulder + croup + chest - flankHollow);
}

function coreField(x, y, z) {
  let distance = barrelField(x, y, z);
  if (Math.abs(distance) < 0.08) distance -= muscleSculpture(x, y, z);
  if (z > -0.24 && y > 1.02) {
    // Fuse broadly through the shoulder. The narrow terminal barrel sections
    // sit behind the breast and should not tug the neck surface forward.
    const neckBlend = 0.17 - 0.15 * THREE.MathUtils.smoothstep(z, 0.65, 0.815);
    distance = blend(distance, neckField(x, y, z), neckBlend);
  }
  if (z > 0.63 && y > 2.28) distance = blend(distance, headField(x, y, z), 0.105);
  if (z > 0.57 && y > 1.2 && y < 2.2) {
    const height = (y - 1.70) / 0.18;
    const chest = Math.exp(-height * height - ((z - 0.86) / 0.17) ** 2);
    const center = Math.exp(-Math.pow(x / 0.105, 2));
    const pectoral = Math.exp(-Math.pow((Math.abs(x) - 0.16) / 0.10, 2));
    distance += chest * (0.018 * center - 0.012 * pectoral);
  }
  return distance;
}

function lateralSurface(y, z) {
  let low = 0;
  let high = 0.64;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) * 0.5;
    if (coreField(mid, y, z) < 0) low = mid;
    else high = mid;
  }
  return (low + high) * 0.5;
}

function recess(distance, x, y, z, center, xRadius, yRadius, zRadius, tilt) {
  const across = (x - center[0]) / xRadius;
  const height = (y - center[1] + (z - center[2]) * tilt) / yRadius;
  const length = (z - center[2]) / zRadius;
  const hollow = 1 - Math.sqrt(across * across + height * height + length * length);
  return -blend(-distance, -hollow * xRadius, 0.008);
}

function legField(keys, side) {
  // +Y sweep uses sagittal coordinate -Z. A small buried cap reaches through
  // the hoof coronet, so the independent hoof wall seats into the pastern.
  const [y, x, z] = keys[0];
  const sections = [[y - 0.035, x, -z, 0.002, 0.005, 0.005]];
  for (const [height, lateral, length, width, forward, rear] of keys) {
    sections.push([height, lateral, -length, width, rear, forward]);
  }
  return crossSections(sections, 1, 0, 0, 0, side);
}

const cellCorners = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
];
const cellEdges = [
  [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
  [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]
];
// Corner and edge order around each cube face. A shared face chooses the same
// contour in both adjacent cells, including the rare checkerboard sign case.
const cellFaces = [
  [[0, 1, 3, 2], [0, 3, 5, 1]], [[4, 5, 7, 6], [8, 10, 11, 9]],
  [[0, 1, 5, 4], [0, 4, 8, 2]], [[2, 3, 7, 6], [5, 7, 11, 6]],
  [[0, 2, 6, 4], [1, 6, 9, 2]], [[1, 3, 7, 5], [3, 7, 10, 4]]
];

function trace(parent, edge) {
  while (parent[edge] !== edge) edge = parent[edge];
  return edge;
}

function join(parent, a, b) {
  parent[trace(parent, a)] = trace(parent, b);
}

// Indexed surface nets put one vertex in each active grid cell. Adjacent
// cross sections become one welded skin, with normals from its field gradient.
function extractSurface(field) {
  const step = 0.034;
  const minX = -0.50;
  const minY = 0.195;
  const minZ = -1.41;
  const nx = Math.ceil(1.02 / step) + 1;
  const ny = Math.ceil(3.05 / step) + 1;
  const nz = Math.ceil(3.25 / step) + 1;
  const plane = nx * ny;
  const value = new Float32Array(plane * nz);
  const vertex = new Int32Array(value.length).fill(-1);
  const stride = cellCorners.map(([x, y, z]) => x + y * nx + z * plane);
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        value[x + y * nx + z * plane] = field(minX + x * step, minY + y * step, minZ + z * step);
      }
    }
  }
  const positions = [];
  const normals = [];
  const indices = [];
  const epsilon = 0.003;
  const quadStrides = [[nx, plane], [plane, 1], [1, nx]];
  const quadEdges = [[5, 11, 8], [9, 10, 3], [4, 7, 6]];
  const splitCells = new Map();
  const parent = new Int8Array(12);
  const crossings = new Float32Array(12 * 3);
  const connected = new Int8Array(4);
  const counts = new Int8Array(12);
  const sums = new Float32Array(12 * 3);
  const rootVertices = new Int32Array(12);
  const cellVertex = (cell, edge) => splitCells.get(cell)?.[edge] ?? vertex[cell];

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const cell = x + y * nx + z * plane;
        let mask = 0;
        for (let corner = 0; corner < 8; corner++) {
          if (value[cell + stride[corner]] < 0) mask |= 1 << corner;
        }
        if (mask === 0 || mask === 255) continue;

        parent.fill(-1);
        for (let edge = 0; edge < cellEdges.length; edge++) {
          const [from, to] = cellEdges[edge];
          if (((mask >> from) & 1) === ((mask >> to) & 1)) continue;
          parent[edge] = edge;
          const a = value[cell + stride[from]];
          const b = value[cell + stride[to]];
          const t = a / (a - b);
          for (let axis = 0; axis < 3; axis++) {
            crossings[edge * 3 + axis] = THREE.MathUtils.lerp(cellCorners[from][axis], cellCorners[to][axis], t);
          }
        }
        for (const [corners, edges] of cellFaces) {
          let count = 0;
          for (const edge of edges) {
            if (parent[edge] !== -1) connected[count++] = edge;
          }
          if (count === 2) join(parent, connected[0], connected[1]);
          if (count === 4) {
            const [a, b, c, d] = corners.map((corner) => value[cell + stride[corner]]);
            const firstPair = (a * c > b * d);
            join(parent, edges[0], edges[firstPair ? 1 : 3]);
            join(parent, edges[2], edges[firstPair ? 3 : 1]);
          }
        }
        counts.fill(0);
        sums.fill(0);
        for (let edge = 0; edge < cellEdges.length; edge++) {
          if (parent[edge] === -1) continue;
          const root = trace(parent, edge);
          counts[root]++;
          for (let axis = 0; axis < 3; axis++) {
            sums[root * 3 + axis] += crossings[edge * 3 + axis];
          }
        }
        let components = 0;
        for (let root = 0; root < cellEdges.length; root++) {
          const count = counts[root];
          if (!count) continue;
          const vx = minX + step * (x + sums[root * 3] / count);
          const vy = minY + step * (y + sums[root * 3 + 1] / count);
          const vz = minZ + step * (z + sums[root * 3 + 2] / count);
          rootVertices[root] = positions.length / 3;
          vertex[cell] = rootVertices[root];
          components++;
          positions.push(vx, vy, vz);
          const dx = field(vx + epsilon, vy, vz) - field(vx - epsilon, vy, vz);
          const dy = field(vx, vy + epsilon, vz) - field(vx, vy - epsilon, vz);
          const dz = field(vx, vy, vz + epsilon) - field(vx, vy, vz - epsilon);
          const inv = 1 / (Math.hypot(dx, dy, dz) || 1);
          normals.push(dx * inv, dy * inv, dz * inv);
        }
        if (components > 1) {
          splitCells.set(cell, Int32Array.from(parent, (p, edge) => p === -1 ? -1 : rootVertices[trace(parent, edge)]));
        }
        if (x === 0 || y === 0 || z === 0) continue;
        for (let axis = 0; axis < 3; axis++) {
          if ((mask & 1) === ((mask >> (1 << axis)) & 1)) continue;
          const [a, b] = quadStrides[axis];
          const [e1, e2, e3] = quadEdges[axis];
          const ownVertex = cellVertex(cell, axis);
          const u = cellVertex(cell - a, e1);
          const v = cellVertex(cell - a - b, e2);
          const w = cellVertex(cell - b, e3);
          if (mask & 1) indices.push(ownVertex, u, v, ownVertex, v, w);
          else indices.push(ownVertex, w, v, ownVertex, v, u);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function buildHoof(x, y, z, side) {
  const ringCount = 28;
  const profiles = [
    [0.022, -0.003, 0.047, 0.062, 0.054],
    [0.004, 0.000, 0.060, 0.076, 0.064],
    [-0.026, 0.009, 0.075, 0.089, 0.067],
    [-0.069, 0.018, 0.088, 0.100, 0.072],
    [-0.108, 0.031, 0.093, 0.108, 0.072],
    [-0.118, 0.032, 0.089, 0.103, 0.068]
  ];
  const positions = [];
  const indices = [];
  const point = (height, forward, width, toe, heel, angle) => {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const frontRadius = c >= 0 ? toe : heel * (1 - 0.16 * Math.pow(-c, 10));
    return [
      x + side * (0.004 - height * 0.075) + Math.sign(s) * Math.pow(Math.abs(s), 0.93) * width,
      y + height + Math.max(0, -c) ** 2 * 0.013,
      z + forward + Math.sign(c) * Math.pow(Math.abs(c), 0.85) * frontRadius
    ];
  };
  for (const profile of profiles) {
    for (let i = 0; i < ringCount; i++) positions.push(...point(...profile, i / ringCount * Math.PI * 2));
  }
  for (let ring = 1; ring < profiles.length; ring++) {
    for (let i = 0; i < ringCount; i++) {
      const j = (i + 1) % ringCount;
      const topA = (ring - 1) * ringCount + i;
      const topB = (ring - 1) * ringCount + j;
      const botA = ring * ringCount + i;
      const botB = ring * ringCount + j;
      indices.push(topA, botA, topB, topB, botA, botB);
    }
  }
  const first = positions.length / 3;
  const last = first + 1;
  positions.push(x, y + 0.024, z, x, y - 0.116, z + 0.032);
  const bottom = (profiles.length - 1) * ringCount;
  for (let i = 0; i < ringCount; i++) {
    const next = (i + 1) % ringCount;
    indices.push(first, i, next, last, bottom + next, bottom + i);
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wall.setIndex(indices);
  wall.computeVertexNormals();

  // A shoe follows the toe and quarters and leaves both heel bulbs visible.
  const shoePositions = [];
  const shoeIndices = [];
  const shoeSegments = 22;
  for (let i = 0; i <= shoeSegments; i++) {
    const angle = THREE.MathUtils.lerp(-2.42, 2.42, i / shoeSegments);
    shoePositions.push(
      ...point(-0.107, 0.032, 0.095, 0.112, 0.073, angle),
      ...point(-0.125, 0.033, 0.094, 0.112, 0.073, angle),
      ...point(-0.126, 0.032, 0.076, 0.091, 0.059, angle),
      ...point(-0.116, 0.032, 0.076, 0.091, 0.059, angle)
    );
  }
  for (let i = 0; i < shoeSegments; i++) {
    for (let face = 0; face < 4; face++) {
      const a = i * 4 + face;
      const b = i * 4 + (face + 1) % 4;
      shoeIndices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const end = shoeSegments * 4;
  shoeIndices.push(0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3);
  const shoe = new THREE.BufferGeometry();
  shoe.setAttribute('position', new THREE.Float32BufferAttribute(shoePositions, 3));
  shoe.setIndex(shoeIndices);
  shoe.computeVertexNormals();
  return { wall, shoe };
}

export function buildAnatomy(pose) {
  const legs = [
    [frontRaised, pose === 0 ? 1 : -1],
    [frontExtended, pose === 0 ? -1 : 1],
    [hindExtended, pose === 0 ? 1 : -1],
    [hindCollected, pose === 0 ? -1 : 1]
  ];
  const fields = legs.map(([sections, side]) => legField(sections, side));
  const eye = [lateralSurface(2.90, 1.21) + 0.028, 2.90, 1.21];
  const nostril = [lateralSurface(2.555, 1.615) + 0.019, 2.555, 1.615];
  const field = (x, y, z) => {
    let distance = coreField(x, y, z);
    if (y < 2.09) {
      const lateral = Math.abs(x);
      if (z > -0.14) {
        distance = blend(distance, fields[0](x, y, z), 0.103);
        distance = blend(distance, fields[1](x, y, z), 0.103);
      }
      if (z < -0.08) {
        distance = blend(distance, fields[2](x, y, z), 0.125);
        distance = blend(distance, fields[3](x, y, z), 0.125);
      }
      if (lateral > 0.06 && y < 1.20 && y > 0.42 && Math.abs(distance) < 0.055) {
        const tendon = Math.exp(-Math.pow((lateral - 0.253) / 0.044, 2));
        distance -= tendon * 0.006 * THREE.MathUtils.smoothstep(y, 0.42, 0.57);
      }
    }
    if (y > 2.78 && z > 1.10 && z < 1.32) {
      distance = recess(distance, Math.abs(x), y, z, eye, 0.053, 0.049, 0.073, 0.16);
    }
    if (y > 2.48 && y < 2.63 && z > 1.54) {
      distance = recess(distance, Math.abs(x), y, z, nostril, 0.037, 0.041, 0.049, -0.54);
    }
    return distance;
  };
  const body = extractSurface(field);
  const hoofParts = legs.map(([sections, side]) => {
    const [y, x, z] = sections[0];
    return buildHoof(x * side, y, z, side);
  });
  const hooves = mergeGeometries(hoofParts.map(({ wall }) => wall));
  const shoeTrim = mergeGeometries(hoofParts.map(({ shoe }) => shoe));
  return {
    body, hooves, shoeTrim, field,
    landmarks: {
      eye: [eye[0] - 0.028, eye[1], eye[2]],
      nostril: [nostril[0] - 0.019, nostril[1], nostril[2]],
      dock: [0, 1.96, -1.03],
      ears: [0.075, 3.145, 1.0]
    }
  };
}
