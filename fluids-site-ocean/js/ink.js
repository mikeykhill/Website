(function () {
  'use strict';
  class FluidInkSimulation {
    constructor(N, canvas) {
      this.N = N; this.size = (N + 2) * (N + 2);
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.r = new Float32Array(this.size); this.rPrev = new Float32Array(this.size);
      this.g = new Float32Array(this.size); this.gPrev = new Float32Array(this.size);
      this.b = new Float32Array(this.size); this.bPrev = new Float32Array(this.size);
      this.u = new Float32Array(this.size); this.v = new Float32Array(this.size);
      this.uPrev = new Float32Array(this.size); this.vPrev = new Float32Array(this.size);
      this.visc = 0.0001; this.diff = 0.0001; this.dt = 0.016; this.force = 5.0;
      this.dyeAmount = 50.0; this.vorticity = 0.5; this.running = true;
      this.scale = FluidUtils.getResolutionScale(); this.updateCanvasSize();
    }
    IX(i,j){ return i + (this.N + 2) * j; }
    setBoundary(b, x){
      const N = this.N;
      for (let i=1;i<=N;i++){ x[this.IX(i,0)] = b===2 ? -x[this.IX(i,1)] : x[this.IX(i,1)];
        x[this.IX(i,N+1)] = b===2 ? -x[this.IX(i,N)] : x[this.IX(i,N)]; }
      for (let j=1;j<=N;j++){ x[this.IX(0,j)] = b===1 ? -x[this.IX(1,j)] : x[this.IX(1,j)];
        x[this.IX(N+1,j)] = b===1 ? -x[this.IX(N,j)] : x[this.IX(N,j)]; }
      x[this.IX(0,0)] = 0.5*(x[this.IX(1,0)]+x[this.IX(0,1)]);
      x[this.IX(0,N+1)] = 0.5*(x[this.IX(1,N+1)]+x[this.IX(0,N)]);
      x[this.IX(N+1,0)] = 0.5*(x[this.IX(N,0)]+x[this.IX(N+1,1)]);
      x[this.IX(N+1,N+1)] = 0.5*(x[this.IX(N,N+1)]+x[this.IX(N+1,N)]);
    }
    addSource(x,s,dt){ for (let i=0;i<this.size;i++) x[i]+=dt*s[i]; }
    diffuse(b,x,x0,diff,dt){
      const N=this.N, a=dt*diff*N*N;
      for (let k=0;k<20;k++){
        for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
          x[this.IX(i,j)] = (x0[this.IX(i,j)] + a*(x[this.IX(i-1,j)] + x[this.IX(i+1,j)] + x[this.IX(i,j-1)] + x[this.IX(i,j+1)]))/(1+4*a);
        }
        this.setBoundary(b,x);
      }
    }
    advect(b,d,d0,u,v,dt){
      const N=this.N, dt0=dt*N;
      for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
        let x=i-dt0*u[this.IX(i,j)], y=j-dt0*v[this.IX(i,j)];
        if (x<0.5) x=0.5; if (x>N+0.5) x=N+0.5; const i0=Math.floor(x), i1=i0+1;
        if (y<0.5) y=0.5; if (y>N+0.5) y=N+0.5; const j0=Math.floor(y), j1=j0+1;
        const s1=x-i0, s0=1-s1, t1=y-j0, t0=1-t1;
        d[this.IX(i,j)] = s0*(t0*d0[this.IX(i0,j0)] + t1*d0[this.IX(i0,j1)]) + s1*(t0*d0[this.IX(i1,j0)] + t1*d0[this.IX(i1,j1)]);
      }
      this.setBoundary(b,d);
    }
    project(u,v,p,div){
      const N=this.N, h=1/N;
      for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
        div[this.IX(i,j)] = -0.5*h*(u[this.IX(i+1,j)]-u[this.IX(i-1,j)] + v[this.IX(i,j+1)]-v[this.IX(i,j-1)]);
        p[this.IX(i,j)] = 0;
      }
      this.setBoundary(0,div); this.setBoundary(0,p);
      for (let k=0;k<20;k++){
        for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
          p[this.IX(i,j)] = (div[this.IX(i,j)] + p[this.IX(i-1,j)] + p[this.IX(i+1,j)] + p[this.IX(i,j-1)] + p[this.IX(i,j+1)])/4;
        }
        this.setBoundary(0,p);
      }
      for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
        u[this.IX(i,j)] -= 0.5*(p[this.IX(i+1,j)]-p[this.IX(i-1,j)])/h;
        v[this.IX(i,j)] -= 0.5*(p[this.IX(i,j+1)]-p[this.IX(i,j-1)])/h;
      }
      this.setBoundary(1,u); this.setBoundary(2,v);
    }
    applyVorticity(u,v,dt){
      const N=this.N, curl=new Float32Array(this.size);
      for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
        const duDy=(u[this.IX(i,j+1)]-u[this.IX(i,j-1)])*0.5;
        const dvDx=(v[this.IX(i+1,j)]-v[this.IX(i-1,j)])*0.5;
        curl[this.IX(i,j)]=Math.abs(duDy-dvDx);
      }
      for (let j=2;j<N;j++) for (let i=2;i<N;i++){
        const idx=this.IX(i,j);
        const Nx=curl[this.IX(i+1,j)]-curl[this.IX(i-1,j)];
        const Ny=curl[this.IX(i,j+1)]-curl[this.IX(i,j-1)];
        const mag=Math.sqrt(Nx*Nx+Ny*Ny)+1e-5;
        const nx=Nx/mag, ny=Ny/mag;
        const f=this.vorticity;
        u[idx]+=f*ny*dt; v[idx]-=f*nx*dt;
      }
    }
    step(){
      const N=this.N, dt=this.dt;
      this.addSource(this.u,this.uPrev,dt); this.addSource(this.v,this.vPrev,dt);
      this.diffuse(1,this.uPrev,this.u,this.visc,dt); this.diffuse(2,this.vPrev,this.v,this.visc,dt);
      this.project(this.uPrev,this.vPrev,this.u,this.v);
      this.advect(1,this.u,this.uPrev,this.uPrev,this.vPrev,dt);
      this.advect(2,this.v,this.vPrev,this.uPrev,this.vPrev,dt);
      this.project(this.u,this.v,this.uPrev,this.vPrev);
      if (this.vorticity>0) this.applyVorticity(this.u,this.v,dt);
      this.addSource(this.r,this.rPrev,dt); this.addSource(this.g,this.gPrev,dt); this.addSource(this.b,this.bPrev,dt);
      this.diffuse(0,this.rPrev,this.r,this.diff,dt);
      this.diffuse(0,this.gPrev,this.g,this.diff,dt);
      this.diffuse(0,this.bPrev,this.b,this.diff,dt);
      this.advect(0,this.r,this.rPrev,this.u,this.v,dt);
      this.advect(0,this.g,this.gPrev,this.u,this.v,dt);
      this.advect(0,this.b,this.bPrev,this.u,this.v,dt);
      this.uPrev.fill(0); this.vPrev.fill(0); this.rPrev.fill(0); this.gPrev.fill(0); this.bPrev.fill(0);
    }
    reset(){ this.u.fill(0); this.v.fill(0); this.uPrev.fill(0); this.vPrev.fill(0);
      this.r.fill(0); this.g.fill(0); this.b.fill(0); this.rPrev.fill(0); this.gPrev.fill(0); this.bPrev.fill(0); }
    render(){
      const ctx=this.ctx, N=this.N, w=this.canvas.width, h=this.canvas.height;
      const cellW=w/(N+2), cellH=h/(N+2);
      const img=ctx.getImageData(0,0,w,h), data=img.data;
      for (let j=1;j<=N;j++) for (let i=1;i<=N;i++){
        const idx=this.IX(i,j);
        const r=Math.min(this.r[idx],1.0)*255, g=Math.min(this.g[idx],1.0)*255, b=Math.min(this.b[idx],1.0)*255;
        const x0=Math.floor((i-1)*cellW), y0=Math.floor((j-1)*cellH);
        const x1=Math.floor(i*cellW), y1=Math.floor(j*cellH);
        for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){
          const p=(y*w+x)*4; data[p]=r; data[p+1]=g; data[p+2]=b; data[p+3]=255;
        }
      }
      ctx.putImageData(img,0,0);
    }
    updateCanvasSize(){
      const rect=this.canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      this.canvas.width=rect.width*dpr; this.canvas.height=rect.height*dpr; this.ctx.scale(dpr,dpr);
    }
  }
  window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('inkCanvas')) return;
    FluidUtils.initTheme();
    const navToggle=document.querySelector('.theme-toggle'); if (navToggle) navToggle.addEventListener('click', FluidUtils.toggleTheme);
    const canvas=document.getElementById('inkCanvas');
    const scale=FluidUtils.getResolutionScale(); const baseN=110; const N=Math.max(32, Math.floor(baseN*scale));
    const sim=new FluidInkSimulation(N, canvas);
    const viscInput=document.getElementById('viscosity'), diffInput=document.getElementById('diffusion'), forceInput=document.getElementById('force');
    const dyeInput=document.getElementById('dye'), vortInput=document.getElementById('vorticity');
    const pauseBtn=document.getElementById('pause'), resetBtn=document.getElementById('reset'), randomBtn=document.getElementById('random'), snapshotBtn=document.getElementById('snapshot');
    function updateParams(){
      sim.visc=parseFloat(viscInput.value); sim.diff=parseFloat(diffInput.value); sim.force=parseFloat(forceInput.value);
      const v=parseInt(dyeInput.value.substring(1),16);
      sim.dyeColor={ r:((v>>16)&255)/255, g:((v>>8)&255)/255, b:(v&255)/255 };
      sim.vorticity=parseFloat(vortInput.value);
    }
    viscInput.addEventListener('input',updateParams); diffInput.addEventListener('input',updateParams);
    forceInput.addEventListener('input',updateParams); dyeInput.addEventListener('input',updateParams); vortInput.addEventListener('input',updateParams);
    pauseBtn.addEventListener('click', ()=>{ sim.running=!sim.running; pauseBtn.textContent=sim.running?'Pause':'Resume'; });
    resetBtn.addEventListener('click', ()=> sim.reset() );
    randomBtn.addEventListener('click', ()=>{
      const r=FluidUtils.createRandom(Math.floor(Math.random()*100000));
      viscInput.value=(r()*0.005).toFixed(4); diffInput.value=(r()*0.005).toFixed(4);
      forceInput.value=(2+r()*8).toFixed(1); vortInput.value=(r()*2).toFixed(2);
      dyeInput.value=`#${Math.floor(r()*16777215).toString(16).padStart(6,'0')}`; updateParams();
    });
    snapshotBtn.addEventListener('click', ()=> FluidUtils.saveCanvasSnapshot(canvas,'ink-snapshot') );
    window.addEventListener('keydown', (e)=>{
      if (e.target.matches('input, select, textarea')) return;
      switch(e.key.toLowerCase()){
        case ' ': pauseBtn.click(); e.preventDefault(); break;
        case 'r': resetBtn.click(); e.preventDefault(); break;
        case '1': viscInput.value=0.0005; diffInput.value=0.0005; forceInput.value=4; vortInput.value=0.5; dyeInput.value='#00e5ff'; updateParams(); break;
        case '2': viscInput.value=0.002; diffInput.value=0.0003; forceInput.value=6; vortInput.value=1.0; dyeInput.value='#ff00e5'; updateParams(); break;
        case '3': viscInput.value=0.0001; diffInput.value=0.001; forceInput.value=3; vortInput.value=0.2; dyeInput.value='#8a00ff'; updateParams(); break;
        case 's': snapshotBtn.click(); break;
      }
    });
    FluidUtils.attachPointerEvents(canvas, ({x,y,type})=>{
      const i=Math.floor((sim.N+2)*x), j=Math.floor((sim.N+2)*y); const idx=sim.IX(i,j);
      if (idx<0 || idx>=sim.size) return;
      if (type==='start' || type==='move'){
        const amount=sim.force;
        for (let dj=-1; dj<=1; dj++) for (let di=-1; di<=1; di++){
          const id=sim.IX(i+di,j+dj); if (id>0 && id<sim.size){
            sim.uPrev[id]+=di*amount; sim.vPrev[id]+=dj*amount;
            sim.rPrev[id]+=sim.dyeAmount*sim.dyeColor.r; sim.gPrev[id]+=sim.dyeAmount*sim.dyeColor.g; sim.bPrev[id]+=sim.dyeAmount*sim.dyeColor.b;
          }
        }
      }
    });
    window.addEventListener('resize', ()=> sim.updateCanvasSize() );
    function loop(){ if (sim.running) sim.step(); sim.render(); requestAnimationFrame(loop); }
    updateParams(); sim.updateCanvasSize(); loop();
  });
})();