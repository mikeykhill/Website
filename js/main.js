const WEATHER_API_KEY = '84acb4b38fbe409b9b3131518250108';

/* =======================================================
   DOM HOOKS
   ======================================================= */
const greetingEl     = document.getElementById('greeting');
const cityStateEl    = document.getElementById('citystate');
const locationEl     = document.getElementById('location');
const clockEl        = document.getElementById('clock');
const weatherTextEl  = document.getElementById('weather-text');
const bgContainer    = document.getElementById('bg-animation-3');
const app            = document.getElementById('app');
const fitWrapper     = document.getElementById('fit-wrapper');
const buttonContainer = document.querySelector('.button-container');

/* =======================================================
   TOP CORNER BUTTON LINK
   ======================================================= */
document.getElementById('it-btn').addEventListener('click', () => {
  window.open('https://it.mhservers.com', '_blank', 'noopener,noreferrer');
});

/* =======================================================
   BACKGROUND: HIGH DENSITY PARTICLE OCEAN (THREE.JS)
   ======================================================= */
(function initParticleOceanAsync() {
  if (!bgContainer) return;

  function start() {
    if (!window.THREE) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020202, 0.00045);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 1200;
    camera.position.y = 300;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020202, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    bgContainer.innerHTML = '';
    bgContainer.appendChild(renderer.domElement);

    const isMobileBg = window.matchMedia('(max-width: 560px)').matches;
    const amountX  = isMobileBg ? 140 : 250;
    const amountZ  = isMobileBg ? 420 : 1200;
    const separation = isMobileBg ? 48 : 40;

    const numParticles = amountX * amountZ;
    const geometry = new THREE.BufferGeometry();
    const offsetX  = (amountX * separation) / 2;
    const offsetZ  = (amountZ * separation) / 2;

    const positions = new Float32Array(numParticles * 3);
    let ptr = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iz = 0; iz < amountZ; iz++) {
        positions[ptr++] = ix * separation - offsetX;
        positions[ptr++] = 0;
        positions[ptr++] = iz * separation - offsetZ;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    function getCircleTexture() {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      const tex = new THREE.Texture(c);
      tex.needsUpdate = true;
      return tex;
    }

    const material = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: isMobileBg ? 5 : 6,
      map: getCircleTexture(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let mouseX = 0;
    let windowHalfX = window.innerWidth / 2;

    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX - windowHalfX;
    }, { passive: true });

    window.addEventListener('resize', () => {
      windowHalfX = window.innerWidth / 2;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let count = 0;
    const prefersReducedMotionBg = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render() {
      const pos = particles.geometry.attributes.position.array;
      let i = 0;
      count += 0.02;
      for (let ix = 0; ix < amountX; ix++) {
        for (let iz = 0; iz < amountZ; iz++) {
          pos[i + 1] = (Math.sin((ix + count) * 0.3) * 50) +
                       (Math.sin((iz + count) * 0.3) * 50);
          i += 3;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.03 * (mouseX * 0.0003 - particles.rotation.y);
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }

    function animate() {
      if (!prefersReducedMotionBg) requestAnimationFrame(animate);
      render();
    }
    animate();
  }

  if (window.THREE) { start(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  s.async = true;
  s.onload  = start;
  s.onerror = () => {};
  document.head.appendChild(s);
})();

/* =======================================================
   GREETING + CLOCK
   ======================================================= */
const timeFmt = new Intl.DateTimeFormat([], {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
});

function updateGreeting() {
  const hour = new Date().getHours();
  greetingEl.textContent =
    (hour >= 5 && hour < 12) ? 'Good morning,'  :
    (hour >= 12 && hour < 18) ? 'Good afternoon,' : 'Good evening,';
}
function updateClock() { clockEl.textContent = timeFmt.format(new Date()); }
updateGreeting();
updateClock();
setInterval(() => { updateClock(); updateGreeting(); }, 1000);

/* =======================================================
   WEATHER
   ======================================================= */
const emojiMap = [
  { keywords: ['clear', 'sunny'],            icon: '☀️' },
  { keywords: ['partly', 'mostly sunny'],   icon: '🌤️' },
  { keywords: ['cloud', 'overcast'],        icon: '☁️' },
  { keywords: ['rain', 'shower', 'drizzle'],icon: '🌧️' },
  { keywords: ['thunder'],                  icon: '⛈️' },
  { keywords: ['snow'],                     icon: '❄️' },
  { keywords: ['fog', 'mist', 'haze'],      icon: '🌫️' },
];

async function fetchWeather() {
  if (!navigator.geolocation) {
    cityStateEl.textContent = 'Geolocation not supported';
    locationEl.textContent = '';
    weatherTextEl.textContent = '';
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
      );
      if (!response.ok) throw new Error('Weather API error');
      const data = await response.json();

      const city   = data.location.name;
      const region = data.location.region || data.location.country;
      cityStateEl.textContent = `${city}, ${region}`;
      locationEl.textContent  = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;

      const tempF         = data.current.temp_f;
      const wind          = data.current.wind_mph;
      const conditionText = data.current.condition.text;
      const condition     = conditionText.toLowerCase();

      let emoji = '🌡️';
      for (const { keywords, icon } of emojiMap) {
        if (keywords.some(w => condition.includes(w))) { emoji = icon; break; }
      }
      weatherTextEl.textContent = `Temp: ${tempF}°F, Wind: ${wind} mph, ${conditionText} ${emoji}`;
    } catch {
      /* WeatherAPI failed — fall back to reverse geocode for city name only */
      locationEl.textContent = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
      try {
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
        );
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          const addr    = geoData.address || {};
          const city    = addr.city || addr.town || addr.village || addr.hamlet || '';
          const state   = addr.state || addr.county || '';
          cityStateEl.textContent = (city && state) ? `${city}, ${state}` : 'Unknown Location';
        } else {
          cityStateEl.textContent = 'Location unavailable';
        }
      } catch {
        cityStateEl.textContent = 'Location unavailable';
      }
      weatherTextEl.textContent = 'Weather data unavailable';
    }

    fitToViewport();
  }, () => {
    /* Geolocation denied */
    cityStateEl.textContent = 'Location access denied';
    locationEl.textContent  = '';
    weatherTextEl.textContent = '';
    fitToViewport();
  });
}

