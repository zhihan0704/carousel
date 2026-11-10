import * as THREE from 'three';
import { lathe, tube } from './lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Project the tack onto the actual sculpt, including both gallop variants.
function makeSurface(body, sampler) {
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(body, material);
  const ray = new THREE.Raycaster();
  const hits = [];
  const origin = V(0, 0, 0);
  const inward = V(0, 0, 0);

  function cast(center, direction, offset, limit = 0.75) {
    origin.copy(center).addScaledVector(direction, limit);
    ray.set(origin, inward.copy(direction).negate());
    ray.far = limit + 0.10;
    hits.length = 0;
    ray.intersectObject(mesh, false, hits);
    const hit = hits[0];
    if (!hit) return null;
    const normal = (hit.normal ?? hit.face.normal).clone().normalize();
    return { p: hit.point.addScaledVector(normal, offset), n: normal };
  }

  return {
    atBarrel(z, theta, offset) {
      return sampler.barrel(0, 1.77, z, Math.sin(theta), Math.cos(theta), offset);
    },
    atSide(side, y, z, offset) {
      return cast(V(0, y, z), V(side, 0, 0), offset);
    },
    atTop(x, z, offset) {
      return sampler.barrel(x, 1.77, z, 0, 1, offset);
    },
    atBottom() {
      return sampler.barrel(0, 1.77, 0, 0, -1);
    },
    aroundHead(y, z, theta, offset) {
      const vertical = Math.cos(theta);
      return cast(V(0, y, z), V(Math.sin(theta), 0.78 * vertical, 0.626 * vertical), offset, 0.48);
    },
    dispose() { material.dispose(); }
  };
}

function surfaceGeometry(vertices, triangles) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap((p) => [p.x, p.y, p.z]), 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return geometry;
}

function grid(rows, columns, sample) {
  const vertices = [];
  const faces = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      vertices.push(sample(row / rows, col / columns));
      if (row === rows || col === columns) continue;
      const a = row * (columns + 1) + col;
      const b = a + columns + 1;
      faces.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return surfaceGeometry(vertices, faces);
}

function pipe(points, radius, closed = false) {
  return tube(points.map((p) => [p.x, p.y, p.z]), radius, Math.max(10, points.length), 5, closed);
}

// A rounded rectangular leather section. Local surface normals control the lay of the strap.
function strap(samples, width, thickness, closed = false) {
  const corners = [[-0.8, -1], [0.8, -1], [1, -0.4], [1, 0.4], [0.8, 1], [-0.8, 1], [-1, 0.4], [-1, -0.4]];
  const vertices = [];
  const faces = [];
  for (let i = 0; i < samples.length; i++) {
    const { p, n } = samples[i];
    const prev = samples[i === 0 ? (closed ? samples.length - 1 : 0) : i - 1].p;
    const next = samples[i === samples.length - 1 ? (closed ? 0 : i) : i + 1].p;
    const across = V(0, 0, 0).subVectors(next, prev).cross(n).normalize();
    for (const [u, v] of corners) {
      vertices.push(p.clone().addScaledVector(across, u * width * 0.5).addScaledVector(n, v * thickness * 0.5));
    }
    if (i === samples.length - 1 && !closed) continue;
    const nextRing = (i + 1) % samples.length;
    for (let j = 0; j < corners.length; j++) {
      const a = i * corners.length + j;
      const b = nextRing * corners.length + j;
      const jj = (j + 1) % corners.length;
      faces.push(a, b, i * corners.length + jj, b, nextRing * corners.length + jj, i * corners.length + jj);
    }
  }
  if (!closed) {
    const tail = vertices.length - corners.length;
    for (let j = 1; j < corners.length - 1; j++) faces.push(0, j, j + 1, tail, tail + j + 1, tail + j);
  }
  return surfaceGeometry(vertices, faces);
}

function sidePath(surface, side, control, offset, steps = 16) {
  const curve = new THREE.CatmullRomCurve3(control.map(([y, z]) => V(0, y, z)));
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const { y, z } = curve.getPoint(i / steps);
    const sample = surface.atSide(side, y, z, offset);
    if (sample) path.push(sample);
  }
  return path;
}

function ellipseLink(center, normal, rx, ry, wire, tilt = 0) {
  const link = new THREE.TorusGeometry(1, wire / Math.max(rx, ry), 5, 14);
  link.scale(rx, ry, Math.max(rx, ry));
  link.rotateZ(tilt);
  link.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), normal));
  link.translate(center.x, center.y, center.z);
  return link;
}

