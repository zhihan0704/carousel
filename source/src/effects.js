import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { TAU, mulberry32, makeCanvasTexture, makeGlowTexture, makeSmokeTexture } from './lib.js';
import { createSkyDome } from './sky.js';

const FLOOR_LAYER = 1;
const WARM_WHITE = 0xfff0d6;
const CHAMPAGNE = 0xc6a477;
const MIST_MAUVE = 0x765b78;

function createStars() {
  const rand = mulberry32(301);
  const count = 420;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const warm = new THREE.Color(CHAMPAGNE);
  const pale = new THREE.Color(WARM_WHITE);
  for (let i = 0; i < count; i++) {
    const theta = rand() * TAU;
    const u = rand() * 0.82 + 0.04;
    const r = 42 + rand() * 32;
    const phi = Math.acos(1 - 2 * u);
    const x = Math.sin(phi) * Math.cos(theta) * r;
    const y = Math.cos(phi) * r;
    const z = Math.sin(phi) * Math.sin(theta) * r;
    positions.set([x, y, z], i * 3);
    const color = rand() > 0.68 ? warm : pale;
    const brightness = 0.48 + rand() * 0.9;
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const tex = makeGlowTexture([
    [0, 'rgba(255,255,255,1)'], [0.24, 'rgba(255,255,255,.8)'],
    [0.56, 'rgba(255,255,255,.2)'], [1, 'rgba(255,255,255,0)']
  ], 64);
  const mat = new THREE.PointsMaterial({
    map: tex, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.58, vertexColors: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const stars = new THREE.Points(geo, mat);
  stars.userData.noAO = true;
  stars.frustumCulled = false;
  return stars;
}

function createFireflies(pixelRatio) {
  const rand = mulberry32(906);
  const count = 6200;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const warm = new THREE.Color(0xe3c794);
  const pale = new THREE.Color(WARM_WHITE);
  for (let i = 0; i < count; i++) {
    const a = rand() * TAU;
    const radius = 3.2 + Math.pow(rand(), 0.56) * 21.5;
    const y = rand() * 15.0;
    seeds[i] = rand();
    phases[i] = rand();
    // Fold the fixed angular seed into the position once. The shader only
    // rotates this vector by the time-dependent part of the motion.
    const initialAngle = a + seeds[i] * TAU;
    positions[i * 3] = Math.cos(initialAngle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(initialAngle) * radius;
    const roll = rand();
    const sizeBase = roll > 0.992 ? 0.13 + rand() * 0.07 : (roll > 0.82 ? 0.054 + rand() * 0.033 : 0.018 + rand() * 0.028);
    sizes[i] = sizeBase;
    const color = rand() > 0.48 ? warm : pale;
    const brightness = 0.75 + rand() * 0.95;
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  // Draw the two trailing samples and the core in one instanced POINTS call.
  // Per instance values are opacity, flow scale, and time offset.
  geo.setAttribute('aTrail', new THREE.InstancedBufferAttribute(new Float32Array([
    0.044, 0.18, 0.12,
    0.115, 0.48, 0.055,
    1.0, 1.0, 0.0
  ]), 3));
  geo.instanceCount = 3;

  const flow = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: flow },
      uProjectionScale: { value: 1000 },
      uPixelRatio: { value: pixelRatio }
    },
    vertexShader: `
      uniform float uTime;
      uniform vec3 uFlow;
      uniform float uProjectionScale;
      uniform float uPixelRatio;
      attribute float aSeed;
      attribute float aPhase;
      attribute float aSize;
      attribute vec3 aColor;
      attribute vec3 aTrail;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float t = uTime - aTrail.z;
        float speed = 0.08 + aSeed * 0.23;
        float angle = t * (0.007 + aSeed * 0.012);
        float c = cos(angle);
        float s = sin(angle);
        vec3 p = position;
        p.xz = mat2(c, s, -s, c) * position.xz;
        float y = mod(position.y + t * speed + aPhase * 2.1, 15.8);
        p.y = -0.6 + y;
        p.x += sin(t * (0.16 + aSeed * 0.11) + aPhase * 8.0) * 0.48;
        p.z += cos(t * (0.12 + aSeed * 0.08) + aPhase * 6.0) * 0.42;
        p += uFlow * (aTrail.y * (0.35 + aSeed * 0.85));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float depth = max(0.7, -mv.z);
        gl_Position = projectionMatrix * mv;

        float sizePx = aSize * uProjectionScale / depth;
        gl_PointSize = clamp(sizePx, 0.65, 18.0 * uPixelRatio);

        float twinkle = 0.46 + 0.54 * pow(0.5 + 0.5 * sin(t * (0.9 + aSeed * 2.7) + aPhase * 13.0), 2.2);
        float verticalFade = smoothstep(0.0, 1.8, y) * (1.0 - smoothstep(13.6, 15.8, y));
        float nearFade = smoothstep(1.0, 5.0, depth);
        vAlpha = twinkle * verticalFade * nearFade * aTrail.x;
        vColor = aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;
        if (d > 1.0) discard;
        float core = 1.0 - smoothstep(0.0, 0.62, d);
        float halo = exp(-d * d * 5.5) * 0.34;
        float spike = (1.0 - smoothstep(0.0, 1.0, abs(p.x) * 10.0)) * (1.0 - smoothstep(0.0, 1.0, abs(p.y) * 2.6));
        float alpha = min(core + halo + spike * 0.085, 1.0) * vAlpha;
        vec3 col = vColor * (0.68 + core * 1.08 + halo * 0.35);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.userData.noAO = true;
  const group = new THREE.Group();
  group.name = 'fireflies';
  group.add(points);

  const targetFlow = new THREE.Vector3();
  const target = new THREE.Vector3();
  const up = new THREE.Vector3();
  return {
    group,
    materials: [material],
    flow,
    targetFlow,
    setProjectionScale(scale, dpr) {
      material.uniforms.uProjectionScale.value = scale;
      material.uniforms.uPixelRatio.value = dpr;
    },
    update(time, dt, camera, mouse) {
      target.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mouse.vx * 2.5);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(up, mouse.vy * 1.7);
      targetFlow.lerp(target, 1 - Math.exp(-3.2 * dt));
      flow.lerp(targetFlow, 1 - Math.exp(-2.6 * dt));
      material.uniforms.uTime.value = time;
    }
  };
}

function createBeams() {
  const group = new THREE.Group();
  group.name = 'light-shafts';
  const beams = [];
  const beamTime = { value: 0 };
  const configs = [
    { a: 0.18, radius: 5.75, tilt: 0.4, h: 7.25, r: 1.45, color: 0xe3c794, op: 0.077, inner: false },
    { a: 1.25, radius: 5.9, tilt: 0.34, h: 7.0, r: 1.5, color: WARM_WHITE, op: 0.055, inner: false },
    { a: 2.35, radius: 5.75, tilt: 0.45, h: 7.4, r: 1.15, color: 0xe3c794, op: 0.055, inner: false },
    { a: 3.35, radius: 5.85, tilt: 0.32, h: 7.15, r: 1.45, color: WARM_WHITE, op: 0.048, inner: false },
    { a: 4.4, radius: 5.7, tilt: 0.42, h: 7.3, r: 1.35, color: 0xe3c794, op: 0.072, inner: false },
    { a: 5.35, radius: 5.9, tilt: 0.36, h: 7.2, r: 1.25, color: WARM_WHITE, op: 0.054, inner: false },
    { a: 0.7, radius: 0.3, tilt: 0.02, h: 7.5, r: 1.8, color: 0xe3c794, op: 0.045, inner: true },
    { a: 3.7, radius: 0.4, tilt: 0.03, h: 7.5, r: 1.2, color: WARM_WHITE, op: 0.035, inner: true }
  ];

  configs.forEach((cfg, i) => {
    const geo = new THREE.ConeGeometry(cfg.r, cfg.h, 36, 1, true);
    geo.translate(0, -cfg.h / 2, 0);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: beamTime,
        uColor: { value: new THREE.Color(cfg.color) },
        uOpacity: { value: cfg.op },
        uSeed: { value: i * 13.7 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSeed;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec3 p = position;
          float open = smoothstep(0.05, 0.95, uv.y);
          float ripples = sin(uv.y * 10.0 + uTime * 0.22 + uSeed) * 0.045
                        + sin(uv.x * 18.85 + uTime * 0.15 + uSeed * 1.7) * 0.03;
          p.xz *= 1.0 + ripples * open;
          p.x += sin(uTime * 0.18 + uv.y * 3.4 + uSeed) * 0.045 * open;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uSeed;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                     mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec3 N = normalize(vNormalV);
          vec3 V = normalize(vViewDir);
          float facing = abs(dot(N, V));
          float soft = pow(facing, 1.7);
          float lengthFade = smoothstep(0.02, 0.3, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
          float n1 = noise(vec2(vUv.x * 3.2 + uSeed, vUv.y * 1.3 - uTime * 0.04));
          float n2 = noise(vec2(vUv.x * 9.0 - uSeed, vUv.y * 4.2 - uTime * 0.08));
          float wisps = smoothstep(0.18, 0.9, n1 * 0.72 + n2 * 0.28);
          float dust = noise(vec2(vUv.x * 22.0 - uSeed, vUv.y * 16.0 - uTime * 0.12));
          dust = smoothstep(0.74, 1.0, dust);
          float alpha = soft * lengthFade * (0.42 + wisps * 0.58) * uOpacity + dust * soft * uOpacity * 0.6;
          vec3 col = mix(uColor * vec3(1.0, 0.92, 0.82), uColor, smoothstep(0.0, 0.55, vUv.y));
          col += uColor * dust * 0.5;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const pivot = new THREE.Group();
    if (cfg.inner) {
      pivot.position.set(0, 8.95, 0);
      pivot.rotation.y = cfg.a;
    } else {
      pivot.position.set(Math.cos(cfg.a) * cfg.radius, 8.98, Math.sin(cfg.a) * cfg.radius);
      pivot.rotation.y = Math.PI / 2 - cfg.a;
    }
    const beam = new THREE.Mesh(geo, material);
    beam.rotation.x = -cfg.tilt;
    beam.userData.noAO = true;
    pivot.add(beam);
    group.add(pivot);
    beams.push({ mesh: beam, pivot, cfg, baseRotY: pivot.rotation.y });
  });

  return {
    group,
    update: (time) => {
      beamTime.value = time;
      for (const b of beams) {
        const { a, op, tilt } = b.cfg;
        b.mesh.material.uniforms.uOpacity.value = op * (0.91 + 0.09 * Math.sin(time * 0.17 + a));
        b.pivot.rotation.y = b.baseRotY + Math.sin(time * 0.028 + a) * 0.025;
        b.mesh.rotation.x = -tilt + Math.sin(time * 0.055 + a) * 0.012;
      }
    }
  };
}

function createMist() {
  const group = new THREE.Group();
  group.name = 'mist';
  const textures = [makeSmokeTexture(11), makeSmokeTexture(24), makeSmokeTexture(37)];
  const smokeTints = [0xb8a589, 0xa28e9f, 0xa295a1];
  const rand = mulberry32(73);
  const sprites = [];
  for (let i = 0; i < 19; i++) {
    const a = rand() * TAU;
    const low = i > 12;
    const radius = low ? 6.8 + rand() * 5.4 : 6.2 + rand() * 10.0;
    const mat = new THREE.SpriteMaterial({
      map: textures[i % textures.length],
      color: smokeTints[i % smokeTints.length],
      transparent: true,
      opacity: (low ? 0.079 : 0.055) + rand() * (low ? 0.062 : 0.045),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      rotation: rand() * TAU
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      Math.cos(a) * radius,
      low ? 0.65 + rand() * 1.9 : 0.6 + rand() * 6.0,
      Math.sin(a) * radius
    );
    const scale = (low ? 11 : 8) + rand() * 8;
    sprite.scale.set(scale, scale * (low ? 0.38 : 0.55 + rand() * 0.5), 1);
    sprite.userData.noAO = true;
    sprite.userData.baseX = sprite.position.x;
    sprite.userData.baseZ = sprite.position.z;
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = rand() * TAU;
    sprite.userData.speed = 0.018 + rand() * 0.035;
    sprite.userData.drift = 0.8 + rand() * 1.2;
    sprite.userData.baseRotation = mat.rotation;
    group.add(sprite);
    sprites.push(sprite);
  }

  // small, luminous puffs that hang inside the light shafts
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + 0.28;
    const mat = new THREE.SpriteMaterial({
      map: textures[(i + 1) % textures.length],
      color: smokeTints[i % smokeTints.length],
      transparent: true,
      opacity: 0.055 + rand() * 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      rotation: rand() * TAU
    });
    const sprite = new THREE.Sprite(mat);
    const radius = 7.1 + rand() * 2.4;
    sprite.position.set(Math.cos(a) * radius, 2.2 + rand() * 4.0, Math.sin(a) * radius);
    const scale = 4.5 + rand() * 4.0;
    sprite.scale.set(scale, scale * (0.75 + rand() * 0.5), 1);
    sprite.userData.noAO = true;
    sprite.userData.baseX = sprite.position.x;
    sprite.userData.baseZ = sprite.position.z;
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = rand() * TAU;
    sprite.userData.speed = 0.02 + rand() * 0.03;
    sprite.userData.drift = 0.45 + rand() * 0.5;
    sprite.userData.baseRotation = mat.rotation;
    group.add(sprite);
    sprites.push(sprite);
  }

  const hazeTexture = makeCanvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.45, 'rgba(255,255,255,.035)');
    g.addColorStop(0.7, 'rgba(255,255,255,.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const vign = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.65);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(0.48, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, w, h);
  }, { wrapS: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(25, 14),
    new THREE.MeshBasicMaterial({
      map: hazeTexture, transparent: true, opacity: 0.42,
      depthWrite: false, blending: THREE.AdditiveBlending,
      color: MIST_MAUVE, toneMapped: false, side: THREE.DoubleSide, forceSinglePass: true
    })
  );
  haze.position.set(0, 3.7, -8.5);
  haze.userData.noAO = true;
  group.add(haze);

  return {
    group,
    update: (time) => {
      for (const s of sprites) {
        const t = time * s.userData.speed;
        s.position.x = s.userData.baseX + Math.sin(t + s.userData.phase) * 1.4 * s.userData.drift;
        s.position.z = s.userData.baseZ + Math.cos(t * 0.8 + s.userData.phase) * 1.2 * s.userData.drift;
        s.position.y = s.userData.baseY + Math.sin(t * 1.4 + s.userData.phase) * 0.34;
        s.material.rotation = s.userData.baseRotation + time * 0.009;
      }
    }
  };
}

function createFloor() {
  const reflectorShader = {
    name: 'DreamMirror',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(0x17121d).multiplyScalar(0.44) },
      uGlint: { value: new THREE.Color(CHAMPAGNE).multiplyScalar(0.009) }
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uGlint;
      varying vec4 vUv;
      varying vec3 vWorld;

      void main() {
        vec2 uv = vUv.xy / vUv.w;
        float ripple = sin(vWorld.z * 0.85 + uTime * 0.16) * 0.00044
                     + cos(vWorld.x * 0.64 - uTime * 0.12) * 0.00032;
        vec2 baseUv = uv + vec2(ripple, ripple * 0.7);
        vec3 reflection = texture2D(tDiffuse, baseUv).rgb * 0.36;
        reflection += texture2D(tDiffuse, baseUv + vec2(0.0019, 0.0009)).rgb * 0.16;
        reflection += texture2D(tDiffuse, baseUv + vec2(-0.0019, -0.0009)).rgb * 0.16;
        reflection += texture2D(tDiffuse, baseUv + vec2(-0.0009, 0.0023)).rgb * 0.16;
        reflection += texture2D(tDiffuse, baseUv + vec2(0.0009, -0.0023)).rgb * 0.16;
        float luminance = dot(reflection, vec3(0.2126, 0.7152, 0.0722));
        reflection = mix(reflection, vec3(luminance), 0.18);
        vec3 col = uBase + reflection * (0.52 / (1.0 + 0.2 * luminance));
        float glint = smoothstep(0.96, 1.0, sin(vWorld.x * 1.7 + uTime * 0.2) * sin(vWorld.z * 1.3 - uTime * 0.17));
        // Let the distant mirror plane fall away into the sky. The rings and
        // central reflection stay inside the fully opaque part of the floor.
        float edgeFade = 1.0 - smoothstep(42.0, 54.9, length(vWorld.xz));
        if (edgeFade < 0.001) discard;
        gl_FragColor = vec4(col + uGlint * glint, edgeFade);
      }
    `
  };

  const floorGeometry = new THREE.CircleGeometry(55, 128);
  const reflectionLimit = window.matchMedia('(pointer: coarse)').matches ? 512 : 768;
  const reflectionScale = reflectionLimit / Math.max(window.innerWidth, window.innerHeight);
  const reflector = new Reflector(floorGeometry, {
    clipBias: 0.003,
    textureWidth: Math.max(1, Math.round(window.innerWidth * reflectionScale)),
    textureHeight: Math.max(1, Math.round(window.innerHeight * reflectionScale)),
    color: 0x17121d,
    multisample: 0,
    shader: reflectorShader
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = -0.006;
  reflector.name = 'dream-mirror';
  reflector.receiveShadow = false;
  reflector.renderOrder = -2;
  reflector.material.transparent = true;

  const originalOnBeforeRender = reflector.onBeforeRender;
  let reflectionFrame = -1;
  let reflectionNeedsRefresh = true;
  reflector.onBeforeRender = function (renderer, scene, camera) {
    if (scene.overrideMaterial) return;
    reflectionFrame++;
    // Shadow refresh uses even frames. Prime the mirror immediately, then
    // refresh on odd frames so the two expensive passes usually alternate.
    if (!reflectionNeedsRefresh && reflectionFrame % 2 === 0) return;
    reflectionNeedsRefresh = false;
    const pendingShadowUpdate = renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate = false;
    try {
      originalOnBeforeRender.call(this, renderer, scene, camera);
    } finally {
      renderer.shadowMap.needsUpdate = pendingShadowUpdate;
    }
  };

  const floorGroup = new THREE.Group();
  floorGroup.name = 'floor';
  floorGroup.add(reflector);

  const veilMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Color(0x17121d) },
      uEdge: { value: new THREE.Color(0x0e0a12) },
      uGold: { value: new THREE.Color(CHAMPAGNE) },
      uMauve: { value: new THREE.Color(MIST_MAUVE) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCenter;
      uniform vec3 uEdge;
      uniform vec3 uGold;
      uniform vec3 uMauve;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float ringA = 1.0 - smoothstep(0.0, 0.015, abs(r - 0.395));
        float ringB = 1.0 - smoothstep(0.0, 0.008, abs(r - 0.64));
        float ringC = 1.0 - smoothstep(0.0, 0.018, abs(r - 0.86));
        vec3 col = mix(uCenter, uEdge, smoothstep(0.22, 1.0, r));
        col += uGold * (ringA * 0.044 + ringB * 0.023 + ringC * 0.015);
        float sweeps = smoothstep(0.92, 1.0, sin(a * 24.0 + r * 6.0 + uTime * 0.05)) * smoothstep(0.5, 0.92, r);
        col += uMauve * sweeps * 0.009;
        float edgeFade = 1.0 - smoothstep(0.76, 0.998, r);
        float alpha = mix(0.13, 0.96, smoothstep(0.25, 1.0, r)) * edgeFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  const veil = new THREE.Mesh(floorGeometry, veilMat);
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.006;
  veil.renderOrder = 2;
  veil.layers.set(FLOOR_LAYER);
  veil.userData.noAO = true;
  floorGroup.add(veil);

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(35, 96),
    new THREE.ShadowMaterial({ color: 0x0b080f, opacity: 0.58 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.009;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.renderOrder = 1;
  shadowCatcher.layers.set(FLOOR_LAYER);
  shadowCatcher.userData.noAO = true;
  floorGroup.add(shadowCatcher);

  const ringGroup = new THREE.Group();
  ringGroup.position.y = 0.014;
  ringGroup.layers.set(FLOOR_LAYER);
  ringGroup.userData.noAO = true;
  const ritualMatGold = new THREE.MeshBasicMaterial({
    color: CHAMPAGNE,
    transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false
  });
  const ritualMatMauve = new THREE.MeshBasicMaterial({
    color: MIST_MAUVE,
    transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false
  });
  for (const [inner, outer, mat] of [
    [10.45, 10.49, ritualMatGold], [13.05, 13.11, ritualMatMauve], [13.75, 13.77, ritualMatGold]
  ]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.layers.set(FLOOR_LAYER);
    ring.userData.noAO = true;
    ringGroup.add(ring);
  }
  const arcMat = new THREE.MeshBasicMaterial({
    color: WARM_WHITE,
    transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false
  });
  const arcs = new THREE.InstancedMesh(new THREE.RingGeometry(15.4, 15.435, 24, 1, 0, 0.025), arcMat, 12);
  arcs.rotation.x = -Math.PI / 2;
  arcs.layers.set(FLOOR_LAYER);
  arcs.userData.noAO = true;
  const arcTransform = new THREE.Matrix4();
  for (let i = 0; i < arcs.count; i++) {
    arcs.setMatrixAt(i, arcTransform.makeRotationZ(i / arcs.count * TAU));
  }
  ringGroup.add(arcs);
  floorGroup.add(ringGroup);

  const poolTex = makeCanvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.38, 'rgba(0,0,0,0)');
    g.addColorStop(0.46, 'rgba(198,164,119,.07)');
    g.addColorStop(0.5, 'rgba(233,220,197,.13)');
    g.addColorStop(0.56, 'rgba(118,91,120,.05)');
    g.addColorStop(0.72, 'rgba(118,91,120,.02)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { wrapS: THREE.ClampToEdgeWrapping, repeatX: 1, repeatY: 1 });
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(24, 96),
    new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  halo.layers.set(FLOOR_LAYER);
  halo.userData.noAO = true;
  halo.renderOrder = 3;
  floorGroup.add(halo);

  return {
    group: floorGroup,
    reflector,
    floorLayer: FLOOR_LAYER,
    setSize(width, height) {
      const scale = reflectionLimit / Math.max(width, height, 1);
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const target = reflector.getRenderTarget();
      if (target.width === w && target.height === h) return;
      target.setSize(w, h);
      reflectionNeedsRefresh = true;
    },
    update: (time) => {
      reflector.material.uniforms.uTime.value = time;
      veilMat.uniforms.uTime.value = time;
    }
  };
}

export function createWorld({ pixelRatio }) {
  const sky = createSkyDome();
  const stars = createStars();
  const fireflies = createFireflies(pixelRatio);
  const beams = createBeams();
  const mist = createMist();
  const floor = createFloor();

  return {
    sky,
    stars,
    fireflies,
    beams,
    mist,
    floor,
    update: (time, dt, camera, mouse) => {
      sky.update(time);
      fireflies.update(time, dt, camera, mouse);
      beams.update(time);
      mist.update(time);
      floor.update(time);
    },
    setProjectionScale: (scale, dpr) => fireflies.setProjectionScale(scale, dpr),
    setReflectionSize: (width, height) => floor.setSize(width, height)
  };
}
