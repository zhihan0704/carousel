import * as THREE from 'three';
import {
  TAU, mulberry32, makeCanvasTexture, lathe, tube, cylinderBetween, merge
} from './lib.js';
import { createHorseAssets } from './horse-model.js';
import { createOrnateCanopy } from './ornate-canopy.js';

const DECK_Y = 1.08;
const CANOPY_Y = 9.42;
const CANOPY_RADIUS = 7.62;
const CHAMPAGNE = 0xc6a477;
const IVORY = 0xe9dcc5;
const ROSE = 0xb77e91;
const BRONZE = 0x49352e;
const WARM_WHITE = 0xfff0d6;

function goldTrimMaterial(envMap) {
  return new THREE.MeshPhysicalMaterial({
    color: CHAMPAGNE,
    metalness: 0.92,
    roughness: 0.29,
    clearcoat: 0.6,
    clearcoatRoughness: 0.22,
    envMap,
    envMapIntensity: 1.2
  });
}

function darkMetalMaterial(envMap) {
  return new THREE.MeshPhysicalMaterial({
    color: BRONZE,
    metalness: 0.8,
    roughness: 0.36,
    clearcoat: 0.7,
    clearcoatRoughness: 0.28,
    envMap,
    envMapIntensity: 0.9
  });
}

function filamentMaterial(hex, intensity) {
  const color = new THREE.Color(hex).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}