function fitSaddle(surface, cloth, leather, gold) {
  const clothPoint = (t, u, offset = 0.011) => {
    const edge = Math.pow(Math.abs(2 * u - 1), 4);
    const fall = 0.22 * Math.sin(Math.PI * t) - 0.095 * Math.cos(t * Math.PI * 4);
    const z = THREE.MathUtils.lerp(-0.59, 0.31, t) - 0.06 * edge;
    const theta = (2 * u - 1) * (1.50 + fall);
    return surface.atBarrel(z, theta, offset).p;
  };
  cloth.push(grid(20, 24, clothPoint));

  // An inset gold welt traces the shaped wool caparison.
  const perimeter = [];
  for (let i = 0; i < 20; i++) perimeter.push(clothPoint(i / 20, 0, 0.018));
  for (let i = 0; i < 16; i++) perimeter.push(clothPoint(1, i / 16, 0.018));
  for (let i = 0; i < 20; i++) perimeter.push(clothPoint(1 - i / 20, 1, 0.018));
  for (let i = 0; i < 16; i++) perimeter.push(clothPoint(0, 1 - i / 16, 0.018));
  gold.push(pipe(perimeter, 0.009, true));

  const seatProfile = new THREE.SplineCurve([
    [-0.51, 0.105], [-0.37, 0.226], [-0.19, 0.212],
    [0.03, 0.152], [0.19, 0.137], [0.28, 0.073]
  ].map(([z, width]) => new THREE.Vector2(z, width)));
  const seatAt = (t, u, underside = false) => {
    const { x: z, y: width } = seatProfile.getPoint(t);
    const x = (2 * u - 1) * width;
    const baseY = surface.atTop(x, z, 0).p.y;
    const crown = 0.042 * Math.sin(Math.PI * u);
    const cantle = 0.10 * Math.exp(-Math.pow((z + 0.43) / 0.11, 2));
    const pommel = 0.080 * Math.exp(-Math.pow((z - 0.205) / 0.09, 2));
    return V(x, baseY + (underside ? 0.004 : 0.045 + crown + cantle + pommel), z);
  };
  const rowCount = 20;
  const colCount = 12;
  const cushion = grid(rowCount, colCount, (t, u) => seatAt(t, u));
  const underside = grid(rowCount, colCount, (t, u) => seatAt(t, 1 - u, true));
  leather.push(cushion, underside);
  const outlineTop = [];
  const outlineBottom = [];
  const addOutline = (t, u) => {
    outlineTop.push(seatAt(t, u));
    outlineBottom.push(seatAt(t, u, true));
  };
  for (let i = 0; i < rowCount; i++) addOutline(i / rowCount, 0);
  for (let i = 0; i < colCount; i++) addOutline(1, i / colCount);
  for (let i = 0; i < rowCount; i++) addOutline(1 - i / rowCount, 1);
  for (let i = 0; i < colCount; i++) addOutline(0, 1 - i / colCount);
  const wall = [];
  for (let i = 0; i < outlineTop.length; i++) {
    const j = (i + 1) % outlineTop.length;
    wall.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1);
  }
  leather.push(surfaceGeometry(outlineTop.flatMap((p, i) => [p, outlineBottom[i]]), wall));
  gold.push(pipe(outlineTop.map((p) => p.clone().add(V(0, 0.004, 0))), 0.008, true));

  const girth = [];
  for (let i = 0; i < 38; i++) girth.push(surface.atBarrel(0, i / 38 * Math.PI * 2, 0.015));
  leather.push(strap(girth, 0.086, 0.020, true));

  for (const side of [-1, 1]) {
    const flap = (t, u, offset) => {
      const z = -0.24 + 0.46 * t + (0.13 - 0.24 * t) * u * u;
      const theta = side * (0.53 + u * (0.64 + 0.39 * Math.sin(t * Math.PI)));
      return surface.atBarrel(z, theta, offset).p;
    };
    leather.push(grid(12, 12, (t, u) => flap(t, side === 1 ? u : 1 - u, 0.025)));
    const flapEdge = Array.from({ length: 15 }, (_, i) => flap(i / 14, 1, 0.031));
    gold.push(pipe(flapEdge, 0.006));

    const hanger = [];
    for (let i = 0; i <= 14; i++) {
      hanger.push(surface.atBarrel(-0.075 + 0.045 * i / 14, side * (0.79 + 1.12 * i / 14), 0.047));
    }
    leather.push(strap(hanger, 0.034, 0.010));
    const last = hanger.at(-1).p;
    const stirrup = ellipseLink(last.clone().add(V(side * 0.017, -0.062, 0.004)), V(side, 0, 0), 0.064, 0.082, 0.010);
    gold.push(stirrup);
    const tread = new THREE.BoxGeometry(0.047, 0.017, 0.108);
    tread.translate(last.x + side * 0.014, last.y - 0.126, last.z + 0.004);
    gold.push(tread);

    // A small acanthus sprig stitched into the saddlecloth.
    const motif = (z, angle) => surface.atBarrel(z, side * angle, 0.021).p;
    const vine = (t) => [-0.515 + 0.25 * t, 1.41 - 0.37 * t + 0.15 * Math.sin(1.4 * Math.PI * t)];
    const stem = Array.from({ length: 18 }, (_, i) => motif(...vine(i / 17)));
    gold.push(pipe(stem, 0.0055));
    for (const [t, direction] of [[0.24, -1], [0.48, 1], [0.70, -1]]) {
      const [z, angle] = vine(t);
      gold.push(pipe([
        motif(z, angle), motif(z + 0.015, angle + direction * 0.10),
        motif(z + 0.071, angle + direction * 0.18),
        motif(z + 0.058, angle + direction * 0.072),
        motif(z + 0.030, angle + direction * 0.026)
      ], 0.0042, true));
    }
  }
}

