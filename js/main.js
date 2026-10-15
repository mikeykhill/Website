/* =======================================================
   CONFIGURATION
   ======================================================= */
const IDLE_FADE_MS    = 20000; // 20 seconds of mouse inactivity before middle UI fades on Harbor BG

/* =======================================================
   DOM ELEMENTS (Hooks to your HTML)
   ======================================================= */
const greetingEl      = document.getElementById('greeting');
const cityStateEl     = document.getElementById('citystate');
const locationEl      = document.getElementById('location');
const clockEl         = document.getElementById('clock');
const weatherTextEl   = document.getElementById('weather-text');
const bgContainer     = document.getElementById('bg-animation-3');
const harborFrame     = document.getElementById('bg-harbor');
const app             = document.getElementById('app');
const fitWrapper      = document.getElementById('fit-wrapper');
const buttonContainer = document.querySelector('.button-container');
const itBtn           = document.getElementById('it-btn');
const bgToggleBtn     = document.getElementById('bg-toggle-btn');

/* =======================================================
   BACKGROUND STATE & IDLE / AUTO-CAMERA FADE LOGIC
   ======================================================= */
let isHarborActive  = false;
let isHarborLoaded  = false;
let isAutoCamLocked = false;
let idleTimer       = null;

function fadeOutMainUI() {
  if (!isHarborActive) return;
  app?.classList.add('ui-faded');
}

function fadeInMainUI() {
  app?.classList.remove('ui-faded');
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  // Only run the 20s inactivity timer when on the Harbor background and Auto Camera is OFF
  if (!isHarborActive || isAutoCamLocked) return;

  fadeInMainUI();
  idleTimer = setTimeout(() => {
    if (isHarborActive && !isAutoCamLocked) {
      fadeOutMainUI();
    }
  }, IDLE_FADE_MS);
}

// Listen for mouse movement on the main document to bring UI back and reset the 20s timer
['mousemove', 'pointermove', 'keydown', 'touchstart'].forEach(evtName => {
  window.addEventListener(evtName, () => {
    if (isHarborActive && !isAutoCamLocked) {
      resetIdleTimer();
    }
  }, { passive: true });
});

// Hook into harbor.html iframe once loaded
function attachHarborHooks() {
  if (!harborFrame) return;
  try {
    const hWin = harborFrame.contentWindow;
    const hDoc = harborFrame.contentDocument || hWin?.document;
    if (!hDoc) return;

    // 1. Make Night Mode the default on startup
    const dayNightBtn   = hDoc.getElementById('day-night-btn');
    const dayNightIcon  = hDoc.getElementById('day-night-icon');
    const dayNightLabel = hDoc.getElementById('day-night-label');

    if (dayNightBtn && !dayNightBtn.classList.contains('is-night')) {
      dayNightBtn.click(); // Toggles NightEnvironment.isNight = true and updates button UI
    }
    // Also set nightMix = 1.0 immediately so there is no daytime transition flash
    if (hWin && hWin.NightEnvironment) {
      hWin.NightEnvironment.isNight  = true;
      hWin.NightEnvironment.nightMix = 1.0;
      if (dayNightBtn)   dayNightBtn.classList.add('is-night');
      if (dayNightIcon)  dayNightIcon.innerText  = '☀️';
      if (dayNightLabel) dayNightLabel.innerText = 'Day Mode';
    }

    // 2. Forward mouse movement inside the harbor iframe to our 20-second inactivity timer
    ['mousemove', 'pointermove', 'touchstart'].forEach(evtName => {
      hDoc.addEventListener(evtName, () => {
        if (isHarborActive && !isAutoCamLocked) {
          resetIdleTimer();
        }
      }, { passive: true });
    });

    // 3. Hook the Auto Camera button at the bottom of harbor.html
    const autoCamBtn = hDoc.getElementById('auto-cam-btn');
    if (autoCamBtn && !autoCamBtn.dataset.fadeHooked) {
      autoCamBtn.dataset.fadeHooked = 'true';
      autoCamBtn.addEventListener('click', () => {
        // Check if Auto Camera was just activated
        setTimeout(() => {
          isAutoCamLocked = autoCamBtn.classList.contains('is-active-cam');
          clearTimeout(idleTimer);
          if (isAutoCamLocked) {
            fadeOutMainUI();
          } else {
            fadeInMainUI();
            resetIdleTimer();
          }
        }, 0);
      });
    }
  } catch (err) {
    console.warn('Could not attach direct hooks to harbor.html:', err);
  }
}

harborFrame?.addEventListener('load', attachHarborHooks);

/* =======================================================
   TOP CORNER BUTTON ROUTING
   ======================================================= */
itBtn?.addEventListener('click', () => {
  window.open('https://it.mhservers.com', '_blank', 'noopener,noreferrer');
});

bgToggleBtn?.addEventListener('click', () => {
  isHarborActive = !isHarborActive;

  if (isHarborActive) {
    // Lazy-load harbor.html the first time you switch to it
    if (!isHarborLoaded && harborFrame) {
      harborFrame.src = 'harbor.html';
      isHarborLoaded = true;
    }
    harborFrame?.classList.add('active');
    if (bgContainer) bgContainer.style.opacity = '0';

    bgToggleBtn.textContent = '🌊 Particle BG';
    bgToggleBtn.classList.add('harbor-active');

    if (isAutoCamLocked) {
      fadeOutMainUI();
    } else {
      resetIdleTimer();
    }
  } else {
    harborFrame?.classList.remove('active');
    if (bgContainer) bgContainer.style.opacity = '1';

    bgToggleBtn.textContent = '⚓ Harbor BG';
    bgToggleBtn.classList.remove('harbor-active');

    clearTimeout(idleTimer);
    fadeInMainUI();
  }
});