function makeCrystalMaterial(commonTime, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: commonTime,
      uColorA: { value: new THREE.Color(opts.colorA ?? CHAMPAGNE) },
      uColorB: { value: new THREE.Color(opts.colorB ?? IVORY) },
      uGlow: { value: new THREE.Color(opts.glow ?? WARM_WHITE) },
      uOpacity: { value: opts.opacity ?? 0.22 },
      uBrightness: { value: opts.brightness ?? 1.0 }
    },
    vertexShader: `
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mv = viewMatrix * world;
        vDepth = -mv.z;
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uGlow;
      uniform float uOpacity;
      uniform float uBrightness;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vWorld;
      varying float vDepth;

      void main() {
        vec3 N = normalize(vNormalV);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fres = pow(1.0 - ndv, 1.8);

        float flow = sin(vWorld.y * 1.65 + sin(vWorld.x * 2.1 + uTime * 0.28) * 1.5 - uTime * 0.38);
        float irid = smoothstep(-0.85, 0.9, flow);

        vec3 col = mix(uColorA, uColorB, fres * 0.9);
        // The custom glass shades in linear sRGB before the final display transform.
        vec3 L = normalize(vec3(0.25, 0.85, 0.55));
        col *= 0.55 + max(dot(N, L), 0.0) * 0.45;
        col += mix(uColorB, uGlow, 0.4) * fres * (0.08 + irid * 0.06);

        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 64.0);
        float spec2 = pow(max(dot(N, normalize(vec3(-0.7, 0.2, 0.6))), 0.0), 22.0);
        col += uGlow * spec * 0.43;
        col += uColorB * spec2 * 0.075;

        float facet = smoothstep(0.6, 1.0, sin(vWorld.y * 23.0 + vWorld.x * 16.0 + vWorld.z * 11.0 + uTime * 0.45) * 0.5 + 0.5);
        col += uGlow * facet * 0.014;

        float breathe = 0.985 + 0.015 * sin(uTime * 0.55 + vWorld.y * 1.25);
        float alpha = min(uOpacity + fres * 0.3, 0.87) * (gl_FrontFacing ? 1.0 : 0.42);
        float distanceFade = smoothstep(0.2, 1.8, vDepth);
        alpha *= distanceFade;
        gl_FragColor = vec4(col * uBrightness * breathe, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function makeBaseBandTexture() {
  return makeCanvasTexture(2048, 320, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2b211e');
    bg.addColorStop(0.24, '#49352e');
    bg.addColorStop(0.5, '#332722');
    bg.addColorStop(0.76, '#3b2b27');
    bg.addColorStop(1, '#201919');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    const topGlow = ctx.createLinearGradient(0, 0, 0, 14);
    topGlow.addColorStop(0, 'rgba(233,220,197,.28)');
    topGlow.addColorStop(1, 'rgba(233,220,197,0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = 'rgba(198,164,119,.18)';
    ctx.fillRect(0, h - 10, w, 3);
    ctx.globalCompositeOperation = 'source-over';

    const panel = w / 16;
    for (let i = 0; i < 16; i++) {
      const cx = panel * (i + 0.5);
      ctx.save();
      ctx.translate(cx, h / 2);

      // an engraved niche
      ctx.strokeStyle = 'rgba(198,164,119,.48)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-panel * 0.38, -h * 0.3);
      ctx.lineTo(-panel * 0.24, -h * 0.12);
      ctx.lineTo(-panel * 0.3, h * 0.26);
      ctx.moveTo(panel * 0.38, -h * 0.3);
      ctx.lineTo(panel * 0.24, -h * 0.12);
      ctx.lineTo(panel * 0.3, h * 0.26);
      ctx.stroke();

      // pair of swept acanthus curls
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.strokeStyle = 'rgba(198,164,119,.62)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.1);
        ctx.bezierCurveTo(panel * 0.1, h * 0.08, panel * 0.22, h * 0.17, panel * 0.17, h * 0.26);
        ctx.bezierCurveTo(panel * 0.12, h * 0.34, -panel * 0.015, h * 0.25, panel * 0.075, h * 0.17);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(233,220,197,.34)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(panel * 0.018, h * 0.12);
        ctx.bezierCurveTo(panel * 0.15, h * 0.05, panel * 0.26, h * 0.2, panel * 0.13, h * 0.27);
        ctx.stroke();
        ctx.restore();
      }

      // central jewel and rays
      ctx.fillStyle = 'rgba(198,164,119,.22)';
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.13, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(198,164,119,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.1, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(183,126,145,.72)';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU;
        const r = k % 2 ? h * 0.025 : h * 0.07;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(233,220,197,.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fill();

      // tiny pearl border points
      for (let k = 0; k < 8; k++) {
        const y = -h * 0.33 + k * h * 0.094;
        for (const side of [-1, 1]) {
          ctx.fillStyle = `rgba(233,220,197,${0.18 + (k % 2) * 0.12})`;
          ctx.beginPath();
          ctx.arc(side * panel * 0.43, y, 1.6, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // border filigree
    ctx.strokeStyle = 'rgba(198,164,119,.5)';
    ctx.lineWidth = 1.4;
    for (let y of [h * 0.08, h * 0.92]) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin(x / 32) * 3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }, { repeatX: 1, repeatY: 1, wrapS: THREE.RepeatWrapping });
}

function makeDeckTexture() {
  return makeCanvasTexture(1536, 1536, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.5);
    bg.addColorStop(0, '#685447');
    bg.addColorStop(0.36, '#494039');
    bg.addColorStop(0.78, '#352d2b');
    bg.addColorStop(1, '#2b2323');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.24);
    core.addColorStop(0, 'rgba(233,220,197,.28)');
    core.addColorStop(0.55, 'rgba(198,164,119,.08)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    ctx.translate(cx, cy);

    // broad inlaid rings
    for (const [r, alpha, line] of [
      [0.19, 0.7, 4], [0.205, 0.3, 1.4], [0.32, 0.55, 2.2], [0.52, 0.4, 2],
      [0.68, 0.8, 3], [0.705, 0.35, 1.4], [0.805, 0.5, 2.4], [0.91, 0.6, 3.2]
    ]) {
      ctx.strokeStyle = `rgba(198,164,119,${alpha})`;
      ctx.lineWidth = line;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.5 * r, 0, TAU);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(233,220,197,.16)';
    ctx.lineWidth = 1.2;
    for (let a = 0; a < 48; a++) {
      const angle = a / 48 * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * w * 0.21, Math.sin(angle) * w * 0.21);
      ctx.lineTo(Math.cos(angle) * w * 0.31, Math.sin(angle) * w * 0.31);
      ctx.stroke();
    }

    // long radial sunburst inlay
    for (let a = 0; a < 24; a++) {
      const angle = a / 24 * TAU + Math.PI / 48;
      ctx.save();
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(w * 0.22, 0, w * 0.46, 0);
      grad.addColorStop(0, 'rgba(198,164,119,.15)');
      grad.addColorStop(0.55, 'rgba(198,164,119,.05)');
      grad.addColorStop(1, 'rgba(198,164,119,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(w * 0.215, -w * 0.002);
      ctx.lineTo(w * 0.455, -w * 0.012);
      ctx.lineTo(w * 0.455, w * 0.012);
      ctx.lineTo(w * 0.215, w * 0.002);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // twelve zodiac-like star medallions
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TAU + Math.PI / 12;
      const r = w * 0.415;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.strokeStyle = 'rgba(198,164,119,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.03, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(233,220,197,.46)';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU;
        const rr = k % 2 ? w * 0.005 : w * 0.021;
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // center rosette under the column
    ctx.strokeStyle = 'rgba(233,220,197,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU;
      const rr = w * (0.135 + 0.009 * Math.sin(a * 12));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(198,164,119,.22)';
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,220,197,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.105, 0, TAU);
    ctx.stroke();
  }, { repeatX: 1, repeatY: 1, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
}

function buildPoleGeometry(positions) {
  const gold = [];
  const neon = [];
  const beads = [];
  for (const { x, z, gap, sleeves } of positions) {
    const [gapStart, gapEnd] = gap;
    for (const [from, to] of [[1.11, gapStart], [gapEnd, CANOPY_Y + 0.05]]) {
      gold.push(cylinderBetween([x, from, z], [x, to, z], 0.047, 0.047, 10));
    }
    // foot and capital
    const foot = lathe([[0, 0], [0.18, 0.01], [0.19, 0.055], [0.12, 0.1], [0.1, 0.14], [0, 0.14]], 20);
    foot.translate(x, 1.09, z);
    gold.push(foot);
    const cap = new THREE.SphereGeometry(0.1, 12, 8);
    cap.scale(1, 0.65, 1);
    cap.translate(x, CANOPY_Y - 0.06, z);
    gold.push(cap);
    // collars
    for (const yy of [2.3, 4.1, 6.0, 7.8]) {
      const ring = new THREE.TorusGeometry(0.075, 0.018, 6, 16);
      ring.rotateX(Math.PI / 2);
      ring.translate(x, yy, z);
      gold.push(ring);
    }
    // Keep the original spiral's pitch on both sides of the concealed break.
    const helixStart = 1.25;
    const helixHeight = 7.78;
    for (const [from, to] of [[helixStart, gapStart], [gapEnd, helixStart + helixHeight]]) {
      const fraction = (to - from) / helixHeight;
      const segments = Math.ceil(fraction * 160);
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const y = THREE.MathUtils.lerp(from, to, i / segments);
        const a = (y - helixStart) / helixHeight * TAU * 5.5;
        const distance = Math.min(Math.abs(y - sleeves[0]), Math.abs(y - sleeves[1]));
        // Bring the filament closer to the shaft while it passes through a moving sleeve.
        const radius = THREE.MathUtils.lerp(0.050, 0.082, THREE.MathUtils.smoothstep(distance, 0.27, 0.46));
        pts.push([x + Math.cos(a) * radius, y, z + Math.sin(a) * radius]);
      }
      neon.push(tube(pts, 0.012, Math.ceil(fraction * 180), 5));
    }
    // tiny glass beads at the collars
    for (const yy of [2.3, 4.1, 6.0, 7.8]) {
      const bead = new THREE.OctahedronGeometry(0.035, 0);
      bead.scale(1, 1.6, 1);
      bead.translate(x + 0.09, yy, z);
      beads.push(bead);
    }
  }
  return { gold: merge(gold), neon: merge(neon), beads: merge(beads) };
}

export function createCarousel({ envMap }) {
  const group = new THREE.Group();
  group.name = 'carouselStaticRoot';

  const commonTime = { value: 0 };
  const crystalGold = makeCrystalMaterial(commonTime, {
    colorA: CHAMPAGNE, colorB: IVORY, opacity: 0.19, brightness: 0.83
  });
  const crystalRose = makeCrystalMaterial(commonTime, {
    colorA: ROSE, colorB: IVORY, opacity: 0.14, brightness: 0.8
  });
  const crystalColumn = makeCrystalMaterial(commonTime, {
    colorA: 0x8d7567, colorB: IVORY, opacity: 0.14, brightness: 0.87
  });
  const crystalLantern = makeCrystalMaterial(commonTime, {
    colorA: 0xa58c78, colorB: IVORY, opacity: 0.07, brightness: 0.9
  });
  const gold = goldTrimMaterial(envMap);
  const darkMetal = darkMetalMaterial(envMap);
  const poleGold = gold.clone();
  poleGold.roughness = 0.26;
  poleGold.envMapIntensity = 1.4;
  const champagneFilament = filamentMaterial(0xffe4ba, 1.2);
  const ivoryFilament = filamentMaterial(IVORY, 1.15);
  const goldFilament = filamentMaterial(WARM_WHITE, 1.52);
  const poleFilament = filamentMaterial(0xffe9c7, 1.14);
  const pearlBeads = filamentMaterial(IVORY, 1.1);
  const filaments = [
    { material: champagneFilament, speed: 0.68, phase: 0.4 },
    { material: ivoryFilament, speed: 0.54, phase: 2.1 },
    { material: goldFilament, speed: 0.61, phase: 3.4 },
    { material: poleFilament, speed: 0.51, phase: 1.0 },
    { material: pearlBeads, speed: 0.58, phase: 5.0 }
  ];
  for (const light of filaments) light.baseColor = light.material.color.clone();
  const lanternCore = filamentMaterial(WARM_WHITE, 2.72);
  // ---------- the plinth ----------
  const plinth = new THREE.Group();
  group.add(plinth);

  const baseProfile = [
    [0, 0], [5.85, 0], [6.3, 0.012], [6.84, 0.03], [7.16, 0.1],
    [7.31, 0.21], [7.28, 0.35], [7.18, 0.42], [7.22, 0.5],
    [7.14, 0.58], [6.99, 0.66], [6.96, 0.83], [7.0, 0.94], [6.9, 1.02], [6.82, 1.08]
  ];
  const base = new THREE.Mesh(lathe(baseProfile, 160), darkMetal);
  base.castShadow = true;
  base.receiveShadow = true;
  plinth.add(base);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(7.205, 7.205, 0.29, 160, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: makeBaseBandTexture(), metalness: 0.55, roughness: 0.42,
      clearcoat: 0.45, clearcoatRoughness: 0.4,
      envMap, envMapIntensity: 0.95,
      emissive: 0x231b1a, emissiveIntensity: 0.12
    })
  );
  band.position.y = 0.48;
  band.castShadow = true;
  band.receiveShadow = true;
  plinth.add(band);

  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(6.82, 160),
    new THREE.MeshPhysicalMaterial({
      map: makeDeckTexture(), color: 0xd2c5b9,
      metalness: 0.56, roughness: 0.43,
      clearcoat: 0.62, clearcoatRoughness: 0.29,
      envMap, envMapIntensity: 1.05
    })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = DECK_Y;
  deck.receiveShadow = true;
  plinth.add(deck);

  const deckRim = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.96, 0.13, 160, 1, true), gold);
  deckRim.position.y = DECK_Y - 0.06;
  deckRim.castShadow = true;
  deckRim.receiveShadow = true;
  plinth.add(deckRim);

  const trims = [
    { r: 7.18, y: 0.37, tube: 0.026, mat: gold },
    { r: 7.19, y: 0.62, tube: 0.018, mat: gold },
    { r: 6.97, y: 0.99, tube: 0.035, mat: gold },
    { r: 6.89, y: 1.045, tube: 0.016, mat: goldFilament },
    { r: 7.235, y: 0.22, tube: 0.012, mat: champagneFilament }
  ];
  for (const t of trims) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(t.r, t.tube, 8, 200), t.mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = t.y;
    ring.castShadow = true;
    ring.receiveShadow = true;
    plinth.add(ring);
  }

  // tiny gilt rosettes mounted on the outer band
  const rosetteGeo = [];
  const gemGeo = [];
  const rosetteCount = 32;
  for (let i = 0; i < rosetteCount; i++) {
    const a = i / rosetteCount * TAU;
    const t = new THREE.TorusGeometry(0.13, 0.02, 6, 22);
    t.rotateY(Math.PI / 2 - a);
    t.translate(Math.cos(a) * 7.25, 0.48, Math.sin(a) * 7.25);
    rosetteGeo.push(t);
    const g = new THREE.OctahedronGeometry(0.04, 0);
    g.scale(0.7, 1.6, 0.7);
    g.rotateY(Math.PI / 2 - a);
    g.translate(Math.cos(a) * 7.27, 0.48, Math.sin(a) * 7.27);
    gemGeo.push(g);
  }
  plinth.add(new THREE.Mesh(merge(rosetteGeo), gold));
  const bandGems = new THREE.Mesh(merge(gemGeo), champagneFilament);
  plinth.add(bandGems);

  // a warm pool beneath the carousel, painted with additive light
  const poolTexture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
    g.addColorStop(0, 'rgba(198,164,119,.12)');
    g.addColorStop(0.25, 'rgba(198,164,119,.085)');
    g.addColorStop(0.58, 'rgba(118,91,120,.03)');
    g.addColorStop(0.8, 'rgba(233,220,197,.025)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (const [rr, alpha, color] of [[0.53, 0.16, '198,164,119'], [0.545, 0.075, '233,220,197'], [0.61, 0.065, '198,164,119']]) {
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, w * rr, 0, TAU);
      ctx.stroke();
    }
  }, { noColor: false, wrapS: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(12.5, 128),
    new THREE.MeshBasicMaterial({
      map: poolTexture, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.012;
  pool.renderOrder = 2;
  pool.userData.noAO = true;
  group.add(pool);

  // ---------- central column ----------
  const column = new THREE.Group();
  group.add(column);

  const pedestalProfile = [
    [0, 0], [1.16, 0], [1.32, 0.03], [1.38, 0.1], [1.33, 0.19],
    [1.18, 0.27], [1.2, 0.4], [1.08, 0.52], [0.91, 0.62], [0.89, 0.86],
    [1.02, 0.92], [0.97, 1.03], [0.72, 1.1], [0, 1.1]
  ];
  const pedestal = new THREE.Mesh(lathe(pedestalProfile, 96), darkMetal);
  pedestal.position.y = DECK_Y;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  column.add(pedestal);

  for (const [r, y, t] of [[1.22, DECK_Y + 0.28, 0.035], [0.92, DECK_Y + 0.84, 0.025], [0.74, DECK_Y + 1.04, 0.02]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 96), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    column.add(ring);
  }
  const pedestalNeon = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.012, 6, 100), champagneFilament);
  pedestalNeon.rotation.x = Math.PI / 2;
  pedestalNeon.position.y = DECK_Y + 0.68;
  column.add(pedestalNeon);

  // crystal waist
  const columnCrystal = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 3.85, 12, 6, false), crystalColumn);
  columnCrystal.position.y = DECK_Y + 3.0;
  columnCrystal.castShadow = true;
  columnCrystal.renderOrder = 3;
  column.add(columnCrystal);

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.16, 3.5, 8, 4),
    lanternCore
  );
  core.position.y = DECK_Y + 2.95;
  column.add(core);

  const coreFlare = new THREE.PointLight(WARM_WHITE, 15, 10, 2);
  coreFlare.position.y = DECK_Y + 3.2;
  column.add(coreFlare);

  // gilded ribbons wind around the glass
  for (const [phase, colorMat, radius] of [[0, gold, 0.78], [Math.PI, gold, 0.78], [Math.PI / 2, ivoryFilament, 0.88]]) {
    const pts = [];
    for (let i = 0; i <= 150; i++) {
      const t = i / 150;
      const a = phase + t * TAU * 1.65;
      const r = radius + Math.sin(t * Math.PI) * 0.1;
      pts.push([Math.cos(a) * r, DECK_Y + 1.8 + t * 4.2, Math.sin(a) * r]);
    }
    const ribbon = new THREE.Mesh(tube(pts, colorMat === gold ? 0.035 : 0.015, 180, 6), colorMat);
    if (colorMat === gold) {
      ribbon.castShadow = true;
    }
    column.add(ribbon);
  }

  // gold capital between glass and upper flutes
  const collar = new THREE.Mesh(lathe([
    [0.25, 0], [0.78, 0.03], [0.94, 0.14], [0.98, 0.32], [0.83, 0.48],
    [0.98, 0.58], [0.86, 0.7], [0.75, 0.8], [0.25, 0.86]
  ], 96), gold);
  collar.position.y = DECK_Y + 4.78;
  collar.castShadow = true;
  collar.receiveShadow = true;
  column.add(collar);

  const fluted = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 3.25, 16, 3, false), darkMetal);
  fluted.position.y = DECK_Y + 6.55;
  fluted.castShadow = true;
  fluted.receiveShadow = true;
  column.add(fluted);

  const fluteGeos = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    const r = 0.86;
    fluteGeos.push(cylinderBetween(
      [Math.cos(a) * r, DECK_Y + 4.95, Math.sin(a) * r],
      [Math.cos(a) * (r - 0.12), DECK_Y + 8.1, Math.sin(a) * (r - 0.12)],
      0.018, 0.013, 6
    ));
  }
  const flutes = new THREE.Mesh(merge(fluteGeos), gold);
  flutes.castShadow = true;
  column.add(flutes);

  for (const [y, r, mat, t] of [
    [DECK_Y + 4.95, 0.92, gold, 0.04], [DECK_Y + 5.9, 0.83, gold, 0.022],
    [DECK_Y + 6.8, 0.79, gold, 0.018], [DECK_Y + 7.55, 0.76, gold, 0.022],
    [DECK_Y + 8.1, 0.72, gold, 0.045],
    [DECK_Y + 8.22, 0.78, champagneFilament, 0.012], [DECK_Y + 4.88, 0.97, goldFilament, 0.008]
  ]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 100), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    column.add(ring);
  }

  // luminous crystal channels recessed into the upper fluted shaft
  const channelGeos = [];
  const channelNeon = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    const r = 0.82;
    const channel = new THREE.CylinderGeometry(0.04, 0.055, 2.7, 5);
    channel.translate(Math.cos(a) * r, DECK_Y + 6.55, Math.sin(a) * r);
    channelGeos.push(channel);
    const line = cylinderBetween(
      [Math.cos(a) * 0.98, DECK_Y + 5.18, Math.sin(a) * 0.98],
      [Math.cos(a) * 0.76, DECK_Y + 8.0, Math.sin(a) * 0.76],
      0.008, 0.006, 4
    );
    channelNeon.push(line);
  }
  const crystalChannels = new THREE.Mesh(merge(channelGeos), crystalColumn);
  crystalChannels.renderOrder = 4;
  column.add(crystalChannels);
  const channelLines = new THREE.Mesh(merge(channelNeon), goldFilament);
  column.add(channelLines);

  // a translucent crystal sheath around the whole upper shaft
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.8, 2.85, 24, 3, true), crystalLantern);
  sleeve.position.y = DECK_Y + 6.55;
  sleeve.renderOrder = 4;
  column.add(sleeve);

  // sweeping brackets hold the canopy
  const bracketGeos = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + Math.PI / 8;
    const pts = [
      [Math.cos(a) * 0.7, DECK_Y + 8.0, Math.sin(a) * 0.7],
      [Math.cos(a) * 1.25, DECK_Y + 8.75, Math.sin(a) * 1.25],
      [Math.cos(a) * 2.05, DECK_Y + 9.65, Math.sin(a) * 2.05]
    ];
    bracketGeos.push(tube(pts, 0.032, 24, 5));
  }
  const brackets = new THREE.Mesh(merge(bracketGeos), gold);
  brackets.castShadow = true;
  column.add(brackets);

  // ---------- ornate Belle Epoque canopy ----------
  const ornateCanopy = createOrnateCanopy({
    envMap,
    gold,
    darkMetal,
    champagneFilament,
    goldFilament,
    crystalGold,
    crystalColumn,
    lanternCore,
    warmWhite: WARM_WHITE,
    canopyY: CANOPY_Y,
    canopyRadius: CANOPY_RADIUS
  });
  const canopy = ornateCanopy.group;
  // The new Belle Epoque cornice is wider than the original cone. Keep its
  // plan footprint just inside the old mobile framing while preserving all
  // the vertical layers and the original camera untouched.
  canopy.scale.set(0.93, 1, 0.93);
  group.add(canopy);

  // ---------- horses and poles ----------
  // The building is a static root. Only these two center pivots rotate.
  const horsesGroup = new THREE.Group();
  horsesGroup.name = 'horseRotationRoot';
  group.add(horsesGroup);
  const { variants, materials, saddleColors } = createHorseAssets(envMap, gold);
  const horses = [];
  const ringConfigs = [
    { radius: 5.24, count: 8, offset: 0.26, scale: 1.3, zLift: 0 },
    { radius: 3.18, count: 4, offset: Math.PI / 4 + 0.26, scale: 1.1, zLift: 0.12 }
  ];
  const ringPivots = ringConfigs.map((cfg, ringIdx) => {
    const pivot = new THREE.Group();
    pivot.name = ringIdx === 0 ? 'outerHorseRingPivot' : 'innerHorseRingPivot';
    pivot.position.set(0, 0, 0);
    horsesGroup.add(pivot);
    return pivot;
  });
  // In an overhead view with screen up = -Z, outer is clockwise and inner
  // counter-clockwise. Signs are kept here so they can be tuned independently.
  const ringAngularSpeeds = [-0.12, 0.15];

  // Preserve the original pose/tint sequence while allocating one instance
  // set per ring, so the two rings can be parented to independent pivots.
  const ringPoseCounts = [];
  const ringPoseCursor = ringConfigs.map(() => variants.map(() => 0));
  let poseCursor = 0;
  for (const cfg of ringConfigs) {
    const counts = variants.map(() => 0);
    for (let i = 0; i < cfg.count; i++) {
      counts[poseCursor % variants.length]++;
      poseCursor++;
    }
    ringPoseCounts.push(counts);
  }
  const horseBatchesByRing = ringConfigs.map((cfg, ringIdx) =>
    variants.map(({ parts }, pose) => {
      const count = ringPoseCounts[ringIdx][pose];
      if (!count) return [];
      return Object.entries(parts).map(([part, geometry]) => {
        const mesh = new THREE.InstancedMesh(geometry, materials[part], count);
        mesh.name = 'horse-' + (ringIdx === 0 ? 'outer' : 'inner') + '-' + pose + '-' + part;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.castShadow = part !== 'inset' && part !== 'dark';
        mesh.receiveShadow = true;
        ringPivots[ringIdx].add(mesh);
        return mesh;
      });
    })
  );

  const polePositionsByRing = ringConfigs.map(() => []);
  let horseIndex = 0;
  for (let ringIdx = 0; ringIdx < ringConfigs.length; ringIdx++) {
    const cfg = ringConfigs[ringIdx];
    const ringPivot = ringPivots[ringIdx];
    for (let i = 0; i < cfg.count; i++) {
      const a = cfg.offset + (i + ringIdx * 0.5) / cfg.count * TAU;
      const x = Math.cos(a) * cfg.radius;
      const z = Math.sin(a) * cfg.radius;
      const pose = horseIndex % variants.length;
      const tint = horseIndex % saddleColors.length;
      const batchIndex = ringPoseCursor[ringIdx][pose]++;
      const batches = horseBatchesByRing[ringIdx][pose];
      const { mount } = variants[pose];
      const amp = ringIdx === 0 ? 0.16 : 0.12;
      const baseY = DECK_Y + 0.035;
      const gap = [baseY + mount.belly * cfg.scale + amp + 0.10, baseY + mount.back * cfg.scale - amp - 0.10];
      const sleeves = [baseY + (mount.belly - 0.025) * cfg.scale, baseY + (mount.back + 0.13) * cfg.scale];
      const pivot = new THREE.Group();
      pivot.name = (ringIdx === 0 ? 'outerHorseAssembly' : 'innerHorseAssembly') + String(i + 1).padStart(2, '0');
      pivot.position.set(x, baseY, z);
      pivot.rotation.y = -a;
      pivot.scale.setScalar(cfg.scale);
      ringPivot.add(pivot);
      pivot.updateMatrix();
      for (const mesh of batches) {
        mesh.setMatrixAt(batchIndex, pivot.matrix);
        if (mesh.material === materials.cloth) {
          mesh.setColorAt(batchIndex, saddleColors[tint]);
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      horses.push({
        pivot,
        batches,
        batchIndex,
        pose,
        mount: { ...mount, gap, sleeves },
        baseY,
        phase: a * 1.7 + ringIdx * 1.4,
        amp,
        speed: 1.2 + ringIdx * 0.08,
        ring: ringIdx,
        assembly: pivot.name
      });
      polePositionsByRing[ringIdx].push({ x, z, gap, sleeves });
      horseIndex++;
    }
  }

  const instancedParts = horseBatchesByRing.flat(2);
  for (const mesh of instancedParts) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    // Initial bounds include all instances, plus the original bob/tilt margin.
    mesh.boundingSphere.radius += 0.4;
  }

  // The support poles live in the same ring pivot as their horses, so they
  // revolve together. The poles themselves never receive the bob transform.
  const poleMeshesByRing = ringConfigs.map((cfg, ringIdx) => {
    const poleData = buildPoleGeometry(polePositionsByRing[ringIdx]);
    const goldMesh = new THREE.Mesh(poleData.gold, poleGold);
    goldMesh.castShadow = true;
    goldMesh.receiveShadow = true;
    const neonMesh = new THREE.Mesh(poleData.neon, poleFilament);
    const beadMesh = new THREE.Mesh(poleData.beads, pearlBeads);
    ringPivots[ringIdx].add(goldMesh, neonMesh, beadMesh);
    return { gold: goldMesh, neon: neonMesh, beads: beadMesh, positions: polePositionsByRing[ringIdx] };
  });
  const poleMeshes = poleMeshesByRing.flatMap((entry) => [entry.gold, entry.neon, entry.beads]);

  // extra crystal shards floating around the column
  const orbitShards = new THREE.Group();
  orbitShards.position.y = DECK_Y + 3.15;
  column.add(orbitShards);
  const shardRand = mulberry32(7);
  const shardGeosRose = [];
  const shardGeosGold = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const r = 1.12 + shardRand() * 0.35;
    const geo = new THREE.OctahedronGeometry(0.1, 0);
    geo.scale(0.7, 2.8, 0.7);
    dummy.position.set(Math.cos(a) * r, (shardRand() - 0.5) * 2.2, Math.sin(a) * r);
    dummy.scale.setScalar(0.65 + shardRand() * 0.8);
    dummy.rotation.set(shardRand() * 3, shardRand() * 3, shardRand() * 3);
    dummy.updateMatrix();
    geo.applyMatrix4(dummy.matrix);
    if (i % 3 === 0) shardGeosRose.push(geo); else shardGeosGold.push(geo);
  }
  const shardMeshRose = new THREE.Mesh(merge(shardGeosRose), crystalRose);
  shardMeshRose.renderOrder = 4;
  orbitShards.add(shardMeshRose);
  const shardMeshGold = new THREE.Mesh(merge(shardGeosGold), crystalGold);
  shardMeshGold.renderOrder = 4;
  orbitShards.add(shardMeshGold);

  // ---------- interior light ----------
  const canopySpot = new THREE.SpotLight(WARM_WHITE, 110, 18, 0.98, 0.88, 1.4);
  canopySpot.position.set(0, CANOPY_Y - 0.25, 0);
  canopySpot.target.position.set(0, 1.2, 0);
  group.add(canopySpot, canopySpot.target);

  const baseLight = new THREE.PointLight(CHAMPAGNE, 6, 9, 2);
  baseLight.position.set(0, DECK_Y + 0.25, 0);
  group.add(baseLight);

  const deckGlow = new THREE.PointLight(WARM_WHITE, 4.8, 7, 2);
  deckGlow.position.set(0, DECK_Y + 1.0, 0);
  group.add(deckGlow);

  const underLight = new THREE.PointLight(CHAMPAGNE, 4.2, 8, 2);
  underLight.position.set(0, 0.35, 0);
  group.add(underLight);

  const state = {
    group,
    plinth,
    canopy,
    ornateCanopy,
    horses,
    horsesGroup,
    outerHorseRingPivot: ringPivots[0],
    innerHorseRingPivot: ringPivots[1],
    ringPivots,
    ringConfigs,
    ringAngularSpeeds,
    horsesByRing: [horses.filter((h) => h.ring === 0), horses.filter((h) => h.ring === 1)],
    instancedParts,
    poleMeshesByRing,
    poleMeshes,
    staticRoot: group,
    orbitShards,
    canopySpot,
    coreFlare,
    underLight,
    baseLight,
    deckGlow,
    crystalMats: [crystalGold, crystalRose, crystalColumn],
    bandGems
  };

  function update(t, dt, spinMultiplier = 1) {
    commonTime.value = t;
    // The static root, plinth, column and canopy never rotate.
    // The two independent ring pivots share the same center (0, 0, 0).
    const ringDelta = dt * spinMultiplier;
    for (let i = 0; i < ringPivots.length; i++) {
      ringPivots[i].rotation.y = (ringPivots[i].rotation.y + ringAngularSpeeds[i] * ringDelta) % TAU;
    }

    for (const h of horses) {
      const bob = Math.sin(t * h.speed + h.phase) * h.amp;
      h.pivot.position.y = h.baseY + bob;
      h.pivot.rotation.z = Math.sin(t * 0.82 + h.phase) * 0.018;
      h.pivot.rotation.x = Math.sin(t * 0.63 + h.phase * 1.7) * 0.02;
      h.pivot.updateMatrix();
      for (const mesh of h.batches) mesh.setMatrixAt(h.batchIndex, h.pivot.matrix);
    }
    for (const mesh of instancedParts) mesh.instanceMatrix.needsUpdate = true;

    orbitShards.rotation.y += dt * 0.12;

    const pulse = Math.sin(t * 0.59);
    const pulse2 = Math.sin(t * 0.47 + 1.2);
    coreFlare.intensity = 15 + pulse * 1.1;
    canopySpot.intensity = 110 + Math.sin(t * 0.43) * 4;
    underLight.intensity = 4.2 + pulse2 * 0.38;
    deckGlow.intensity = 4.8 + pulse * 0.45;

    for (const { material, baseColor, speed, phase } of filaments) {
      material.color.copy(baseColor).multiplyScalar(1 + 0.045 * Math.sin(t * speed + phase));
    }
    ornateCanopy.update(t, dt);
  }

  return { ...state, update };
}
