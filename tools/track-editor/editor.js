(() => {
  'use strict';
  const api=window.LPRTrackDocument,$=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
  let objects=[],selected=-1,adding=false,drag=null,zoom=1,ox=0,oy=0,dirty=false,brushPoint=null;
  let saving=false;
  function saveStatus(text,state){
    $('save-status').textContent=text;
    $('save-status').setAttribute('data-state',state);
    $('status').textContent=text;
  }
  const lakeColor='#1f5c73';
  const paintingSurface=()=>adding&&['lake','asphalt','hill'].includes($('type').value);
  const isWall=type=>['barrier','tyreWall'].includes(type);
  const wallName=()=>$('type').value==='tyreWall'?'rengasvallia':'suojakaidetta';
  const drawingBarrier=()=>adding&&isWall($('type').value);
  const drawingStroke=()=>paintingSurface()||drawingBarrier();
  const brushScale=()=>$('type').value==='hill'?Number($('hill-width').value)/40:$('type').value==='asphalt'?Number($('asphalt-width').value)/12:Number($('lake-width').value)/20;
  const objectSize=o=>o.type==='asphalt'?api.asphaltFootprint(o):isWall(o.type)?api.wallFootprint(o):api.types[o.type];
  const undo=[],redo=[];
  const roadMask=api.createRoadMask(LPRCampus),asphaltCache=new WeakMap();
  // Project the game's actual exterior into the editor's top-down map.
  // Ramp slopes, canopies and rails therefore follow changes to sale.js.
  const salePlan={surfaces:[],ramps:[],labels:[]};
  if(window.LPRSale) {
    const area=points=>Math.abs(points.reduce((sum,p,i)=>{
      const next=points[(i+1)%points.length];return sum+p[0]*next[2]-next[0]*p[2];
    },0))/2;
    const surface=(points,color)=>{
      if(area(points)<.3)return;
      salePlan.surfaces.push({points:points.map(p=>[p[0],p[2]]),
        height:Math.max(...points.map(p=>p[1])),color});
      if(area(points)>100 && Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))>1) {
        const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1]));
        const middle=height=>{
          const side=points.filter(p=>Math.abs(p[1]-height)<.01);
          return [side.reduce((s,p)=>s+p[0],0)/side.length,side.reduce((s,p)=>s+p[2],0)/side.length];
        };
        salePlan.ramps.push({from:middle(low),to:middle(high)});
      }
    };
    const top=(x,y,z,w,h,d,color)=>surface([
      [x-w/2,y+h,z-d/2],[x+w/2,y+h,z-d/2],
      [x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]],color);
    window.LPRSale.buildExterior({box:top,materialBox:top,
      quad:(a,b,c,d,color)=>surface([a,b,c,d],color),
      artwork:(id,points)=>{
        if(id==='yolo'||id==='sign')salePlan.labels.push({text:id==='yolo'?'Yolo':'Sale',
          x:points.reduce((sum,p)=>sum+p[0],0)/4,y:points.reduce((sum,p)=>sum+p[2],0)/4+35});
      }});
    salePlan.surfaces.sort((a,b)=>a.height-b.height);
  }
  function updateAddButtonLabel(){
    const type=$('type').value;
    $('add').textContent = ['lake','asphalt','hill','barrier','tyreWall'].includes(type) ? (adding?'Lopeta piirtäminen':type==='hill'?'Maalaa mäkeä':type==='lake'?'Piirrä järveä':isWall(type)?`Piirrä ${wallName()}`:'Piirrä asfalttia') : 'Lisää kartalle';
    $('add').setAttribute('aria-pressed',String(adding));
    $('lake-brush').hidden=$('type').value!=='lake';
    $('asphalt-brush').hidden=type!=='asphalt';
    $('hill-brush').hidden=type!=='hill';
    $('barrier-brush').hidden=!isWall(type);
    $('barrier-brush').textContent=`Piirrä ${wallName()} vetämällä hiirellä tai sormella. Jatka samanlaisen vallin tai kaiteen päästä. Kumoa peruu koko vedon; Esc peruu keskeneräisen vedon tai lopettaa piirtämisen.`;
  }
  try {objects=api.withSceneDefaults(api.validate(window.LPRTrackData),LPRCampus);} catch(e){$('status').textContent=e.message;}
  for(const [value,t] of Object.entries(api.types))if(!api.isScene(value)) $('type').add(new Option(t.name,value));
  const copy=()=>JSON.stringify(objects);
  function checkpoint(){undo.push(copy());if(undo.length>100)undo.shift();redo.length=0;dirty=true;if(!saving)saveStatus('Tallentamattomia muutoksia.','dirty');}
  function sync(){
    $('list').replaceChildren(...objects.map((o,i)=>new Option(`${i+1}. ${api.types[o.type].name}${o.type==='person'?` ${o.personId+1}`:''}`,i)));
    $('list').value=String(selected);$('properties').disabled=selected<0;
    const o=objects[selected];if(o) for(const k of ['x','y','angle','scale']) $(k).value=k==='angle'?(o[k]*180/Math.PI).toFixed(1):k==='scale'?o[k]:(o[k]/10).toFixed(1);
    $('scale').setAttribute('min',o?.type==='asphalt'?String(1/12):'0.2');
    $('scale').setAttribute('step',o?.type==='asphalt'?'any':'0.1');
    $('hill-height-property').hidden=o?.type!=='hill';
    if(o?.type==='hill')$('height').value=o.height;
    $('asphalt-road-property').hidden=o?.type!=='asphalt';
    if(o?.type==='asphalt')$('allow-on-track').checked=o.allowOnTrack!==false;
    for(const id of ['angle','scale','rotate-left','rotate-right','duplicate','remove'])$(id).disabled=!!o&&api.isScene(o.type);
    $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
    if(drawingBarrier())$('status').textContent=`Piirrä ${wallName()} vetämällä. Jatka olemassa olevan vallin tai kaiteen päästä. Kumoa peruu koko vedon; Esc peruu keskeneräisen vedon.`;
    else if(paintingSurface())$('status').textContent=`Maalaa ${$('type').value==='hill'?'mäkeä':$('type').value==='lake'?'järveä':'asfalttia'} vetämällä. Kumoa peruu koko vedon. Esc lopettaa; hiiren keskipainike siirtää karttaa.`;
    else if(dirty)$('status').textContent=`${objects.length} elementtiä · tallentamattomia muutoksia`;
    draw();
  }
  function fit(){zoom=Math.min(canvas.clientWidth/5200,canvas.clientHeight/4400)*.95;ox=(canvas.clientWidth-5200*zoom)/2;oy=(canvas.clientHeight-4400*zoom)/2;draw();}
  function setAddMode(enabled){
    if(['surface-paint','barrier-paint'].includes(drag?.mode)){
      const id=drag.id;drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    }
    adding = enabled;
    canvas.style.cursor = enabled ? 'crosshair' : '';
    if(drawingBarrier()){
      $('status').textContent=`Piirrä yhtenäisesti ${wallName()}. Aloitus ja lopetus tarttuvat lähellä olevan samanlaisen elementin päähän.`;
    } else if(paintingSurface()){
      $('status').textContent = `Maalaa ${$('type').value==='hill'?'mäkeä':$('type').value==='lake'?'järveä':'asfalttia'} vetämällä kartalla, myös nykyisen alueen päälle. Esc lopettaa.`;
    } else {
      $('status').textContent = enabled ? 'Napauta sijoituspaikkaa kartalla.' : 'Lisäys peruttu.';
    }
    updateAddButtonLabel();
    brushPoint=null;draw();
  }
  function focusScene(label,x,y){
    const targetZoom = Math.min(1.4, Math.max(0.7, Math.min(canvas.clientWidth / 2200, canvas.clientHeight / 1800)));
    zoom = targetZoom;
    ox = (canvas.clientWidth / 2) - x * zoom;
    oy = (canvas.clientHeight / 2) - y * zoom;
    $('status').textContent = `${label} näytetty kartalla.`;
    draw();
  }
  function addBrushStamps(p){
    const point={x:clamp(p.x,5200),y:clamp(p.y,4400)};
    const previous=drag.last||point,distance=Math.hypot(point.x-previous.x,point.y-previous.y);
    const spacing=(drag.type==='hill'?50:drag.type==='asphalt'?18:30)*drag.scale;
    const steps=Math.max(1,Math.ceil(distance/spacing));
    for(let i=1;i<=steps;i++){
      if(objects.length+drag.stamps.length>=api.maxObjects){drag.full=true;break;}
      const stamp={type:drag.type,x:previous.x+(point.x-previous.x)*i/steps,y:previous.y+(point.y-previous.y)*i/steps,angle:0,scale:drag.scale,...(drag.type==='asphalt'?{square:true,roundness:drag.roundness,allowOnTrack:drag.allowOnTrack}:drag.type==='hill'?{height:drag.height}:{})};
      if(stamp.type==='asphalt'&&!stamp.allowOnTrack&&!api.asphaltPolygons(stamp,roadMask).length)continue;
      drag.stamps.push(stamp);
    }
    drag.last=point;
  }
  function barrierPoint(p,snapEnd=false){
    const point={x:clamp(p.x,5200),y:clamp(p.y,4400)};
    if(!snapEnd)return point;
    let best=point,distance=Math.min(20,10/zoom);
    for(const o of objects){
      if(o.type!==$('type').value)continue;
      const half=api.wallFootprint(o).w*o.scale/2;
      for(const side of [-1,1]){
        const end={x:o.x+side*half*Math.cos(o.angle),y:o.y+side*half*Math.sin(o.angle)};
        const gap=Math.hypot(end.x-point.x,end.y-point.y);
        if(gap<distance&&end.x>=0&&end.x<=5200&&end.y>=0&&end.y<=4400){best=end;distance=gap;}
      }
    }
    return best;
  }
  function addBarrierSegments(p,snapEnd=false){
    if(drag.full)return;
    const end=barrierPoint(p,snapEnd),start=drag.last;
    const length=Math.hypot(end.x-start.x,end.y-start.y);
    if(length<1)return;
    const count=Math.ceil(length/api.types[drag.type].w),angle=Math.atan2(end.y-start.y,end.x-start.x);
    for(let i=1;i<=count;i++){
      if(objects.length+drag.stamps.length>=api.maxObjects){drag.full=true;break;}
      const a={x:start.x+(end.x-start.x)*(i-1)/count,y:start.y+(end.y-start.y)*(i-1)/count};
      const b={x:start.x+(end.x-start.x)*i/count,y:start.y+(end.y-start.y)*i/count};
      drag.stamps.push({type:drag.type,x:(a.x+b.x)/2,y:(a.y+b.y)/2,angle,scale:1,length:length/count});
      drag.last=b;
    }
  }
  function drawBrush(){
    if(drawingBarrier()&&brushPoint){
      const p=barrierPoint(brushPoint,true);
      ctx.beginPath();ctx.arc(p.x,p.y,5/zoom,0,Math.PI*2);ctx.strokeStyle='#eaf6ed';ctx.lineWidth=1.5/zoom;ctx.stroke();return;
    }
    if(!paintingSurface()||!brushPoint)return;
    const scale=drag?.mode==='surface-paint'?drag.scale:brushScale();
    ctx.beginPath();
    if($('type').value==='asphalt'){
      const roundness=drag?.mode==='surface-paint'?drag.roundness:Number($('asphalt-roundness').value)/100;
      const allowOnTrack=drag?.mode==='surface-paint'?drag.allowOnTrack:$('asphalt-over-road').checked;
      asphaltPath({square:true,roundness,scale,allowOnTrack},brushPoint.x,brushPoint.y);
    }else if($('type').value==='hill')ctx.arc(brushPoint.x,brushPoint.y,200*scale,0,Math.PI*2);
    else ctx.ellipse(brushPoint.x,brushPoint.y,100*scale,90*scale,0,0,Math.PI*2);
    ctx.strokeStyle='#fff';ctx.lineWidth=1.5/zoom;ctx.stroke();
  }
  function asphaltPath(o,x=0,y=0){
    const placement={...o,x:o.x??x,y:o.y??y,angle:o.angle??0};
    const key=JSON.stringify(placement);let cached=asphaltCache.get(o);
    if(cached?.key!==key){cached={key,polygons:api.asphaltPolygons(placement,roadMask)};asphaltCache.set(o,cached);}
    const c=Math.cos(placement.angle),s=Math.sin(placement.angle);
    for(const polygon of cached.polygons){
      polygon.forEach(([px,py],i)=>{
        if(o.x!==undefined){const dx=px-placement.x,dy=py-placement.y;px=dx*c+dy*s;py=-dx*s+dy*c;}
        i?ctx.lineTo(px,py):ctx.moveTo(px,py);
      });ctx.closePath();
    }
  }
  function drawSalePlan(){
    if(!salePlan.surfaces.length)return;
    ctx.save();
    for(const surface of salePlan.surfaces){
      ctx.beginPath();surface.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();ctx.fillStyle=`rgb(${surface.color.map(c=>Math.round(c*255)).join(',')})`;ctx.fill();
    }
    if(zoom>=.3){
      ctx.strokeStyle='#53605a';ctx.lineWidth=1.2/zoom;
      for(const {from,to} of salePlan.ramps){
        const a=from.map((v,i)=>v+(to[i]-v)*.2),b=from.map((v,i)=>v+(to[i]-v)*.8);
        const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),size=5/zoom;
        ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);
        for(const side of [-1,1]){ctx.moveTo(...b);ctx.lineTo(b[0]-size*Math.cos(angle+side*.55),b[1]-size*Math.sin(angle+side*.55));}
        ctx.stroke();
      }
      ctx.fillStyle='#263b32';ctx.font=`600 ${11/zoom}px system-ui`;ctx.textAlign='center';
      for(const label of salePlan.labels)ctx.fillText(label.text,label.x,label.y);
      const entrance=window.LPRSale.entrance;
      ctx.beginPath();ctx.arc(entrance.x,entrance.y,3.5/zoom,0,Math.PI*2);ctx.fillStyle='#cfa831';ctx.fill();
      ctx.font=`${10/zoom}px system-ui`;ctx.fillStyle='#eee9d7';ctx.fillText('Pääovi',entrance.x,entrance.y-8/zoom);
    }
    ctx.restore();
  }
  function draw(){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=window.devicePixelRatio||1;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.translate(ox,oy);ctx.scale(zoom,zoom);
    ctx.strokeStyle='#38523b';ctx.lineWidth=1/zoom;ctx.beginPath();for(let x=0;x<=5200;x+=100){ctx.moveTo(x,0);ctx.lineTo(x,4400);}for(let y=0;y<=4400;y+=100){ctx.moveTo(0,y);ctx.lineTo(5200,y);}ctx.stroke();
    ctx.fillStyle='#617361';for(const b of LPRCampus.buildingBounds)ctx.fillRect(b.minX,b.minY,b.maxX-b.minX,b.maxY-b.minY);
    const lakePoints = [[590,80],[1050,80],[1050,520],[850,480],[780,400],[745,330],[715,240]].map(([x,z])=>{
      const p = LPRCampus.world(x,z); return { x: p.x, y: p.y };
    });
    ctx.beginPath();lakePoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=lakeColor;ctx.fill();
    objects.forEach((o,i)=>{if(o.type==='lake')drawObject(o,i);});
    if(drag?.mode==='surface-paint'&&drag.type==='lake')drag.stamps.forEach(o=>drawObject(o,-1));
    const jettyCoords = [[620,305,145,12],[694,332,120,12],[755,388,100,12]].map(([x,z,w,d])=>({x:LPRCampus.world(x,z).x,y:LPRCampus.world(x,z).y,w:d*3,h:w*0.9}));
    for(const p of jettyCoords){ctx.fillStyle='#8c5d32';ctx.fillRect(p.x-20,p.y-6,p.w,p.h);ctx.fillStyle='#5b3d1b';for(let i=0;i<8;i++)ctx.fillRect(p.x-20+i*18,p.y-6,2,p.h);}
    ctx.beginPath();LPRCampus.track.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#bbbba9';ctx.lineWidth=78;ctx.stroke();ctx.strokeStyle='#454d4e';ctx.lineWidth=66;ctx.stroke();
    const start=LPRCampus.track[0];ctx.fillStyle='#fff';ctx.font=`${12/zoom}px system-ui`;ctx.fillText('Lähtö',start.x,start.y-50);
    ctx.fillStyle='#385d35';for(const t of LPRCampus.trees){ctx.beginPath();ctx.arc(t.x,t.y,12,0,Math.PI*2);ctx.fill();}
    objects.forEach((o,i)=>{if(o.type!=='asphalt')return;drawObject(o,i);});
    if(drag?.mode==='surface-paint'&&drag.type==='asphalt')drag.stamps.forEach(o=>drawObject(o,-1));
    drawSalePlan();
    objects.forEach((o,i)=>{if(o.type==='hill')drawObject(o,i);});
    if(drag?.mode==='surface-paint'&&drag.type==='hill')drag.stamps.forEach(o=>drawObject(o,-1));
    objects.forEach((o,i)=>{if(o.type==='asphalt'||o.type==='lake'||o.type==='hill')return;drawObject(o,i);});
    if(drag?.mode==='barrier-paint')drag.stamps.forEach(o=>drawObject(o,-1));
    if(selected>=0&&!drawingStroke()&&!api.isScene(objects[selected].type))drawRotationHandle(objects[selected]);
    drawBrush();
  }
  function drawObject(o,i){
    const t=api.types[o.type],size=objectSize(o),w=isWall(o.type)?size.w*o.scale:Math.max(size.w*o.scale,10/zoom),d=Math.max(size.d*o.scale,isWall(o.type)?3/zoom:10/zoom);
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.angle);
    if(o.type==='hill'){
      for(const ring of [1,.75,.5,.25]){
        ctx.beginPath();ctx.arc(0,0,200*o.scale*ring,0,Math.PI*2);
        ctx.fillStyle='rgba(151,176,67,.16)';ctx.fill();ctx.strokeStyle='rgba(220,213,121,.6)';ctx.lineWidth=1/zoom;ctx.stroke();
      }
      ctx.fillStyle='#fff';ctx.font=`${11/zoom}px system-ui`;ctx.fillText(`${o.height} m`,0,0);
    }else if(o.type==='lake'){
      ctx.beginPath();
      ctx.ellipse(0,0,t.w*o.scale/2,t.d*o.scale/2,0,0,Math.PI*2);
      ctx.fillStyle=lakeColor;
      ctx.fill();
    } else if(o.type==='asphalt'){
      ctx.beginPath();asphaltPath(o);
      ctx.fillStyle=`rgb(${t.color.map(c=>Math.round(c*255)).join(',')})`;ctx.fill();
    } else if(o.type==='barrier') {
      const postWidth=Math.min(w,Math.max(1.35*o.scale,1.5/zoom)),postHeight=d*.78,railHeight=Math.max(3/zoom,d*.38);
      const postCount=Math.max(2,Math.ceil(size.w/20));
      ctx.fillStyle='#4b5357';
      for(let i=0;i<postCount;i++){
        const x=-w/2+postWidth/2+i*(w-postWidth)/(postCount-1);
        ctx.fillRect(x-postWidth/2,-postHeight*.28,postWidth,postHeight);
      }
      ctx.fillStyle='#aeb6b8';
      ctx.fillRect(-w/2,-railHeight*.34,w,railHeight*.68);
      ctx.strokeStyle='#737d80';ctx.lineWidth=Math.max(1/zoom,railHeight*.13);
      for(let y=-railHeight*.25;y<=railHeight*.25;y+=railHeight*.25) {
        ctx.beginPath();ctx.moveTo(-w/2,y);ctx.lineTo(w/2,y);ctx.stroke();
      }
      ctx.strokeStyle='#e0e3e2';ctx.lineWidth=Math.max(1/zoom,railHeight*.08);
      ctx.beginPath();ctx.moveTo(-w/2,-railHeight*.31);ctx.lineTo(w/2,-railHeight*.31);ctx.stroke();
    } else if(api.isScene(o.type)) {
      ctx.fillStyle=`rgb(${t.color.map(c=>Math.round(c*255)).join(',')})`;
      if(o.type==='person'||o.type==='pool'){
        ctx.beginPath();ctx.arc(0,0,w/2,0,Math.PI*2);ctx.fill();
        if(o.type==='pool'){ctx.fillStyle='#35828b';ctx.beginPath();ctx.arc(0,0,w*.38,0,Math.PI*2);ctx.fill();}
      }else ctx.fillRect(-w/2,-d/2,w,d);
      ctx.rotate(-o.angle);ctx.fillStyle='#fff';ctx.font=`${11/zoom}px system-ui`;
      ctx.fillText(o.type==='person'?`${o.personId+1}`:t.name,0,-d/2-5/zoom);
    } else if(o.type==='tyreWall') {
      const count=Math.max(1,Math.ceil(size.w/7.2)),radius=Math.min(3.6,size.w/2)*o.scale;
      ctx.fillStyle='#202322';ctx.strokeStyle='#646967';ctx.lineWidth=Math.min(radius*.25,1/zoom);
      for(let i=0;i<count;i++){
        const x=count===1?0:-w/2+radius+i*(w-2*radius)/(count-1);
        ctx.beginPath();ctx.arc(x,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.arc(x,0,radius*.48,0,Math.PI*2);ctx.stroke();
      }
    } else if(o.type==='pier') {
      ctx.fillStyle='#8c5d32';
      ctx.fillRect(-w/2,-d/2,w,d);
      ctx.fillStyle='#5b3d1b';
      for(let x=-w/2+10;x<=w/2-10;x+=14){ctx.fillRect(x,-d/2+2,2,d-4);}
      ctx.strokeStyle='rgba(33,22,14,0.75)';
      ctx.lineWidth=2/zoom;
      ctx.strokeRect(-w/2,-d/2,w,d);
    } else if(o.type==='tree') {
      ctx.fillStyle='rgba(53,38,21,0.8)';
      ctx.fillRect(-w*0.12, -d*0.16, w*0.24, d*0.38);
      ctx.fillStyle='rgba(22,82,38,0.9)';
      ctx.beginPath();ctx.arc(0,-d*0.44,w*0.75,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(-w*0.38,-d*0.2,w*0.48,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(w*0.38,-d*0.22,w*0.48,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(0,-d*0.04,w*0.55,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(34,124,51,0.9)';
      ctx.beginPath();ctx.arc(-w*0.1,-d*0.28,w*0.34,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(w*0.15,-d*0.3,w*0.38,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(21,55,25,0.45)';
      ctx.fillRect(-w*0.4, d*0.12, w*0.8, w*0.08);
    } else {
      ctx.fillStyle=`rgb(${t.color.map(c=>Math.round(c*255)).join(',')})`;
      ctx.fillRect(-w/2,-d/2,w,d);
    }
    if(o.type==='tyreWall') {
      ctx.strokeStyle='#555';ctx.lineWidth=2/zoom;
      for(let x=-w/2+5;x<w/2;x+=10){ctx.beginPath();ctx.arc(x,0,Math.min(d*.38,3.8),0,Math.PI*2);ctx.stroke();}
    }
    if(o.type==='building'){ctx.strokeStyle='#9a998e';ctx.lineWidth=2/zoom;ctx.strokeRect(-w/2+5,-d/2+5,w-10,d-10);}
    if(!['lake','asphalt','hill','barrier','tyreWall'].includes(o.type)||(i===selected&&i>=0&&!drawingStroke())){
      ctx.strokeStyle=i===selected?'#fff':'#111';ctx.lineWidth=(i===selected?3:1)/zoom;ctx.strokeRect(-w/2,-d/2,w,d);
    }
    ctx.restore();
  }
  function drawRotationHandle(o){
    const t=objectSize(o),x=t.w*o.scale/2,y=-t.d*o.scale/2,r=11/zoom;
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.angle);
    ctx.strokeStyle='#fff';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+17/zoom,y-17/zoom);ctx.stroke();
    const hx=x+25/zoom,hy=y-25/zoom;
    ctx.fillStyle='#10251c';ctx.strokeStyle='#fff';ctx.lineWidth=2/zoom;
    ctx.beginPath();ctx.arc(hx,hy,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#a7f2c3';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.arc(hx,hy,5/zoom,-Math.PI*.7,Math.PI*.95);ctx.stroke();
    ctx.fillStyle='#a7f2c3';ctx.beginPath();ctx.moveTo(hx-4/zoom,hy-4/zoom);ctx.lineTo(hx-1/zoom,hy-5/zoom);ctx.lineTo(hx-3/zoom,hy-1/zoom);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function isOnRotationHandle(o,p){
    const t=objectSize(o),dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);
    const x=dx*c+dy*s,y=-dx*s+dy*c,hx=t.w*o.scale/2+25/zoom,hy=-t.d*o.scale/2-25/zoom;
    return Math.hypot(x-hx,y-hy)<=14/zoom;
  }
  function findHitObjectIndex(p){
    return objects.findLastIndex(o=>{if(o.type==='asphalt')return !(o.allowOnTrack===false&&roadMask.contains(p.x,p.y))&&api.onAsphaltObject(o,p.x,p.y);const t=objectSize(o),dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);return Math.abs(dx*c+dy*s)<Math.max(t.w*o.scale/2,9/zoom)&&Math.abs(-dx*s+dy*c)<Math.max(t.d*o.scale/2,9/zoom);});
  }
  function world(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-ox)/zoom,y:(e.clientY-r.top-oy)/zoom};}
  function clamp(v,max){return Math.max(0,Math.min(max,$('snap').checked?Math.round(v/10)*10:v));}
  function treeAt(p){
    let best = null;
    for (let i = 0; i < LPRCampus.trees.length; i++) {
      const tree = LPRCampus.trees[i];
      if (Math.hypot(p.x - tree.x, p.y - tree.y) <= 18 / zoom) best = i;
    }
    return best;
  }
  function treeObjectAt(p, radius=25){
    let best = null;
    let bestDistance = Infinity;
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      if (object.type !== 'tree') continue;
      const distance = Math.hypot(p.x - object.x, p.y - object.y);
      if (distance <= radius && distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(drag||![0,1].includes(e.button))return;const p=world(e);
    if(e.button===1){e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,p,origin:null,moved:false};canvas.setPointerCapture(e.pointerId);return;}
    if(drawingBarrier()){
      if(objects.length>=api.maxObjects){$('status').textContent=`Enintään ${api.maxObjects} elementtiä. Poista elementtejä ennen piirtämistä.`;return;}
      drag={id:e.pointerId,mode:'barrier-paint',type:$('type').value,stamps:[],last:barrierPoint(p,true)};
      brushPoint=p;canvas.setPointerCapture(e.pointerId);draw();return;
    }
    if(paintingSurface()){
      if(objects.length>=api.maxObjects){$('status').textContent=`Enintään ${api.maxObjects} elementtiä. Poista elementtejä ennen piirtämistä.`;return;}
      drag={id:e.pointerId,mode:'surface-paint',type:$('type').value,stamps:[],scale:brushScale(),roundness:Number($('asphalt-roundness').value)/100,height:Number($('hill-height').value),allowOnTrack:$('asphalt-over-road').checked};
      brushPoint=p;addBrushStamps(p);
      canvas.setPointerCapture(e.pointerId);draw();return;
    }
    const hitIndex = findHitObjectIndex(p);
    if(selected>=0&&!api.isScene(objects[selected].type)&&isOnRotationHandle(objects[selected],p)){
      const o=objects[selected];
      drag={id:e.pointerId,mode:'rotate',originAngle:o.angle,pointerAngle:Math.atan2(p.y-o.y,p.x-o.x),moved:false};
      canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';return;
    }
    if(adding){
      if(hitIndex >= 0) {
        selected = hitIndex;
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,p,origin:{...objects[selected]},moved:false};
        canvas.setPointerCapture(e.pointerId);sync();
        return;
      }
      if(objects.length>=api.maxObjects){$('status').textContent=`Enintään ${api.maxObjects} elementtiä.`;return;}checkpoint();objects.push({type:$('type').value,x:clamp(p.x,5200),y:clamp(p.y,4400),angle:0,scale:1});selected=objects.length-1;canvas.style.cursor='crosshair';sync();return;
    }
    const treeIndex = treeAt(p);
    if(treeIndex !== null&&(hitIndex<0||objects[hitIndex].type==='tree')){
      const tree = LPRCampus.trees[treeIndex];
      const objectIndex = treeObjectAt({x:tree.x,y:tree.y}, 18);
      selected = objectIndex ?? -1;
      drag={id:e.pointerId,mode:'tree',treeIndex,objectIndex,origin:{x:tree.x,y:tree.y},pointer:{x:p.x,y:p.y},moved:false};
      canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';$('status').textContent='Siirrä puuta kartalla.';sync();return;
    }
    selected = hitIndex;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,p,origin:selected>=0?{...objects[selected]}:null,moved:false};canvas.setPointerCapture(e.pointerId);sync();
  });
  canvas.addEventListener('pointermove',e=>{
    if(drawingStroke()){brushPoint=world(e);}
    if(!drag){canvas.style.cursor=drawingStroke()?'crosshair':selected>=0&&isOnRotationHandle(objects[selected],world(e))?'grab':adding?'crosshair':'';if(drawingStroke())draw();return;}
    if(e.pointerId!==drag.id)return;
    const p=world(e);
    if(drag.mode==='barrier-paint'){
      if(Math.hypot(p.x-drag.last.x,p.y-drag.last.y)>=8)addBarrierSegments(p);
      draw();return;
    }
    if(drag.mode==='rotate'){
      const o=objects[selected];
      if(!drag.moved)checkpoint();
      const delta=Math.atan2(p.y-o.y,p.x-o.x)-drag.pointerAngle;
      o.angle=drag.originAngle+Math.atan2(Math.sin(delta),Math.cos(delta));
      drag.moved=true;sync();return;
    }
    if(drag.mode==='tree'){
      const tree = LPRCampus.trees[drag.treeIndex];
      const nextX = clamp(drag.origin.x + (p.x - drag.pointer.x), 5200);
      const nextY = clamp(drag.origin.y + (p.y - drag.pointer.y), 4400);
      if(!drag.moved) checkpoint();
      if(drag.objectIndex === null || drag.objectIndex < 0 || drag.objectIndex >= objects.length || objects[drag.objectIndex].type !== 'tree') {
        const nearby = treeObjectAt({x:nextX,y:nextY}, 18);
        drag.objectIndex = nearby ?? objects.length;
        if(nearby === null) objects.push({type:'tree',x:nextX,y:nextY,angle:0,scale:1});
      }
      const target = objects[drag.objectIndex];
      if(target && target.type === 'tree') {
        target.x = nextX;
        target.y = nextY;
        selected = drag.objectIndex;
      }
      tree.x = nextX;
      tree.y = nextY;
      drag.moved = true;
      sync();
      return;
    }
    if(drag.mode==='surface-paint'){
      if(Math.hypot(p.x-drag.last.x,p.y-drag.last.y)>=10*drag.scale)addBrushStamps(p);
      draw();
      return;
    }
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
    if(drag.origin){if(!drag.moved)checkpoint();objects[selected].x=clamp(drag.origin.x+p.x-drag.p.x,5200);objects[selected].y=clamp(drag.origin.y+p.y-drag.p.y,4400);}else{ox+=e.clientX-drag.x;oy+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;}drag.moved=true;sync();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId){
    const stroke=drag;
    if(stroke.mode==='barrier-paint'&&event==='pointerup'){
      addBarrierSegments(world(e),true);
      if(stroke.stamps.length){checkpoint();objects.push(...stroke.stamps);selected=-1;}
    }
    if(stroke.mode==='surface-paint'&&event==='pointerup'){
      const p=world(e);if(Math.hypot(p.x-stroke.last.x,p.y-stroke.last.y)>0)addBrushStamps(p);
      if(stroke.stamps.length){checkpoint();objects.push(...stroke.stamps);selected=-1;}
    }
    drag=null;canvas.style.cursor=adding?'crosshair':'';sync();
    if(stroke.full&&event==='pointerup')$('status').textContent=`Enintään ${api.maxObjects} elementtiä. Veto tallennettiin rajaan asti; voit kumota sen.`;
  }});
  canvas.addEventListener('pointerleave',()=>{if(!drag){brushPoint=null;draw();}});
  window.addEventListener('keydown',e=>{
    if(e.key==='Delete'){
      const target=e.target;
      if(target?.isContentEditable || ['INPUT','TEXTAREA'].includes(target?.tagName) ||
        (target?.tagName==='SELECT' && target!==$('list')) || drag || selected<0||api.isScene(objects[selected].type))return;
      e.preventDefault();
      removeSelected();
      return;
    }
    if(e.key!=='Escape')return;
    if(['surface-paint','barrier-paint'].includes(drag?.mode)){const id=drag.id;drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);draw();}
    else if(adding)setAddMode(false);
  });
  function magnify(f,x=canvas.clientWidth/2,y=canvas.clientHeight/2){const next=Math.max(.05,Math.min(3,zoom*f));ox=x-(x-ox)*next/zoom;oy=y-(y-oy)*next/zoom;zoom=next;draw();}
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(drag)return;brushPoint=null;const r=canvas.getBoundingClientRect();magnify(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  $('zoom-in').onclick=()=>magnify(1.3);$('zoom-out').onclick=()=>magnify(1/1.3);$('fit').onclick=fit;$('focus-sale').onclick=()=>{
    const entrance=window.LPRSale?.entrance||{x:2450,y:1910};
    focusScene('Yolo / Sale',entrance.x,entrance.y+50);
  };$('focus-sauna').onclick=()=>{const sauna=objects.find(o=>o.type==='sauna')||LPRCampus.saunaSite||{x:2890,y:1055};focusScene('Sauna',sauna.x,sauna.y);};
  $('add').onclick=()=>setAddMode(!adding);
  $('lake-width').oninput=()=>{$('lake-width-value').textContent=`${$('lake-width').value} m`;draw();};
  $('asphalt-width').oninput=()=>{$('asphalt-width-value').textContent=`${$('asphalt-width').value} m`;draw();};
  $('asphalt-roundness').oninput=()=>{$('asphalt-roundness-value').textContent=`${$('asphalt-roundness').value} %`;draw();};
  $('asphalt-over-road').onchange=draw;
  $('allow-on-track').onchange=()=>{if(selected<0||objects[selected].type!=='asphalt')return;checkpoint();objects[selected].allowOnTrack=$('allow-on-track').checked;sync();};
  $('hill-width').oninput=()=>{$('hill-width-value').textContent=`${$('hill-width').value} m`;draw();};
  $('hill-height').oninput=()=>{$('hill-height-value').textContent=`${$('hill-height').value} m`;draw();};
  $('height').onchange=()=>{if(selected<0||objects[selected].type!=='hill'||!$('height').value||!$('height').checkValidity())return;checkpoint();objects[selected].height=Number($('height').value);sync();};
  $('type').addEventListener('change',()=>{updateAddButtonLabel();setAddMode(true);});
  $('list').addEventListener('change',()=>{selected=Number($('list').value);sync();});
  for(const k of ['x','y','angle','scale'])$(k).onchange=()=>{if(selected<0)return;const v=Number($(k).value);if(!$(k).value||!Number.isFinite(v)||!$(k).checkValidity()){sync();return;}checkpoint();objects[selected][k]=k==='angle'?v*Math.PI/180:k==='scale'?v:v*10;sync();};
  for(const [id,delta] of [['rotate-left',-15],['rotate-right',15]])$(id).onclick=()=>{if(selected<0||api.isScene(objects[selected].type))return;checkpoint();objects[selected].angle+=delta*Math.PI/180;sync();};
  function removeSelected(){if(selected<0||drag||api.isScene(objects[selected].type))return;checkpoint();objects.splice(selected,1);selected=-1;sync();}
  $('remove').onclick=removeSelected;
  $('remove').textContent='Poista (Delete)';
  $('duplicate').onclick=()=>{if(selected<0||objects.length>=api.maxObjects||api.isScene(objects[selected].type))return;checkpoint();const o=objects[selected];objects.push({...o,x:clamp(o.x+20,5200),y:clamp(o.y+20,4400)});selected=objects.length-1;sync();};
  function restore(from,to){if(!from.length)return;to.push(copy());objects=JSON.parse(from.pop());selected=-1;dirty=true;if(!saving)saveStatus('Tallentamattomia muutoksia.','dirty');sync();}
  $('undo').onclick=()=>restore(undo,redo);$('redo').onclick=()=>restore(redo,undo);
  $('save').onclick=async()=>{
    if(saving)return;
    if(window.location?.protocol==='file:'){
      saveStatus('Tallennus ei onnistu tiedostona avatusta editorista. Käynnistä npm run dev ja avaa http://localhost:8000/tools/track-editor/editor.html.','error');
      return;
    }
    const snapshot=copy();
    saving=true;$('save').disabled=true;
    saveStatus('Tallennetaan ja tarkistetaan…','saving');
    try{
      const expected=JSON.stringify(api.validate({version:1,objects:JSON.parse(snapshot)}));
      const response=await fetch('/api/dev/track-objects',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,objects:JSON.parse(snapshot)})});
      if(!response.ok)throw Error(await response.text());
      const verification=await fetch('/data/track-objects.json',{cache:'no-store'});
      if(!verification.ok)throw Error('Tallennettua rataa ei voitu lukea takaisin.');
      const actual=JSON.stringify(api.validate(await verification.json()));
      if(actual!==expected)throw Error('Tallennettu rata poikkeaa lähetetystä. Tallennusta ei voitu vahvistaa.');
      dirty=copy()!==snapshot;
      saveStatus(dirty?'Rata tallennettu ja tarkistettu. Uusia muutoksia on vielä tallentamatta.':`Rata tallennettu ja tarkistettu (${JSON.parse(snapshot).length} elementtiä).`,dirty?'dirty':'saved');
    }catch(e){dirty=true;saveStatus(`Tallennus epäonnistui: ${e.message}. Muutokset ovat edelleen editorissa; voit ottaa varmuuskopion Vie JSON -painikkeella.`,'error');}
    finally{saving=false;$('save').disabled=false;}
  };
  $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,objects},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lpr-rataelementit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>api.maxDocumentBytes)throw Error('Tiedosto on liian suuri.');const next=api.withSceneDefaults(api.validate(JSON.parse(await file.text())),LPRCampus);checkpoint();objects=next;selected=-1;sync();}catch(e){$('status').textContent=`Tuonti epäonnistui: ${e.message}`;}finally{$('import').value='';}};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  updateAddButtonLabel();
  new ResizeObserver(draw).observe(canvas);fit();sync();
  if(window.location?.protocol==='file:'){
    $('status').textContent='Editori on avattu tiedostona. Tallennus ja pelin ratadata tarvitsevat paikallisen palvelimen: käynnistä npm run dev ja avaa http://localhost:8000/tools/track-editor/editor.html. Vie jo tekemäsi muutokset ensin JSON-tiedostoon ja tuo ne palvelimella avattuun editoriin.';
  }
})();
