import * as THREE from 'three';
import {
  TAU, mulberry32, makeCanvasTexture, lathe, tube, taperedTube, cylinderBetween, merge
} from './lib.js';

/**
 * Belle Époque carousel canopy.
 *
 * The canopy is intentionally self-contained: only the roof, its drapes,
 * crown, ceiling and local decorative lights live here. The horses, deck,
 * column, camera and global lighting are owned by the carousel module.
 */
export function createOrnateCanopy({
  envMap,
  gold,
  darkMetal,
  champagneFilament,
  goldFilament,
  crystalGold,
  crystalColumn,
  lanternCore,
  warmWhite,
  canopyY,
  canopyRadius
}) {
  const RIM_Y = canopyY;
  const RIM_R = canopyRadius;
  const EAVE_R = RIM_R + 0.36;
  const FRIEZE_R = RIM_R + 0.27;
  const FRIEZE_TOP = RIM_Y - 0.03;
  const FRIEZE_BOTTOM = RIM_Y - 0.58;
  const ROOF_BASE_Y = RIM_Y + 0.075;
  const CROWN_BASE = 12.9;

  const group = new THREE.Group();
  group.name = 'ornate-canopy';

  const rand = mulberry32(1900);
  const goldParts = [];
  const darkParts = [];
  const mirrorParts = [];
  const ivoryParts = [];
  const cameoParts = [];
  const friezeParts = [];
  const roofPanelParts = [];
  const crimsonParts = [];
  const clothParts = [];
  const clothDarkParts = [];
  const crystalPositions = [];
  const lightCreamParts = [];
  const lightGoldParts = [];

  const bulbBuckets = {
    crown: [],
    eave: [],
    dome: [],
    interior: []
  };
  function addBulb(x, y, z, size, bucket, nx = 0, ny = 1, nz = 0) {
    bulbBuckets[bucket].push({ x, y, z, size: size * 1.16, nx, ny, nz });
  }
  function addCrystal(x, y, z, sx, sy, sz, ry = 0) {
    crystalPositions.push({ x, y, z, sx, sy, sz, ry });
  }

  // ---------------------------------------------------------------------------
  // textile / panel textures
  // ---------------------------------------------------------------------------
  function makeBrocadeTexture() {
    return makeCanvasTexture(2048, 1024, (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#2c1b17');
      bg.addColorStop(0.24, '#4d3024');
      bg.addColorStop(0.53, '#2b1a16');
      bg.addColorStop(0.78, '#4c3025');
      bg.addColorStop(1, '#201411');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      // woven vertical lines
      for (let i = 0; i < 24; i++) {
        const x = (i + 0.5) / 24 * w;
        const grad = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(198,164,119,.075)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 18, 0, 36, h);
      }

      // small repeating damask, kept subtle so the gold ribs and lamps dominate
      for (let i = 0; i < 16; i++) {
        const cx = (i + 0.5) / 16 * w;
        ctx.save();
        ctx.translate(cx, h * 0.5);
        ctx.strokeStyle = 'rgba(222,177,105,.22)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.2);
        ctx.bezierCurveTo(w * 0.028, -h * 0.1, w * 0.038, h * 0.06, 0, h * 0.2);
        ctx.bezierCurveTo(-w * 0.038, h * 0.06, -w * 0.028, -h * 0.1, 0, -h * 0.2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,226,173,.12)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          const yy = -h * 0.12 + k * h * 0.12;
          ctx.beginPath();
          ctx.moveTo(-w * 0.025, yy);
          ctx.quadraticCurveTo(0, yy + h * 0.035, w * 0.025, yy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // tiny dust of gold fibres
      for (let i = 0; i < 900; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const a = 0.035 + rand() * 0.12;
        ctx.fillStyle = `rgba(245,211,153,${a})`;
        ctx.fillRect(x, y, 1 + rand() * 2, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
    }, { repeatX: 1, repeatY: 1, wrapS: THREE.RepeatWrapping });
  }

  function makeVelvetTexture() {
    return makeCanvasTexture(1024, 1024, (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1b080f');
      bg.addColorStop(0.26, '#421523');
      bg.addColorStop(0.5, '#260d17');
      bg.addColorStop(0.78, '#3d1420');
      bg.addColorStop(1, '#17070d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // soft vertical pile bands
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 32; i++) {
        const x = rand() * w;
        const grad = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, `rgba(183,126,145,${0.018 + rand() * 0.022})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 20, 0, 40, h);
      }

      // tone-on-tone damask
      for (let i = 0; i < 8; i++) {
        const cx = (i + 0.5) / 8 * w;
        const cy = h * 0.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(198,164,119,.11)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.3);
        ctx.bezierCurveTo(w * 0.1, -h * 0.16, w * 0.11, h * 0.08, 0, h * 0.3);
        ctx.bezierCurveTo(-w * 0.11, h * 0.08, -w * 0.1, -h * 0.16, 0, -h * 0.3);
        ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.beginPath();
          ctx.moveTo(w * 0.02, h * 0.11);
          ctx.bezierCurveTo(w * 0.15, h * 0.02, w * 0.2, h * 0.16, w * 0.11, h * 0.24);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      // very light noise so the velvet does not look like a flat gradient
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (rand() - 0.5) * 5;
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
        img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
        img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }, { repeatX: 1, repeatY: 1, wrapS: THREE.RepeatWrapping });
  }

  function makeCeilingTexture() {
    return makeCanvasTexture(1536, 1536, (ctx, w, h) => {
      const cx = w / 2, cy = h / 2;
      ctx.fillStyle = '#33221d';
      ctx.fillRect(0, 0, w, h);
      ctx.translate(cx, cy);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
      glow.addColorStop(0, 'rgba(255,229,183,.62)');
      glow.addColorStop(0.18, 'rgba(213,176,126,.3)');
      glow.addColorStop(0.55, 'rgba(103,60,49,.12)');
      glow.addColorStop(1, 'rgba(25,13,14,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.5, 0, TAU);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * TAU;
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,229,179,.38)' : 'rgba(198,164,119,.17)';
        ctx.lineWidth = i % 6 === 0 ? 2.6 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * w * 0.105, Math.sin(a) * w * 0.105);
        ctx.lineTo(Math.cos(a) * w * 0.48, Math.sin(a) * w * 0.48);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const [r, lw, color] of [
        [0.105, 4, 'rgba(255,232,187,.55)'], [0.2, 1.4, 'rgba(198,164,119,.34)'],
        [0.32, 2.2, 'rgba(255,219,160,.35)'], [0.46, 1.2, 'rgba(198,164,119,.28)'],
        [0.49, 4, 'rgba(198,164,119,.35)']
      ]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(0, 0, w * r, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        ctx.save();
        ctx.rotate(i / 24 * TAU);
        ctx.fillStyle = i % 2 ? 'rgba(255,226,178,.10)' : 'rgba(198,164,119,.08)';
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.09);
        ctx.quadraticCurveTo(w * 0.035, -w * 0.15, 0, -w * 0.22);
        ctx.quadraticCurveTo(-w * 0.035, -w * 0.15, 0, -w * 0.09);
        ctx.fill();
        ctx.restore();
      }
      // small gold rivets
      for (let i = 0; i < 144; i++) {
        const a = rand() * TAU;
        const r = w * (0.12 + rand() * 0.36);
        ctx.fillStyle = 'rgba(255,224,170,.25)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.2 + rand() * 1.4, 0, TAU);
        ctx.fill();
      }
    }, { repeatX: 1, repeatY: 1, wrapS: THREE.RepeatWrapping });
  }

  function makeRoofPanelTexture() {
    return makeCanvasTexture(512, 512, (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#bda37a');
      bg.addColorStop(0.28, '#d8bf95');
      bg.addColorStop(0.58, '#b79a70');
      bg.addColorStop(0.82, '#ccb58d');
      bg.addColorStop(1, '#a98e66');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // painted border and inset gold line
      ctx.strokeStyle = 'rgba(67,40,20,.78)';
      ctx.lineWidth = 9;
      ctx.strokeRect(11, 11, w - 22, h - 22);
      ctx.strokeStyle = 'rgba(225,184,116,.82)';
      ctx.lineWidth = 3;
      ctx.strokeRect(27, 27, w - 54, h - 54);
      ctx.strokeStyle = 'rgba(255,229,178,.35)';
      ctx.lineWidth = 9;
      ctx.strokeRect(38, 38, w - 76, h - 76);

      // soft damask / acanthus scrollwork
      ctx.save();
      ctx.translate(w / 2, h / 2);
      // central eight-petal gilt medallion
      ctx.strokeStyle = 'rgba(83,50,23,.58)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate(i / 8 * TAU);
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.055);
        ctx.bezierCurveTo(w * 0.07, -w * 0.12, w * 0.075, -w * 0.16, 0, -w * 0.2);
        ctx.bezierCurveTo(-w * 0.075, -w * 0.16, -w * 0.07, -w * 0.12, 0, -w * 0.055);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(117,77,42,.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate(i / 8 * TAU);
        ctx.beginPath();
        ctx.moveTo(0, -w * 0.2);
        ctx.bezierCurveTo(w * 0.08, -w * 0.14, w * 0.09, w * 0.02, 0, w * 0.08);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(242,212,158,.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.2, h * 0.14, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.145, h * 0.095, 0, 0, TAU);
      ctx.stroke();
      // fleur motifs in the corners
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          ctx.save();
          ctx.translate(sx * w * 0.31, sy * h * 0.3);
          ctx.rotate(sx * sy * 0.2);
          ctx.fillStyle = 'rgba(116,75,39,.24)';
          ctx.beginPath();
          ctx.moveTo(0, -w * 0.06);
          ctx.quadraticCurveTo(w * 0.05, 0, 0, w * 0.07);
          ctx.quadraticCurveTo(-w * 0.05, 0, 0, -w * 0.06);
          ctx.fill();
          ctx.strokeStyle = 'rgba(242,216,166,.32)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      // fine gold stipple
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = `rgba(255,235,190,${0.04 + rand() * 0.08})`;
        ctx.fillRect(rand() * w, rand() * h, 1, 1);
      }
      ctx.restore();
    }, { repeatX: 1, repeatY: 1, wrapS: THREE.ClampToEdgeWrapping });
  }

  function makeIvoryTexture() {
    return makeCanvasTexture(512, 512, (ctx, w, h) => {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#bbaa8b');
      bg.addColorStop(0.45, '#e2d3b7');
      bg.addColorStop(0.72, '#c4b08e');
      bg.addColorStop(1, '#a48f70');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,242,207,.22)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * w * 0.1, h / 2 + Math.sin(a) * h * 0.1);
        ctx.quadraticCurveTo(w / 2 + Math.cos(a + 0.3) * w * 0.28, h / 2 + Math.sin(a + 0.3) * h * 0.28, w / 2 + Math.cos(a + 0.1) * w * 0.38, h / 2 + Math.sin(a + 0.1) * h * 0.38);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }, { repeatX: 1, repeatY: 1, wrapS: THREE.RepeatWrapping });
  }

  const brocadeTexture = makeBrocadeTexture();
  const velvetTexture = makeVelvetTexture();
  const ceilingTexture = makeCeilingTexture();
  const ivoryTexture = makeIvoryTexture();
  const roofPanelTexture = makeRoofPanelTexture();

  const roofMaterial = new THREE.MeshStandardMaterial({
    map: brocadeTexture, color: 0xbca587, metalness: 0.44, roughness: 0.5,
    envMap, envMapIntensity: 0.9,
    emissiveMap: brocadeTexture, emissive: 0x150d08, emissiveIntensity: 0.32,
    side: THREE.DoubleSide
  });
  // A dedicated PBR gold for the 400k-triangle canopy frame: it keeps the
  // warm environment reflections without paying for a second clearcoat lobe
  // on every small moulding and bead.
  const canopyGoldMaterial = new THREE.MeshStandardMaterial({
    color: 0xc6a477, metalness: 0.92, roughness: 0.3,
    envMap, envMapIntensity: 1.25
  });
  const ivoryMaterial = new THREE.MeshPhysicalMaterial({
    map: ivoryTexture, color: 0xf7ecd9, metalness: 0.2, roughness: 0.4,
    clearcoat: 0.56, clearcoatRoughness: 0.3, envMap, envMapIntensity: 0.9,
    emissive: 0x4a3620, emissiveIntensity: 0.33,
    side: THREE.DoubleSide
  });
  const cameoMaterial = new THREE.MeshPhysicalMaterial({
    map: ivoryTexture, color: 0xfff0d9, metalness: 0.13, roughness: 0.42,
    clearcoat: 0.5, clearcoatRoughness: 0.32, envMap, envMapIntensity: 0.65,
    emissive: 0x8a6a46, emissiveIntensity: 0.52,
    side: THREE.DoubleSide
  });
  const roofPanelMaterial = new THREE.MeshStandardMaterial({
    map: roofPanelTexture, color: 0xd4bf9c, metalness: 0.22, roughness: 0.52,
    envMap, envMapIntensity: 0.75,
    emissiveMap: roofPanelTexture, emissive: 0x23160e, emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });
  const mirrorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd8c6ad, metalness: 1, roughness: 0.07,
    clearcoat: 1, clearcoatRoughness: 0.02, envMap, envMapIntensity: 1.45,
    side: THREE.DoubleSide
  });
  const velvetMaterial = new THREE.MeshPhysicalMaterial({
    map: velvetTexture, color: 0xffffff, metalness: 0.07, roughness: 0.78,
    clearcoat: 0.02, clearcoatRoughness: 0.9,
    sheen: 0.18, sheenColor: new THREE.Color(0x8d4b52), sheenRoughness: 0.82,
    envMap, envMapIntensity: 0.2,
    emissive: 0x0d0307, emissiveIntensity: 0.22,
    side: THREE.DoubleSide
  });
  const velvetDarkMaterial = new THREE.MeshPhysicalMaterial({
    map: velvetTexture, color: 0xffffff, metalness: 0.05, roughness: 0.82,
    sheen: 0.08, sheenColor: new THREE.Color(0x5d2a34), sheenRoughness: 0.9,
    envMap, envMapIntensity: 0.14,
    emissive: 0x080204, emissiveIntensity: 0.2,
    side: THREE.DoubleSide
  });
  const crimsonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x3d111e, metalness: 0.24, roughness: 0.48,
    clearcoat: 0.46, clearcoatRoughness: 0.36,
    envMap, envMapIntensity: 0.55,
    emissive: 0x100307, emissiveIntensity: 0.25,
    side: THREE.DoubleSide
  });
  const friezeMaterial = new THREE.MeshStandardMaterial({
    map: ivoryTexture, color: 0xd8c19e, metalness: 0.24, roughness: 0.48,
    envMap, envMapIntensity: 0.72,
    emissive: 0x1f1308, emissiveIntensity: 0.16,
    side: THREE.DoubleSide
  });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: ceilingTexture, color: 0xf1ddc0, metalness: 0.18, roughness: 0.5,
    emissiveMap: ceilingTexture, emissive: 0x5a4029, emissiveIntensity: 1.0,
    envMap, envMapIntensity: 0.5, side: THREE.DoubleSide
  });
  const crystalBeadMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeed2, metalness: 0.14, roughness: 0.08,
    transparent: true, opacity: 0.76,
    envMap, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03,
    side: THREE.DoubleSide, depthWrite: false
  });

  // ---------------------------------------------------------------------------
  // reusable geometry helpers
  // ---------------------------------------------------------------------------
  function addTube(arr, points, radius, tubular = 24, radial = 5, closed = false) {
    arr.push(tube(points, radius, tubular, radial, closed));
  }

  function makeOval(w, h) {
    const s = new THREE.Shape();
    s.absellipse(0, 0, w / 2, h / 2, 0, TAU, false, 0);
    return s;
  }

  function extrude(shape, depth, bevel = 0.008) {
    return new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, curveSegments: 12,
      bevelEnabled: true, bevelThickness: bevel * 0.55, bevelSize: bevel, bevelSegments: 2
    });
  }

  function localFrame(angle, radius, y, zOffset = 0) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const tangent = new THREE.Vector3(-s, 0, c);
    const radial = new THREE.Vector3(c, 0, s);
    const up = new THREE.Vector3(0, 1, 0);
    const m = new THREE.Matrix4().makeBasis(tangent, up, radial);
    m.setPosition(radial.x * radius + radial.x * zOffset, y, radial.z * radius + radial.z * zOffset);
    return { m, tangent, radial, up };
  }

  function applyLocal(geo, angle, radius, y, zOffset) {
    const frame = localFrame(angle, radius, y, zOffset);
    geo.applyMatrix4(frame.m);
    return geo;
  }

  function localPoint(angle, lx, ly, lz, radius, y) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [
      c * (radius + lz) - s * lx,
      y + ly,
      s * (radius + lz) + c * lx
    ];
  }

  // Build a closed shell from a pair of parametric surfaces. This gives cloth
  // and carved bands a real visible edge rather than a paper-thin plane.
  function buildShell(outerFn, innerFn, segU, segV, wrapU = false) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const cols = segU + 1;
    const rows = segV + 1;
    const outerCount = cols * rows;
    for (let iv = 0; iv <= segV; iv++) {
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const v = iv / segV;
        const p = outerFn(u, v);
        positions.push(p[0], p[1], p[2]);
        uvs.push(u, v);
      }
    }
    for (let iv = 0; iv <= segV; iv++) {
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const v = iv / segV;
        const p = innerFn(u, v);
        positions.push(p[0], p[1], p[2]);
        uvs.push(u, v);
      }
    }
    // outer faces
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * cols + iu;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    // inner faces (reverse winding)
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = outerCount + iv * cols + iu;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    // top (v=0) and bottom (v=1) rims
    for (const vRow of [0, segV]) {
      for (let iu = 0; iu < segU; iu++) {
        const oa = vRow * cols + iu;
        const ob = oa + 1;
        const ia = outerCount + oa;
        const ib = ia + 1;
        if (vRow === 0) indices.push(oa, ia, ob, ob, ia, ib);
        else indices.push(oa, ob, ia, ob, ib, ia);
      }
    }
    // side rims only for open panels
    if (!wrapU) {
      for (let iv = 0; iv < segV; iv++) {
        const oa = iv * cols;
        const ob = oa + cols;
        const ia = outerCount + oa;
        const ib = ia + cols;
        indices.push(oa, ob, ia, ob, ib, ia);
        const oa2 = iv * cols + segU;
        const ob2 = oa2 + cols;
        const ia2 = outerCount + oa2;
        const ib2 = ia2 + cols;
        indices.push(oa2, ia2, ob2, ob2, ia2, ib2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ---------------------------------------------------------------------------
  // roof shell, skeleton and cartouches
  // ---------------------------------------------------------------------------
  const roofProfile = [
    [7.58, 9.52], [7.66, 9.69], [7.38, 9.95], [6.62, 10.28],
    [5.55, 10.71], [4.35, 11.2], [3.05, 11.74], [1.86, 12.26],
    [0.98, 12.66], [0.38, 12.89], [0.06, 13.02]
  ];
  const roofYAt = (r) => {
    const points = roofProfile;
    for (let i = 0; i < points.length - 1; i++) {
      const [r0, y0] = points[i];
      const [r1, y1] = points[i + 1];
      if (r <= r0 && r >= r1) {
        const t = (r0 - r) / (r0 - r1);
        return y0 + (y1 - y0) * t;
      }
    }
    return points[0][1];
  };
  const roofSlopeAt = (r) => {
    const points = roofProfile;
    for (let i = 0; i < points.length - 1; i++) {
      const [r0, y0] = points[i];
      const [r1, y1] = points[i + 1];
      if (r <= r0 && r >= r1) return (y1 - y0) / (r1 - r0);
    }
    return 0;
  };
  const roofPoint = (a, r, lift = 0.02) => [
    Math.cos(a) * r,
    roofYAt(r) + lift,
    Math.sin(a) * r
  ];
  const roofNormal = (a, r) => {
    const slope = roofSlopeAt(r);
    const n = new THREE.Vector3(Math.cos(a) * (-slope), 1, Math.sin(a) * (-slope)).normalize();
    return n;
  };

  const roof = new THREE.Mesh(lathe(roofProfile, 160), roofMaterial);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const RIBS = 24;
  const RINGS = [2.15, 3.85, 5.55, 7.02];
  for (let i = 0; i < RIBS; i++) {
    const a = i / RIBS * TAU;
    // sample the profile from apex to rim so the rib follows the shell
    const pts = [];
    for (let k = 0; k <= 54; k++) {
      const t = k / 54;
      const r = roofProfile[roofProfile.length - 1][0] + (roofProfile[0][0] - roofProfile[roofProfile.length - 1][0]) * t;
      const p = roofPoint(a, r, 0.026);
      pts.push(p);
    }
    darkParts.push(tube(pts, 0.062, 86, 6));
    goldParts.push(tube(pts.map(([x, y, z]) => [x, y + 0.035, z]), 0.032, 86, 6));
    addTube(goldParts, pts.map(([x, y, z]) => [x, y + 0.057, z]), 0.008, 86, 4);
    goldParts.push(tube(pts.map(([x, y, z]) => [x, y + 0.045, z]), 0.012, 86, 4));
    // little eave bracket under every rib
    const base = roofPoint(a, 7.34, -0.03);
    const outward = [Math.cos(a), 0, Math.sin(a)];
    addTube(goldParts, [
      base,
      [base[0] + outward[0] * 0.18, base[1] - 0.1, base[2] + outward[2] * 0.18],
      [base[0] + outward[0] * 0.14, base[1] - 0.24, base[2] + outward[2] * 0.14]
    ], 0.018, 14, 4);
    for (const rr of [2.0, 2.9, 3.9, 4.9, 5.9, 6.8]) {
      const p = roofPoint(a, rr, 0.1);
      const n = roofNormal(a, rr);
      addBulb(p[0], p[1], p[2], 0.032 + (i % 3) * 0.004, 'dome', n.x, n.y, n.z);
    }
  }
  // continuous light lines run up every rib
  for (let i = 0; i < RIBS; i++) {
    const a = i / RIBS * TAU + Math.PI / RIBS;
    // a narrow filament between ribs catches the roof surface
    const pts = [];
    for (let k = 0; k <= 28; k++) {
      const r = 7.2 - k / 28 * 5.8;
      pts.push(roofPoint(a, r, 0.04));
    }
    addTube(goldParts, pts, 0.006, 44, 4);
  }

  for (const [ri, rr] of RINGS.entries()) {
    const y = roofYAt(rr) + 0.02;
    const torusDark = new THREE.TorusGeometry(rr, 0.064, 7, 160);
    torusDark.rotateX(Math.PI / 2);
    torusDark.translate(0, y, 0);
    darkParts.push(torusDark);
    const torusGold = new THREE.TorusGeometry(rr + 0.012, 0.026, 7, 160);
    torusGold.rotateX(Math.PI / 2);
    torusGold.translate(0, y + 0.038, 0);
    goldParts.push(torusGold);
    const glow = Array.from({ length: 80 }, (_, k) => {
      const a = k / 79 * TAU;
      return [Math.cos(a) * (rr + 0.024), y + 0.052, Math.sin(a) * (rr + 0.024)];
    });
    addTube(goldParts, glow, 0.007, 140, 4, true);
    const count = [36, 48, 56, 64][ri];
    for (let k = 0; k < count; k++) {
      const a = k / count * TAU + ri * 0.05;
      const p = [Math.cos(a) * (rr + 0.025), y + 0.09, Math.sin(a) * (rr + 0.025)];
      const n = roofNormal(a, rr);
      addBulb(p[0], p[1], p[2], 0.027 + (k % 4) * 0.003, 'dome', n.x, n.y, n.z);
    }
    // gilt rosettes at every rib-ring intersection
    for (let i = 0; i < RIBS; i++) {
      const a = i / RIBS * TAU;
      const x = Math.cos(a) * (rr + 0.02);
      const z = Math.sin(a) * (rr + 0.02);
      const rosette = new THREE.TorusGeometry(0.052, 0.011, 5, 12);
      rosette.rotateX(Math.PI / 2);
      rosette.rotateZ(a);
      rosette.translate(x, y + 0.07, z);
      goldParts.push(rosette);
    }
  }
  // small gold fleur crests between the ribs, near the lower two rings
  for (let i = 0; i < RIBS; i++) {
    const a = (i + 0.5) / RIBS * TAU;
    for (const rr of [4.7, 6.2]) {
      const p = roofPoint(a, rr, 0.075);
      const n = roofNormal(a, rr);
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const binormal = new THREE.Vector3().crossVectors(n, tangent).normalize();
      const center = new THREE.Vector3(p[0], p[1], p[2]);
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const t = k / 2;
        const sign = k === 1 ? -1 : 1;
        pts.push([
          center.x + tangent.x * 0.13 * sign + binormal.x * 0.05,
          center.y + 0.1 * t + 0.06,
          center.z + tangent.z * 0.13 * sign + binormal.z * 0.05
        ]);
      }
      addTube(goldParts, [
        pts[0],
        [center.x, center.y + 0.16, center.z],
        pts[2]
      ], 0.009, 12, 4);
      const gem = new THREE.OctahedronGeometry(0.035, 0);
      gem.translate(center.x, center.y + 0.17, center.z);
      // gold bead at the crest instead of a loose crystal: keeps the roof crisp
      goldParts.push(gem);
    }
  }

  // coffered roof panels: pale damask fields framed by the gold ribs and rings
  const roofBands = [[6.9, 5.72], [5.36, 4.02], [3.66, 2.42]];
  for (let i = 0; i < RIBS; i++) {
    const a0 = (i / RIBS) * TAU + 0.013;
    const a1 = ((i + 1) / RIBS) * TAU - 0.013;
    for (const [rOuter, rInner] of roofBands) {
      const outer = (u, v) => {
        const aa = THREE.MathUtils.lerp(a0, a1, u);
        const rr = THREE.MathUtils.lerp(rOuter, rInner, v);
        return roofPoint(aa, rr, 0.035);
      };
      const inner = (u, v) => {
        const aa = THREE.MathUtils.lerp(a0, a1, u);
        const rr = THREE.MathUtils.lerp(rOuter, rInner, v);
        const p = roofPoint(aa, rr, 0.012);
        const n = roofNormal(aa, rr);
        return [p[0] - n.x * 0.018, p[1] - n.y * 0.018, p[2] - n.z * 0.018];
      };
      roofPanelParts.push(buildShell(outer, inner, 6, 4, false));
      // a small gilt and garnet boss at every panel centre
      const ac = (a0 + a1) / 2;
      const rc = (rOuter + rInner) / 2;
      const p = roofPoint(ac, rc, 0.055);
      const n = roofNormal(ac, rc);
      const dummy = new THREE.Object3D();
      dummy.position.set(p[0], p[1], p[2]);
      dummy.up.set(0, 1, 0);
      dummy.lookAt(p[0] + n.x, p[1] + n.y, p[2] + n.z);
      dummy.updateMatrix();
      const bed = new THREE.CircleGeometry(0.075, 16);
      bed.translate(0, 0, 0.001);
      bed.applyMatrix4(dummy.matrix);
      crimsonParts.push(bed);
      const rose = new THREE.TorusGeometry(0.075, 0.013, 5, 18);
      rose.applyMatrix4(dummy.matrix);
      goldParts.push(rose);
      const gem = new THREE.Vector3(0, 0, 0.016).applyMatrix4(dummy.matrix);
      addCrystal(gem.x, gem.y, gem.z, 0.018, 0.055, 0.018, ac);
    }
  }

  // shallow raised cartouches on the roof: ivory faces with gold frames
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + Math.PI / 12;
    for (const [rr, w, h] of [[5.15, 0.44, 0.58], [3.2, 0.34, 0.44]]) {
      const p = roofPoint(a, rr, 0.07);
      const n = roofNormal(a, rr);
      const dummy = new THREE.Object3D();
      dummy.position.set(p[0], p[1], p[2]);
      dummy.up.set(0, 1, 0);
      dummy.lookAt(p[0] + n.x, p[1] + n.y, p[2] + n.z);
      dummy.updateMatrix();
      const frameShape = makeOval(w, h);
      const inset = makeOval(w * 0.7, h * 0.7);
      frameShape.holes.push(inset);
      const frame = extrude(frameShape, 0.034, 0.007);
      frame.applyMatrix4(dummy.matrix);
      goldParts.push(frame);
      const face = extrude(makeOval(w * 0.7, h * 0.7), 0.016, 0.004);
      face.applyMatrix4(dummy.matrix);
      ivoryParts.push(face);
      const gem = new THREE.Vector3(0, 0, 0.068).applyMatrix4(dummy.matrix);
      addCrystal(gem.x, gem.y, gem.z, 0.025, 0.05, 0.025, a);
    }
  }

  // ---------------------------------------------------------------------------
  // carved frieze panels, pilasters and the stepped cornice
  // ---------------------------------------------------------------------------
  const FRIEZE_MID = (FRIEZE_TOP + FRIEZE_BOTTOM) / 2;
  const PANELS = 20;
  const HALF = TAU / PANELS * 0.46;
  for (let i = 0; i < PANELS; i++) {
    const a = i / PANELS * TAU;
    const a0 = a - HALF;
    const a1 = a + HALF;
    const outer = (u, v) => {
      const aa = THREE.MathUtils.lerp(a0, a1, u);
      const yy = THREE.MathUtils.lerp(FRIEZE_TOP, FRIEZE_BOTTOM, v);
      return [Math.cos(aa) * FRIEZE_R, yy, Math.sin(aa) * FRIEZE_R];
    };
    const inner = (u, v) => {
      const aa = THREE.MathUtils.lerp(a0, a1, u);
      const yy = THREE.MathUtils.lerp(FRIEZE_TOP, FRIEZE_BOTTOM, v);
      return [Math.cos(aa) * (FRIEZE_R - 0.05), yy, Math.sin(aa) * (FRIEZE_R - 0.05)];
    };
    friezeParts.push(buildShell(outer, inner, 10, 2, false));

    // real gold edge moulding around each section
    const edgeY = [FRIEZE_TOP - 0.035, FRIEZE_BOTTOM + 0.035];
    for (const yy of edgeY) {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const aa = THREE.MathUtils.lerp(a0 + 0.012, a1 - 0.012, k / 8);
        pts.push([Math.cos(aa) * (FRIEZE_R + 0.018), yy, Math.sin(aa) * (FRIEZE_R + 0.018)]);
      }
      addTube(goldParts, pts, 0.014, 24, 4);
    }
    for (const aa of [a0 + 0.014, a1 - 0.014]) {
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const yy = THREE.MathUtils.lerp(FRIEZE_TOP - 0.03, FRIEZE_BOTTOM + 0.03, k / 4);
        pts.push([Math.cos(aa) * (FRIEZE_R + 0.018), yy, Math.sin(aa) * (FRIEZE_R + 0.018)]);
      }
      addTube(goldParts, pts, 0.012, 18, 4);
    }

    const frame = localFrame(a, FRIEZE_R, FRIEZE_MID, 0.04);
    const outerShape = makeOval(0.8, 0.5);
    const hole = makeOval(0.67, 0.39);
    outerShape.holes.push(hole);
    const goldFrame = extrude(outerShape, 0.036, 0.008);
    goldFrame.applyMatrix4(frame.m);
    goldParts.push(goldFrame);

    // a deep crimson velvet bed sits under a pale cameo, framed by the gold
    const crimsonFrame = localFrame(a, FRIEZE_R, FRIEZE_MID, 0.014);
    const crimsonBack = extrude(makeOval(0.71, 0.44), 0.012, 0.004);
    crimsonBack.applyMatrix4(crimsonFrame.m);
    crimsonParts.push(crimsonBack);

    const faceFrame = localFrame(a, FRIEZE_R, FRIEZE_MID, 0.025);
    const face = extrude(makeOval(0.58, 0.33), 0.016, 0.005);
    face.applyMatrix4(faceFrame.m);
    if (i === 9 || i === 19) mirrorParts.push(face);
    else cameoParts.push(face);
    // a fine illuminated filigree rim around the cameo
    const ovalRim = [];
    for (let k = 0; k <= 26; k++) {
      const aa = k / 26 * TAU;
      const p = new THREE.Vector3(Math.cos(aa) * 0.3, Math.sin(aa) * 0.17, 0.043).applyMatrix4(frame.m);
      ovalRim.push([p.x, p.y, p.z]);
    }
    addTube(lightGoldParts, ovalRim, 0.0045, 36, 4, true);

    const bezel = new THREE.TorusGeometry(0.072, 0.009, 5, 18);
    bezel.translate(0, 0, 0.073);
    bezel.applyMatrix4(frame.m);
    goldParts.push(bezel);
    const gem = new THREE.Vector3(0, 0, 0.081).applyMatrix4(frame.m);
    addCrystal(gem.x, gem.y, gem.z, 0.032, 0.065, 0.032, a);

    const panelTube = (points, radius = 0.008) => {
      const pts = points.map(([x, y, z]) => {
        const v = new THREE.Vector3(x, y, z).applyMatrix4(frame.m);
        return [v.x, v.y, v.z];
      });
      addTube(goldParts, pts, radius, 18, 4);
    };
    // acanthus curls flanking the cameo
    panelTube([
      [-0.2, -0.25, 0.07], [-0.38, -0.11, 0.08], [-0.34, 0.09, 0.08],
      [-0.22, 0.2, 0.065], [-0.16, 0.13, 0.06]
    ], 0.009);
    panelTube([
      [0.2, -0.25, 0.07], [0.38, -0.11, 0.08], [0.34, 0.09, 0.08],
      [0.22, 0.2, 0.065], [0.16, 0.13, 0.06]
    ], 0.009);
    panelTube([
      [-0.09, -0.3, 0.06], [-0.2, -0.18, 0.07], [-0.08, -0.11, 0.06]
    ], 0.007);
    panelTube([
      [0.09, -0.3, 0.06], [0.2, -0.18, 0.07], [0.08, -0.11, 0.06]
    ], 0.007);
    // small fan / shell above the shield
    for (let k = -2; k <= 2; k++) {
      panelTube([
        [0, 0.22, 0.055],
        [k * 0.055, 0.29, 0.055],
        [k * 0.075, 0.33, 0.048]
      ], 0.007);
    }
    // corner rosettes
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const rose = new THREE.TorusGeometry(0.027, 0.006, 4, 12);
        rose.translate(sx * 0.31, sy * 0.18, 0.052);
        rose.applyMatrix4(frame.m);
        goldParts.push(rose);
      }
    }
    // a pointed pendant below the cameo
    const drop = new THREE.Vector3(0, -0.285, 0.065).applyMatrix4(frame.m);
    addCrystal(drop.x, drop.y, drop.z, 0.022, 0.075, 0.022, a);
    addTube(goldParts, [
      new THREE.Vector3(0, -0.25, 0.06).applyMatrix4(frame.m).toArray(),
      new THREE.Vector3(0, -0.29, 0.063).applyMatrix4(frame.m).toArray()
    ], 0.006, 8, 4);
  }

  // a continuous crimson backing wall closes the small structural gaps between
  // the curved frieze sections so no sky or interior light can leak through
  const friezeBacking = new THREE.CylinderGeometry(
    FRIEZE_R - 0.055, FRIEZE_R - 0.055,
    FRIEZE_TOP - FRIEZE_BOTTOM + 0.02, 160, 1, true
  );
  friezeBacking.translate(0, (FRIEZE_TOP + FRIEZE_BOTTOM) / 2, 0);
  crimsonParts.push(friezeBacking);

  // gilded pilasters and their little carved brackets bind the sections
  for (let i = 0; i < PANELS; i++) {
    const a = i / PANELS * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    goldParts.push(cylinderBetween(
      [c * (FRIEZE_R + 0.08), FRIEZE_BOTTOM - 0.03, s * (FRIEZE_R + 0.08)],
      [c * (FRIEZE_R + 0.08), FRIEZE_TOP + 0.045, s * (FRIEZE_R + 0.08)],
      0.031, 0.022, 8
    ));
    for (const yy of [FRIEZE_TOP + 0.02, FRIEZE_BOTTOM - 0.015]) {
      const ring = new THREE.TorusGeometry(0.046, 0.011, 5, 14);
      ring.rotateX(Math.PI / 2);
      ring.translate(c * (FRIEZE_R + 0.08), yy, s * (FRIEZE_R + 0.08));
      goldParts.push(ring);
    }
    // S-scroll bracket towards the eave
    const bracket = [
      [c * (FRIEZE_R + 0.08), FRIEZE_TOP - 0.05, s * (FRIEZE_R + 0.08)],
      [c * (FRIEZE_R + 0.18), FRIEZE_TOP + 0.02, s * (FRIEZE_R + 0.18)],
      [c * (FRIEZE_R + 0.21), FRIEZE_TOP - 0.06, s * (FRIEZE_R + 0.21)],
      [c * (FRIEZE_R + 0.12), FRIEZE_TOP - 0.12, s * (FRIEZE_R + 0.12)]
    ];
    addTube(goldParts, bracket, 0.012, 16, 4);
    const bead = new THREE.SphereGeometry(0.035, 8, 6);
    bead.translate(c * (FRIEZE_R + 0.08), FRIEZE_MID, s * (FRIEZE_R + 0.08));
    goldParts.push(bead);
    const drop = new THREE.Vector3(c * (FRIEZE_R + 0.06), FRIEZE_BOTTOM - 0.1, s * (FRIEZE_R + 0.06));
    addCrystal(drop.x, drop.y, drop.z, 0.018, 0.07, 0.018, a);
  }

  // frieze and cornice light lines
  function ringPoints(radius, y, count = 160) {
    return Array.from({ length: count + 1 }, (_, k) => {
      const a = k / count * TAU;
      return [Math.cos(a) * radius, y, Math.sin(a) * radius];
    });
  }
  addTube(lightGoldParts, ringPoints(FRIEZE_R + 0.035, FRIEZE_TOP - 0.022, 180), 0.007, 240, 4, true);
  addTube(lightCreamParts, ringPoints(FRIEZE_R + 0.035, FRIEZE_BOTTOM + 0.02, 180), 0.006, 240, 4, true);
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    addBulb(c * (FRIEZE_R + 0.06), FRIEZE_TOP - 0.01, s * (FRIEZE_R + 0.06), 0.023, 'eave', c, 0.1, s);
    addBulb(c * (FRIEZE_R + 0.06), FRIEZE_BOTTOM + 0.005, s * (FRIEZE_R + 0.06), 0.022, 'eave', c, -0.15, s);
  }

  // layered eave: a closed lathe cross-section gives a real stepped profile
  const corniceProfile = [
    [7.28, -0.02], [7.93, 0.01], [8.16, 0.08], [8.24, 0.2],
    [8.15, 0.3], [8.02, 0.33], [8.12, 0.43], [8.2, 0.55],
    [8.06, 0.64], [7.7, 0.68], [7.28, 0.62], [7.28, -0.02]
  ];
  const cornice = lathe(corniceProfile, 160);
  cornice.translate(0, 9.3, 0);
  darkParts.push(cornice);
  const upperProfile = [
    [7.1, -0.02], [7.6, 0.01], [7.78, 0.07], [7.8, 0.15],
    [7.66, 0.22], [7.36, 0.25], [7.1, 0.18], [7.1, -0.02]
  ];
  const upperCornice = lathe(upperProfile, 160);
  upperCornice.translate(0, 9.76, 0);
  darkParts.push(upperCornice);

  for (const [rr, yy, tubeRadius] of [
    [8.23, 9.5, 0.022], [8.11, 9.8, 0.016], [7.69, 10.0, 0.018], [7.3, 9.61, 0.013]
  ]) {
    addTube(goldParts, ringPoints(rr, yy, 180), tubeRadius, 240, 5, true);
  }
  addTube(lightGoldParts, ringPoints(8.21, 9.53, 180), 0.008, 240, 4, true);
  addTube(lightCreamParts, ringPoints(8.07, 9.83, 180), 0.007, 240, 4, true);
  addTube(lightCreamParts, ringPoints(7.73, 9.96, 180), 0.006, 240, 4, true);

  // classical dentil blocks under the heavy cornice, moved to the visible face
  for (let i = 0; i < 80; i++) {
    const a = i / 80 * TAU;
    const block = new THREE.BoxGeometry(0.064, 0.09, 0.16);
    block.rotateY(-a + Math.PI / 2);
    block.translate(Math.cos(a) * 8.215, 9.36, Math.sin(a) * 8.215);
    goldParts.push(block);
  }
  // bead row along the outer lip and below the upper torus
  for (const [yy, rr, count, size] of [[9.485, 8.21, 80, 0.038], [9.86, 8.08, 72, 0.028]]) {
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU;
      const bead = new THREE.SphereGeometry(size, 8, 6);
      bead.translate(Math.cos(a) * rr, yy, Math.sin(a) * rr);
      goldParts.push(bead);
    }
  }
  // large oval medallions break up the broad cornice face
  for (let i = 0; i < PANELS; i++) {
    const a = i / PANELS * TAU;
    const frame = localFrame(a, 8.205, 9.635, 0.0);
    const rim = new THREE.TorusGeometry(0.16, 0.018, 6, 28);
    rim.scale(1, 1.3, 1);
    rim.applyMatrix4(frame.m);
    goldParts.push(rim);
    const plate = new THREE.CircleGeometry(0.135, 24);
    plate.scale(1, 1.3, 1);
    plate.translate(0, 0, 0.008);
    plate.applyMatrix4(frame.m);
    if (i % 4 === 0) mirrorParts.push(plate);
    else ivoryParts.push(plate);
    // a small gold centre knot and ruby bead
    const knot = new THREE.SphereGeometry(0.042, 8, 6);
    const p = new THREE.Vector3(0, 0, 0.03).applyMatrix4(frame.m);
    knot.translate(p.x, p.y, p.z);
    goldParts.push(knot);
    addCrystal(p.x, p.y, p.z + 0.0, 0.016, 0.055, 0.016, a);
    // acanthus volutes sweeping either side of the medallion
    for (const sign of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const t = k / 7;
        const x = sign * (0.2 + t * 0.24);
        const y = -0.04 - Math.sin(t * Math.PI) * 0.12 + t * 0.05;
        const z = 0.008;
        pts.push(new THREE.Vector3(x, y, z).applyMatrix4(frame.m).toArray());
      }
      addTube(goldParts, pts, 0.01, 16, 4);
      const curl = [];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        const ang = t * Math.PI * 1.4;
        const rr = 0.06 * t;
        curl.push(new THREE.Vector3(sign * (0.43 + Math.cos(ang) * rr), -0.04 + Math.sin(ang) * rr, 0.01).applyMatrix4(frame.m).toArray());
      }
      addTube(goldParts, curl, 0.007, 10, 4);
    }
    // a tiny hanging pearl below each medallion
    const drop = new THREE.Vector3(0, -0.26, 0.02).applyMatrix4(frame.m);
    addCrystal(drop.x, drop.y, drop.z, 0.012, 0.075, 0.012, a);
  }
  // a broad carved band of smaller gilt bosses above the medallions
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU + Math.PI / 40;
    const frame = localFrame(a, 8.16, 9.78, 0.0);
    const boss = new THREE.TorusGeometry(0.048, 0.01, 5, 14);
    boss.applyMatrix4(frame.m);
    goldParts.push(boss);
    const centre = new THREE.SphereGeometry(0.024, 7, 5);
    const p = new THREE.Vector3(0, 0, 0.006).applyMatrix4(frame.m);
    centre.translate(p.x, p.y, p.z);
    goldParts.push(centre);
  }
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    addBulb(c * 8.24, 9.4, s * 8.24, 0.034, 'eave', c, -0.25, s);
    addBulb(c * 7.72, 9.97, s * 7.72, 0.028, 'eave', c * 0.4, 1, s * 0.4);
    if (i % 2 === 0) addBulb(c * 8.235, 9.88, s * 8.235, 0.03, 'eave', c, 0.4, s);
  }

  // ---------------------------------------------------------------------------
  // draped valance, skirt and long velvet banners
  // ---------------------------------------------------------------------------
  const SKIRT_TOP = FRIEZE_BOTTOM + 0.015;
  const SKIRT_R = 7.66;

  function addClothPanel({ center, width, topY, radius, drop, sag, folds, foldAmp, thickness, array, trim = true, tassel = false }) {
    const a0 = center - width / 2;
    const a1 = center + width / 2;
    const bottomAt = (u) => {
      const a = THREE.MathUtils.lerp(a0, a1, u);
      return topY - drop - sag * Math.sin(Math.PI * u) - 0.035 * Math.sin(a * 17 + 0.8);
    };
    const outerPoint = (u, v) => {
      const a = THREE.MathUtils.lerp(a0, a1, u);
      const y = THREE.MathUtils.lerp(topY, bottomAt(u), v);
      const r = radius + foldAmp * Math.sin(u * Math.PI * 2 * folds + 0.5) * (0.25 + 0.75 * v);
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const innerPoint = (u, v) => {
      const a = THREE.MathUtils.lerp(a0, a1, u);
      const y = THREE.MathUtils.lerp(topY, bottomAt(u), v);
      const r = radius + foldAmp * Math.sin(u * Math.PI * 2 * folds + 0.5) * (0.25 + 0.75 * v) - thickness;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    array.push(buildShell(outerPoint, innerPoint, 16, 7, false));
    if (trim) {
      const top = [];
      const bottom = [];
      for (let k = 0; k <= 20; k++) {
        const p0 = outerPoint(k / 20, 0);
        const p1 = outerPoint(k / 20, 1);
        top.push(p0);
        bottom.push(p1);
      }
      addTube(goldParts, top, 0.007, 34, 4);
      addTube(goldParts, bottom, 0.009, 34, 4);
      // vertical seam threads catch the folds
      for (const u of [0.08, 0.92]) {
        const pts = [];
        for (let k = 0; k <= 4; k++) pts.push(outerPoint(u, k / 4));
        addTube(goldParts, pts, 0.005, 12, 4);
      }
    }
    if (tassel) {
      const p = outerPoint(0.5, 1);
      addTassel(p[0], p[1] - 0.02, p[2], center, 1);
    }
  }

  function addTassel(x, y, z, a, scale = 1) {
    const cap = new THREE.SphereGeometry(0.045 * scale, 8, 6);
    cap.translate(x, y, z);
    goldParts.push(cap);
    const ring = new THREE.TorusGeometry(0.046 * scale, 0.009 * scale, 5, 12);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, y - 0.035 * scale, z);
    goldParts.push(ring);
    const body = new THREE.CylinderGeometry(0.017 * scale, 0.06 * scale, 0.14 * scale, 8, 1, false);
    body.translate(x, y - 0.11 * scale, z);
    goldParts.push(body);
    // three tiny tassel threads
    for (let k = 0; k < 3; k++) {
      const aa = a + (k - 1) * 0.018;
      const px = x + Math.cos(aa) * 0.018;
      const pz = z + Math.sin(aa) * 0.018;
      goldParts.push(cylinderBetween([px, y - 0.17 * scale, pz], [px, y - 0.29 * scale, pz], 0.006 * scale, 0.003 * scale, 5));
    }
    addCrystal(x, y - 0.33 * scale, z, 0.025 * scale, 0.085 * scale, 0.025 * scale, a);
  }

  function addVerticalChain(theta, topY, length, crystals = 3) {
    const c = Math.cos(theta), s = Math.sin(theta);
    const radius = 7.71;
    const pts = [
      [c * radius, topY, s * radius],
      [c * (radius + 0.012), topY - length * 0.45, s * (radius + 0.012)],
      [c * radius, topY - length, s * radius]
    ];
    addTube(goldParts, pts, 0.005, 14, 4);
    for (let k = 0; k < crystals; k++) {
      const t = (k + 1) / (crystals + 1);
      const y = topY - length * t;
      const xx = c * (radius + 0.006);
      const zz = s * (radius + 0.006);
      addCrystal(xx, y, zz, 0.018, 0.06, 0.018, theta);
      const bead = new THREE.SphereGeometry(0.018, 6, 5);
      bead.translate(xx, y + 0.035, zz);
      goldParts.push(bead);
    }
  }

  // continuous inner skirt, made as a closed double-sided shell with deep folds
  const skirtSegments = 480;
  const skirtOuter = (u, v) => {
    const a = u * TAU;
    const bottom = SKIRT_TOP - 0.62 - 0.08 * Math.cos(a * 20) - 0.035 * Math.sin(a * 40);
    const y = THREE.MathUtils.lerp(SKIRT_TOP, bottom, v);
    const r = SKIRT_R + 0.075 * Math.sin(a * 60) * (0.2 + 0.8 * v);
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  const skirtInner = (u, v) => {
    const a = u * TAU;
    const bottom = SKIRT_TOP - 0.62 - 0.08 * Math.cos(a * 20) - 0.035 * Math.sin(a * 40);
    const y = THREE.MathUtils.lerp(SKIRT_TOP, bottom, v);
    const r = SKIRT_R + 0.075 * Math.sin(a * 60) * (0.2 + 0.8 * v) - 0.035;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  clothDarkParts.push(buildShell(skirtOuter, skirtInner, skirtSegments, 7, true));
  addTube(goldParts, Array.from({ length: 241 }, (_, k) => skirtOuter(k / 240, 1)), 0.008, 320, 4, true);
  addTube(goldParts, Array.from({ length: 241 }, (_, k) => skirtOuter(k / 240, 0)), 0.007, 320, 4, true);
  for (let i = 0; i < 20; i++) {
    const u = i / 20;
    const a = u * TAU;
    const pts = [];
    for (let k = 0; k <= 5; k++) pts.push(skirtOuter(u, k / 5));
    addTube(goldParts, pts, 0.006, 16, 4);
    // slim tassels at the low points of the scallops
    const low = skirtOuter((i + 0.5) / 20, 1);
    addTassel(low[0], low[1] - 0.015, low[2], a + Math.PI / 20, 0.8);
  }
  // fine metal fringe along the hem, at a regular architectural interval
  for (let i = 0; i < 80; i++) {
    const u = (i + 0.5) / 80;
    const p = skirtOuter(u, 1);
    const cone = new THREE.ConeGeometry(0.012, 0.09, 5, 1);
    cone.translate(p[0], p[1] - 0.045, p[2]);
    goldParts.push(cone);
  }

  // twenty short scalloped over-panels
  for (let i = 0; i < 20; i++) {
    addClothPanel({
      center: i / 20 * TAU,
      width: TAU / 20 * 0.77,
      topY: SKIRT_TOP + 0.02,
      radius: 7.94,
      drop: 0.27,
      sag: 0.17,
      folds: 5,
      foldAmp: 0.055,
      thickness: 0.026,
      array: clothParts,
      trim: true,
      tassel: true
    });
  }
  // ten longer wine-velvet banners, alternating around the rim
  for (let i = 0; i < 10; i++) {
    addClothPanel({
      center: i / 10 * TAU + Math.PI / 10,
      width: TAU / 10 * 0.68,
      topY: SKIRT_TOP + 0.005,
      radius: 7.82,
      drop: 0.62,
      sag: 0.24,
      folds: 7,
      foldAmp: 0.08,
      thickness: 0.034,
      array: clothParts,
      trim: true,
      tassel: true
    });
  }
  // vertical crystal chains alternate with the banners
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) continue;
    addVerticalChain(i / 20 * TAU + Math.PI / 20, SKIRT_TOP - 0.01, 0.38 + (i % 4) * 0.035, 2);
  }

  // type A: twenty swags of small lamps hanging below the eave
  for (let i = 0; i < 20; i++) {
    const a0 = i / 20 * TAU + 0.035;
    const a1 = (i + 1) / 20 * TAU - 0.035;
    const radius = 8.1;
    const sag = 0.34 + (i % 3) * 0.028;
    const pts = [];
    for (let k = 0; k <= 22; k++) {
      const t = k / 22;
      const a = THREE.MathUtils.lerp(a0, a1, t);
      const y = 8.98 - Math.sin(Math.PI * t) * sag;
      pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    }
    addTube(goldParts, pts, 0.005, 28, 4);
    for (const t of [0.16, 0.32, 0.5, 0.68, 0.84]) {
      const a = THREE.MathUtils.lerp(a0, a1, t);
      const y = 8.98 - Math.sin(Math.PI * t) * sag;
      addBulb(Math.cos(a) * radius, y - 0.015, Math.sin(a) * radius, 0.025, 'eave', 0, -1, 0);
    }
    const am = (a0 + a1) / 2;
    const ym = 8.98 - sag;
    addCrystal(Math.cos(am) * radius, ym - 0.075, Math.sin(am) * radius, 0.025, 0.11, 0.025, am);
    addTassel(Math.cos(am) * radius, ym - 0.02, Math.sin(am) * radius, am, 0.58);
  }

  // ---------------------------------------------------------------------------
  // coffered inner ceiling, radial light beams and chandeliers
  // ---------------------------------------------------------------------------
  const ceilingProfile = [
    [7.23, 9.34], [6.6, 9.33], [5.3, 9.29], [4.0, 9.24],
    [2.7, 9.18], [1.45, 9.11], [0.65, 9.07], [0.0, 9.05]
  ];
  const ceilingYAt = (r) => {
    for (let i = 0; i < ceilingProfile.length - 1; i++) {
      const [r0, y0] = ceilingProfile[i];
      const [r1, y1] = ceilingProfile[i + 1];
      if (r <= r0 && r >= r1) {
        const t = r0 === r1 ? 0 : (r0 - r) / (r0 - r1);
        return y0 + (y1 - y0) * t;
      }
    }
    return 9.05;
  };
  const ceiling = new THREE.Mesh(lathe(ceilingProfile, 160), ceilingMaterial);
  ceiling.receiveShadow = true;
  ceiling.renderOrder = -1;
  ceiling.userData.noAO = true;
  group.add(ceiling);

  // central carved boss, not a flat hole
  const bossProfile = [
    [0.0, 9.04], [0.32, 9.05], [0.62, 9.0], [0.74, 8.93],
    [0.62, 8.88], [0.34, 8.86], [0.0, 8.87]
  ];
  const boss = new THREE.Mesh(lathe(bossProfile, 96), gold);
  boss.castShadow = true;
  group.add(boss);
  const bossDark = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.035, 6, 90), darkMetal);
  bossDark.rotation.x = Math.PI / 2;
  bossDark.position.y = 8.9;
  group.add(bossDark);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
    const bead = new THREE.SphereGeometry(0.035, 7, 5);
    bead.translate(x, 8.86, z);
    goldParts.push(bead);
    addCrystal(x, 8.81, z, 0.018, 0.075, 0.018, a);
  }
  addBulb(0, 8.82, 0, 0.055, 'interior', 0, -1, 0);
  const ceilingFill = new THREE.PointLight(warmWhite, 20, 16, 2);
  ceilingFill.position.set(0, 8.78, 0);
  ceilingFill.castShadow = false;
  group.add(ceilingFill);

  const CEIL_RINGS = [1.1, 2.3, 3.5, 4.7, 5.9, 7.08];
  for (const [ri, rr] of CEIL_RINGS.entries()) {
    const yy = ceilingYAt(rr) - 0.035;
    const darkRing = new THREE.TorusGeometry(rr, 0.022, 6, 150);
    darkRing.rotateX(Math.PI / 2);
    darkRing.translate(0, yy + 0.018, 0);
    darkParts.push(darkRing);
    const goldRing = new THREE.TorusGeometry(rr, 0.038, 6, 150);
    goldRing.rotateX(Math.PI / 2);
    goldRing.translate(0, yy - 0.018, 0);
    goldParts.push(goldRing);
    addTube(lightCreamParts, ringPoints(rr, yy - 0.052, 160), 0.009, 220, 4, true);
    const count = [18, 26, 34, 42, 50, 58][ri];
    for (let k = 0; k < count; k++) {
      const a = k / count * TAU + ri * 0.04;
      const x = Math.cos(a) * (rr + 0.016);
      const z = Math.sin(a) * (rr + 0.016);
      addBulb(x, yy - 0.04, z, 0.031 + (k % 3) * 0.003, 'interior', 0, -1, 0);
    }
    // gilt rosettes at the ring/radial-beam intersections
    for (let i = 0; i < RIBS; i++) {
      const a = i / RIBS * TAU;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const rose = new THREE.TorusGeometry(0.045, 0.009, 4, 12);
      rose.rotateX(Math.PI / 2);
      rose.translate(x, yy - 0.025, z);
      goldParts.push(rose);
    }
  }

  // 24 radial beams with actual glowing inlays
  for (let i = 0; i < RIBS; i++) {
    const a = i / RIBS * TAU + Math.PI / RIBS;
    const pts = [];
    const lightPts = [];
    for (let k = 0; k <= 16; k++) {
      const r = 0.66 + (7.1 - 0.66) * k / 16;
      const y = ceilingYAt(r) - 0.045;
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      lightPts.push([Math.cos(a) * r, y - 0.034, Math.sin(a) * r]);
    }
    addTube(goldParts, pts, 0.042, 32, 5);
    addTube(darkParts, pts.map(([x, y, z]) => [x, y - 0.014, z]), 0.026, 32, 5);
    addTube(lightGoldParts, lightPts, 0.01, 38, 4);
    for (const rr of [1.8, 3.3, 4.8, 6.25]) {
      const y = ceilingYAt(rr) - 0.085;
      addBulb(Math.cos(a) * rr, y, Math.sin(a) * rr, 0.031, 'interior', 0, -1, 0);
    }
    // curled outer bracket
    const outer = [
      [Math.cos(a) * 6.96, ceilingYAt(6.96) - 0.08, Math.sin(a) * 6.96],
      [Math.cos(a) * 7.08, ceilingYAt(7.08) - 0.16, Math.sin(a) * 7.08],
      [Math.cos(a) * 7.14, ceilingYAt(7.14) - 0.28, Math.sin(a) * 7.14]
    ];
    addTube(goldParts, outer, 0.013, 12, 4);
  }

  // mirrored cartouches between the beams
  for (let i = 0; i < 24; i++) {
    const a = (i + 0.5) / 24 * TAU;
    for (const [rr, radius] of [[2.8, 0.2], [4.9, 0.29]]) {
      const yy = ceilingYAt(rr) - 0.055;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      // a dark crimson bed makes the pale medallion read from a distance
      const bed = new THREE.CircleGeometry(radius + 0.035, 24);
      bed.rotateX(Math.PI / 2);
      bed.translate(x, yy + 0.006, z);
      crimsonParts.push(bed);
      const c = new THREE.CircleGeometry(radius, 24);
      c.rotateX(Math.PI / 2);
      c.translate(x, yy - 0.004, z);
      if (i % 6 === 0) mirrorParts.push(c); else ivoryParts.push(c);
      const ring = new THREE.TorusGeometry(radius + 0.027, 0.018, 5, 24);
      ring.rotateX(Math.PI / 2);
      ring.translate(x, yy - 0.006, z);
      goldParts.push(ring);
      const inner = new THREE.TorusGeometry(radius * 0.55, 0.008, 4, 18);
      inner.rotateX(Math.PI / 2);
      inner.translate(x, yy - 0.012, z);
      goldParts.push(inner);
      addCrystal(x, yy - 0.045, z, 0.022, 0.075, 0.022, a);
      // eight small gold studs at the compass points
      for (let k = 0; k < 8; k++) {
        const aa = k / 8 * TAU;
        const stud = new THREE.SphereGeometry(0.017, 6, 5);
        stud.translate(x + Math.cos(aa) * (radius + 0.055), yy - 0.018, z + Math.sin(aa) * (radius + 0.055));
        goldParts.push(stud);
      }
    }
  }

  // type B: short light swags between the ceiling beams
  for (let i = 0; i < 16; i++) {
    const a0 = i / 16 * TAU + 0.04;
    const a1 = (i + 1) / 16 * TAU - 0.04;
    const radius = 4.4;
    const baseY = ceilingYAt(radius) - 0.15;
    const pts = [];
    for (let k = 0; k <= 18; k++) {
      const t = k / 18;
      const a = THREE.MathUtils.lerp(a0, a1, t);
      const y = baseY - Math.sin(Math.PI * t) * 0.24;
      pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    }
    addTube(goldParts, pts, 0.005, 24, 4);
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const a = THREE.MathUtils.lerp(a0, a1, t);
      const y = baseY - Math.sin(Math.PI * t) * 0.24;
      addBulb(Math.cos(a) * radius, y - 0.012, Math.sin(a) * radius, 0.021, 'interior', 0, -1, 0);
    }
    const am = (a0 + a1) / 2;
    addCrystal(Math.cos(am) * radius, baseY - 0.28, Math.sin(am) * radius, 0.021, 0.08, 0.021, am);
  }

  // type C: three tiers of crystal chains below the ceiling
  for (const [rr, count, baseLen] of [[2.2, 16, 0.3], [4.1, 24, 0.4], [6.35, 32, 0.48]]) {
    const yTop = ceilingYAt(rr) - 0.06;
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + rr * 0.23;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const len = baseLen + (i % 5) * 0.045;
      const pts = [
        [x, yTop, z],
        [x + Math.cos(a) * 0.008, yTop - len * 0.5, z + Math.sin(a) * 0.008],
        [x, yTop - len, z]
      ];
      addTube(goldParts, pts, 0.0045, 12, 4);
      for (let k = 0; k < 3; k++) {
        const t = (k + 1) / 4;
        const y = yTop - len * t;
        addCrystal(x, y, z, 0.018, 0.06, 0.018, a);
        const bead = new THREE.SphereGeometry(0.014, 6, 5);
        bead.translate(x, y + 0.03, z);
        goldParts.push(bead);
      }
      if (i % 4 === 0) addBulb(x, yTop - 0.01, z, 0.022, 'interior', 0, -1, 0);
    }
  }

  // central ring chandelier, wrapped around the existing column rather than a central chain
  const chandY = 8.35;
  const chandR = 1.44;
  const chandRings = [
    [chandR, chandY, 0.048], [1.1, chandY - 0.4, 0.036], [0.95, chandY - 0.62, 0.028]
  ];
  for (const [ri, [rr, yy, tubeR]] of chandRings.entries()) {
    const ring = new THREE.TorusGeometry(rr, tubeR, 7, 84);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, yy, 0);
    goldParts.push(ring);
    // a shallow dark channelling above each gold ring, never hiding it from below
    const under = new THREE.TorusGeometry(rr + 0.012, tubeR * 0.52, 5, 84);
    under.rotateX(Math.PI / 2);
    under.translate(0, yy + 0.045, 0);
    darkParts.push(under);
    addTube(lightCreamParts, ringPoints(rr, yy - 0.045, 90), 0.009, 120, 4, true);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU + ri * 0.1;
      const bead = new THREE.SphereGeometry(0.024, 6, 5);
      bead.translate(Math.cos(a) * (rr + 0.005), yy - 0.012, Math.sin(a) * (rr + 0.005));
      goldParts.push(bead);
    }
  }
  // four suspension chains from the ceiling to the chandelier ring
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + Math.PI / 4;
    const topR = 1.1;
    const pts = [
      [Math.cos(a) * topR, ceilingYAt(topR) - 0.03, Math.sin(a) * topR],
      [Math.cos(a) * 1.22, 8.9, Math.sin(a) * 1.22],
      [Math.cos(a) * chandR, chandY + 0.02, Math.sin(a) * chandR]
    ];
    addTube(goldParts, pts, 0.007, 18, 4);
  }
  // twelve candle arms, curving inwards above the ring
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const pts = [
      [Math.cos(a) * chandR, chandY + 0.02, Math.sin(a) * chandR],
      [Math.cos(a) * (chandR + 0.08), chandY + 0.18, Math.sin(a) * (chandR + 0.08)],
      [Math.cos(a) * 1.16, chandY + 0.28, Math.sin(a) * 1.16]
    ];
    addTube(goldParts, pts, 0.013, 16, 4);
    const bx = Math.cos(a) * 1.16, bz = Math.sin(a) * 1.16;
    const cup = new THREE.CylinderGeometry(0.045, 0.07, 0.05, 7);
    cup.translate(bx, chandY + 0.3, bz);
    goldParts.push(cup);
    addBulb(bx, chandY + 0.36, bz, 0.036, 'interior', 0, 1, 0);
    const drop = new THREE.Vector3(Math.cos(a) * (chandR + 0.02), chandY - 0.12, Math.sin(a) * (chandR + 0.02));
    addCrystal(drop.x, drop.y, drop.z, 0.027, 0.16, 0.027, a);
  }
  // a second, lower tier of eight arms reads clearly from beneath
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    const pts = [
      [Math.cos(a) * 1.02, chandY - 0.4, Math.sin(a) * 1.02],
      [Math.cos(a) * 1.24, chandY - 0.25, Math.sin(a) * 1.24],
      [Math.cos(a) * 1.36, chandY - 0.19, Math.sin(a) * 1.36]
    ];
    addTube(goldParts, pts, 0.013, 16, 4);
    const bx = Math.cos(a) * 1.36, bz = Math.sin(a) * 1.36;
    const cup = new THREE.CylinderGeometry(0.045, 0.07, 0.05, 7);
    cup.translate(bx, chandY - 0.17, bz);
    goldParts.push(cup);
    addBulb(bx, chandY - 0.11, bz, 0.035, 'interior', 0, 1, 0);
    addCrystal(bx, chandY - 0.8, bz, 0.024, 0.19, 0.024, a);
  }
  // a circlet of lamps and crystals under the upper ring
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + Math.PI / 16;
    addBulb(Math.cos(a) * (chandR - 0.08), chandY - 0.06, Math.sin(a) * (chandR - 0.08), 0.027, 'interior', 0, -1, 0);
  }
  // graceful lower ring and central crystal drops
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    const pts = [
      [Math.cos(a) * 1.02, chandY - 0.4, Math.sin(a) * 1.02],
      [Math.cos(a) * 1.14, chandY - 0.54, Math.sin(a) * 1.14],
      [Math.cos(a) * 0.95, chandY - 0.72, Math.sin(a) * 0.95]
    ];
    addTube(goldParts, pts, 0.008, 14, 4);
    addCrystal(Math.cos(a) * 0.95, chandY - 0.83, Math.sin(a) * 0.95, 0.022, 0.12, 0.022, a);
  }
  // a low jeweled fringe outside the central column
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    addTube(goldParts, [
      [Math.cos(a) * 0.95, chandY - 0.62, Math.sin(a) * 0.95],
      [Math.cos(a) * 1.01, chandY - 0.76, Math.sin(a) * 1.01],
      [Math.cos(a) * 1.05, chandY - 0.9, Math.sin(a) * 1.05]
    ], 0.008, 12, 4);
    addCrystal(Math.cos(a) * 1.05, chandY - 1.0, Math.sin(a) * 1.05, 0.022, 0.12, 0.022, a);
  }

  // four small crown chandeliers around the center
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + Math.PI / 4;
    const rr = 4.15;
    const top = ceilingYAt(rr) - 0.04;
    const ringY = top - 0.78;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    addTube(goldParts, [[x, top, z], [x, top - 0.16, z], [x, ringY, z]], 0.006, 14, 4);
    const ring = new THREE.TorusGeometry(0.38, 0.024, 5, 32);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, ringY, z);
    goldParts.push(ring);
    const crownRing = new THREE.TorusGeometry(0.39, 0.011, 4, 32);
    crownRing.rotateX(Math.PI / 2);
    crownRing.translate(x, ringY + 0.045, z);
    goldParts.push(crownRing);
    for (let k = 0; k < 8; k++) {
      const aa = k / 8 * TAU;
      const px = x + Math.cos(aa) * 0.38;
      const pz = z + Math.sin(aa) * 0.38;
      addTube(goldParts, [[x + Math.cos(aa) * 0.13, ringY, z + Math.sin(aa) * 0.13], [px, ringY + 0.07, pz]], 0.007, 10, 4);
      addBulb(px, ringY + 0.13, pz, 0.031, 'interior', 0, 1, 0);
      addCrystal(px, ringY - 0.18, pz, 0.023, 0.15, 0.023, aa);
    }
    const finial = new THREE.SphereGeometry(0.055, 8, 6);
    finial.translate(x, ringY - 0.18, z);
    goldParts.push(finial);
  }

  // ---------------------------------------------------------------------------
  // imperial crown above the dome
  // ---------------------------------------------------------------------------
  const crown = new THREE.Group();
  crown.name = 'imperial-crown';
  crown.position.y = CROWN_BASE;
  group.add(crown);
  const crownGoldParts = [];
  const crownDarkParts = [];
  const crownLightCream = [];
  const crownLightGold = [];

  const crownGold = (geo) => { crownGoldParts.push(geo); return geo; };
  const crownLight = (arr, points, radius) => addTube(arr, points, radius, 28, 4, false);

  // support scrolls rise from the roof apex to the lower crown ring
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const b = a + TAU / 24;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const rr = THREE.MathUtils.lerp(0.62, 1.77, t);
      const yy = THREE.MathUtils.lerp(0.02, 0.64, t) + Math.sin(Math.PI * t) * 0.13;
      const aa = THREE.MathUtils.lerp(a, b, t * 0.35);
      pts.push([Math.cos(aa) * rr, yy, Math.sin(aa) * rr]);
    }
    addTube(crownGoldParts, pts, 0.016, 20, 5);
    addTube(crownGoldParts, pts.map(([x, y, z]) => [x, y + 0.016, z]), 0.006, 20, 4);
  }

  // stepped crown drum at the apex
  const crownDrumProfile = [
    [0.03, 0], [0.56, 0.01], [0.78, 0.06], [0.88, 0.14],
    [0.82, 0.23], [0.62, 0.3], [0.52, 0.42], [0.62, 0.53],
    [0.48, 0.62], [0.27, 0.66], [0.1, 0.7]
  ];
  const crownDrum = lathe(crownDrumProfile, 96);
  crownGold(crownDrum);
  const crownDrumDark = new THREE.TorusGeometry(0.54, 0.045, 6, 64);
  crownDrumDark.rotateX(Math.PI / 2);
  crownDrumDark.translate(0, 0.36, 0);
  crownDarkParts.push(crownDrumDark);

  // lower tiara ring and its foot ornaments
  const lowerRingY = 0.66;
  const lowerRingR = 1.78;
  const lowerDark = new THREE.TorusGeometry(lowerRingR, 0.075, 7, 112);
  lowerDark.rotateX(Math.PI / 2);
  lowerDark.translate(0, lowerRingY - 0.03, 0);
  crownDarkParts.push(lowerDark);
  const lowerGold = new THREE.TorusGeometry(lowerRingR, 0.038, 8, 112);
  lowerGold.rotateX(Math.PI / 2);
  lowerGold.translate(0, lowerRingY + 0.025, 0);
  crownGold(lowerGold);
  crownLight(crownLightGold, ringPoints(lowerRingR, lowerRingY + 0.06, 180), 0.007);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const x = Math.cos(a) * lowerRingR, z = Math.sin(a) * lowerRingR;
    const bead = new THREE.SphereGeometry(0.055, 8, 6);
    bead.translate(x, lowerRingY + 0.055, z);
    crownGoldParts.push(bead);
    addBulb(x, lowerRingY + 0.095 + CROWN_BASE, z, 0.032, 'crown', Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4);
    // twelve crystal drops from the tiara
    const cap = new THREE.SphereGeometry(0.03, 7, 5);
    cap.translate(x, lowerRingY - 0.08, z);
    crownGoldParts.push(cap);
    addCrystal(x, lowerRingY - 0.18 + CROWN_BASE, z, 0.022, 0.11, 0.022, a);
  }

  // twelve upright crown points silhouette the tiara against the sky
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const base = [Math.cos(a) * 1.82, 0.68, Math.sin(a) * 1.82];
    const tip = [Math.cos(a) * 1.58, 1.43, Math.sin(a) * 1.58];
    const stemPts = [
      base,
      [Math.cos(a + 0.025) * 1.8, 0.88, Math.sin(a + 0.025) * 1.8],
      [Math.cos(a + 0.05) * 1.72, 1.1, Math.sin(a + 0.05) * 1.72],
      [Math.cos(a + 0.06) * 1.62, 1.3, Math.sin(a + 0.06) * 1.62],
      tip
    ];
    crownGoldParts.push(taperedTube(stemPts, 0.026, 0.006, 22, 5));
    // a tiny gilded leaf pair at the root
    for (const sign of [-1, 1]) {
      const lpts = [
        [Math.cos(a) * 1.79, 0.72, Math.sin(a) * 1.79],
        [Math.cos(a + sign * 0.035) * 1.93, 0.86, Math.sin(a + sign * 0.035) * 1.93],
        [Math.cos(a + sign * 0.02) * 1.92, 1.0, Math.sin(a + sign * 0.02) * 1.92]
      ];
      addTube(crownGoldParts, lpts, 0.011, 12, 4);
    }
    // fleur-de-lis finial and a hanging crystal
    const tipX = tip[0], tipY = tip[1], tipZ = tip[2];
    addTube(crownGoldParts, [
      [tipX, tipY, tipZ],
      [tipX, tipY + 0.1, tipZ],
      [tipX, tipY + 0.17, tipZ]
    ], 0.009, 10, 4);
    for (const sign of [-1, 1]) {
      const a2 = a + sign * 0.09;
      addTube(crownGoldParts, [
        [tipX, tipY + 0.03, tipZ],
        [Math.cos(a2) * 1.62, tipY + 0.1, Math.sin(a2) * 1.62],
        [Math.cos(a2) * 1.57, tipY + 0.16, Math.sin(a2) * 1.57]
      ], 0.007, 10, 4);
    }
    const finial = new THREE.CylinderGeometry(0.045, 0.008, 0.24, 7);
    finial.translate(tipX, tipY + 0.19, tipZ);
    crownGoldParts.push(finial);
    const finialCollar = new THREE.TorusGeometry(0.05, 0.01, 4, 12);
    finialCollar.rotateX(Math.PI / 2);
    finialCollar.translate(tipX, tipY + 0.08, tipZ);
    crownGoldParts.push(finialCollar);
    addCrystal(tipX, tipY + 0.33 + CROWN_BASE, tipZ, 0.02, 0.075, 0.02, a);
    addBulb(tipX, tipY + 0.05 + CROWN_BASE, tipZ, 0.027, 'crown', Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5);
    addCrystal(Math.cos(a) * 1.78, 0.53 + CROWN_BASE, Math.sin(a) * 1.78, 0.021, 0.12, 0.021, a);
  }

  // pointed Gothic arches around the central spire
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const apexR = 0.43;
    for (const side of [-1, 1]) {
      const aa = a + side * 0.105;
      const pts = [
        [Math.cos(aa) * 1.72, 0.73, Math.sin(aa) * 1.72],
        [Math.cos(aa - side * 0.05) * 1.57, 0.98, Math.sin(aa - side * 0.05) * 1.57],
        [Math.cos(aa - side * 0.08) * 1.16, 1.23, Math.sin(aa - side * 0.08) * 1.16],
        [Math.cos(a) * apexR, 1.46, Math.sin(a) * apexR]
      ];
      addTube(crownGoldParts, pts, 0.012, 24, 5);
    }
    crownGoldParts.push(cylinderBetween(
      [Math.cos(a) * 0.27, 1.43, Math.sin(a) * 0.27],
      [Math.cos(a) * 0.33, 1.52, Math.sin(a) * 0.33],
      0.024, 0.006, 6
    ));
    addBulb(Math.cos(a) * 0.34, 1.545 + CROWN_BASE, Math.sin(a) * 0.34, 0.026, 'crown', Math.cos(a), 0.8, Math.sin(a));
  }

  // middle and upper rings, each with its own light line
  for (const [rr, yy, count] of [[1.28, 1.17, 16], [0.82, 1.62, 12]]) {
    const dark = new THREE.TorusGeometry(rr, 0.045, 6, 84);
    dark.rotateX(Math.PI / 2);
    dark.translate(0, yy - 0.02, 0);
    crownDarkParts.push(dark);
    const ring = new THREE.TorusGeometry(rr, 0.024, 6, 84);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, yy + 0.02, 0);
    crownGold(ring);
    crownLight(crownLightCream, ringPoints(rr, yy + 0.04, 120), 0.006);
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + 0.04;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      addBulb(x, yy + 0.075 + CROWN_BASE, z, 0.024, 'crown', Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4);
      const bead = new THREE.SphereGeometry(0.026, 6, 5);
      bead.translate(x, yy + 0.02, z);
      crownGoldParts.push(bead);
    }
  }

  // central mast, collars and a warm crystal core
  const mastProfile = [
    [0.07, 0.12], [0.18, 0.24], [0.26, 0.36], [0.19, 0.48],
    [0.16, 0.66], [0.22, 0.82], [0.17, 1.0], [0.25, 1.16],
    [0.18, 1.34], [0.22, 1.52], [0.14, 1.7], [0.1, 1.9], [0.035, 2.03]
  ];
  const mast = lathe(mastProfile, 64);
  crownGold(mast);
  for (const yy of [0.38, 0.68, 0.98, 1.27, 1.56]) {
    const collar = new THREE.TorusGeometry(0.22, 0.018, 5, 32);
    collar.rotateX(Math.PI / 2);
    collar.translate(0, yy, 0);
    crownGold(collar);
  }
  const crownCoreGeo = new THREE.OctahedronGeometry(0.27, 0);
  crownCoreGeo.scale(0.82, 2.15, 0.82);
  const crownCore = new THREE.Mesh(crownCoreGeo, crystalColumn);
  crownCore.position.y = 1.58;
  crownCore.renderOrder = 5;
  crown.add(crownCore);
  const crownGlow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), lanternCore);
  crownGlow.position.y = 1.58;
  crownGlow.renderOrder = 6;
  crown.add(crownGlow);

  // a second outer halo and a tilted inner halo for the crown silhouette
  for (const [rr, yy, tilt, lightArr] of [
    [1.5, 1.0, 0.05, crownLightGold], [0.98, 1.38, -0.05, crownLightCream]
  ]) {
    const ringGeo = new THREE.TorusGeometry(rr, 0.019, 5, 100);
    ringGeo.rotateX(Math.PI / 2 + tilt);
    ringGeo.translate(0, yy, 0);
    crownGold(ringGeo);
    const pts = [];
    for (let k = 0; k <= 120; k++) {
      const a = k / 120 * TAU;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const y = yy + Math.sin(a) * Math.sin(tilt) * rr * 0.5;
      pts.push([x, y + 0.012, z]);
    }
    addTube(lightArr, pts, 0.005, 150, 4, true);
  }

  // eight sweeping scroll arms with crystal tips
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const rr = 1.78 + Math.sin(Math.PI * t) * 0.22;
      const yy = 0.66 + t * 0.34;
      const aa = a + t * 0.25;
      pts.push([Math.cos(aa) * rr, yy, Math.sin(aa) * rr]);
    }
    addTube(crownGoldParts, pts, 0.011, 20, 4);
    const tip = pts[pts.length - 1];
    addCrystal(tip[0], tip[1] - 0.03 + CROWN_BASE, tip[2], 0.024, 0.12, 0.024, a);
    const bead = new THREE.SphereGeometry(0.035, 7, 5);
    bead.translate(tip[0], tip[1], tip[2]);
    crownGoldParts.push(bead);
  }

  // faceted crystal orb, gold claws and a star-crowned spire
  const orbCollar = lathe([
    [0.1, 0], [0.27, 0.015], [0.32, 0.06], [0.28, 0.11],
    [0.19, 0.15], [0.14, 0.2], [0.09, 0.24]
  ], 64);
  orbCollar.translate(0, 1.78, 0);
  crownGold(orbCollar);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    const pts = [
      [Math.cos(a) * 0.23, 1.86, Math.sin(a) * 0.23],
      [Math.cos(a) * 0.29, 1.94, Math.sin(a) * 0.29],
      [Math.cos(a) * 0.21, 2.03, Math.sin(a) * 0.21]
    ];
    addTube(crownGoldParts, pts, 0.011, 12, 4);
  }
  const crownOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.215, 1), crystalGold);
  crownOrb.position.y = 1.96;
  crownOrb.renderOrder = 5;
  crown.add(crownOrb);
  const orbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 10), lanternCore);
  orbGlow.position.y = 1.96;
  orbGlow.renderOrder = 6;
  crown.add(orbGlow);
  const topCrystal = new THREE.OctahedronGeometry(0.14, 0);
  topCrystal.scale(0.58, 1.7, 0.58);
  topCrystal.translate(0, 2.18, 0);
  const topCrystalMesh = new THREE.Mesh(topCrystal, crystalGold);
  topCrystalMesh.renderOrder = 5;
  crown.add(topCrystalMesh);
  addBulb(0, 2.06 + CROWN_BASE, 0, 0.036, 'crown', 0, 1, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    const pts = [
      [0, 2.05, 0],
      [Math.cos(a) * 0.18, 2.13, Math.sin(a) * 0.18],
      [Math.cos(a) * 0.27, 2.24, Math.sin(a) * 0.27]
    ];
    addTube(crownGoldParts, pts, 0.008, 10, 4);
    addBulb(Math.cos(a) * 0.19, 2.12 + CROWN_BASE, Math.sin(a) * 0.19, 0.022, 'crown', Math.cos(a), 0.4, Math.sin(a));
  }
  addBulb(0, 2.22 + CROWN_BASE, 0, 0.04, 'crown', 0, 1, 0);

  // small glowing finial inside the crown
  const finialLight = new THREE.PointLight(warmWhite, 7, 8, 2);
  finialLight.position.set(0, 1.7, 0);
  crown.add(finialLight);

  // ---------------------------------------------------------------------------
  // merge static geometry and build the instanced lamps
  // ---------------------------------------------------------------------------
  function addStatic(parts, material, name, { cast = false, receive = false, noAO = false, parent = group } = {}) {
    if (!parts.length) return null;
    const geo = merge(parts);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (noAO) mesh.userData.noAO = true;
    parent.add(mesh);
    return mesh;
  }

  const roofMesh = roof;
  const goldMesh = addStatic(goldParts, canopyGoldMaterial, 'canopy-gold', { cast: false, receive: true });
  const darkMesh = addStatic(darkParts, darkMetal, 'canopy-dark-structure', { cast: true, receive: true });
  const friezeMesh = addStatic(friezeParts, friezeMaterial, 'frieze-panels', { cast: true, receive: true });
  const roofPanelMesh = addStatic(roofPanelParts, roofPanelMaterial, 'coffered-roof-panels', { cast: false, receive: true });
  // Draw the cream coffers before the surrounding dark shell. The shell
  // fragments behind them are then depth-rejected instead of over-shading
  // the largest area of the roof twice.
  if (roofPanelMesh) roofPanelMesh.renderOrder = -1;
  const crimsonInlayMesh = addStatic(crimsonParts, crimsonMaterial, 'crimson-panel-inlays', { cast: false, receive: true });
  const mirrorMesh = addStatic(mirrorParts, mirrorMaterial, 'mirror-inlays', { receive: true });
  const ivoryMesh = addStatic(ivoryParts, ivoryMaterial, 'ivory-cameos', { receive: true });
  const cameoMesh = addStatic(cameoParts, cameoMaterial, 'backlit-cameos', { receive: true });
  const clothMesh = addStatic(clothParts, velvetMaterial, 'wine-velvet-drapes', { cast: true, receive: true });
  const clothDarkMesh = addStatic(clothDarkParts, velvetDarkMaterial, 'under-skirt', { cast: true, receive: true });
  // The under-skirt sits behind the outer swags and banners; drawing it after
  // them lets the depth buffer reject the hidden fabric.
  if (clothMesh) clothMesh.renderOrder = 0;
  if (clothDarkMesh) clothDarkMesh.renderOrder = 1;
  const lightCreamMesh = addStatic(lightCreamParts, champagneFilament, 'cream-light-bands', { noAO: true });
  const lightGoldMesh = addStatic(lightGoldParts, goldFilament, 'gold-light-bands', { noAO: true });
  const ceilingBoss = boss;
  ceilingBoss.castShadow = true;

  // crown is kept as its own group so a future animation can move it without
  // changing the rest of the canopy.
  const crownGoldMesh = addStatic(crownGoldParts, canopyGoldMaterial, 'crown-gold', { cast: false, receive: true, parent: crown });
  const crownDarkMesh = addStatic(crownDarkParts, darkMetal, 'crown-dark-structure', { cast: true, receive: true, parent: crown });
  const crownCreamMesh = addStatic(crownLightCream, champagneFilament, 'crown-cream-lights', { noAO: true, parent: crown });
  const crownGoldLightMesh = addStatic(crownLightGold, goldFilament, 'crown-gold-lights', { noAO: true, parent: crown });

  // lamps: one InstancedMesh per phase group, equal-scale sockets in a single mesh
  const bulbSpecs = {
    crown: { intensity: 2.3, speed: 0.35, phase: 0.2, color: 0xffd9a2 },
    eave: { intensity: 2.05, speed: 0.44, phase: 1.6, color: 0xffca85 },
    dome: { intensity: 1.85, speed: 0.52, phase: 2.7, color: 0xffcf92 },
    interior: { intensity: 2.0, speed: 0.48, phase: 4.0, color: 0xffd0a0 }
  };
  const bulbGeometry = new THREE.SphereGeometry(1, 7, 5);
  const bulbMaterials = [];
  let bulbCount = 0;
  for (const [bucket, spec] of Object.entries(bulbSpecs)) {
    const entries = bulbBuckets[bucket];
    if (!entries.length) continue;
    const baseColor = new THREE.Color(spec.color).multiplyScalar(spec.intensity);
    const mat = new THREE.MeshBasicMaterial({ color: baseColor.clone(), toneMapped: false });
    const mesh = new THREE.InstancedMesh(bulbGeometry, mat, entries.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < entries.length; i++) {
      const b = entries[i];
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.size, b.size * 1.16, b.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.noAO = true;
    mesh.frustumCulled = true;
    group.add(mesh);
    bulbMaterials.push({ mat, baseColor, speed: spec.speed, phase: spec.phase });
    bulbCount += entries.length;
  }
  // shared gold sockets for every lamp
  const allBulbs = Object.values(bulbBuckets).flat();
  if (allBulbs.length) {
    const socketGeo = new THREE.CylinderGeometry(0.58, 0.86, 0.72, 5, 1, false);
    const socketMesh = new THREE.InstancedMesh(socketGeo, gold, allBulbs.length);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3();
    for (let i = 0; i < allBulbs.length; i++) {
      const b = allBulbs[i];
      normal.set(b.nx, b.ny, b.nz);
      if (normal.lengthSq() < 0.0001) normal.copy(up);
      normal.normalize();
      dummy.position.set(
        b.x - normal.x * b.size * 0.88,
        b.y - normal.y * b.size * 0.88,
        b.z - normal.z * b.size * 0.88
      );
      dummy.quaternion.setFromUnitVectors(up, normal);
      dummy.scale.set(b.size * 1.12, b.size * 0.72, b.size * 1.12);
      dummy.updateMatrix();
      socketMesh.setMatrixAt(i, dummy.matrix);
    }
    socketMesh.instanceMatrix.needsUpdate = true;
    socketMesh.castShadow = false;
    socketMesh.receiveShadow = false;
    socketMesh.userData.noAO = true;
    group.add(socketMesh);
  }

  // cut-crystal drops: one instanced physical mesh, no dozens of draw calls
  if (crystalPositions.length) {
    const gemGeo = new THREE.OctahedronGeometry(1, 0);
    const gemMesh = new THREE.InstancedMesh(gemGeo, crystalBeadMaterial, crystalPositions.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < crystalPositions.length; i++) {
      const c = crystalPositions[i];
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.ry, 0);
      dummy.scale.set(c.sx, c.sy, c.sz);
      dummy.updateMatrix();
      gemMesh.setMatrixAt(i, dummy.matrix);
    }
    gemMesh.instanceMatrix.needsUpdate = true;
    gemMesh.renderOrder = 3;
    gemMesh.castShadow = false;
    gemMesh.receiveShadow = false;
    gemMesh.userData.noAO = true;
    group.add(gemMesh);
  }

  // central chandelier light. It lives just inside the existing glass column,
  // as before, and is the only extra local light besides the crown.
  const chandLight = new THREE.PointLight(warmWhite, 36, 12, 2);
  chandLight.position.set(0, 7.8, 0);
  chandLight.castShadow = false;
  group.add(chandLight);

  function update(t, dt) {
    for (const bulb of bulbMaterials) {
      const pulse = 0.94 + 0.06 * Math.sin(t * bulb.speed + bulb.phase);
      bulb.mat.color.copy(bulb.baseColor).multiplyScalar(pulse);
    }
    chandLight.intensity = 36 + Math.sin(t * 0.47 + 1.2) * 1.8;
    finialLight.intensity = 7 + Math.sin(t * 0.59) * 0.6;
    ceilingFill.intensity = 20 + Math.sin(t * 0.33 + 0.6) * 0.8;
    crownCore.rotation.y = t * 0.1;
    const coreScale = 1 + Math.sin(t * 0.7) * 0.018;
    crownCore.scale.set(0.82 * coreScale, 2.15 * coreScale, 0.82 * coreScale);
    crownGlow.scale.setScalar(0.92 + Math.sin(t * 0.9 + 1.3) * 0.05);
    orbGlow.scale.setScalar(0.9 + Math.sin(t * 0.82 + 0.4) * 0.06);
  }

  return {
    group,
    update,
    counts: {
      bulbs: bulbCount,
      crystals: crystalPositions.length,
      panels: PANELS,
      ribs: RIBS,
      roofRings: RINGS.length,
      ceilingRings: CEIL_RINGS.length,
      outerSwags: 20,
      innerSwags: 16,
      crystalChains: 16 + 24 + 32
    }
  };
}
