(function () {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => {
    FluidUtils.initTheme();
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', FluidUtils.toggleTheme);
    initOcean();
  });

  let canvas, ctx, off, offCtx;
  let t = 0;
  let cssW = 0, cssH = 0, dpr = 1;

  // Realistic ocean: longer wavelengths, slower speeds, soft lighting.
  const config = {
    bw: 360,  // slightly higher buffer for smoother gradients
    bh: 200,
    waves: [
      // amplitude A, direction (kx,ky), phase, speed
      { A: 0.35, kx: 2.5, ky: 0.7,  speed: 0.35, phase: 0.0 },
      { A: 0.20, kx: 1.4, ky: -1.1, speed: 0.25, phase: 1.2 },
      { A: 0.12, kx: 3.3, ky: -0.4, speed: 0.50, phase: 2.1 },
      { A: 0.08, kx: 4.1, ky:  1.8, speed: 0.65, phase: 0.6 }
    ],
    // Colors (sRGB)
    sky:  { r: 140, g: 178, b: 210 },   // soft blue sky reflection
    water:{ r:   8, g:  36, b:  56 },   // deep ocean base
    shallowTint: { r: 18, g: 92, b: 110 }, // subtle turquoise tint
    sunDir: { x: -0.2, y: -0.4, z: 0.88 }, // high, behind camera-left
    foamSlope: 0.92,        // where foam may appear (slope threshold)
    specular: 0.18,         // specular intensity
    exposure: 1.0
  };

  function initOcean() {
    canvas = document.getElementById('wavepool');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    off = document.createElement('canvas');
    off.width = config.bw; off.height = config.bh;
    offCtx = off.getContext('2d', { willReadFrequently: true });
    resize();
    window.addEventListener('resize', resize);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(loop);
    } else {
      renderFrame(0);
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.floor(rect.width));
    cssH = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Height + normal from summed waves
  function sample(x, y, time) {
    let h = 0, gx = 0, gy = 0;
    for (const w of config.waves) {
      const klen = Math.hypot(w.kx, w.ky);
      const omega = klen * w.speed;
      const a = w.A;
      const ph = w.kx * x + w.ky * y - omega * time + w.phase;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      h += a * s;
      gx += a * w.kx * c;
      gy += a * w.ky * c;
    }
    // normal = normalize( -∂h/∂x, -∂h/∂y, 1 )
    const nx = -gx, ny = -gy, nz = 1.0;
    const invLen = 1.0 / Math.sqrt(nx*nx + ny*ny + nz*nz);
    return { h, nx: nx*invLen, ny: ny*invLen, nz: nz*invLen };
  }

  function renderFrame(timeMs) {
    t = timeMs * 0.001;
    const w = config.bw, h = config.bh;
    const img = offCtx.getImageData(0, 0, w, h);
    const data = img.data;
    const sun = config.sunDir;

    for (let j = 0; j < h; j++) {
      // map j to world y (bigger scale -> calmer look)
      const y = (j / h) * 6.0;
      for (let i = 0; i < w; i++) {
        const x = (i / w) * 6.0;
        const s = sample(x, y, t);

        // Fresnel (view dir ~ (0,0,1)): reflect more at grazing angles
        const F = Math.pow(1.0 - Math.max(0, s.nz), 3.0); // smoother than Schlick for this scene

        // Lambert with sun
        const lambert = Math.max(0, s.nx * sun.x + s.ny * sun.y + s.nz * sun.z);

        // Specular highlight
        const spec = Math.pow(lambert, 64.0) * 255.0 * config.specular;

        // Depth tint by height: higher crests slightly lighter
        const heightTint = Math.max(0, Math.min(1, (s.h + 0.5) * 0.5)); // [-? .. ?] -> [0..1]

        // Base transmission (water body)
        let wr = config.water.r * (1.0 - heightTint) + config.shallowTint.r * heightTint;
        let wg = config.water.g * (1.0 - heightTint) + config.shallowTint.g * heightTint;
        let wb = config.water.b * (1.0 - heightTint) + config.shallowTint.b * heightTint;

        // Reflection (sky)
        const sr = config.sky.r, sg = config.sky.g, sb = config.sky.b;

        // Mix reflection vs transmission by Fresnel
        let r = wr * (1 - F) + sr * F;
        let g = wg * (1 - F) + sg * F;
        let b = wb * (1 - F) + sb * F;

        // Add subtle specular
        r += spec * 0.4; g += spec * 0.5; b += spec * 0.6;

        // Optional foam only at steeper slopes
        const slope = Math.sqrt(1.0 - s.nz);
        if (slope > config.foamSlope) {
          const f = Math.min(1, (slope - config.foamSlope) / (1.0 - config.foamSlope));
          r = r * (1 - f) + 235 * f;
          g = g * (1 - f) + 240 * f;
          b = b * (1 - f) + 245 * f;
        }

        // Exposure/gamma-ish tweak
        r = Math.min(255, r * config.exposure);
        g = Math.min(255, g * config.exposure);
        b = Math.min(255, b * config.exposure);

        const idx = (j * w + i) * 4;
        data[idx] = r & 255;
        data[idx + 1] = g & 255;
        data[idx + 2] = b & 255;
        data[idx + 3] = 255;
      }
    }
    offCtx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, cssW, cssH);
  }

  function loop(time) {
    renderFrame(time);
    requestAnimationFrame(loop);
  }
})();