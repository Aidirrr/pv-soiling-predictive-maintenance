// Perspective study of the Chancellor Complex and its branching photovoltaic canopies.
// Coordinates describe an illustrative campus layout in local model units.
function createUtpCampus(refresh) {
  const layer = document.createElement('canvas');
  const g = layer.getContext('2d');
  const tau = 2*Math.PI;
  const roofY = 3.1, radius = 7.2;
  let cachedView = '';
  function random(seed) {
    const n = Math.sin(seed*78.23+1.47)*43758.5453;
    return n-Math.floor(n);
  }
  function quad(x1,z1,x2,z2,y) {
    return [[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]];
  }
  function ring(r,y) {
    return Array.from({length:80},(_,i)=>[r*Math.cos(i*tau/80),y,r*Math.sin(i*tau/80)]);
  }
  const rim = ring(radius,roofY);
  const grain=document.createElement('canvas');
  grain.width=grain.height=96;
  const grass=grain.getContext('2d');
  for(let i=0;i<1800;i++){
    grass.fillStyle=i%2?'rgba(60,81,45,.12)':'rgba(214,204,150,.16)';
    grass.fillRect(random(i+35)*96,random(i+1983)*96,1+random(i+814)*2,1);
  }
  const grassPattern=g.createPattern(grain,'repeat');
  // Soft-edged cumulus banks, prepainted once so a phone only composites sprites.
  const clouds=Array.from({length:5},(_,k)=>{
    const tile=document.createElement('canvas');tile.width=320;tile.height=124;
    const c=tile.getContext('2d'), pixels=c.createImageData(tile.width,tile.height);
    const lattice=Float32Array.from({length:2048},(_,i)=>random(i+k*213));
    function noise(x,y) {
      const ix=Math.floor(x),iy=Math.floor(y);
      let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
      const i=(ix+iy*73)&2047, j=(i+73)&2047;
      return (lattice[i]*(1-u)+lattice[(i+1)&2047]*u)*(1-v)+(lattice[j]*(1-u)+lattice[(j+1)&2047]*u)*v;
    }
    for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++){
      const nx=(x-160)/148,ny=(y-64)/48;
      const n=noise(x*.028,y*.036)*.53+noise(x*.073,y*.084)*.29+noise(x*.17,y*.19)*.13+noise(x*.38,y*.41)*.05;
      const mass=1-nx*nx-ny*ny+(n-.55)*2.5;
      const alpha=Math.max(0,Math.min(1,mass*1.7));
      const light=Math.min(255,223-ny*17+(n-.45)*49);
      const i=(y*tile.width+x)*4;
      pixels.data[i]=light-4;pixels.data[i+1]=light;pixels.data[i+2]=light+4;
      pixels.data[i+3]=255*alpha*alpha*(3-2*alpha);
    }
    c.putImageData(pixels,0,0);
    return tile;
  });
  const hills=new Image(), ridge=document.createElement('canvas');
  hills.onload=()=>{
    ridge.width=hills.naturalWidth; ridge.height=hills.naturalHeight;
    const c=ridge.getContext('2d');
    c.drawImage(hills,0,0); c.globalCompositeOperation='destination-in';
    const fade=c.createLinearGradient(0,0,0,ridge.height);
    fade.addColorStop(0,'transparent');fade.addColorStop(.13,'#000');fade.addColorStop(.58,'#000');fade.addColorStop(1,'transparent');
    c.fillStyle=fade;c.fillRect(0,0,ridge.width,ridge.height);
    cachedView='';refresh();
  };
  hills.src='assets/utp-hills.jpg';
  const modules = [];
  const rows = 14, pitch = .87;
  for (let row=0;row<rows;row++) {
    const z=(row-(rows-1)/2)*pitch;
    const span=Math.sqrt((radius-.31)**2-(Math.abs(z)+pitch/2)**2);
    for (let side of [-1,1]) {
      for (let i=0;;i++) {
        const start=.35+i*.84+(i>=3?.20:0);
        if (start+.78>span) break;
        modules.push({row,z,x:side*(start+.39),span,tone:random(i+row*11)});
      }
    }
  }

  // Build the covered spines in short sections so their depth order follows the curves.
  const scenery=[];
  for (const side of [-1,1]) {
    for (let i=0;i<21;i++) {
      const point=t=>[side*(.56*t+.019*t*t),6.1+.98*t-.015*t*t];
      const a=point(i), b=point(i+1);
      scenery.push({type:'canopy',x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,a,b});
      if (i%4===2 && i<19) {
        scenery.push({type:'block',x:a[0]+side*3.2,z:a[1]-2.5,angle:-side*.48});
      }
    }
  }
  for(let i=0;i<700;i++) {
    const x=(random(i+19)-.5)*110,z=(random(i+917)-.40)*100;
    if (Math.hypot(x,z)<11.6 || (z>0 && Math.abs(x)<25 && z<24)) continue;
    scenery.push({type:'tree',x,z,size:.7+random(i+53)*1.5,seed:i});
  }
  for(let i=0;i<45;i++) {
    const side=i%2?1:-1, t=random(i+93)*23;
    scenery.push({type:'tree',x:side*(2+t*.8+random(i)*2.1),z:9.6+t*.66+random(i+21)*2.3,
      size:.8+random(i+38)*.7,seed:i+800});
  }
  scenery.push({type:'hall',x:0,z:0});
  // Render textured tree crowns once. Each sprite is projected at its world position.
  const crowns=Array.from({length:8},(_,k)=>{
    const tile=document.createElement('canvas'); tile.width=80; tile.height=96;
    const c=tile.getContext('2d');
    c.fillStyle='#725f4a'; c.fillRect(38,43,4,48);
    for (let j=0;j<320;j++) {
      const angle=random(k*131+j)*tau,r=Math.sqrt(random(k*47+j+200));
      const x=40+Math.cos(angle)*r*29,y=41+Math.sin(angle)*r*23;
      const light=25+(1-r)*9+(80-x-y)*.29+random(j+400)*12;
      c.fillStyle='hsl('+(89+k*3)+' 29% '+light+'%)';
      c.beginPath();c.arc(x,y,2+random(j+657)*5,0,tau);c.fill();
    }
    return tile;
  });

  return function renderCampus(ctx,view) {
    const {w,h,dpr,azimuth,elevation,zoom,sun,cloud,dust,wind,time,windTravel,washing,progress}=view;
    const ca=Math.cos(azimuth),sa=Math.sin(azimuth),ce=Math.cos(elevation),se=Math.sin(elevation);
    const focal=Math.min(w*1.02,h*1.29),distance=24.5/zoom;
    const cx=w*.5,cy=h*.60;
    const horizon=cy-focal*se/ce;
    function depth(x,y,z) {return distance+(x*sa+(z-.65)*ca)*ce-(y-2.7)*se;}
    function project(x,y,z) {
      const d=depth(x,y,z);
      return [cx+(x*ca-(z-.65)*sa)*focal/d,cy-((y-2.7)*ce+(x*sa+(z-.65)*ca)*se)*focal/d];
    }
    function path(points) {
      // Clip against the camera plane for close-up and reverse-orbit views.
      const clipped=[];
      let a=points[points.length-1],da=depth(...a);
      for (const b of points) {
        const db=depth(...b);
        if ((da>1)!==(db>1)) {
          const t=(1-da)/(db-da);
          clipped.push(a.map((v,i)=>v+t*(b[i]-v)));
        }
        if(db>1) clipped.push(b);
        a=b;da=db;
      }
      if(clipped.length<3) return false;
      g.beginPath();
      clipped.forEach((p,i)=>i?g.lineTo(...project(...p)):g.moveTo(...project(...p)));
      g.closePath();return true;
    }
    function face(points,color) {
      if(path(points)){g.fillStyle=color;g.fill();}
    }
    function line(a,b,color,width) {
      if(depth(...a)<1||depth(...b)<1)return;
      g.beginPath();g.moveTo(...project(...a));g.lineTo(...project(...b));
      g.strokeStyle=color;g.lineWidth=width;g.stroke();
    }
    function ball(p,r,color) {
      const d=depth(...p);
      if(d<1)return;
      g.beginPath();g.arc(...project(...p),r*focal/d,0,tau);g.fillStyle=color;g.fill();
    }
    function drawBlock(obj) {
      const c=Math.cos(obj.angle),s=Math.sin(obj.angle);
      const p=(u,y,v)=>[obj.x+u*c-v*s,y,obj.z+u*s+v*c];
      const outline=[[-2.6,-.85],[2.6,-.85],[2.6,.85],[-2.6,.85]];
      const sides=outline.map((a,i)=>[a,outline[(i+1)%4]]);
      sides.sort(([a,b],[c,d])=>depth(...p(c[0]+d[0],0,c[1]+d[1]))-depth(...p(a[0]+b[0],0,a[1]+b[1])));
      for(const [a,b] of sides){
        const strip=(lo,hi)=>[p(a[0],lo,a[1]),p(b[0],lo,b[1]),p(b[0],hi,b[1]),p(a[0],hi,a[1])];
        face(strip(0,1.65),'#d7d9cc');
        for(const y of [.34,.85,1.35])face(strip(y,y+.20),'#546e74');
        for(let i=1;i<7;i++){
          const t=i/7,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;
          line(p(u,.15,v),p(u,1.6,v),'#b4bcb4',.85);
        }
      }
      face(outline.map(([u,v])=>p(u,1.66,v)),'#b9c2bf');
      face(quad(-2.35,-.56,2.35,.56,1.68).map(v=>p(...v)),'#879995');
    }
    function drawCanopy({a,b}) {
      const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      const p=(t,y,u)=>[a[0]+t*dx+u*dz/len,y,a[1]+t*dz-u*dx/len];
      const deck=(lo,hi,y)=>[p(-.025,y,lo),p(1.025,y,lo),p(1.025,y,hi),p(-.025,y,hi)];
      const steel=Math.max(.75,focal*.067/Math.max(1,depth(...p(.4,0,0))));
      line(p(.4,0,0),p(.4,2.62,0),'#77837e',steel*1.6);
      for(const side of [-1,1]){
        line(p(.4,1.77,0),p(.4,2.86,side*.86),'#9ca9a6',steel);
        face([p(0,2.74,side*.96),p(1,2.74,side*.96),p(1,2.94,side*.96),p(0,2.94,side*.96)],'#a3ada8');
      }
      face(deck(-.97,.97,2.94),'#e2e4de');
      for(const side of [-1,1]){
        face(deck(side*.18,side*.82,2.95),'#526579');
        line(p(.5,2.96,side*.18),p(.5,2.96,side*.82),'#afbabc',.55);
      }
    }
    function drawHall() {
      face(ring(radius+.65,.025),'#bdad93');
      // The glazed drum sits in shadow underneath the deep ribbed metal eave.
      for(let j=0;j<80;j++) {
        const i=(j+1)%80;
        const [x,,z]=rim[j],[xx,,zz]=rim[i];
        const near=-(x*sa+z*ca)/radius;
        if(near<-.18)continue;
        const side=(scale,y1,y2)=>[[x*scale,y1,z*scale],[xx*scale,y1,zz*scale],[xx*scale,y2,zz*scale],[x*scale,y2,z*scale]];
        const light=Math.max(0,(x*sun.east+z*sun.north)/radius)*(1-cloud*.8);
        const base=project(x*.91,.2,z*.91),top=project(x*.91,2.5,z*.91);
        const glass=g.createLinearGradient(...base,...top);
        glass.addColorStop(0,'hsl(34 23% '+(26+light*12)+'%)');
        glass.addColorStop(.42,'hsl(167 16% '+(26+light*10+random(j)*6)+'%)');
        glass.addColorStop(.76,'hsl(197 22% '+(43+light*14)+'%)');
        glass.addColorStop(1,'#334443');
        face(side(.91,.05,2.55),glass);
        for(const y of [.29,1.19,2.02])face(side(.915,y,y+.045),'#8c9994');
        line([x*.916,.1,z*.916],[x*.916,2.45,z*.916],'#aab3ac',.85);
        if(j%4===0){
          line([x*.974,.06,z*.974],[x*.974,2.55,z*.974],'#68716c',3.3*zoom);
          line([x*.974,.06,z*.974],[x*.974,2.55,z*.974],'#d4d5c8',1.65*zoom);
        }
        face([[x*.91,2.5,z*.91],[xx*.91,2.5,zz*.91],[xx,2.36,zz],[x,2.36,z]],'#626d66');
        face(side(1,2.36,roofY),'hsl(42 9% '+(59+light*24+near*6)+'%)');
        for(const y of [2.42,2.56,2.70,2.84,2.98])face(side(1.002,y,y+.026),'rgba(69,84,86,.50)');
        line([x,2.36,z],[x,roofY,z],'#bbc4bf',.8);
      }
      face(rim,'#d2d3c9');
      for(let x=-6.9;x<7;x+=.21) {
        const z=Math.sqrt(radius*radius-x*x);
        line([x,roofY,-z],[x,roofY,z],'#b9c0b9',.55);
      }
      const pass=progress*rows;
      for(const m of modules) {
        const {x,z,row,span,tone}=m,y=roofY+.04;
        // The centre follows the roof's transverse rack rows; the flank banks run lengthwise.
        const spanZ=Math.abs(x)<2.7 ? .29 : .395;
        const corners=quad(x-.39,z-spanZ,x+.39,z+spanZ,y);
        face(quad(x-.37,z-spanZ-.025,x+.43,z+spanZ,y-.025),'#78817e');
        const glass=g.createLinearGradient(...project(x-.39,y,z-.39),...project(x+.39,y,z+.39));
        const shine=6*Math.cos(azimuth+x*.11)+4*(1-cloud);
        glass.addColorStop(0,'hsl(216 26% '+(18+tone*6)+'%)');
        glass.addColorStop(1,'hsl(213 25% '+(28+shine+tone*7)+'%)');
        face(corners,glass);
        for(const t of [-.20,0,.20])line([x+t,y,z-spanZ],[x+t,y,z+spanZ],'rgba(176,192,205,.72)',.49);
        for(const t of [-.6,0,.6])line([x-.39,y,z+t*spanZ],[x+.39,y,z+t*spanZ],'rgba(173,190,197,.73)',.46);
        if(dust>0) {
          const reach=washing?Math.max(0,Math.min(1,pass-row))*span:0;
          const start=Math.max(Math.abs(x)-.39,reach);
          if(start<Math.abs(x)+.39) {
            const sign=Math.sign(x);
            face(quad(sign*start,z-spanZ,sign*(Math.abs(x)+.39),z+spanZ,y),'rgba(190,159,110,'+Math.sqrt(dust)*.78+')');
          }
        }
      }
      // Raised rooflights and access gratings along the central service aisle.
      for(let z=-5.1;z<5.8;z+=1.35){
        face(quad(-.23,z,.25,z+.65,roofY+.05),'#8c9998');
        face(quad(-.20,z+.04,.19,z+.61,roofY+.12),'#c7d1cb');
        for(let v=.10;v<.59;v+=.12)line([-.17,roofY+.13,z+v],[.17,roofY+.13,z+v],'#72827c',.6);
      }
      if(washing){
        const row=Math.min(rows-1,Math.floor(pass)),z=(row-(rows-1)/2)*pitch;
        const span=Math.sqrt((radius-.31)**2-(Math.abs(z)+pitch/2)**2);
        for(const side of [-1,1]){
          const x=side*Math.max(.28,(pass-row)*span), p=(dx,y,dz)=>[x+dx,roofY+y,z+dz];
          const scale=focal/Math.max(1,depth(...p(0,0,0)));
          for(const f of [-1,1])line(p(.08*f,.01,-.40),p(.04*f,.22,-.4),'#263e4a',scale*.073);
          line(p(0,.22,-.4),p(0,.43,-.36),'#ed9e30',scale*.18);
          ball(p(0,.53,-.36),.091,'#ffc652');
          line(p(.03,.38,-.36),p(.10,.28,-.22),'#af8565',scale*.06);
          line(p(.10,.28,-.22),p(.08,.055,.16),'#ced8cf',scale*.028);
          line(p(-.06,.055,.16),p(.22,.055,.16),'#45b8a3',scale*.06);
        }
      }
    }
    const key=[w,h,dpr,azimuth,elevation,zoom,sun.up,sun.east,cloud,dust,washing,Math.floor(progress*220)].join('/');
    if(key!==cachedView) {
      cachedView=key;
      if(layer.width!==Math.round(w*dpr)||layer.height!==Math.round(h*dpr)){
        layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);
      }
      g.setTransform(dpr,0,0,dpr,0,0);
      g.clearRect(0,0,w,h);
      for(let ridge=0;ridge<2;ridge++) {
        g.beginPath();g.moveTo(0,h);
        for(let x=0;x<=w+4;x+=4){
          const angle=azimuth+Math.atan((x-cx)/focal);
          const y=horizon-h*(.06+.026*Math.sin(angle*15+ridge)+.012*Math.cos(angle*23)) +ridge*h*.035;
          g.lineTo(x,y);
        }
        g.lineTo(w,h);g.fillStyle=ridge?'#87a495':'#a4b9ae';g.fill();
      }
      const ground=g.createLinearGradient(0,0,0,h);
      ground.addColorStop(0,'#a5b389');ground.addColorStop(1,'#8da571');
      g.fillStyle=ground;g.fillRect(0,Math.max(0,horizon),w,h);
      g.fillStyle=grassPattern;g.fillRect(0,Math.max(0,horizon),w,h);
      for(let i=0;i<520;i++){
        const x=(random(i+541)-.5)*83,z=(random(i+5541)-.5)*83;
        const d=depth(x,.01,z);
        if(d<2)continue;
        const size=focal/d*(.4+random(i)*1.8);
        const [px,py]=project(x,.01,z);
        g.fillStyle=i%2?'rgba(90,113,65,.035)':'rgba(216,203,146,.045)';
        g.beginPath();g.ellipse(px,py,size,size*.45,0,0,tau);g.fill();
      }
      if(hills.naturalWidth && horizon>-h*.45){
        const bandH=h*.29,bandW=w*1.43;
        g.drawImage(ridge,-(bandW-w)*(.5+.49*Math.sin(azimuth)),horizon-h*.047,bandW,bandH);
      }
      // Paved campus paths and the approach road are drawn on the ground plane.
      const road=(a,b,width,color)=>{
        const dx=b[0]-a[0],dz=b[1]-a[1],factor=width/Math.hypot(dx,dz)/2;
        const ox=dz*factor,oz=-dx*factor;
        face([[a[0]-ox,.01,a[1]-oz],[a[0]+ox,.01,a[1]+oz],
          [b[0]+ox,.01,b[1]+oz],[b[0]-ox,.01,b[1]-oz]],color);
      };
      road([-48,-7],[-12,-11],1.3,'#858b82');road([-12,-11],[7,-10],1.3,'#858b82');
      road([7,-10],[44,-2],1.3,'#858b82');
      for(const o of scenery){
        if(o.type==='canopy')road(o.a,o.b,2.7,'#c4bdac');
        if(o.type==='block')road([o.x-2.4,o.z-.8],[o.x+3,o.z+1],1.5,'#c7c3b2');
      }
      // The ring road frames the hall and separates it from the landscaped grounds.
      for(const [r,color] of [[10.6,'#c8c3ac'],[10.45,'#90958c'],[9.75,'#c9c3ab'],[9.6,'#a5b681']])face(ring(r,.01),color);
      for(let i=0;i<80;i+=2) {
        const a=i*tau/80,b=(i+.75)*tau/80;
        line([10.1*Math.cos(a),.018,10.1*Math.sin(a)],[10.1*Math.cos(b),.018,10.1*Math.sin(b)],'#d3cdb1',.8);
      }
      road([0,-7],[0,-10],2.1,'#c4ad91');
      for(let z=-8.35;z<-7;z+=.19)line([-1.04,.025,z],[1.04,.025,z],'#9c947f',.9);
      const shade=sun.up>0?Math.min(4,2.8/Math.max(.2,sun.up)):0;
      const cast='rgba(40,54,40,'+(.24-.17*cloud)+')';
      face(rim.map(([x,,z])=>[x-sun.east*shade,.019,z-sun.north*shade]),cast);
      for(const o of scenery) {
        if(o.type==='canopy')road([o.a[0]-sun.east*shade,o.a[1]-sun.north*shade],[o.b[0]-sun.east*shade,o.b[1]-sun.north*shade],1.9,cast);
      }
      const visible=scenery.filter(o=>depth(o.x,0,o.z)>-8).sort((a,b)=>depth(b.x,0,b.z)-depth(a.x,0,a.z));
      for(const obj of visible) {
        if(obj.type==='hall'){drawHall();continue;}
        if(obj.type==='canopy'){drawCanopy(obj);continue;}
        if(obj.type==='block'){drawBlock(obj);continue;}
        const d=depth(obj.x,0,obj.z);
        if(d<1)continue;
        const [x,y]=project(obj.x,0,obj.z),size=obj.size*focal/d;
        if(x+size<0||x-size>w||y<horizon||y-size*2>h)continue;
        g.fillStyle='rgba(54,76,47,.18)';g.beginPath();g.ellipse(x,y,size*.50,size*.12,0,0,tau);g.fill();
        g.drawImage(crowns[obj.seed%crowns.length],x-size*.61,y-size*1.41,size*1.22,size*1.49);
      }
    }
    const sky=ctx.createLinearGradient(0,0,0,Math.max(h*.22,horizon));
    sky.addColorStop(0,'hsl(206 '+(60-cloud*39)+'% '+(57+cloud*5)+'%)');
    sky.addColorStop(1,'hsl(196 '+(51-cloud*32)+'% '+(88-cloud*12)+'%)');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const drift=time*.0025+windTravel*.0016;
    function drawClouds(aerial) {
      ctx.save();
      for(let i=0;i<14;i++){
        const amount=Math.min(1,Math.max(0,cloud*14-i));
        if(!amount)break;
        const phase=(i*.381+.74-drift*(.8+random(i)*.5)+azimuth*.13)%1;
        const x=(((phase+1)%1)*1.6-.3)*w;
        const width=(.24+random(i+63)*.23+cloud*.14)*w;
        const height=Math.min(h*.33,width*.36);
        const y=aerial ? -height*(.68+.15*random(i+16)) :
          Math.max(0,horizon)*(.03+random(i+20)*.72)-height*.48;
        ctx.globalAlpha=amount*(aerial?.34:.94);
        ctx.drawImage(clouds[i%clouds.length],x-width*.5,y,width,height);
      }
      ctx.restore();
    }
    drawClouds(false);
    ctx.drawImage(layer,0,0,w,h);
    if(cloud>0){
      // Cloud shadows remain readable when the camera looks straight down at the roof.
      ctx.save();
      const top=Math.max(0,horizon);ctx.beginPath();ctx.rect(0,top,w,h-top);ctx.clip();
      ctx.fillStyle='rgba(83,101,119,'+cloud*.24+')';ctx.fillRect(0,top,w,h-top);
      for(let i=0;i<3;i++){
        const x=(((.24+i*.36-drift*.58)%1+1)%1)*1.8*w-.4*w;
        const y=h*(.27+i*.23),r=Math.max(w,h)*(.20+cloud*.18);
        const shadow=ctx.createRadialGradient(x,y,0,x,y,r);
        shadow.addColorStop(0,'rgba(45,65,85,'+cloud*.31+')');shadow.addColorStop(1,'rgba(45,65,85,0)');
        ctx.fillStyle=shadow;ctx.fillRect(x-r,y-r,2*r,2*r);
      }
      ctx.restore();
      if(horizon<h*.12)drawClouds(true);
    }
    // The roof windsock gives speed and direction even with animation paused.
    const mast=[4.85,roofY,-3.8];
    const tip=[mast[0],roofY+1.37,mast[2]];
    ctx.beginPath();ctx.moveTo(...project(...mast));ctx.lineTo(...project(...tip));
    ctx.lineWidth=Math.max(1.5,zoom*1.6);ctx.strokeStyle='#64767b';ctx.stroke();
    const sock=(t,side)=>project(tip[0]-(.23+1.65*wind)*t,
      tip[1]-(1-wind)*.78*t+side*(.15-.085*t)+wind*.12*t*Math.sin(time*8-t*5),tip[2]+.16*t);
    for(let i=0;i<5;i++){
      ctx.beginPath();ctx.moveTo(...sock(i/5,1));ctx.lineTo(...sock((i+1)/5,1));
      ctx.lineTo(...sock((i+1)/5,-1));ctx.lineTo(...sock(i/5,-1));ctx.closePath();
      ctx.fillStyle=i%2?'#fff1d4':'#e35d29';ctx.fill();
    }
    if(sun.daylight<1) {
      ctx.fillStyle='rgba(8,19,42,'+(.76*(1-sun.daylight))+')';ctx.fillRect(0,0,w,h);
    }
    drawSolarGusts(ctx,project,wind,windTravel,roofY,zoom,depth);
  };
}
