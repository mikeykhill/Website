(function () {
  'use strict';
  class Ripples {
    constructor(canvas){
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      const scale=FluidUtils.getResolutionScale(); this.width=Math.floor(160*scale); this.height=Math.floor(90*scale);
      this.current=new Float32Array(this.width*this.height); this.previous=new Float32Array(this.width*this.height);
      this.damping=0.99; this.perturbStrength=1.0; this.radius=2; this.running=true; this.resizeCanvas();
    }
    update(){
      const w=this.width, h=this.height, next=new Float32Array(this.width*this.height);
      for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++){
        const i=y*w+x, sum=this.current[i-1]+this.current[i+1]+this.current[i-w]+this.current[i+w];
        next[i]=(sum/2 - this.previous[i])*this.damping;
      }
      this.previous=this.current; this.current=next;
    }
    render(){
      const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
      const img=ctx.getImageData(0,0,W,H), data=img.data, sx=W/this.width, sy=H/this.height;
      for (let y=0;y<H;y++){ const yy=Math.floor(y/sy);
        for (let x=0;x<W;x++){ const xx=Math.floor(x/sx), idx=yy*this.width+xx; const hVal=this.current[idx];
          const base=8, amp=Math.min(Math.abs(hVal)*800,255), intensity=Math.min(base+amp,255);
          const p=(y*W+x)*4; data[p]=0; data[p+1]=intensity; data[p+2]=intensity*1.5; data[p+3]=255;
        }
      }
      ctx.putImageData(img,0,0);
    }
    disturb(xn,yn){
      const x=Math.floor(xn*this.width), y=Math.floor(yn*this.height);
      for (let j=-this.radius;j<=this.radius;j++) for (let i=-this.radius;i<=this.radius;i++){
        const xi=x+i, yj=y+j; if (xi>0 && xi<this.width-1 && yj>0 && yj<this.height-1){
          this.current[yj*this.width+xi]=this.perturbStrength;
        }
      }
    }
    resizeCanvas(){ const rect=this.canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      this.canvas.width=rect.width*dpr; this.canvas.height=rect.height*dpr; this.ctx.scale(dpr,dpr); }
  }
  window.addEventListener('DOMContentLoaded', ()=>{
    if (!document.getElementById('ripplesCanvas')) return;
    FluidUtils.initTheme();
    const navToggle=document.querySelector('.theme-toggle'); if (navToggle) navToggle.addEventListener('click', FluidUtils.toggleTheme);
    const canvas=document.getElementById('ripplesCanvas'); const ripple=new Ripples(canvas);
    const radiusInput=document.getElementById('rippleRadius'), dampingInput=document.getElementById('damping'), strengthInput=document.getElementById('strength');
    const pauseBtn=document.getElementById('pauseRipples'), resetBtn=document.getElementById('resetRipples'), randomBtn=document.getElementById('randomRipples'), snapshotBtn=document.getElementById('snapshotRipples');
    function updateParams(){ ripple.radius=parseInt(radiusInput.value,10); ripple.damping=parseFloat(dampingInput.value); ripple.perturbStrength=parseFloat(strengthInput.value); }
    radiusInput.addEventListener('input',updateParams); dampingInput.addEventListener('input',updateParams); strengthInput.addEventListener('input',updateParams);
    pauseBtn.addEventListener('click', ()=>{ ripple.running=!ripple.running; pauseBtn.textContent=ripple.running?'Pause':'Resume'; });
    resetBtn.addEventListener('click', ()=>{ ripple.current.fill(0); ripple.previous.fill(0); });
    randomBtn.addEventListener('click', ()=>{ const r=FluidUtils.createRandom(Math.floor(Math.random()*100000));
      radiusInput.value=Math.floor(1+r()*5); dampingInput.value=(0.95+r()*0.04).toFixed(3); strengthInput.value=(0.5+r()*1.5).toFixed(2); updateParams(); });
    snapshotBtn.addEventListener('click', ()=> FluidUtils.saveCanvasSnapshot(canvas,'ripples-snapshot') );
    window.addEventListener('keydown', (e)=>{
      if (e.target.matches('input, select, textarea')) return;
      switch(e.key.toLowerCase()){
        case ' ': pauseBtn.click(); e.preventDefault(); break;
        case 'r': resetBtn.click(); e.preventDefault(); break;
        case '1': radiusInput.value=2; dampingInput.value=0.985; strengthInput.value=1.0; updateParams(); break;
        case '2': radiusInput.value=3; dampingInput.value=0.97; strengthInput.value=0.8; updateParams(); break;
        case '3': radiusInput.value=1; dampingInput.value=0.99; strengthInput.value=1.5; updateParams(); break;
        case 's': snapshotBtn.click(); break;
      }
    });
    FluidUtils.attachPointerEvents(canvas, ({x,y,type})=>{ if (type==='start' || type==='move') ripple.disturb(x,y); });
    window.addEventListener('resize', ()=> ripple.resizeCanvas() );
    function loop(){ if (ripple.running) ripple.update(); ripple.render(); requestAnimationFrame(loop); }
    updateParams(); ripple.resizeCanvas(); loop();
  });
})();