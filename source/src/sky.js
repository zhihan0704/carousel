import * as THREE from 'three';
import { TAU, mulberry32, makeCanvasTexture } from './lib.js';

function drawWrappedBlob(ctx, x, y, radius, colorStops, w) {
  for (const offset of [-w, 0, w]) {
    const g = ctx.createRadialGradient(x + offset, y, 0, x + offset, y, radius);
    for (const [p, c] of colorStops) g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(x + offset - radius, y - radius, radius * 2, radius * 2);
  }
}

export function createSkyDome() {
  const texture = makeCanvasTexture(2048, 1024, (ctx, w, h) => {
    const rand = mulberry32(20261110);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#100d15');
    bg.addColorStop(0.36, '#17121d');
    bg.addColorStop(0.5, '#1d1722');
    bg.addColorStop(0.64, '#151019');
    bg.addColorStop(1, '#0b0810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // A faint haze marks the horizon.
    ctx.globalCompositeOperation = 'lighter';
    const belt = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.62);
    belt.addColorStop(0, 'rgba(118,91,120,0)');
    belt.addColorStop(0.5, 'rgba(118,91,120,.065)');
    belt.addColorStop(1, 'rgba(118,91,120,0)');
    ctx.fillStyle = belt;
    ctx.fillRect(0, h * 0.38, w, h * 0.24);

    // Sparse, muted mauve nebulae keep the skyline behind the carousel.
    const clouds = [
      { x: 0.14, y: 0.35, r: 0.23, c: ['rgba(118,91,120,.085)', 'rgba(102,77,111,.027)'] },
      { x: 0.48, y: 0.24, r: 0.27, c: ['rgba(104,81,116,.055)', 'rgba(84,65,96,.018)'] },
      { x: 0.7, y: 0.42, r: 0.32, c: ['rgba(118,91,120,.075)', 'rgba(106,79,112,.023)'] },
      { x: 0.94, y: 0.26, r: 0.2, c: ['rgba(114,87,121,.052)', 'rgba(89,68,99,.017)'] }
    ];
    for (const cloud of clouds) {
      drawWrappedBlob(ctx, cloud.x * w, cloud.y * h, cloud.r * w, [
        [0, cloud.c[0]],
        [0.4, cloud.c[1]],
        [1, 'rgba(0,0,0,0)']
      ], w);
    }

    // faint diagonal river of stardust
    ctx.save();
    ctx.translate(w * 0.5, h * 0.31);
    ctx.rotate(-0.16);
    const river = ctx.createLinearGradient(0, -h * 0.16, 0, h * 0.16);
    river.addColorStop(0, 'rgba(118,91,120,0)');
    river.addColorStop(0.4, 'rgba(118,91,120,.018)');
    river.addColorStop(0.5, 'rgba(170,141,172,.027)');
    river.addColorStop(0.65, 'rgba(118,91,120,.015)');
    river.addColorStop(1, 'rgba(118,91,120,0)');
    ctx.fillStyle = river;
    ctx.fillRect(-w, -h * 0.16, w * 2, h * 0.32);
    ctx.restore();

    // Faint champagne reflections at the horizon.
    drawWrappedBlob(ctx, w * 0.03, h * 0.5, w * 0.16, [
      [0, 'rgba(198,164,119,.027)'], [0.55, 'rgba(118,91,120,.014)'], [1, 'rgba(0,0,0,0)']
    ], w);
    drawWrappedBlob(ctx, w * 0.48, h * 0.53, w * 0.18, [
      [0, 'rgba(198,164,119,.035)'], [0.5, 'rgba(118,91,120,.017)'], [1, 'rgba(0,0,0,0)']
    ], w);

    // Small, dim points leave room for the brighter three-dimensional stars.
    for (let i = 0; i < 2400; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const size = rand() > 0.991 ? 1.1 + rand() * 1.6 : 0.3 + rand() * 0.78;
      const alpha = 0.11 + rand() * 0.46;
      const color = rand() > 0.72 ? '198,164,119' : '255,240,214';
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }

    // sparkle halos around the brightest stars
    for (let i = 0; i < 17; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 2.5 + rand() * 8;
      drawWrappedBlob(ctx, x, y, r, [
        [0, 'rgba(255,240,214,.22)'],
        [0.22, 'rgba(198,164,119,.09)'],
        [1, 'rgba(0,0,0,0)']
      ], w);
    }

    // subtle grain to avoid plastic gradients
    ctx.globalCompositeOperation = 'source-over';
    const grain = ctx.createImageData(w, h);
    for (let i = 0; i < grain.data.length; i += 4) {
      const v = rand() * 3;
      grain.data[i] = v;
      grain.data[i + 1] = v;
      grain.data[i + 2] = v;
      grain.data[i + 3] = 7;
    }
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = w;
    grainCanvas.height = h;
    grainCanvas.getContext('2d').putImageData(grain, 0, 0);
    ctx.drawImage(grainCanvas, 0, 0);
  }, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    repeatX: 1,
    repeatY: 1,
    anisotropy: 8
  });

  // The painted backdrop is magnified rather than minified, so disable mipmaps and
  // keep filtering linear. This also keeps the soft nebula perfectly smooth.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 64, 32), material);
  sky.name = 'sky-dome';
  sky.frustumCulled = false;
  sky.userData.noAO = true;
  sky.renderOrder = -100;

  // tiny drift layer so the backdrop is not completely frozen
  const uniforms = { uTime: { value: 0 } };
  return {
    sky,
    texture,
    uniforms,
    update(time) {
      uniforms.uTime.value = time;
      // extremely subtle drift preserves the hand-painted feel
      texture.offset.x = (Math.sin(time * 0.009) * 0.0012);
      texture.offset.y = (Math.cos(time * 0.007) * 0.0006);
    }
  };
}
