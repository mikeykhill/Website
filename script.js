// Dark/light mode toggle
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  updateCanvasStyle();
});

// Clock
function updateClock() {
  const now = new Date();
  const clock = document.getElementById("clock");
  clock.textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// Weather (uses browser location)
function getWeather(lat, lon) {
  fetch(`https://wttr.in/${lat},${lon}?format=%t`)
    .then(res => res.text())
    .then(data => {
      document.getElementById("weather").textContent = `Weather: ${data}`;
    })
    .catch(() => {
      document.getElementById("weather").textContent = "Weather unavailable";
    });
}
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => getWeather(pos.coords.latitude, pos.coords.longitude),
    () => {
      document.getElementById("weather").textContent = "Location blocked";
    }
  );
}

// Background animations
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
let bgStyle = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let dots = Array.from({ length: 100 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 2 + 1,
  dx: Math.random() - 0.5,
  dy: Math.random() - 0.5
}));

function updateCanvasStyle() {
  const isLight = document.body.classList.contains("light");
  ctx.fillStyle = isLight ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.2)";
  ctx.strokeStyle = isLight ? "#888" : "#58a6ff";
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (bgStyle) {
    case 0:
      for (let dot of dots) {
        dot.x += dot.dx;
        dot.y += dot.dy;
        if (dot.x < 0 || dot.x > canvas.width) dot.dx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.dy *= -1;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 1:
      for (let i = 0; i < canvas.width; i += 20) {
        for (let j = 0; j < canvas.height; j += 20) {
          ctx.beginPath();
          ctx.arc(i, j, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      break;
    case 2:
      const t = Date.now() * 0.002;
      for (let x = 0; x < canvas.width; x += 30) {
        const y = canvas.height / 2 + Math.sin(x * 0.01 + t) * 50;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }

  requestAnimationFrame(animate);
}
updateCanvasStyle();
animate();

// Toggle background style
document.getElementById("bg-toggle").addEventListener("click", () => {
  bgStyle = (bgStyle + 1) % 3;
});
