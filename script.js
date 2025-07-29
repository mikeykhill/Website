let currentAnimation = 1;

function toggleDarkMode() {
  const body = document.body;
  const bg = document.getElementById('background-animation');
  body.classList.toggle('dark');
  updateBackgroundClass();
}

function toggleBackground() {
  currentAnimation = (currentAnimation % 3) + 1;
  updateBackgroundClass();
}

function updateBackgroundClass() {
  const bg = document.getElementById('background-animation');
  const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
  bg.className = `animation-${currentAnimation} ${mode}`;
}

// Clock
setInterval(() => {
  const clock = document.getElementById('clock');
  const now = new Date();
  clock.textContent = now.toLocaleTimeString();
}, 1000);

// Weather
fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74&current_weather=true&temperature_unit=fahrenheit')
  .then(res => res.json())
  .then(data => {
    const temp = data.current_weather.temperature;
    document.getElementById('weather').textContent = `Current Temp: ${temp}°F`;
  });
