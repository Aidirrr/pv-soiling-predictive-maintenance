// Short drifting trails make the wind field legible at both sites and at phone scale.
function drawSolarGusts(ctx,project,wind,travel,base,zoom,depth) {
  if(wind<=0)return;
  ctx.save();ctx.lineCap='round';
  const count=Math.ceil(5+wind*20);
  for(let i=0;i<count;i++){
    const path=i*7.327+travel*(.74+(i%5)*.105);
    const x=9-(path%18), z=-5+(i*3.721)%10;
    const y=base+.35+(i*1.373)%1.85;
    const length=.38+wind*1.32, fade=Math.min(1,(9-Math.abs(x))/1.8,wind*6);
    if(depth && depth(x-length,y+.35,z)<2)continue;
    function at(t){
      const wave=path*.65+t*2.4+i;
      return project(x-length*t,y+.13*Math.sin(wave),z+.23*Math.sin(wave*.77));
    }
    const a=at(0),b=at(.5),c=at(1);
    ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo(...b,...c);
    ctx.lineWidth=2.3*zoom;ctx.strokeStyle='rgba(49,75,82,'+fade*.36+')';ctx.stroke();
    ctx.lineWidth=Math.max(1.1,1.4*zoom);ctx.strokeStyle='rgba(240,254,255,'+fade*(.58+wind*.28)+')';ctx.stroke();
    ctx.beginPath();ctx.arc(...c,Math.max(.9,zoom*1.15),0,2*Math.PI);
    ctx.fillStyle='rgba(255,242,211,'+fade*.91+')';ctx.fill();
  }
  ctx.restore();
}

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
  const liveClock = byId('scene-live');
  const sitePicker = byId('scene-site');
  const sites = {
    laghouat: {name:'Laghouat',zone:'Laghouat, Algeria (UTC+1)',offset:1,lat:33.8,lon:2.88,
      azimuth:-.52,elevation:.34,description:'Explore how the Live Predictor responds to simulated site conditions.'},
    utp: {name:'UTP',zone:'Seri Iskandar, Malaysia (UTC+8)',offset:8,lat:4.38,lon:100.97,
      azimuth:-.23,elevation:.32,description:'Chancellor Complex, Seri Iskandar · Illustrative rooftop layout. Module estimates use the Laghouat-trained predictor.'}
  };
  sitePicker.value = new URLSearchParams(location.search).get('site') === 'utp' ? 'utp' : 'laghouat';
  let site = sites[sitePicker.value], campusRenderer;
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
    const hour = date.getUTCHours() + (date.getUTCMinutes() + equation + 4 * (site.lon - 15*site.offset)) / 60;
    const angle = (hour - 12) * 15 * rad, latitude = site.lat * rad;
    const decl = 23.44 * rad * Math.sin(seasonal);
    const east = -Math.cos(decl) * Math.sin(angle);
    const north = Math.sin(decl)*Math.cos(latitude) - Math.cos(decl)*Math.sin(latitude)*Math.cos(angle);
    const up = Math.sin(decl)*Math.sin(latitude) + Math.cos(decl)*Math.cos(latitude)*Math.cos(angle);
    sun = { east, north, up, daylight: Math.min(1,Math.max(0,(up+.12)/.43)) };
    byId('scene-light').textContent = up > 0 ? 'Daylight' : up > -.105 ? 'Twilight' : 'Night';
    byId('scene-day').textContent = date.toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'});
    byId('scene-clock-time').textContent = dateInput.value.slice(11,16) + (liveClock.checked ? ' · Live' : ' · Manual') + ' · ' + site.name;
    refresh();
  }
  dateInput.addEventListener('input', updateTime);
  function syncClock() {
    if (!liveClock.checked) return;
    dateInput.value = new Date(Date.now() + site.offset*3600000).toISOString().slice(0,16);
    updateTime();
  }
  liveClock.onchange = () => {
    dateInput.disabled = liveClock.checked;
    if (liveClock.checked) syncClock();
    else updateTime();
  };
  function scheduleMinute() {
    syncClock();
    setTimeout(scheduleMinute, 60000 - Date.now() % 60000);
  }
  let state;
  let azimuth = site.azimuth, elevation = site.elevation;
  let visible = false, frame = 0, last = 0, time = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clean = byId('scene-clean'), restore = byId('scene-restore');
  const progress = byId('wash-progress'), washTitle = byId('wash-title');
  let washPhase = 'idle', savedDust = 0, washProgress = 0, recommended = false;
  let windTravel = 0;

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
    fields[key] = { input, value, unit, group };
    input.addEventListener('input', () => {
      sliders[key].value = input.value;
      sliders[key].dispatchEvent(new Event('input'));
    });
  }
  const compactWeather=matchMedia('(max-width:900px), (pointer:coarse) and (max-height:540px)');
  const weatherChoices=byId('quick-weather').querySelectorAll('[data-field]');
  let activeField='ws';
  function arrangeWeather() {
    const compact=compactWeather.matches;
    byId('quick-weather').hidden=!compact;
    byId('standard-weather').hidden=compact;
    for (const [key,field] of Object.entries(fields)) {
      const target=compact ? byId('quick-range') : byId('scene-sliders');
      if (field.group.parentNode!==target) target.append(field.group);
      field.group.hidden=compact && key!==activeField;
    }
    weatherChoices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.field===activeField)));
  }
  weatherChoices.forEach(button=>button.onclick=()=>{activeField=button.dataset.field;arrangeWeather();});
  compactWeather.addEventListener('change',arrangeWeather);
  arrangeWeather();

  function updateAlert() {
    const threshold = Number(limit.value);
    byId('scene-limit-value').textContent = threshold.toFixed(1) + ' g/m²';
    recommended = cleaningAlerts(state, threshold) > 0;
    const canClean = recommended && washPhase === 'idle';
    for (const button of [clean, byId('predict-clean'), byId('notice-clean')]) button.hidden = !canClean;
    byId('wash-bar').hidden = !canClean && washPhase === 'idle';
    restore.hidden = washPhase === 'idle';
    progress.hidden = washPhase !== 'washing';
    washTitle.textContent = washPhase === 'washing' ? 'Crew cleaning the array' :
      washPhase === 'clean' ? (site === sites.utp ? 'Rooftop array clean' : 'All six panels clean') : 'Cleaning recommended';
  }
  limit.addEventListener('input', updateAlert);

  function setDust(value) {
    sliders.dust.value = value;
    sliders.dust.dispatchEvent(new Event('input'));
  }
  function finishWash() {
    washPhase = 'clean';
    washProgress = 1;
    setDust(0);
  }
  function startWash() {
    if (!recommended || washPhase !== 'idle') return;
    savedDust = state.dust;
    washProgress = progress.value = 0;
    washPhase = 'washing';
    byId('cleaning-notice').hidden = true;
    switchTab('scene');
    canvas.scrollIntoView({block:'center', behavior:'instant'});
    restore.hidden = false;
    restore.focus({preventScroll:true});
    if (paused) finishWash();
    else { updateAlert(); refresh(); }
  }
  for (const button of [clean, byId('predict-clean'), byId('notice-clean')]) button.onclick = startWash;
  restore.onclick = () => {
    washPhase = 'idle';
    washProgress = 0;
    setDust(savedDust);
    if (!clean.hidden) clean.focus({preventScroll:true});
  };

  // Repeatable textures keep individual dust grains fixed to the glass during orbit.
  function noise(i) {
    const n = Math.sin(i * 78.233 + 12.9898) * 43758.5453;
    return n - Math.floor(n);
  }
  const panels = [];
  for (const z of [-2.4, 2.4]) {
    for (const [column,x] of [-4.5, 0, 4.5].entries()) panels.push({ x, z, column });
  }
  const motes = Array.from({length:160}, (_,i)=>({
    offset:noise(i+19)*28, z:noise(i+52)*14-7, lift:noise(i+140)**2,
    speed:.62+noise(i+280)*.62, phase:noise(i+390)*Math.PI*2, size:.009+.017*noise(i+490)
  }));
  // Layer translucent eddies into a reusable texture for windblown sand.
  const plume = document.createElement('canvas');
  plume.width = 220; plume.height = 64;
  const plumeCtx = plume.getContext('2d');
  for (let i=0;i<36;i++) {
    const x=25+noise(i+81)*170, y=25+noise(i+160)*16, r=8+noise(i+170)*16;
    const haze=plumeCtx.createRadialGradient(x,y,0,x,y,r);
    haze.addColorStop(0,'rgba(208,175,125,.22)');
    haze.addColorStop(1,'rgba(208,175,125,0)');
    plumeCtx.fillStyle=haze;
    plumeCtx.fillRect(x-r,y-r,2*r,2*r);
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
    if (site === sites.utp) {
      campusRenderer ??= createUtpCampus(refresh);
      campusRenderer(ctx,{w,h,dpr,azimuth,elevation,zoom,sun,cloud,dust,wind,time,windTravel,
        washing:washPhase==='washing',progress:washProgress});
      return;
    }
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
    const dusk = Math.max(0,1-Math.abs(sun.up-.035)/.25)*(1-cloud*.65);
    if (dusk) {
      const warmth=ctx.createLinearGradient(0,0,0,h*.8);
      warmth.addColorStop(0,'rgba(144,108,142,'+dusk*.18+')');
      warmth.addColorStop(.42,'rgba(246,158,87,'+dusk*.43+')');
      warmth.addColorStop(1,'rgba(202,138,91,0)');
      ctx.fillStyle=warmth; ctx.fillRect(0,0,w,h);
    }
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
    // Boots, sleeves, tool and brush all use the same projection as the glass.
    function drawWorker(worker) {
      const {x,z,stroke} = worker;
      const p=(dx,y,dz=0)=>project(x+dx,y,z+dz);
      const scale=Math.hypot(...p(0,1).map((v,i)=>v-p(0,0)[i]));
      function limb(a,b,color,width) { line(p(...a),p(...b),color,scale*width); }
      function oval(a,rx,ry,color) {
        const [cx,cy]=p(...a);
        ctx.fillStyle=color; ctx.beginPath();
        ctx.ellipse(cx,cy,scale*rx,scale*ry,0,0,Math.PI*2); ctx.fill();
      }
      ctx.save(); ctx.lineCap='round';
      oval([0,.02],.32,.055,'rgba(41,38,31,.29)');
      for (const side of [-1,1]) {
        const hip=side*.10, foot=side*.23;
        limb([hip,.9],[foot,.50,.05],'#293c4c',.17);
        limb([foot,.50,.05],[foot,.12],'#354c59',.14);
        limb([foot,.08],[foot,.075,.14],'#392e27',.16);
      }
      const lean=.12+.07*stroke;
      limb([0,.91],[.02,1.40,lean],'#e59a2a',.38);
      limb([0,1.06,.045],[.01,1.11,.057],'#edf1ae',.36);
      oval([.025,1.61,lean],.128,.155,'#ae7752');
      oval([.025,1.72,lean],.15,.10,'#ffce53');
      oval([.025,1.69,lean+.035],.18,.035,'#edb539');
      const reach=.42+.17*stroke;
      for (const side of [-1,1]) {
        const sx=side*.15;
        limb([sx,1.38,lean],[sx*1.3,1.13,.25],'#506e7c',.105);
        limb([sx*1.3,1.13,.25],[0,1.23+side*.08,reach+side*.13],'#c79069',.08);
      }
      const along=1.7+stroke*1.15;
      const brushHeight=1.45+(along-1.85)*.40+.045;
      limb([0,1.23,reach],[0,brushHeight,along],'#c1d3d2',.038);
      limb([-.24,brushHeight,along],[.24,brushHeight,along],'#48a3a2',.095);
      ctx.restore();
    }
    function drawWind(item) {
      const {x,y,z,mote,isPlume}=item;
      const [px,py]=project(x,y,z);
      const scale=Math.hypot(...project(x,y+1,z).map((v,i)=>v-[px,py][i]));
      // Fade at the edge of the field so particles enter and leave gradually.
      const fade=Math.min(1,(14-Math.abs(x))/2);
      if (isPlume) {
        const end=project(x-1,y,z);
        const width=scale*(3+wind*3);
        ctx.save(); ctx.translate(px,py); ctx.rotate(Math.atan2(end[1]-py,end[0]-px));
        ctx.globalAlpha=fade*wind*(.20+.23*mote.lift);
        ctx.drawImage(plume,-width/2,-scale*.31,width,scale*.62); ctx.restore();
      } else {
        ctx.fillStyle='rgba(213,184,137,'+fade*(.23+.4*wind)+')';
        ctx.beginPath(); ctx.arc(px,py,Math.max(.48,mote.size*scale),0,Math.PI*2); ctx.fill();
      }
    }
    const pole={x:7.2,z:3.8};
    const objects=[...panels,pole];
    for (const mote of motes.slice(0,Math.ceil(wind*motes.length))) {
      const path=mote.offset+windTravel*mote.speed;
      const wave=path*.77+mote.phase;
      objects.push({mote,x:14-path%28,z:mote.z+.24*Math.sin(wave*.57),
        y:.09+mote.lift*(.55+wind*2.1)+.09*Math.sin(wave),isPlume:mote.offset<2.2});
    }
    if (washPhase === 'washing') {
      for (const z of [-2.4,2.4]) {
        const pass=Math.min(washProgress*3,2.99999), col=Math.floor(pass), t=pass-col;
        const x=-4.5+4.5*col-2+4*Math.min(1,t/.90)+.5*Math.max(0,(t-.90)/.10);
        objects.push({x,z:z-1.85,worker:true,stroke:Math.sin(washProgress*32*Math.PI)});
      }
    }
    objects.sort((a,b)=>(b.x-a.x)*sa+(b.z-a.z)*ca);
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
      if (object.mote) { drawWind(object); continue; }
      if (object.worker) { drawWorker(object); continue; }
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
      const washed=washPhase==='washing' ? Math.min(1,Math.max(0,(washProgress*3-object.column)/.90)) : 0;
      if (dust>0 && washed<1) {
        const edge=-2+4*washed;
        const dirty=[glass(edge,-1.3),face[1],face[2],glass(edge,1.3)];
        const sediment=ctx.createLinearGradient(...glass(0,-1.3),...glass(0,1.3));
        const opacity=Math.sqrt(dust);
        sediment.addColorStop(0,'rgba(196,157,100,'+opacity*.91+')');
        sediment.addColorStop(.2,'rgba(188,155,109,'+opacity*.68+')');
        sediment.addColorStop(1,'rgba(209,180,136,'+opacity*.62+')');
        polygon(dirty,sediment);
        ctx.save(); ctx.clip();
        ctx.fillStyle='rgba(231,200,153,.70)';
        for(let i=0;i<dust*240;i++) {
          const pt=glass(noise(i+x+14)*3.97-1.985,noise(i+z+331)*2.55-1.275);
          ctx.fillRect(pt[0],pt[1],Math.max(.85,w/800)*zoom,1.1*zoom);
        }
        ctx.restore();
      }
    }
    if (sun.daylight < 1) {
      ctx.fillStyle='rgba(8,19,42,'+(.79*(1-sun.daylight))+')';
      ctx.fillRect(0,0,w,h);
    }

    drawSolarGusts(ctx,project,wind,windTravel,1.15,zoom);
  }

  function tick(now) {
    frame=0;
    if (!visible || document.hidden || !state) { last=0; return; }
    if (!paused && last) {
      const dt=Math.min((now-last)/1000,.1);
      time+=dt;
      windTravel+=dt*state.ws*.48*(.92+.19*Math.sin(time*.83)+.10*Math.sin(time*2.27));
      if (washPhase==='washing') {
        washProgress=Math.min(1,washProgress+dt/10);
        progress.value=washProgress;
        if (washProgress===1) finishWash();
      }
    }
    last=now;
    draw();
    if (!paused && !frame) frame=requestAnimationFrame(tick);
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
  document.addEventListener('visibilitychange',()=>{last=0; if (!document.hidden) syncClock(); refresh();});
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
  function resetCamera() { azimuth=site.azimuth; elevation=site.elevation; setZoom(1); }
  byId('scene-reset').onclick=resetCamera;
  function selectSite() {
    site=sites[sitePicker.value];
    byId('scene-zone').textContent=site.zone;
    byId('scene-description').textContent=site.description;
    canvas.setAttribute('aria-label',site.name+' solar array in 3D. Drag or use arrow keys to orbit. Pinch, scroll, or use plus and minus to zoom.');
    resetCamera();
    if (liveClock.checked || !dateInput.value) {
      dateInput.value=new Date(Date.now()+site.offset*3600000).toISOString().slice(0,16);
    }
    updateTime();
    if(state)updateAlert();
  }
  sitePicker.onchange=()=>{
    selectSite();
    if (location.protocol==='https:' || location.protocol==='http:') {
      const url=new URL(location.href);
      if(site===sites.utp)url.searchParams.set('site','utp');
      else url.searchParams.delete('site');
      history.replaceState(null,'',url);
    }
  };
  const pause=byId('scene-pause');
  function labelMotion() { pause.textContent=paused?'Resume motion':'Pause motion'; }
  labelMotion();
  selectSite();
  scheduleMinute();
  pause.onclick=()=>{paused=!paused; last=0; labelMotion(); refresh();};

  return conditions=>{
    if (state && conditions.dust !== state.dust &&
        (washPhase === 'washing' || (washPhase === 'clean' && conditions.dust !== 0))) {
      washPhase = 'idle';
      washProgress = 0;
    }
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