fetchWeather();

/* =======================================================
   BUTTON HANDLERS
   ======================================================= */
const buttonLinks = {
  'jellyfin-btn':  'https://jellyfin.mhservers.com',
  'nextcloud-btn': 'https://nextcloud.mhservers.com',
  'converter-btn': 'https://convertx.mhservers.com',
};
Object.entries(buttonLinks).forEach(([id, url]) => {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
  /* Keyboard accessibility: trigger on Enter or Space */
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
});

/* =======================================================
   DESKTOP-ONLY: tilt + ripple
   ======================================================= */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFineHover   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (hasFineHover && !prefersReduced) {
  document.querySelectorAll('.service-button').forEach(card => {
    let lastX = 0, lastY = 0, rect = null, ticking = false;

    card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); });
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
    card.addEventListener('pointermove', (e) => {
      if (!rect) return;
      lastX = e.clientX - rect.left; lastY = e.clientY - rect.top;
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const midX    = rect.width / 2, midY = rect.height / 2;
        const rotateY = ((lastX - midX) / midX) * 6;
        const rotateX = -((lastY - midY) / midY) * 6;
        card.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
        ticking = false;
      });
    });
    card.addEventListener('click', (e) => {
      const r      = card.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(r.width, r.height) * 0.5;
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      card.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
}

/* =======================================================
   INTRO ANIMATION
   ======================================================= */
if (!prefersReduced && buttonContainer) {
  requestAnimationFrame(() => buttonContainer.classList.add('intro'));
} else if (buttonContainer) {
  document.querySelectorAll('.service-button').forEach(b => b.style.opacity = '1');
}

/* =======================================================
   MOBILE: FIT TO VIEWPORT
   ======================================================= */
const isSmallScreen = () => window.matchMedia('(max-width: 560px)').matches;

function fitToViewport() {
  if (!isSmallScreen()) {
    document.documentElement.style.setProperty('--fit-scale', '1');
    document.body.style.overflowY = 'auto';
    return;
  }
  document.body.style.overflowY = 'hidden';
  app.style.transform = 'scale(1)';
  const available = window.innerHeight;
  const needed    = app.getBoundingClientRect().height;
  const scale     = Math.min(1, available / needed);
  document.documentElement.style.setProperty('--fit-scale', String(scale));
  fitWrapper.style.height = available + 'px';
}

window.addEventListener('load', fitToViewport);
setTimeout(fitToViewport, 300);
window.addEventListener('resize', fitToViewport);
window.addEventListener('orientationchange', () => setTimeout(fitToViewport, 50));