/* =======================================================
   BACKGROUND: 3D PARTICLE OCEAN (THREE.JS)
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
      // Skip rendering the particle ocean while the Harbor Logistics background is active
      if (isHarborActive) return;

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
   TIME & GREETING LOGIC
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

function updateClock() { 
  clockEl.textContent = timeFmt.format(new Date()); 
}

updateGreeting();
updateClock();
setInterval(() => { 
  updateClock(); 
  updateGreeting(); 
}, 1000);

/* =======================================================
   WEATHER WIDGET (Open-Meteo Integration - No API Key)
   ======================================================= */
const weatherCodeMap = {
  0:  { text: 'Clear sky',             icon: '☀️' },
  1:  { text: 'Mainly clear',          icon: '🌤️' },
  2:  { text: 'Partly cloudy',         icon: '⛅' },
  3:  { text: 'Overcast',              icon: '☁️' },
  45: { text: 'Fog',                   icon: '🌫️' },
  48: { text: 'Depositing rime fog',   icon: '🌫️' },
  51: { text: 'Light drizzle',         icon: '🌧️' },
  53: { text: 'Moderate drizzle',      icon: '🌧️' },
  55: { text: 'Dense drizzle',         icon: '🌧️' },
  61: { text: 'Slight rain',           icon: '🌧️' },
  63: { text: 'Moderate rain',         icon: '🌧️' },
  65: { text: 'Heavy rain',            icon: '🌧️' },
  71: { text: 'Slight snow fall',      icon: '❄️' },
  73: { text: 'Moderate snow fall',    icon: '❄️' },
  75: { text: 'Heavy snow fall',       icon: '❄️' },
  95: { text: 'Thunderstorm',          icon: '⛈️' },
};

async function applyWeatherToDOM(lat, lon, locationLabel) {
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
    if (!response.ok) throw new Error('Open-Meteo API error');
    const data = await response.json();

    cityStateEl.textContent = locationLabel;
    locationEl.textContent  = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;

    const tempC         = data.current.temperature_2m;
    const tempF         = (tempC * 9/5) + 32;
    const windKmh       = data.current.wind_speed_10m;
    const windMph       = windKmh * 0.621371;
    const weatherCode   = data.current.weather_code;

    const condition     = weatherCodeMap[weatherCode] || { text: 'Fair', icon: '🌡️' };
    
    weatherTextEl.textContent = `Temp: ${tempF.toFixed(1)}°F, Wind: ${windMph.toFixed(1)} mph, ${condition.text} ${condition.icon}`;
  } catch {
    cityStateEl.textContent = 'Weather data unavailable';
    weatherTextEl.textContent = 'Check network connection';
  }
}

async function fetchWeather() {
  if (!navigator.geolocation) {
    // Default fallback coordinates for Vero Beach, FL
    applyWeatherToDOM(27.6386, -80.3973, 'Vero Beach, FL');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      // Reverse geocode rough region name or display coordinates cleanly
      applyWeatherToDOM(lat, lon, `Lat: ${lat.toFixed(1)}, Lon: ${lon.toFixed(1)}`);
      fitToViewport();
    }, 
    () => {
      // Fallback to Vero Beach, FL if location permission is denied
      applyWeatherToDOM(27.6386, -80.3973, 'Vero Beach, FL');
      fitToViewport();
    }
  );
}

fetchWeather();

/* =======================================================
   MAIN GRID BUTTON HANDLERS
   ======================================================= */
const buttonLinks = {
  'jellyfin-btn':  'https://jellyfin.mhservers.com',
  'nextcloud-btn': 'https://nextcloud.mhservers.com',
  'converter-btn': 'https://convertx.mhservers.com',
};

Object.entries(buttonLinks).forEach(([id, url]) => {
  const btn = document.getElementById(id);
  
  if (btn) {
    btn.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
    
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }
});

/* =======================================================
   DESKTOP TILT & RIPPLE EFFECTS
   ======================================================= */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFineHover   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (hasFineHover && !prefersReduced) {
  document.querySelectorAll('.service-button').forEach(card => {
    let lastX = 0, lastY = 0, rect = null, ticking = false;

    card.addEventListener('pointerenter', () => { 
      rect = card.getBoundingClientRect(); 
    });
    
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
    
    card.addEventListener('pointermove', (e) => {
      if (!rect) return;
      lastX = e.clientX - rect.left; 
      lastY = e.clientY - rect.top;
      if (ticking) return; 
      ticking = true;
      
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
   ON-LOAD INTRO ANIMATION
   ======================================================= */
if (!prefersReduced && buttonContainer) {
  requestAnimationFrame(() => buttonContainer.classList.add('intro'));
} else if (buttonContainer) {
  document.querySelectorAll('.service-button').forEach(b => b.style.opacity = '1');
}

/* =======================================================
   MOBILE: FIT TO VIEWPORT SCALING
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
