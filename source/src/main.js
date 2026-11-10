import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createCarousel } from './carousel.js';
import { createWorld } from './effects.js';
import { makeEnvTexture, easeInOutCubic, damp } from './lib.js';

const canvas = document.getElementById('scene');
const veil = document.getElementById('veil');
const fallback = document.getElementById('fallback');

const isCoarse = window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_DPR = isCoarse ? 1.2 : 1.45;
const listeners = new AbortController();
const { signal } = listeners;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false
  });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 unavailable');
} catch (error) {
  console.error(error);
  fallback.style.display = 'grid';
  veil.style.display = 'none';
  listeners.abort();
}

if (renderer?.capabilities.isWebGL2) start();

function start() {
  renderer.setClearColor(0x17121d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x17121d, 0.0085);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 180);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.06;
  orbit.enablePan = false;
  orbit.rotateSpeed = 0.62;
  orbit.zoomSpeed = 0.72;
  orbit.minDistance = 11;
  orbit.maxDistance = 52;
  orbit.minPolarAngle = 0.38;
  orbit.maxPolarAngle = 1.53;
  orbit.target.set(0, 5.85, 0);
  orbit.enabled = false;
  orbit.enableZoom = isCoarse;

  function fitDistance() {
    const aspect = window.innerWidth / window.innerHeight;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const vertical = 10.5 / Math.tan(vFov / 2);
    const horizontal = 7.6 / (Math.tan(vFov / 2) * Math.max(0.35, aspect));
    return THREE.MathUtils.clamp(Math.max(vertical, horizontal) * 1.07, 23, 50);
  }

  const HOME_Y = 7.75;
  let homeDistance = fitDistance();
  camera.position.set(0, HOME_Y, homeDistance);
  camera.lookAt(orbit.target);

  // ---------- environment ----------
  const envTexture = makeEnvTexture();
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(envTexture);
  const envMap = envRT.texture;
  pmrem.dispose();
  envTexture.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.95;

  // ---------- world ----------
  const world = createWorld({ pixelRatio: renderer.getPixelRatio() });
  scene.add(world.sky.sky);
  scene.add(world.stars);
  scene.add(world.floor.group);
  scene.add(world.fireflies.group);
  scene.add(world.beams.group);
  scene.add(world.mist.group);

  const carousel = createCarousel({ envMap });
  scene.add(carousel.group);

  camera.layers.enable(world.floor.floorLayer);

  // ---------- lighting ----------
  const hemi = new THREE.HemisphereLight(0xc3afba, 0x49352e, 0.45);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x9d859f, 0.16);
  scene.add(ambient);

  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, 3.8, 0);
  scene.add(keyTarget);

  const key = new THREE.SpotLight(0xfff0d6, 535, 52, 0.64, 0.98, 1.35);
  key.position.set(11.5, 22.5, 15.5);
  key.target = keyTarget;
  key.castShadow = true;
  key.shadow.mapSize.set(isCoarse ? 1024 : 1536, isCoarse ? 1024 : 1536);
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 55;
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.022;
  key.shadow.radius = 1.7;
  scene.add(key);

  const rim = new THREE.SpotLight(0xe9dcc5, 225, 58, 0.62, 1.0, 1.15);
  rim.position.set(-13, 15, -15);
  const rimTarget = new THREE.Object3D();
  rimTarget.position.set(0, 5.5, 0);
  scene.add(rimTarget);
  rim.target = rimTarget;
  scene.add(rim);

  const backWarm = new THREE.SpotLight(0xc6a477, 155, 48, 0.5, 0.95, 1.4);
  backWarm.position.set(7, 8.5, -18);
  const backTarget = new THREE.Object3D();
  backTarget.position.set(0, 2.2, 0);
  scene.add(backTarget);
  backWarm.target = backTarget;
  scene.add(backWarm);

  const frontFill = new THREE.PointLight(0xffeddc, 20, 28, 2);
  frontFill.position.set(-7, 3.4, 14);
  scene.add(frontFill);

  const moonFill = new THREE.DirectionalLight(0x9c839e, 0.24);
  moonFill.position.set(-8, 12, -12);
  scene.add(moonFill);

  // ---------- post processing ----------
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 2,
    resolveDepthBuffer: false,
    depthBuffer: true,
    stencilBuffer: false
  });
  const composer = new EffectComposer(renderer, target);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.57;
  gtao.updateGtaoMaterial({
    radius: 4.5,
    distanceExponent: 1.35,
    thickness: 0.8,
    distanceFallOff: 1.0,
    scale: 1.0,
    samples: 8
  });
  gtao.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 5,
    radiusExponent: 2,
    rings: 2,
    samples: 8
  });
  const setAOSize = gtao.setSize.bind(gtao);
  const aoScale = isCoarse ? 0.48 : 0.58;
  gtao.setSize = (width, height) => {
    setAOSize(Math.max(160, Math.floor(width * aoScale)), Math.max(120, Math.floor(height * aoScale)));
  };
  composer.addPass(gtao);

  // The scene graph is built once. Cache the non-occluders instead of traversing it twice per frame.
  const aoExcluded = [];
  scene.traverse((obj) => {
    if (obj.userData.noAO || obj.isPoints || obj.isLine || obj.isLine2) aoExcluded.push(obj);
  });
  gtao._overrideVisibility = function () {
    for (const obj of aoExcluded) {
      if (obj.visible) {
        obj.visible = false;
        this._visibilityCache.push(obj);
      }
    }
  };

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.25,
    0.30,
    2.50
  );
  composer.addPass(bloom);

  const finishShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        vec2 uv = vUv;
        vec2 c = uv - 0.5;
        // Bloom and scene lighting are linear HDR. Convert once, before the display-space grade.
        gl_FragColor = vec4(texture2D(tDiffuse, uv).rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 col = gl_FragColor.rgb;

        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(luma), col, 0.96);
        vec3 shadowTint = vec3(1.00, 0.985, 1.025);
        col *= mix(shadowTint, vec3(1.0), smoothstep(0.06, 0.64, luma));
        col = mix(col, col * col * (3.0 - 2.0 * col), 0.035);
        col *= 1.0 - 0.19 * smoothstep(0.18, 0.70, length(c));

        // filmic grain, scaled down in the highlights
        float grain = hash12(uv * uResolution + fract(uTime) * 147.13) - 0.5;
        col += grain * (0.010 - smoothstep(0.55, 1.0, luma) * 0.005);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `
  };
  const finish = new ShaderPass(finishShader);
  finish.renderToScreen = true;
  composer.addPass(finish);

  // ---------- interactions ----------
  const mouse = {
    nx: 0, ny: 0,
    vx: 0, vy: 0,
    targetVx: 0, targetVy: 0,
    lastNx: 0, lastNy: 0,
    hasMoved: false
  };
  let zoomTarget = camera.position.distanceTo(orbit.target);
  const cameraOffset = new THREE.Vector3();

  canvas.addEventListener('pointermove', (event) => {
    const nx = event.clientX / window.innerWidth * 2 - 1;
    const ny = -(event.clientY / window.innerHeight * 2 - 1);
    if (!mouse.hasMoved) {
      mouse.lastNx = nx; mouse.lastNy = ny;
      mouse.hasMoved = true;
    }
    const dx = nx - mouse.lastNx;
    const dy = ny - mouse.lastNy;
    mouse.lastNx = nx;
    mouse.lastNy = ny;
    mouse.nx = nx;
    mouse.ny = ny;
    mouse.targetVx = THREE.MathUtils.clamp(mouse.targetVx + dx * 2.7, -1.2, 1.2);
    mouse.targetVy = THREE.MathUtils.clamp(mouse.targetVy + dy * 2.7, -1.2, 1.2);
  }, { passive: true, signal });

  canvas.addEventListener('pointerdown', () => {
    canvas.classList.add('dragging');
    skipIntro();
  }, { capture: true, signal });

  function stopDragging() {
    canvas.classList.remove('dragging');
  }
  window.addEventListener('pointerup', stopDragging, { signal });
  window.addEventListener('pointercancel', stopDragging, { signal });

  if (!isCoarse) {
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      skipIntro();
      const factor = Math.exp(THREE.MathUtils.clamp(event.deltaY, -180, 180) * 0.00125);
      zoomTarget = THREE.MathUtils.clamp(zoomTarget * factor, 12.5, 48);
    }, { passive: false, signal });
  }

  function skipIntro() {
    if (intro.complete) return;
    intro.complete = true;
    camera.position.set(0, HOME_Y, homeDistance);
    camera.lookAt(orbit.target);
    zoomTarget = camera.position.distanceTo(orbit.target);
    orbit.enabled = true;
    orbit.update();
    intro.multiplier = 1;
  }

  // ---------- intro ----------
  const intro = {
    elapsed: 0,
    duration: reduceMotion ? 0 : 3000,
    complete: false,
    multiplier: 0.28
  };
  const introFrom = new THREE.Vector3(0, 12.7, homeDistance * 1.22);
  const introTo = new THREE.Vector3(0, HOME_Y, homeDistance);
  const introTarget = new THREE.Vector3(0, 5.85, 0);

  if (intro.duration === 0) {
    intro.complete = true;
    intro.multiplier = 1;
    orbit.enabled = true;
  } else {
    camera.position.copy(introFrom);
    camera.lookAt(introTarget);
  }

  // ---------- resize ----------
  let resizePending = false;
  let adaptiveDprCap = MAX_DPR;

  function resize() {
    resizePending = false;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, adaptiveDprCap);
    const previousDpr = renderer.getPixelRatio();
    renderer.setDrawingBufferSize(w, h, dpr);
    if (dpr !== previousDpr) composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    finish.uniforms.uResolution.value.set(canvas.width, canvas.height);
    const projectionScale = canvas.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    world.setProjectionScale(projectionScale, dpr);
    world.setReflectionSize(w, h);
    const nextHomeDistance = fitDistance();
    if (!intro.complete) {
      introTo.set(0, HOME_Y, nextHomeDistance);
      introFrom.set(0, 12.7, nextHomeDistance * 1.22);
    } else if (nextHomeDistance !== homeDistance) {
      const scale = nextHomeDistance / homeDistance;
      cameraOffset.subVectors(camera.position, orbit.target);
      cameraOffset.setLength(THREE.MathUtils.clamp(cameraOffset.length() * scale, orbit.minDistance, orbit.maxDistance));
      camera.position.copy(orbit.target).add(cameraOffset);
      zoomTarget = THREE.MathUtils.clamp(zoomTarget * scale, orbit.minDistance, orbit.maxDistance);
    }
    homeDistance = nextHomeDistance;
  }
  window.addEventListener('resize', () => { resizePending = true; }, { signal });
  resize();

  // ---------- animation ----------
  let frameRequest = 0;
  let lastFrameAt;
  let elapsed = 0;
  let firstFrame = true;
  let frameCount = 0;
  let sampleTime = 0;
  let sampledFrames = 0;
  let adaptiveChecked = false;
  let veilTimer;

  function animate(now) {
    frameRequest = 0;
    if (document.hidden || signal.aborted) return;
    const rawDt = lastFrameAt === undefined ? 0 : (now - lastFrameAt) * 0.001;
    lastFrameAt = now;
    const dt = Math.min(rawDt, 0.05);
    elapsed += dt;
    if (resizePending) resize();

    // intro sweep
    if (!intro.complete) {
      // Startup shader compilation or a long frame should not skip the visible camera sweep.
      intro.elapsed += Math.min(rawDt, 0.10) * 1000;
      const p = Math.min(1, intro.elapsed / intro.duration);
      const e = easeInOutCubic(p);
      camera.position.lerpVectors(introFrom, introTo, e);
      camera.lookAt(introTarget);
      intro.multiplier = 0.28 + e * 0.72;
      if (p >= 1) {
        intro.complete = true;
        orbit.enabled = true;
        orbit.update();
        zoomTarget = camera.position.distanceTo(orbit.target);
      }
    } else {
      orbit.update();
      // OrbitControls owns touch zoom. Desktop wheel uses the smoothed zoom target.
      if (!isCoarse) {
        cameraOffset.subVectors(camera.position, orbit.target);
        const distance = cameraOffset.length();
        const zoomDistance = damp(distance, zoomTarget, 7.5, dt);
        if (Math.abs(zoomDistance - distance) > 0.0003) {
          cameraOffset.setLength(zoomDistance);
          camera.position.copy(orbit.target).add(cameraOffset);
        }
      }
    }

    // imparted momentum on the firefly field
    mouse.targetVx = damp(mouse.targetVx, 0, 4.8, dt);
    mouse.targetVy = damp(mouse.targetVy, 0, 4.8, dt);
    mouse.vx = damp(mouse.vx, mouse.targetVx, 12, dt);
    mouse.vy = damp(mouse.vy, mouse.targetVy, 12, dt);

    carousel.update(elapsed, dt, intro.multiplier);
    world.update(elapsed, dt, camera, mouse);

    finish.uniforms.uTime.value = elapsed;
    renderer.shadowMap.needsUpdate = (frameCount % 2) === 0;
    renderer.info.reset();
    composer.render(dt);

    // signal readiness only when the first full frame has actually been drawn
    if (firstFrame) {
      firstFrame = false;
      veil.classList.add('gone');
      window.__CAROUSEL_READY__ = true;
      veilTimer = setTimeout(() => veil.remove(), 1700);
    }

    frameCount++;
    // Sample visible frames after the intro. Keep the reduced cap through subsequent resizes.
    if (!adaptiveChecked && intro.complete && rawDt > 0) {
      sampleTime += rawDt;
      sampledFrames++;
      if (sampleTime >= 4) {
        const dpr = renderer.getPixelRatio();
        if (sampledFrames / sampleTime < 32 && dpr > 1) {
          adaptiveDprCap = Math.max(1, dpr - 0.25);
          resizePending = true;
        }
        adaptiveChecked = true;
      }
    }
    scheduleFrame();
  }

  function scheduleFrame() {
    if (!frameRequest && !document.hidden && !signal.aborted) frameRequest = requestAnimationFrame(animate);
  }

  function pause() {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    lastFrameAt = undefined;
  }

  function dispose() {
    listeners.abort();
    clearTimeout(veilTimer);
    orbit.dispose();

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isInstancedMesh) object.dispose();
      if (Array.isArray(object.material)) {
        for (const material of object.material) materials.add(material);
      } else if (object.material) {
        materials.add(object.material);
      }
    });
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value?.isTexture && !value.isRenderTargetTexture) textures.add(value);
      }
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (uniform.value?.isTexture && !uniform.value.isRenderTargetTexture) textures.add(uniform.value);
      }
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    world.floor.reflector.getRenderTarget().dispose();
    key.shadow.dispose();
    envRT.dispose();
    for (const pass of composer.passes) pass.dispose();
    // Three r180's GTAOPass.dispose() does not dispose these two materials.
    gtao.gtaoMaterial.dispose();
    gtao.blendMaterial.dispose();
    composer.dispose();
    renderer.dispose();
    delete window.__CAROUSEL__;
    delete window.__CAROUSEL_READY__;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else scheduleFrame();
  }, { signal });
  window.addEventListener('pagehide', (event) => {
    pause();
    if (!event.persisted) dispose();
  }, { signal });
  window.addEventListener('pageshow', scheduleFrame, { signal });

  // Expose a small debug/QA surface. This is not shown to the visitor.
  window.__CAROUSEL__ = {
    THREE, scene, camera, renderer, composer, controls: orbit, carousel, world,
    bloom, gtao, finish, intro,
    setView(position, target = [0, 5.85, 0], fov = camera.fov) {
      intro.complete = true;
      orbit.enabled = true;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.position.set(...position);
      orbit.target.set(...target);
      camera.lookAt(orbit.target);
      orbit.update();
      zoomTarget = camera.position.distanceTo(orbit.target);
      intro.multiplier = 1;
    },
    finishIntro() {
      intro.complete = true;
      orbit.enabled = true;
      camera.position.copy(introTo);
      camera.lookAt(orbit.target);
      orbit.update();
      zoomTarget = camera.position.distanceTo(orbit.target);
      intro.multiplier = 1;
    },
    stats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        pixelRatio: renderer.getPixelRatio(),
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? null
      };
    }
  };

  scheduleFrame();
}
