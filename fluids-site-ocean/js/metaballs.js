(function () {
  'use strict';
  class Metaballs {
    constructor(canvas){
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      this.blobCount=5; this.blobs=[]; this.threshold=1.0; this.noiseStrength=0.0;
      this.colorStart={r:0.0,g:1.0,b:1.0}; this.colorEnd={r:1.0,g:0.0,b:0.8}; this.running=true;
      this.bufferWidth=200; this.bufferHeight=112;
      this.buffer=this.ctx.createImageData(this.bufferWidth,this.bufferHeight);
      this.noise=new Float32Array(this.bufferWidth*this.bufferHeight);
      this.initNoise(); this.initBlobs(); this.resizeCanvas();
      this.offCanvas=document.createElement('canvas'); this.offCanvas.width=this.bufferWidth; this.offCanvas.height=this.bufferHeight;
      this.offCtx=this.offCanvas.getContext('2d');
    }
    initNoise(){ const r=FluidUtils.createRandom(98765); for (let i=0;i<this.noise.length;i++) this.noise[i]=r(); }
    initBlobs(){
      this.blobs=[]; const r=FluidUtils.createRandom(54321);
      for (let i=0;i<this.blobCount;i++) this.blobs.push({ x:r(), y:r(), vx:(r()-0.5)*0.3, vy:(r()-0.5)*0.3, r:0.1 + r()*0.15 });
    }
    setBlobCount(n){ this.blobCount=n; this.initBlobs(); }
    update(dt){
      for (const b of this.blobs){
        b.x+=b.vx*dt; b.y+=b.vy*dt;
        if (b.x<0){ b.x=0; b.vx*=-1; } if (b.x>1){ b.x=1; b.vx*=-1; }
        if (b.y<0){ b.y=0; b.vy*=-1; } if (b.y>1){ b.y=1; b.vy*=-1; }
      }
      const bw=this.bufferWidth, bh=this.bufferHeight, data=this.buffer.data;
      for (let j=0;j<bh;j++) for (let i=0;i<bw;i++){
        const x=i/bw, y=j/bh; let val=0;
        for (const b of this.blobs){ const dx=x-b.x, dy=y-b.y; const d2=dx*dx+dy*dy+1e-6; val+=(b.r*b.r)/d2; }
        val += this.noise[j*bw+i]*this.noiseStrength;
        const inside=val>=this.threshold; const t=Math.min(Math.max((val-this.threshold)/this.threshold,0),1);
        const r=inside ? (this.colorStart.r*(1-t)+this.colorEnd.r*t)*255 : 0;
        const g=inside ? (this.colorStart.g*(1-t)+this.colorEnd.g*t)*255 : 0;
        const bcol=inside ? (this.colorStart.b*(1-t)+this.colorEnd.b*t)*255 : 0;
        const idx=(j*bw+i)*4; data[idx]=r; data[idx+1]=g; data[idx+2]=bcol; data[idx+3]=inside?255:0;
      }
    }
    render(){
      const ctx=this.ctx, w=this.canvas.width, h=this.canvas.height;
      this.offCtx.putImageData(this.buffer,0,0);
      ctx.imageSmoothingEnabled=true; ctx.clearRect(0,0,w,h); ctx.drawImage(this.offCanvas,0,0,w,h);
    }
    resizeCanvas(){ const rect=this.canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      this.canvas.width=rect.width*dpr; this.canvas.height=rect.height*dpr; this.ctx.scale(dpr,dpr); }
  }
  function hexToRgbObject(hex){ const v=parseInt(hex.substring(1),16); return { r:((v>>16)&255)/255, g:((v>>8)&255)/255, b:(v&255)/255 }; }
  window.addEventListener('DOMContentLoaded', ()=>{
    if (!document.getElementById('metaballsCanvas')) return;
    FluidUtils.initTheme();
    const navToggle=document.querySelector('.theme-toggle'); if (navToggle) navToggle.addEventListener('click', FluidUtils.toggleTheme);
    const canvas=document.getElementById('metaballsCanvas'); const meta=new Metaballs(canvas);
    const countInput=document.getElementById('blobCount'), tensionInput=document.getElementById('tension'), noiseInput=document.getElementById('noise');
    const colorStartInput=document.getElementById('colorStart'), colorEndInput=document.getElementById('colorEnd');
    const pauseBtn=document.getElementById('pauseMeta'), resetBtn=document.getElementById('resetMeta'), randomBtn=document.getElementById('randomMeta'), snapshotBtn=document.getElementById('snapshotMeta');
    function updateParams(){ meta.threshold=parseFloat(tensionInput.value); meta.noiseStrength=parseFloat(noiseInput.value);
      meta.colorStart=hexToRgbObject(colorStartInput.value); meta.colorEnd=hexToRgbObject(colorEndInput.value);
      const c=parseInt(countInput.value,10); if (c!==meta.blobCount) meta.setBlobCount(c); }
    countInput.addEventListener('input',updateParams); tensionInput.addEventListener('input',updateParams); noiseInput.addEventListener('input',updateParams);
    colorStartInput.addEventListener('input',updateParams); colorEndInput.addEventListener('input',updateParams);
    pauseBtn.addEventListener('click', ()=>{ meta.running=!meta.running; pauseBtn.textContent=meta.running?'Pause':'Resume'; });
    resetBtn.addEventListener('click', ()=> meta.initBlobs() );
    randomBtn.addEventListener('click', ()=>{
      const r=FluidUtils.createRandom(Math.floor(Math.random()*100000));
      countInput.value=Math.floor(3+r()*12); tensionInput.value=(0.8+r()*1.2).toFixed(2); noiseInput.value=(r()*0.5).toFixed(2);
      colorStartInput.value=`#${Math.floor(r()*16777215).toString(16).padStart(6,'0')}`;
      colorEndInput.value=`#${Math.floor(r()*16777215).toString(16).padStart(6,'0')}`; updateParams();
    });
    snapshotBtn.addEventListener('click', ()=> FluidUtils.saveCanvasSnapshot(canvas,'metaballs-snapshot') );
    window.addEventListener('keydown', (e)=>{
      if (e.target.matches('input, select, textarea')) return;
      switch(e.key.toLowerCase()){
        case ' ': pauseBtn.click(); e.preventDefault(); break;
        case 'r': resetBtn.click(); e.preventDefault(); break;
        case '1': countInput.value=4; tensionInput.value=1.0; noiseInput.value=0.1; colorStartInput.value='#00e5ff'; colorEndInput.value='#ff00e5'; updateParams(); break;
        case '2': countInput.value=8; tensionInput.value=0.8; noiseInput.value=0.2; colorStartInput.value='#8a00ff'; colorEndInput.value='#00e5ff'; updateParams(); break;
        case '3': countInput.value=6; tensionInput.value=1.2; noiseInput.value=0.05; colorStartInput.value='#ff00e5'; colorEndInput.value='#8a00ff'; updateParams(); break;
        case 's': snapshotBtn.click(); break;
      }
    });
    window.addEventListener('resize', ()=> meta.resizeCanvas() );
    let last=performance.now();
    function loop(t){ const dt=Math.min((t-last)/1000,0.033); last=t; if (meta.running) meta.update(dt); meta.render(); requestAnimationFrame(loop); }
    updateParams(); meta.resizeCanvas(); requestAnimationFrame(loop);
  });
})();