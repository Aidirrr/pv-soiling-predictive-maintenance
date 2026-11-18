// Perspective study of the Chancellor Complex and its branching photovoltaic canopies.
// Coordinates describe an illustrative campus layout in local model units.
function createUtpCampus() {
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
    const focal=Math.min(w*1.09,h*1.85),distance=35/zoom;
    const cx=w*.5,cy=h*.49;
    function depth(x,y,z) {return distance+(x*sa+(z-2)*ca)*ce-(y-2.7)*se;}
    function project(x,y,z) {
      const d=depth(x,y,z);
      return [cx+(x*ca-(z-2)*sa)*focal/d,cy-((y-2.7)*ce+(x*sa+(z-2)*ca)*se)*focal/d];
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
      line(p(.4,0,0),p(.4,2.9,0),'#8c9991',Math.max(1,focal*.10/Math.max(1,depth(...p(.4,0,0)))));
      face(deck(-.94,.94,2.93),'#dce1d9');
      for(const side of [-1,1]){
        face(deck(side*.18,side*.82,2.95),'#526579');
        line(p(.5,2.96,side*.18),p(.5,2.96,side*.82),'#afbabc',.55);
      }
    }
    function drawHall() {
      face(ring(radius+.65,.025),'#c2b9a4');
      for(let j=0;j<80;j++) {
        const i=(j+1)%80;
        const [x,,z]=rim[j],[xx,,zz]=rim[i];
        const near=-(x*sa+z*ca)/radius;
        if(near<-.18)continue;
        const side=(scale,y1,y2)=>[[x*scale,y1,z*scale],[xx*scale,y1,zz*scale],[xx*scale,y2,zz*scale],[x*scale,y2,z*scale]];
        face(side(.95,0,2.35),'hsl(184 16% '+(31+near*10)+'%)');
        line([x*.95,.12,z*.95],[x*.95,2.35,z*.95],'#a3aaa1',.85);
        face(side(1,2.3,roofY),'hsl(48 12% '+(68+near*8)+'%)');
        line([x,2.32,z],[x,roofY,z],'#aeb5ae',.85);
      }
      face(rim,'#e0e2d9');
      for(let x=-6.9;x<7;x+=.21) {
        const z=Math.sqrt(radius*radius-x*x);
        line([x,roofY,-z],[x,roofY,z],'#b9c0b9',.55);
      }
      const pass=progress*rows;
      for(const m of modules) {
        const {x,z,row,span,tone}=m,y=roofY+.04;
        const corners=quad(x-.39,z-.39,x+.39,z+.39,y);
        face(corners,'hsl(214 28% '+(24+tone*9+(z+6)*.35)+'%)');
        for(const t of [-.19,0,.19])line([x+t,y,z-.39],[x+t,y,z+.39],'#94a7b4',.5);
        line([x-.39,y,z],[x+.39,y,z],'#97abb9',.6);
        if(dust>0) {
          const reach=washing?Math.max(0,Math.min(1,pass-row))*span:0;
          const start=Math.max(Math.abs(x)-.39,reach);
          if(start<Math.abs(x)+.39) {
            const sign=Math.sign(x);
            face(quad(sign*start,z-.39,sign*(Math.abs(x)+.39),z+.39,y),'rgba(190,159,110,'+Math.sqrt(dust)*.78+')');
          }
        }
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
      const horizon=cy-focal*se/ce;
      const sky=g.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,'#9dcbd6');sky.addColorStop(1,'#e4eee0');g.fillStyle=sky;g.fillRect(0,0,w,h);
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
      for(let i=0;i<520;i++){
        const x=(random(i+541)-.5)*83,z=(random(i+5541)-.5)*83;
        const d=depth(x,.01,z);
        if(d<2)continue;
        const size=focal/d*(.4+random(i)*1.8);
        const [px,py]=project(x,.01,z);
        g.fillStyle=i%2?'rgba(101,125,71,.065)':'rgba(216,203,146,.08)';
        g.beginPath();g.ellipse(px,py,size,size*.45,0,0,tau);g.fill();
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
      const shade=sun.up>0?Math.min(4,2.8/Math.max(.2,sun.up)):0;
      face(rim.map(([x,,z])=>[x-sun.east*shade,.019,z-sun.north*shade]),'rgba(44,65,48,.22)');
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
      g.fillStyle='rgba(128,143,148,'+(cloud*.24)+')';g.fillRect(0,0,w,h);
    }
    ctx.drawImage(layer,0,0,w,h);
    // Local airborne particles show the wind over the active roof.
    ctx.fillStyle='rgba(230,218,183,.53)';
    for(let i=0;i<wind*65;i++) {
      const x=8-(random(i+18)*16+windTravel)%16,z=random(i+81)*13-6.5;
      const y=roofY+.3+random(i+260)*1.2+.09*Math.sin(time+i);
      if(depth(x,y,z)>1){const p=project(x,y,z);ctx.fillRect(p[0],p[1],1.2,1);}
    }
    if(sun.daylight<1) {
      ctx.fillStyle='rgba(8,19,42,'+(.76*(1-sun.daylight))+')';ctx.fillRect(0,0,w,h);
    }
  };
}
