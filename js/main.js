/* =======================================================
   CONFIGURATION
   ======================================================= */
// WeatherAPI Key (Free tier)
const WEATHER_API_KEY = '84acb4b38fbe409b9b3131518250108';

/* =======================================================
   DOM ELEMENTS (Hooks to your HTML)
   ======================================================= */
const greetingEl      = document.getElementById('greeting');
const cityStateEl     = document.getElementById('citystate');
const locationEl      = document.getElementById('location');
const clockEl         = document.getElementById('clock');
const weatherTextEl   = document.getElementById('weather-text');
const bgContainer     = document.getElementById('bg-animation-3');
const app             = document.getElementById('app');
const fitWrapper      = document.getElementById('fit-wrapper');
const buttonContainer = document.querySelector('.button-container');
const itBtn           = document.getElementById('it-btn');

/* =======================================================
   TOP CORNER BUTTON ROUTING
   ======================================================= */
// The '?' ensures the code doesn't crash if the IT button is ever removed from the HTML
itBtn?.addEventListener('click', () => {
  window.open('https://it.mhservers.com', '_blank', 'noopener,noreferrer');
});

/* =======================================================
   BACKGROUND: 3D PARTICLE OCEAN (THREE.JS)
   ======================================================= */
// This runs immediately as an IIFE (Immediately Invoked Function Expression)
(function initParticleOceanAsync() {
  if (!bgContainer) return;

  function start() {
    if (!window.THREE) return;

    let renderer;
    try {
      // Initialize WebGL with transparency enabled to blend with the CSS background
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // Silently fail if the browser doesn't support WebGL
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020202, 0.00045); // Creates depth by fading distant particles into the background color

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 1200;
    camera.position.y = 300;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020202, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true'); // Hides the canvas from screen readers

    bgContainer.innerHTML = '';
    bgContainer.appendChild(renderer.domElement);

    // Responsive particle count: heavily reduced on mobile devices to save battery and performance
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
    
    // Generate the grid of particles
    for (let ix = 0; ix < amountX; ix++) {
      for (let iz = 0; iz < amountZ; iz++) {
        positions[ptr++] = ix * separation - offsetX;
        positions[ptr++] = 0; // Y position is set dynamically during render
        positions[ptr++] = iz * separation - offsetZ;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Creates a soft, circular texture for the particles using a hidden 2D canvas
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
      color: 0x00aaff, // Cyan accent color
      size: isMobileBg ? 5 : 6,
      map: getCircleTexture(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending // Makes overlapping particles glow brighter
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let mouseX = 0;
    let windowHalfX = window.innerWidth / 2;

    // Shift camera angle slightly based on mouse position (passive:true improves scrolling performance)
    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX - windowHalfX;
    }, { passive: true });

    // Handle window resizing
    window.addEventListener('resize', () => {
      windowHalfX = window.innerWidth / 2;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let count = 0;
    const prefersReducedMotionBg = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Core animation loop
    function render() {
      const pos = particles.geometry.attributes.position.array;
      let i = 0;
      count += 0.02; // Speed of the wave
      
      // Calculate the sine wave for the ocean effect
      for (let ix = 0; ix < amountX; ix++) {
        for (let iz = 0; iz < amountZ; iz++) {
          pos[i + 1] = (Math.sin((ix + count) * 0.3) * 50) +
                       (Math.sin((iz + count) * 0.3) * 50);
          i += 3;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Smoothly rotate the entire ocean based on mouse movement
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

  // Inject the Three.js library dynamically so it doesn't block the initial page load
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
// Formats time as "12:00:00 PM"
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

// Initialize clock and update every second
updateGreeting();
updateClock();
setInterval(() => { 
  updateClock(); 
  updateGreeting(); 
}, 1000);

/* =======================================================
   WEATHER WIDGET
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

// Helper function to process weather data and update the DOM
async function applyWeatherToDOM(query, isFallback = false) {
  try {
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${query}&aqi=no`);
    if (!response.ok) throw new Error('Weather API error');
    const data = await response.json();

    const city   = data.location.name;
    const region = data.location.region || data.location.country;
    cityStateEl.textContent = `${city}, ${region}`;
    
    // Only update the latitude/longitude text if we are using exact GPS coordinates
    if (!isFallback) {
      const lat = data.location.lat;
      const lon = data.location.lon;
      locationEl.textContent  = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    } else {
      locationEl.textContent = 'Default Location';
    }

    const tempF         = data.current.temp_f;
    const wind          = data.current.wind_mph;
    const conditionText = data.current.condition.text;
    const condition     = conditionText.toLowerCase();

    // Match condition text to the correct emoji
    let emoji = '🌡️';
    for (const { keywords, icon } of emojiMap) {
      if (keywords.some(w => condition.includes(w))) { emoji = icon; break; }
    }
    weatherTextEl.textContent = `Temp: ${tempF}°F, Wind: ${wind} mph, ${conditionText} ${emoji}`;
  } catch {
    cityStateEl.textContent = 'Weather data unavailable';
    weatherTextEl.textContent = 'Check API connection';
  }
}

async function fetchWeather() {
  if (!navigator.geolocation) {
    applyWeatherToDOM('Vero Beach, FL', true); // Fallback if browser doesn't support geolocator
    return;
  }

  // Request user location
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Success: Fetch weather based on exact coordinates
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      applyWeatherToDOM(`${lat},${lon}`);
      fitToViewport(); // Recalculate scaling once text populates
    }, 
    () => {
      // Denied/Error: Fall back to default location instead of breaking the widget
      applyWeatherToDOM('Vero Beach, FL', true);
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

// Loop through each button ID and attach click/keyboard events
Object.entries(buttonLinks).forEach(([id, url]) => {
  const btn = document.getElementById(id);
  
  if (btn) { // Safety check ensures script doesn't crash if a button is removed
    btn.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
    
    // Accessibility: Allow activating buttons with Enter or Spacebar
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

// Only apply complex hover effects if the user is on a desktop mouse (pointer: fine)
if (hasFineHover && !prefersReduced) {
  document.querySelectorAll('.service-button').forEach(card => {
    let lastX = 0, lastY = 0, rect = null, ticking = false;

    // Track when mouse enters the button
    card.addEventListener('pointerenter', () => { 
      rect = card.getBoundingClientRect(); 
    });
    
    // Reset button tilt when mouse leaves
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
    
    // Calculate 3D tilt based on mouse position inside the button
    card.addEventListener('pointermove', (e) => {
      if (!rect) return;
      lastX = e.clientX - rect.left; 
      lastY = e.clientY - rect.top;
      if (ticking) return; 
      ticking = true;
      
      requestAnimationFrame(() => {
        const midX    = rect.width / 2, midY = rect.height / 2;
        const rotateY = ((lastX - midX) / midX) * 6; // Max rotation 6deg
        const rotateX = -((lastY - midY) / midY) * 6;
        card.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
        ticking = false;
      });
    });

    // Material design ripple effect on click
    card.addEventListener('click', (e) => {
      const r      = card.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(r.width, r.height) * 0.5;
      // Position ripple exactly where the click occurred
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      card.appendChild(ripple);
      // Clean up the DOM element after the animation finishes
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
}

/* =======================================================
   ON-LOAD INTRO ANIMATION
   ======================================================= */
if (!prefersReduced && buttonContainer) {
  // Triggers the cascading slide-up animation in CSS
  requestAnimationFrame(() => buttonContainer.classList.add('intro'));
} else if (buttonContainer) {
  // If user prefers reduced motion, skip animation and show instantly
  document.querySelectorAll('.service-button').forEach(b => b.style.opacity = '1');
}

/* =======================================================
   MOBILE: FIT TO VIEWPORT SCALING
   ======================================================= */
// Prevents mobile browsers from hiding content behind the address bar/notch
const isSmallScreen = () => window.matchMedia('(max-width: 560px)').matches;

function fitToViewport() {
  if (!isSmallScreen()) {
    document.documentElement.style.setProperty('--fit-scale', '1');
    document.body.style.overflowY = 'auto';
    return;
  }
  
  // Lock scrolling on mobile and shrink the UI to fit perfectly within available height
  document.body.style.overflowY = 'hidden';
  app.style.transform = 'scale(1)';
  const available = window.innerHeight;
  const needed    = app.getBoundingClientRect().height;
  const scale     = Math.min(1, available / needed);
  
  document.documentElement.style.setProperty('--fit-scale', String(scale));
  fitWrapper.style.height = available + 'px';
}

// Re-calculate scaling when window changes (e.g., rotating phone)
window.addEventListener('load', fitToViewport);
setTimeout(fitToViewport, 300);
window.addEventListener('resize', fitToViewport);
window.addEventListener('orientationchange', () => setTimeout(fitToViewport, 50));
