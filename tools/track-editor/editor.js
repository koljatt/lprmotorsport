(() => {
  'use strict';
  const api=window.LPRTrackDocument,$=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
  let objects=[],selected=-1,adding=false,drag=null,zoom=1,ox=0,oy=0,dirty=false;
  const undo=[],redo=[];
  function updateAddButtonLabel(){
    $('add').textContent = $('type').value === 'lake' ? 'Piirrä järvi' : 'Lisää kartalle';
  }
  try {objects=api.validate(window.LPRTrackData);} catch(e){$('status').textContent=e.message;}
  for(const [value,t] of Object.entries(api.types)) $('type').add(new Option(t.name,value));
  const copy=()=>JSON.stringify(objects);
  function checkpoint(){undo.push(copy());if(undo.length>100)undo.shift();redo.length=0;dirty=true;}
  function sync(){
    $('list').replaceChildren(...objects.map((o,i)=>new Option(`${i+1}. ${api.types[o.type].name}`,i)));
    $('list').value=String(selected);$('properties').disabled=selected<0;
    const o=objects[selected];if(o) for(const k of ['x','y','angle','scale']) $(k).value=k==='angle'?(o[k]*180/Math.PI).toFixed(1):k==='scale'?o[k]:(o[k]/10).toFixed(1);
    $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
    if(dirty)$('status').textContent=`${objects.length} elementtiä · tallentamattomia muutoksia`;
    draw();
  }
  function fit(){zoom=Math.min(canvas.clientWidth/5200,canvas.clientHeight/4400)*.95;ox=(canvas.clientWidth-5200*zoom)/2;oy=(canvas.clientHeight-4400*zoom)/2;draw();}
  function setAddMode(enabled){
    adding = enabled;
    canvas.style.cursor = enabled ? 'crosshair' : '';
    if(enabled && $('type').value === 'lake'){
      $('status').textContent = 'Piirrä järvi vetämällä kartalla.';
    } else {
      $('status').textContent = enabled ? 'Napauta sijoituspaikkaa kartalla.' : 'Lisäys peruttu.';
    }
    updateAddButtonLabel();
  }
  function focusScene(label,x,y){
    const targetZoom = Math.min(1.4, Math.max(0.7, Math.min(canvas.clientWidth / 2200, canvas.clientHeight / 1800)));
    zoom = targetZoom;
    ox = (canvas.clientWidth / 2) - x * zoom;
    oy = (canvas.clientHeight / 2) - y * zoom;
    $('status').textContent = `${label} näytetty kartalla.`;
    draw();
  }
  function drawLakePreview(start,end){
    if(!start||!end)return;
    const cx=(start.x+end.x)/2,cy=(start.y+end.y)/2;
    const dx=end.x-start.x,dy=end.y-start.y;
    const w=Math.max(50,Math.abs(dx)*0.8),d=Math.max(50,Math.abs(dy)*0.8);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(dy,dx));
    ctx.beginPath();ctx.ellipse(0,0,w/2,d/2,0,0,Math.PI*2);ctx.fillStyle='rgba(59,120,176,0.65)';ctx.fill();ctx.strokeStyle='rgba(11,52,82,0.9)';ctx.lineWidth=2/zoom;ctx.stroke();
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
    ctx.beginPath();lakePoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='rgba(59,120,176,0.9)';ctx.fill();
    ctx.strokeStyle='rgba(13,39,60,0.75)';ctx.lineWidth=4/zoom;ctx.stroke();
    const jettyCoords = [[620,305,145,12],[694,332,120,12],[755,388,100,12]].map(([x,z,w,d])=>({x:LPRCampus.world(x,z).x,y:LPRCampus.world(x,z).y,w:d*3,h:w*0.9}));
    for(const p of jettyCoords){ctx.fillStyle='#8c5d32';ctx.fillRect(p.x-20,p.y-6,p.w,p.h);ctx.fillStyle='#5b3d1b';for(let i=0;i<8;i++)ctx.fillRect(p.x-20+i*18,p.y-6,2,p.h);}
    ctx.beginPath();LPRCampus.track.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#bbbba9';ctx.lineWidth=78;ctx.stroke();ctx.strokeStyle='#454d4e';ctx.lineWidth=66;ctx.stroke();
    const start=LPRCampus.track[0];ctx.fillStyle='#fff';ctx.font=`${12/zoom}px system-ui`;ctx.fillText('Lähtö',start.x,start.y-50);
    ctx.fillStyle='#385d35';for(const t of LPRCampus.trees){ctx.beginPath();ctx.arc(t.x,t.y,12,0,Math.PI*2);ctx.fill();}
    objects.forEach((o,i)=>{if(o.type!=='asphalt')return;drawObject(o,i);});
    objects.forEach((o,i)=>{if(o.type==='asphalt')return;drawObject(o,i);});
    if(drag && drag.mode === 'lake-paint') drawLakePreview(drag.start, drag.current || drag.start);
    if(selected>=0)drawRotationHandle(objects[selected]);
  }
  function drawObject(o,i){
    const t=api.types[o.type],w=Math.max(t.w*o.scale,10/zoom),d=Math.max(t.d*o.scale,10/zoom);
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.angle);
    if(o.type==='lake'){
      ctx.beginPath();
      ctx.moveTo(-w*0.28, -d*0.5);
      ctx.bezierCurveTo(w*0.38, -d*0.62, w*0.5, -d*0.18, w*0.46, d*0.08);
      ctx.bezierCurveTo(w*0.54, d*0.38, w*0.18, d*0.55, -w*0.18, d*0.46);
      ctx.bezierCurveTo(-w*0.52, d*0.28, -w*0.56, -d*0.12, -w*0.28, -d*0.5);
      ctx.closePath();
      ctx.fillStyle='rgba(59,120,176,0.9)';
      ctx.fill();
      ctx.strokeStyle='rgba(11,52,82,0.7)';
      ctx.lineWidth=2/zoom;
      ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(-w*0.12, -d*0.08, w*0.26, d*0.18, Math.PI/8, 0, Math.PI*2);
      ctx.fill();
    } else if(o.type==='barrier') {
      const postWidth=Math.max(3,5/zoom),postHeight=d*.78,railHeight=Math.max(7/zoom,d*.38);
      ctx.fillStyle='#4b5357';
      for(let x=-w/2;x<=w/2;x+=w/4)ctx.fillRect(x-postWidth/2,-postHeight*.28,postWidth,postHeight);
      ctx.fillStyle='#aeb6b8';
      ctx.fillRect(-w/2,-railHeight*.34,w,railHeight*.68);
      ctx.strokeStyle='#737d80';ctx.lineWidth=Math.max(1/zoom,railHeight*.13);
      for(let y=-railHeight*.25;y<=railHeight*.25;y+=railHeight*.25) {
        ctx.beginPath();ctx.moveTo(-w/2,y);ctx.lineTo(w/2,y);ctx.stroke();
      }
      ctx.strokeStyle='#e0e3e2';ctx.lineWidth=Math.max(1/zoom,railHeight*.08);
      ctx.beginPath();ctx.moveTo(-w/2,-railHeight*.31);ctx.lineTo(w/2,-railHeight*.31);ctx.stroke();
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
    ctx.strokeStyle=i===selected?'#fff':'#111';ctx.lineWidth=(i===selected?3:1)/zoom;ctx.strokeRect(-w/2,-d/2,w,d);ctx.restore();
  }
  function drawRotationHandle(o){
    const t=api.types[o.type],x=t.w*o.scale/2,y=-t.d*o.scale/2,r=11/zoom;
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
    const t=api.types[o.type],dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);
    const x=dx*c+dy*s,y=-dx*s+dy*c,hx=t.w*o.scale/2+25/zoom,hy=-t.d*o.scale/2-25/zoom;
    return Math.hypot(x-hx,y-hy)<=14/zoom;
  }
  function findHitObjectIndex(p){
    return objects.findLastIndex(o=>{const t=api.types[o.type],dx=p.x-o.x,dy=p.y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);return Math.abs(dx*c+dy*s)<Math.max(t.w*o.scale/2,9/zoom)&&Math.abs(-dx*s+dy*c)<Math.max(t.d*o.scale/2,9/zoom);});
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
    if(drag||e.button!==0)return;const p=world(e);
    const hitIndex = findHitObjectIndex(p);
    if(selected>=0&&isOnRotationHandle(objects[selected],p)){
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
      if($('type').value === 'lake') {
        drag={id:e.pointerId,mode:'lake-paint',start:p,current:p,moved:false};
        canvas.setPointerCapture(e.pointerId);canvas.style.cursor='crosshair';draw();
        return;
      }
      if(objects.length>=1000){$('status').textContent='Enintään 1000 elementtiä.';return;}checkpoint();objects.push({type:$('type').value,x:clamp(p.x,5200),y:clamp(p.y,4400),angle:0,scale:1});selected=objects.length-1;canvas.style.cursor='crosshair';sync();return;
    }
    const treeIndex = treeAt(p);
    if(treeIndex !== null){
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
    if(!drag){canvas.style.cursor=selected>=0&&isOnRotationHandle(objects[selected],world(e))?'grab':adding?'crosshair':'';return;}
    if(e.pointerId!==drag.id)return;
    const p=world(e);
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
    if(drag.mode==='lake-paint'){
      drag.current = p;
      drag.moved = true;
      draw();
      return;
    }
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
    if(drag.origin){if(!drag.moved)checkpoint();objects[selected].x=clamp(drag.origin.x+p.x-drag.p.x,5200);objects[selected].y=clamp(drag.origin.y+p.y-drag.p.y,4400);}else{ox+=e.clientX-drag.x;oy+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;}drag.moved=true;sync();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId){
    if(drag.mode==='lake-paint'){
      const start=drag.start,end=drag.current||drag.start;
      const dx=end.x-start.x,dy=end.y-start.y;
      const size=Math.max(50,Math.max(Math.abs(dx),Math.abs(dy))*1.2);
      const scale=Math.max(0.7,size/180);
      if(objects.length>=1000){$('status').textContent='Enintään 1000 elementtiä.';drag=null;canvas.style.cursor=adding?'crosshair':'';return;}
      checkpoint();
      objects.push({type:'lake',x:clamp((start.x+end.x)/2,5200),y:clamp((start.y+end.y)/2,4400),angle:Math.atan2(dy,dx),scale:scale});
      selected=objects.length-1;sync();
    }
    drag=null;canvas.style.cursor=adding?'crosshair':'';}});
  function magnify(f,x=canvas.clientWidth/2,y=canvas.clientHeight/2){const next=Math.max(.05,Math.min(3,zoom*f));ox=x-(x-ox)*next/zoom;oy=y-(y-oy)*next/zoom;zoom=next;draw();}
  canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();magnify(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  $('zoom-in').onclick=()=>magnify(1.3);$('zoom-out').onclick=()=>magnify(1/1.3);$('fit').onclick=fit;$('focus-sale').onclick=()=>focusScene('Sale',2450,1910);$('focus-sauna').onclick=()=>focusScene('Sauna',2890,1055);
  $('add').onclick=()=>setAddMode(!adding);
  $('type').addEventListener('change',()=>{updateAddButtonLabel();setAddMode(true);});
  $('list').addEventListener('change',()=>{selected=Number($('list').value);sync();});
  for(const k of ['x','y','angle','scale'])$(k).onchange=()=>{if(selected<0)return;const v=Number($(k).value);if(!$(k).value||!Number.isFinite(v)||!$(k).checkValidity()){sync();return;}checkpoint();objects[selected][k]=k==='angle'?v*Math.PI/180:k==='scale'?v:v*10;sync();};
  for(const [id,delta] of [['rotate-left',-15],['rotate-right',15]])$(id).onclick=()=>{if(selected<0)return;checkpoint();objects[selected].angle+=delta*Math.PI/180;sync();};
  $('remove').onclick=()=>{if(selected<0)return;checkpoint();objects.splice(selected,1);selected=-1;sync();};
  $('duplicate').onclick=()=>{if(selected<0||objects.length>=1000)return;checkpoint();const o=objects[selected];objects.push({...o,x:clamp(o.x+20,5200),y:clamp(o.y+20,4400)});selected=objects.length-1;sync();};
  function restore(from,to){if(!from.length)return;to.push(copy());objects=JSON.parse(from.pop());selected=-1;dirty=true;sync();}
  $('undo').onclick=()=>restore(undo,redo);$('redo').onclick=()=>restore(redo,undo);
  $('save').onclick=async()=>{
    const snapshot=copy();
    try{
      const response=await fetch('/api/dev/track-objects',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,objects:JSON.parse(snapshot)})});
      if(!response.ok)throw Error(await response.text());
      dirty=copy()!==snapshot;
      $('status').textContent=dirty?'Tallennettu. Uusia muutoksia ei ole tallennettu.':'Tallennettu projektin data/track-objects.json-tiedostoon.';
    }catch(e){$('status').textContent=`Tallennus epäonnistui: ${e.message}`;}
  };
  $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,objects},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lpr-rataelementit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>1000000)throw Error('Tiedosto on liian suuri.');const next=api.validate(JSON.parse(await file.text()));checkpoint();objects=next;selected=-1;sync();}catch(e){$('status').textContent=`Tuonti epäonnistui: ${e.message}`;}finally{$('import').value='';}};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  updateAddButtonLabel();
  new ResizeObserver(draw).observe(canvas);fit();sync();
})();
