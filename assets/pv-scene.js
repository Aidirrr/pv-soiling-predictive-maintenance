// Software perspective projection keeps the scene usable from a local file.
function setupSolarScene(sliders) {
  const byId = id => document.getElementById(id);
  const canvas = byId('solar-field');
  const ctx = canvas.getContext('2d');
  const limit = byId('scene-limit');
  const fields = {};
  const cleaningAlerts = setupCleaningAlerts();
  const landscape = new Image();
  landscape.onload = () => refresh();
  landscape.src = 'assets/laghouat-landscape.jpg';
  const dateInput = byId('scene-datetime');
  const siteOffset = 3600000; // Algeria uses UTC+1 all year.
  dateInput.value = new Date(Date.now() + siteOffset).toISOString().slice(0,16);
  let sun, zoom = 1;
  function updateTime() {
    if (!dateInput.value || !dateInput.validity.valid) return;
    const date = new Date(dateInput.value + 'Z'); // UTC fields hold site wall-clock time.
    if (!Number.isFinite(date.getTime())) return;
    const rad = Math.PI / 180;
    const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000;
    const seasonal = 2 * Math.PI * (day - 81) / 365;
    const equation = 9.87 * Math.sin(2 * seasonal) - 7.53 * Math.cos(seasonal) - 1.5 * Math.sin(seasonal);
    const hour = date.getUTCHours() + (date.getUTCMinutes() + equation + 4 * (2.88 - 15)) / 60;
    const angle = (hour - 12) * 15 * rad, latitude = 33.8 * rad;
    const decl = 23.44 * rad * Math.sin(seasonal);
    const east = -Math.cos(decl) * Math.sin(angle);
    const north = Math.sin(decl)*Math.cos(latitude) - Math.cos(decl)*Math.sin(latitude)*Math.cos(angle);
    const up = Math.sin(decl)*Math.sin(latitude) + Math.cos(decl)*Math.cos(latitude)*Math.cos(angle);
    sun = { east, north, up, daylight: Math.min(1,Math.max(0,(up+.12)/.43)) };
    byId('scene-light').textContent = up > .13 ? 'Daylight' : up > -.105 ? 'Twilight' : 'Night';
    byId('scene-day').textContent = date.toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'});
    byId('scene-clock-time').textContent = dateInput.value.slice(11,16) + ' · Laghouat';
    refresh();
  }
  dateInput.addEventListener('input', updateTime);
  let state;
  let azimuth = -0.52, elevation = 0.34;
  let visible = false, frame = 0, last = 0, time = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const [key, title, unit] of [
    ['ws', 'Wind speed', 'm/s'], ['cc', 'Cloud cover', '%'], ['dust', 'Dust density', 'g/m²']
  ]) {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const input = sliders[key].cloneNode();
    input.id = 'scene-' + key;
    const label = document.createElement('label');
    label.htmlFor = input.id;
    const value = document.createElement('span');
    label.append(title, value);
    group.append(label, input);
    byId('scene-sliders').append(group);
    fields[key] = { input, value, unit };
    input.addEventListener('input', () => {
      sliders[key].value = input.value;
      sliders[key].dispatchEvent(new Event('input'));
    });
  }

  function updateAlert() {
    const threshold = Number(limit.value);
    byId('scene-limit-value').textContent = threshold.toFixed(1) + ' g/m²';
    cleaningAlerts(state, threshold);
  }
  limit.addEventListener('input', updateAlert);

  // Repeatable textures keep individual dust grains fixed to the glass during orbit.
  function noise(i) {
    const n = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
    return n - Math.floor(n);
  }
  const panels = [];
  for (const z of [-2.4, 2.4]) {
    for (const x of [-4.5, 0, 4.5]) panels.push({ x, z });
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || !state || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cloud = state.cc / 100, wind = state.ws / 15, dust = state.dust / 35;
    const horizon = h * (0.38 - elevation * 0.38);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + h*.13);
    sky.addColorStop(0, 'hsl(204  '+(64-cloud*43)+'% '+(61-cloud*18)+'%)');
    sky.addColorStop(1, 'hsl(194  '+(62-cloud*42)+'% '+(90-cloud*14)+'%)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Pan across the distant terrain as the camera orbits. The horizon tracks tilt.
    if (landscape.complete && landscape.naturalWidth) {
      const bw = Math.max(w*1.32,h*2.4), bh = Math.max(h*1.45,bw/3);
      const left = -(bw-w)*(.5 + .47*Math.sin(azimuth));
      const top = horizon-bh*.38;
      ctx.drawImage(landscape,left,top,bw,Math.max(bh,h-top));
    }
    const ca=Math.cos(azimuth), sa=Math.sin(azimuth);
    const sunX=w*(.5+(sun.east*ca-sun.north*sa)*.63), sunY=horizon-sun.up*h*.67;
    if (sun.up>0 && sun.east*sa+sun.north*ca>0) {
      const glow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,h*.16);
      glow.addColorStop(0,'rgba(255,248,209,'+(1-cloud*.85)+')');
      glow.addColorStop(.12,'rgba(255,245,207,'+(.9-cloud*.8)+')');
      glow.addColorStop(.14,'rgba(255,225,160,.3)');
      glow.addColorStop(1,'rgba(255,225,160,0)');
      ctx.fillStyle=glow; ctx.fillRect(0,0,w,h);
    }
    // Soft banks spread across the sky as cloud cover increases.
    for (let i=0; i<Math.ceil(cloud*19); i++) {
      const x=((noise(i+7)*1.55 + time*(.002+.009*wind))%1.55-.27)*w;
      const y=(.025+noise(i+54)*.20)*h;
      const r=(.055+noise(i+77)*.04+cloud*.04)*w;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(1,.32);
      const mist=ctx.createRadialGradient(0,0,0,0,0,r);
      mist.addColorStop(0,'rgba(244,246,244,.95)');
      mist.addColorStop(.65,'rgba(225,232,233,.85)');
      mist.addColorStop(1,'rgba(212,223,226,0)');
      ctx.fillStyle=mist;
      ctx.fillRect(-r,-r,2*r,2*r);
      ctx.restore();
    }
    if (!landscape.naturalWidth) {
      ctx.fillStyle='#b3a58e'; ctx.fillRect(0,horizon,w,h-horizon);
    }
    ctx.fillStyle='rgba(105,119,131,'+cloud*.44+')'; ctx.fillRect(0,0,w,h);
    const ce=Math.cos(elevation), se=Math.sin(elevation);
    const focal=Math.min(w*1.37,h*2.4), distance=22/zoom;
    function project(x,y,z) {
      const forward=x*sa+z*ca;
      const depth=distance+forward*ce-(y-1)*se;
      return [w*.5+(x*ca-z*sa)*focal/depth,
        h*.58-((y-1)*ce+forward*se)*focal/depth];
    }
    function polygon(points,color,edge) {
      ctx.beginPath();
      points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.fill();
      if (edge) { ctx.strokeStyle=edge; ctx.lineWidth=1; ctx.stroke(); }
    }
    function line(a,b,color,width) {
      ctx.beginPath();
      ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
    }
    // Paint distant objects first, including the wind indicator.
    const pole={x:7.2,z:3.8};
    const objects=[...panels,pole].sort((a,b)=>(b.x-a.x)*sa+(b.z-a.z)*ca);
    for (const {x,z} of panels) {
      if (sun.up<=0) continue;
      const shadow=[[-2,-1.3],[2,-1.3],[2,1.3],[-2,1.3]].map(([u,v])=>{
        const cast=(1.45+v*.4)/Math.max(.3,sun.up);
        return project(x+u-cast*sun.east,.01,z+v-cast*sun.north);
      });
      ctx.save();
      ctx.shadowColor='rgba(30,32,31,.22)'; ctx.shadowBlur=2+cloud*5;
      polygon(shadow,'rgba(35,39,42,'+(.34-cloud*.23)*Math.min(1,sun.up*5)+')');
      ctx.restore();
    }
    for(const object of objects) {
      const {x,z}=object;
      if(object===pole) {
        const length=.35+wind*2, droop=1.1-wind*.98;
        line(project(x,0,z),project(x,3.5,z),'#52616a',2);
        for(let i=0;i<5;i++) {
          function sock(t,side) {
            const flutter=wind*.14*Math.sin(time*(3+wind*7)-t*4);
            return project(x-length*t,3.27-droop*t+( .22-.13*t)*side+t*flutter,z);
          }
          polygon([sock(i/5,1),sock((i+1)/5,1),sock((i+1)/5,-1),sock(i/5,-1)],i%2?'#faf2db':'#dc6a38');
        }
        continue;
      }
      function glass(u,v) { return project(x+u,1.45+v*.40,z+v); }
      for (const u of [-1.35,1.35]) {
        for (const v of [-.83,.83]) {
          const foot=[[-.19,-.18],[.19,-.18],[.19,.18],[-.19,.18]];
          polygon(foot.map(([a,b])=>project(x+u+a,.09,z+v+b)),'#ada99e','#807f75');
          const post=project(x+u,.1,z+v), rail=glass(u,v);
          line(post,rail,'#646b69',3.6*zoom);
          line(post,rail,'#c7c8b9',1.2*zoom);
        }
        line(project(x+u,.35,z-.83),glass(u,.83),'#85918e',2*zoom);
      }
      const corners=[[-2,-1.3],[2,-1.3],[2,1.3],[-2,1.3]];
      const face=corners.map(([u,v])=>glass(u,v));
      const rim=corners.map(([u,v])=>project(x+u,1.36+v*.4,z+v));
      for(let i=0;i<4;i++) {
        const j=(i+1)%4;
        polygon([rim[i],rim[j],face[j],face[i]],i%2?'#758385':'#a4ada8');
      }
      const frontFacing=(face[1][0]-face[0][0])*(face[2][1]-face[0][1])-
        (face[1][1]-face[0][1])*(face[2][0]-face[0][0])<0;
      polygon(face,frontFacing?'#8c9caa':'#a5aca9','#c3c8c2');
      if (!frontFacing) {
        for(const v of [-.83,.83]) line(glass(-1.98,v),glass(1.98,v),'#626f72',3*zoom);
        continue;
      }
      for(let row=0;row<6;row++) {
        for(let col=0;col<10;col++) {
          const u=-1.96+col*.393, v=-1.25+row*.42, a=.383, b=.410, c=.027;
          polygon([[c,0],[a-c,0],[a,c],[a,b-c],[a-c,b],[c,b],[0,b-c],[0,c]]
            .map(([du,dv])=>glass(u+du,v+dv)),
            'hsl(215 40% '+(14+row*.8+noise(row*10+col)*3)+'%)');
        }
      }
      for(let k=0;k<30;k++) {
        const u=-1.96+(k+.5)*.131;
        line(glass(u,-1.25),glass(u,1.25),'rgba(171,188,201,.55)',.50*zoom);
      }
      const sheen=ctx.createLinearGradient(...face[0],...face[2]);
      const glint=.12+.10*Math.cos(azimuth*2);
      sheen.addColorStop(0,'rgba(136,179,211,'+glint+')');
      sheen.addColorStop(.58,'rgba(200,220,231,'+(glint+.08)+')');
      sheen.addColorStop(1,'rgba(101,151,184,.035)');
      polygon(face,sheen);
      polygon(face,'rgba(205,167,108,'+dust*.55+')');
      ctx.fillStyle='rgba(226,196,144,.8)';
      for(let i=0;i<dust*180;i++) {
        const pt=glass(noise(i+x+14)*3.9-1.95,noise(i+z+331)*2.48-1.24);
        ctx.fillRect(pt[0],pt[1],Math.max(1,w/630),1.3);
      }
    }
    for(let i=0;i<Math.ceil(wind*40);i++) {
      const x=10-((noise(i+4)*20+time*(.8+wind*6))%20);
      const y=.6+noise(i+70)*3, z=-5+noise(i+22)*9;
      line(project(x,y,z),project(x-.2-wind,y+.04,z),'rgba(247,252,255,'+(.35+.32*wind)+')',1+wind);
    }
    if (sun.daylight < 1) {
      ctx.fillStyle='rgba(8,19,42,'+(.87*(1-sun.daylight))+')';
      ctx.fillRect(0,0,w,h);
    }

  }

  function tick(now) {
    frame=0;
    if (!visible || document.hidden || !state) { last=0; return; }
    if (!paused && last) time+=Math.min((now-last)/1000,.1);
    last=now;
    draw();
    if (!paused) frame=requestAnimationFrame(tick);
  }
  function refresh() {
    if (!frame && visible && !document.hidden) frame=requestAnimationFrame(tick);
  }
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    last=0;
    refresh();
  }).observe(canvas);
  new ResizeObserver(refresh).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0; refresh();});
  function orbit(dx,dy) {
    azimuth+=dx;
    elevation=Math.max(.16,Math.min(.95,elevation+dy));
    refresh();
  }
  function setZoom(value) {
    zoom=Math.max(.65,Math.min(2.4,value));
    byId('zoom-level').textContent=Math.round(zoom*100)+'%';
    byId('zoom-out').disabled=zoom<=.65;
    byId('zoom-in').disabled=zoom>=2.4;
    refresh();
  }
  byId('zoom-in').onclick=()=>setZoom(zoom*1.2);
  byId('zoom-out').onclick=()=>setZoom(zoom/1.2);
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const scale=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1;
    setZoom(zoom*Math.exp(-e.deltaY*scale*.0015));
  },{passive:false});
  const pointers=new Map();
  const span=()=>{
    const [a,b]=pointers.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  };
  canvas.onpointerdown=e=>{
    if (e.button!==0 || pointers.size>=2) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  };
  canvas.onpointermove=e=>{
    const prior=pointers.get(e.pointerId);
    if (!prior) return;
    const pinching=pointers.size===2, before=pinching?span():0;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (pinching) { if (before>2) setZoom(zoom*span()/before); }
    else orbit((e.clientX-prior.x)*.009,(e.clientY-prior.y)*.006);
  };
  canvas.onlostpointercapture=e=>pointers.delete(e.pointerId);
  canvas.onkeydown=e=>{
    if (['+','=','-'].includes(e.key)) {
      e.preventDefault(); setZoom(e.key==='-'?zoom/1.2:zoom*1.2); return;
    }
    const delta={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]}[e.key];
    if (delta) { e.preventDefault(); orbit(...delta); }
  };
  byId('scene-reset').onclick=()=>{azimuth=-.52; elevation=.34; setZoom(1);};
  const pause=byId('scene-pause');
  function labelMotion() { pause.textContent=paused?'Resume motion':'Pause motion'; }
  labelMotion();
  updateTime();
  pause.onclick=()=>{paused=!paused; last=0; labelMotion(); refresh();};

  return conditions=>{
    state=conditions;
    for(const [key,field] of Object.entries(fields)) {
      field.input.value=state[key];
      field.value.textContent=state[key].toFixed(key==='cc'?0:1)+' '+field.unit;
    }
    byId('scene-power').textContent=state.power.toFixed(1)+' W';
    byId('scene-loss').textContent=state.loss.toFixed(1)+' W';
    updateAlert();
    refresh();
  };
}