function fitBridle(surface, leather, gold) {
  const nose = [];
  for (let i = 0; i < 36; i++) {
    const theta = i / 36 * Math.PI * 2;
    const sample = surface.aroundHead(2.60, 1.49, theta, 0.008);
    if (sample) nose.push(sample);
  }
  if (nose.length >= 28) leather.push(strap(nose, 0.037, 0.013, true));

  const brow = [];
  const crown = [];
  for (let i = 0; i <= 20; i++) {
    const theta = -1.34 + 2.68 * i / 20;
    const sample = surface.aroundHead(2.95, 1.10, theta, 0.008);
    if (sample) brow.push(sample);
    const poll = surface.aroundHead(3.025, 0.967, theta, 0.008);
    if (poll) crown.push(poll);
  }
  if (brow.length >= 12) {
    leather.push(strap(brow, 0.030, 0.011));
    gold.push(pipe(brow.map(({ p, n }) => p.clone().addScaledVector(n, 0.007)), 0.005));
  }
  if (crown.length >= 12) leather.push(strap(crown, 0.028, 0.012));

  for (const side of [-1, 1]) {
    const cheek = sidePath(surface, side, [
      [3.022, 0.988], [2.94, 1.056], [2.83, 1.073], [2.72, 1.139], [2.61, 1.273], [2.487, 1.443]
    ], 0.010);
    if (cheek.length < 4) continue;
    leather.push(strap(cheek, 0.027, 0.012));
    const cheekClasp = cheek[Math.floor(cheek.length * 0.33)];
    gold.push(ellipseLink(cheekClasp.p.clone().addScaledVector(cheekClasp.n, 0.009), cheekClasp.n, 0.025, 0.028, 0.005));

    const bit = cheek.at(-1);
    const ringCenter = bit.p.clone().addScaledVector(bit.n, 0.016);
    gold.push(ellipseLink(ringCenter, V(side, 0, 0), 0.042, 0.042, 0.008));
    const reins = sidePath(surface, side, [
      [2.502, 1.434], [2.53, 1.274], [2.53, 1.069], [2.405, 0.815],
      [2.30, 0.617], [2.24, 0.425], [2.17, 0.232]
    ], 0.031, 20);
    if (reins.length > 3) {
      reins.unshift({ p: ringCenter.clone().add(V(0, 0, -0.027)), n: V(side, 0, 0) });
      leather.push(strap(reins, 0.022, 0.010));
      const curve = new THREE.CatmullRomCurve3(reins.map(({ p }) => p));
      const length = curve.getLength();
      for (let i = 0; i < 5; i++) {
        const t = (0.012 + 0.025 * i) / length;
        const tangent = curve.getTangentAt(t);
        const normal = V(side, 0, 0).applyAxisAngle(tangent, i % 2 ? -0.64 : 0.60);
        const p = curve.getPointAt(t).add(V(side * 0.013, 0, 0));
        gold.push(ellipseLink(p, normal, 0.017, 0.011, 0.0038, 0.30));
      }
    }
  }
}

export function buildHorseTack(anatomy, sampler) {
  const surface = makeSurface(anatomy.body, sampler);
  const cloth = [];
  const leather = [];
  const gold = [];
  fitSaddle(surface, cloth, leather, gold);
  fitBridle(surface, leather, gold);

  const back = surface.atTop(0, 0, 0).p.y;
  const belly = surface.atBottom().p.y;
  const bore = 0.158;
  const upperLip = back + 0.167;
  const lowerLip = belly - 0.047;
  const backFitting = lathe([
    [bore, 0.010], [0.185, 0.010], [0.189, 0.023], [0.174, 0.037],
    [0.173, 0.064], [0.181, 0.081], [0.179, 0.094], [0.160, 0.094],
    [bore, 0.080], [bore, 0.010]
  ], 32);
  backFitting.translate(0, upperLip - 0.094, 0);
  gold.push(backFitting);
  const bellyFitting = lathe([
    [bore, -0.047], [0.172, -0.047], [0.177, -0.039], [0.177, -0.025],
    [0.179, -0.015], [0.176, 0.005], [bore, 0.005], [bore, -0.047]
  ], 28);
  bellyFitting.translate(0, lowerLip + 0.047, 0);
  gold.push(bellyFitting);
  surface.dispose();
  return { cloth, leather, gold, mount: { back, belly, bore, upperLip, lowerLip } };
}
