(function () {
  'use strict';
  class ParticleFluid {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      this.particles=[]; this.numParticles=300; this.gravity=1.0; this.cohesion=2.0; this.repulsion=0.5; this.drag=0.98;
      this.mouseAttractor=false; this.obstaclesEnabled=true; this.obstacles=[]; this.running=true; this.pointer={x:0.5,y:0.5,active:false};
      this.scale=FluidUtils.getResolutionScale(); this.initParticles(); this.initObstacles(); this.resizeCanvas();
    }
    initParticles(){
      this.particles=[]; const rand=FluidUtils.createRandom(123456);
      for (let i=0;i<this.numParticles;i++) this.particles.push({ x:rand(), y:rand(), vx:0, vy:0, radius:2+rand()*2 });
    }
    initObstacles(){ this.obstacles=[ {x:0.3,y:0.5,r:0.1}, {x:0.7,y:0.6,r:0.08} ]; }
    setNumParticles(n){ this.numParticles=n; this.initParticles(); }
    update(dt){
      const pArr=this.particles, n=pArr.length;
      for (let i=0;i<n;i++){
        const p=pArr[i]; p.vy+=this.gravity*dt;
        if (this.mouseAttractor && this.pointer.active){
          const dx=this.pointer.x-p.x, dy=this.pointer.y-p.y; const dist=Math.hypot(dx,dy)+1e-3; const force=50.0/(dist*dist*n);
          p.vx+=(dx/dist)*force; p.vy+=(dy/dist)*force;
        }
        if (p.x<0){ p.x=0; p.vx*=-0.5; } if (p.x>1){ p.x=1; p.vx*=-0.5; }
        if (p.y<0){ p.y=0; p.vy*=-0.5; } if (p.y>1){ p.y=1; p.vy*=-0.5; }
      }
      const radius=0.05, rad2=radius*radius;
      for (let i=0;i<n;i++){
        const p=pArr[i];
        for (let j=i+1;j<n;j++){
          const q=pArr[j]; let dx=p.x-q.x, dy=p.y-q.y; let d2=dx*dx+dy*dy;
          if (d2<rad2){
            const d=Math.sqrt(d2)+1e-6, nx=dx/d, ny=dy/d;
            const coh=this.cohesion*(1-d/radius)*dt; p.vx-=nx*coh; p.vy-=ny*coh; q.vx+=nx*coh; q.vy+=ny*coh;
            const rep=this.repulsion*(radius-d)*dt; p.vx+=nx*rep; p.vy+=ny*rep; q.vx-=nx*rep; q.vy-=ny*rep;
          }
        }
      }
      for (let i=0;i<n;i++){
        const p=pArr[i]; p.vx*=this.drag; p.vy*=this.drag; p.x+=p.vx*dt; p.y+=p.vy*dt;
        if (this.obstaclesEnabled){
          for (const o of this.obstacles){
            const dx=p.x-o.x, dy=p.y-o.y; const dist=Math.sqrt(dx*dx+dy*dy);
            if (dist<o.r){ const nx=dx/dist, ny=dy/dist, overlap=o.r-dist; p.x+=nx*overlap; p.y+=ny*overlap; const dot=p.vx*nx+p.vy*ny; p.vx-=2*dot*nx; p.vy-=2*dot*ny; }
          }
        }
        if (p.x<0){ p.x=0; p.vx*=-0.5; } if (p.x>1){ p.x=1; p.vx*=-0.5; }
        if (p.y<0){ p.y=0; p.vy*=-0.5; } if (p.y>1){ p.y=1; p.vy*=-0.5; }
      }
    }
    render(){
      const ctx=this.ctx, w=this.canvas.width, h=this.canvas.height;
      ctx.clearRect(0,0,w,h);
      if (this.obstaclesEnabled){
        ctx.fillStyle='rgba(255,255,255,0.1)';
        for (const o of this.obstacles){ ctx.beginPath(); ctx.arc(o.x*w, o.y*h, o.r*w, 0, Math.PI*2); ctx.fill(); }
      }
      ctx.fillStyle='#00e5ff';
      for (const p of this.particles){ ctx.beginPath(); ctx.arc(p.x*w, p.y*h, p.radius, 0, Math.PI*2); ctx.fill(); }
    }
    resizeCanvas(){
      const rect=this.canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      this.canvas.width=rect.width*dpr; this.canvas.height=rect.height*dpr; this.ctx.scale(dpr,dpr);
    }
  }
  window.addEventListener('DOMContentLoaded', ()=>{
    if (!document.getElementById('particlesCanvas')) return;
    FluidUtils.initTheme();
    const navToggle=document.querySelector('.theme-toggle'); if (navToggle) navToggle.addEventListener('click', FluidUtils.toggleTheme);
    const canvas=document.getElementById('particlesCanvas'); const fluid=new ParticleFluid(canvas);
    const countInput=document.getElementById('particleCount'), gravityInput=document.getElementById('gravity'), cohesionInput=document.getElementById('cohesion');
    const obstaclesInput=document.getElementById('obstacles'), attractorInput=document.getElementById('attractor');
    const pauseBtn=document.getElementById('pauseParticles'), resetBtn=document.getElementById('resetParticles'), randomBtn=document.getElementById('randomParticles'), snapshotBtn=document.getElementById('snapshotParticles');
    function updateParams(){ fluid.gravity=parseFloat(gravityInput.value); fluid.cohesion=parseFloat(cohesionInput.value);
      fluid.obstaclesEnabled=obstaclesInput.checked; fluid.mouseAttractor=attractorInput.checked;
      const count=parseInt(countInput.value,10); if (count !== fluid.particles.length) fluid.setNumParticles(count); }
    countInput.addEventListener('input',updateParams); gravityInput.addEventListener('input',updateParams); cohesionInput.addEventListener('input',updateParams);
    obstaclesInput.addEventListener('change',updateParams); attractorInput.addEventListener('change',updateParams);
    pauseBtn.addEventListener('click', ()=>{ fluid.running=!fluid.running; pauseBtn.textContent=fluid.running?'Pause':'Resume'; });
    resetBtn.addEventListener('click', ()=> fluid.initParticles() );
    randomBtn.addEventListener('click', ()=>{
      const r=FluidUtils.createRandom(Math.floor(Math.random()*100000));
      gravityInput.value=(r()*5).toFixed(2); cohesionInput.value=(r()*5).toFixed(2);
      obstaclesInput.checked=r()>0.5; attractorInput.checked=r()>0.5; countInput.value=Math.floor(100+r()*700); updateParams();
    });
    snapshotBtn.addEventListener('click', ()=> FluidUtils.saveCanvasSnapshot(canvas,'particles-snapshot') );
    window.addEventListener('keydown', (e)=>{
      if (e.target.matches('input, select, textarea')) return;
      switch(e.key.toLowerCase()){
        case ' ': pauseBtn.click(); e.preventDefault(); break;
        case 'r': resetBtn.click(); e.preventDefault(); break;
        case '1': gravityInput.value=0.5; cohesionInput.value=1.5; obstaclesInput.checked=true; attractorInput.checked=false; countInput.value=300; updateParams(); break;
        case '2': gravityInput.value=2.0; cohesionInput.value=3.0; obstaclesInput.checked=false; attractorInput.checked=true; countInput.value=500; updateParams(); break;
        case '3': gravityInput.value=0.0; cohesionInput.value=0.5; obstaclesInput.checked=true; attractorInput.checked=true; countInput.value=200; updateParams(); break;
        case 's': snapshotBtn.click(); break;
      }
    });
    FluidUtils.attachPointerEvents(canvas, ({x,y,type})=>{
      if (fluid.mouseAttractor){
        if (type==='start' || type==='move'){ fluid.pointer.x=x; fluid.pointer.y=y; fluid.pointer.active=true }
      }
    });
    window.addEventListener('resize', ()=> fluid.resizeCanvas() );
    let last=performance.now();
    function loop(time){ const dt=Math.min((time-last)/1000,0.033); last=time; if (fluid.running) fluid.update(dt); fluid.render(); requestAnimationFrame(loop); }
    updateParams(); fluid.resizeCanvas(); requestAnimationFrame(loop);
  });
})();