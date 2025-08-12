(function () {
  'use strict';
  function toggleTheme() {
    const body = document.body;
    const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    try { localStorage.setItem('theme', newTheme); } catch(e){}
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${newTheme==='light'?'dark':'light'} theme`);
  }
  function initTheme() {
    let theme = 'dark';
    try { theme = localStorage.getItem('theme') || theme; } catch(e){}
    if (!theme && window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
    document.body.setAttribute('data-theme', theme);
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${theme==='light'?'dark':'light'} theme`);
  }
  function saveCanvasSnapshot(canvas, filename) {
    try {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url; link.download = `${filename}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) {
      const win = window.open(''); win.document.write(`<img src="${canvas.toDataURL('image/png')}" alt="Snapshot" />`);
    }
  }
  function detectWebGLCapabilities() {
    const result = { webgl:false, webgl2:false, floatTextures:false, linearFloatTextures:false };
    let canvas, gl;
    try {
      canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl2');
      if (gl) {
        result.webgl = true; result.webgl2 = true;
        const colorBufferFloat = gl.getExtension('EXT_color_buffer_float');
        const textureFloatLinear = gl.getExtension('OES_texture_float_linear');
        result.floatTextures = !!colorBufferFloat;
        result.linearFloatTextures = !!textureFloatLinear;
      } else {
        gl = canvas.getContext('webgl');
        if (gl) {
          result.webgl = true;
          const textureFloat = gl.getExtension('OES_texture_float');
          const colorBufferFloat = gl.getExtension('WEBGL_color_buffer_float');
          const textureFloatLinear = gl.getExtension('OES_texture_float_linear');
          result.floatTextures = !!(textureFloat && colorBufferFloat);
          result.linearFloatTextures = !!textureFloatLinear;
        }
      }
    } catch(e){}
    return result;
  }
  function attachPointerEvents(element, handler) {
    let down = false;
    function coords(e){
      let cx, cy;
      if (e.touches && e.touches[0]) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      const r = element.getBoundingClientRect();
      const x = (cx - r.left) / r.width; const y = (cy - r.top) / r.height;
      return {x: Math.min(Math.max(x,0),1), y: Math.min(Math.max(y,0),1)};
    }
    element.addEventListener('mousedown', (e)=>{ down=true; handler({...coords(e), type:'start'}); });
    element.addEventListener('touchstart', (e)=>{ down=true; handler({...coords(e), type:'start'}); e.preventDefault(); }, {passive:false});
    element.addEventListener('mousemove', (e)=>{ if(!down) return; handler({...coords(e), type:'move'}); });
    element.addEventListener('touchmove', (e)=>{ if(!down) return; handler({...coords(e), type:'move'}); e.preventDefault(); }, {passive:false});
    function end(e){ if(!down) return; down=false; handler({...coords(e), type:'end'}); }
    element.addEventListener('mouseup', end); element.addEventListener('mouseleave', end);
    element.addEventListener('touchend', end); element.addEventListener('touchcancel', end);
  }
  function getResolutionScale() {
    const dpr = window.devicePixelRatio || 1;
    const mem = navigator.deviceMemory || 4;
    let s = 1; if (mem <= 2 || dpr > 2) s = 0.5; else if (mem <= 4) s = 0.75;
    return s;
  }
  function createRandom(seed){
    let t = seed + 0x6d2b79f5;
    return function(){
      t += 0x6d2b79f5; let v = Math.imul(t ^ (t>>>15), 1 | t);
      v = (v + Math.imul(v ^ (v>>>7), v | 61)) ^ v;
      return ((v ^ (v>>>14)) >>> 0) / 4294967296;
    };
  }
  window.FluidUtils = { toggleTheme, initTheme, saveCanvasSnapshot, detectWebGLCapabilities, attachPointerEvents, getResolutionScale, createRandom };
})();