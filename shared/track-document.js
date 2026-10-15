(function(root) {
  'use strict';
  const types={
    cone:{name:'Kartio',w:6,d:6,h:8,color:[1,.4,.05]},
    barrier:{name:'Suojakaide',w:40,d:8,h:12,color:[.48,.52,.54]},
    tyreWall:{name:'Rengasvalli',w:50,d:8,h:8,color:[.075,.085,.09]},
    kerb:{name:'Korkeuserä',w:20,d:8,h:24,color:[.63,.61,.5]},
    building:{name:'Rakennus',w:100,d:80,h:60,color:[.58,.57,.51]},
    asphalt:{name:'Asfaltti',w:120,d:80,h:0,color:[.14,.16,.17]},
    hill:{name:'Mäki',w:400,d:400,h:30,color:[.36,.52,.23]},
    tree:{name:'Puu',w:56,d:56,h:165,color:[.14,.42,.18]},
    box:{name:'Laatikko',w:15,d:15,h:15,color:[.55,.38,.2]},
    lake:{name:'Järvi',w:200,d:180,h:0,color:[.15,.5,.8]},
    pier:{name:'Laituri',w:80,d:14,h:8,color:[.68,.49,.24]},
    sauna:{name:'Sauna',w:68,d:24,h:34,color:[.69,.51,.33]},
    bonfire:{name:'Nuotiopaikka',w:92,d:55,h:20,color:[1,.38,.04]},
    pool:{name:'Palju',w:28,d:28,h:10,color:[.67,.44,.25]},
    person:{name:'Ihminen',w:7,d:7,h:18,color:[.055,.63,.22]}
  };
  const maxObjects=10000,maxDocumentBytes=5000000;
  const isScene=type=>['sauna','bonfire','pool','person'].includes(type);
  function validate(doc) {
    if(doc?.version!==1 || !Array.isArray(doc.objects) || doc.objects.length>maxObjects) throw Error(`Virheellinen rataelementtitiedosto (versio 1, enintään ${maxObjects} elementtiä).`);
    const sceneKeys=new Set();
    return doc.objects.map((o,i)=>{
      if(!o || !Object.hasOwn(types,o.type) || !['x','y','angle','scale'].every(k=>Number.isFinite(o[k])) || o.scale<(o.type==='asphalt'?1/12:.2) || o.scale>5 || o.x<0 || o.x>5200 || o.y<0 || o.y>4400) throw Error(`Elementin ${i+1} tiedot eivät kelpaa.`);
      const object={type:o.type,x:o.x,y:o.y,angle:o.angle,scale:o.scale};
      if(o.type==='hill'){
        const height=o.height??3;
        if(!Number.isFinite(height)||height<.5||height>20)throw Error(`Elementin ${i+1} mäen korkeus ei kelpaa (0,5–20 m).`);
        object.height=height;
      }
      if(o.type==='person'){
        if(!Number.isInteger(o.personId)||o.personId<0||o.personId>=22)throw Error(`Elementin ${i+1} henkilötunniste ei kelpaa.`);
        object.personId=o.personId;
      }
      if(isScene(o.type)){
        const key=sceneKey(object);
        if(sceneKeys.has(key))throw Error('Sama tapahtumapaikka tai henkilö esiintyy useammin kuin kerran.');
        sceneKeys.add(key);
        if(o.scale!==1||o.angle!==(o.type==='sauna'?-3*Math.PI/4:0))throw Error('Tapahtumapaikkojen ja ihmisten sijaintia voi siirtää; koko ja suunta ovat kiinteitä.');
      }
      if(['barrier','tyreWall'].includes(o.type) && o.length!==undefined){
        if(!Number.isFinite(o.length)||o.length<1||o.length>200)throw Error(`Elementin ${i+1} pituus ei kelpaa.`);
        object.length=o.length;
      }
      if(o.type==='asphalt'){
        if(o.allowOnTrack!==undefined){
          if(typeof o.allowOnTrack!=='boolean')throw Error(`Elementin ${i+1} radan päälle maalaamisen valinta ei kelpaa.`);
          object.allowOnTrack=o.allowOnTrack;
        }
        if(o.square!==undefined){
          if(typeof o.square!=='boolean')throw Error(`Elementin ${i+1} siveltimen muoto ei kelpaa.`);
          object.square=o.square;
        }
        if(o.roundness!==undefined){
          if(!Number.isFinite(o.roundness)||o.roundness<0||o.roundness>1)throw Error(`Elementin ${i+1} kulmien pyöristys ei kelpaa.`);
          object.roundness=o.roundness;
        }
      }
      return object;
    });
  }
  function sceneDefaults(campus){
    if(!campus.saunaSite||!campus.bonfireSite)return [];
    const sauna=campus.saunaSite,fire=campus.bonfireSite,k=Math.SQRT1_2;
    const object=(type,x,y,extra={})=>({type,x,y,angle:0,scale:1,...extra});
    const people=[[-48,-30],[-27,-35],[-16,-29],[4,-35],[18,-30],[39,-23],
      [-46,15],[-23,23],[-7,26],[10,20],[-49,-16],[-42,29]]
      .map(([f,s],personId)=>object('person',sauna.x-k*f+k*s,sauna.y-k*f-k*s,{personId}));
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10,f=Math.cos(a)*32,s=Math.sin(a)*32;
      people.push(object('person',fire.x-k*f+k*s,fire.y-k*f-k*s,{personId:12+i}));
    }
    return [object('sauna',sauna.x,sauna.y,{angle:-3*Math.PI/4}),
      object('bonfire',fire.x,fire.y),object('pool',sauna.x-k*57,sauna.y-k*57),...people];
  }
  const sceneKey=o=>o.type==='person'?`person:${o.personId}`:o.type;
  function withSceneDefaults(objects,campus){
    const keys=new Set(objects.filter(o=>isScene(o.type)).map(sceneKey));
    return [...objects,...sceneDefaults(campus).filter(o=>!keys.has(sceneKey(o)))];
  }
  function asphaltFootprint(o){
    const w=types.asphalt.w,d=o.square?w:types.asphalt.d;
    return {w,d,radius:Math.min(w,d)/2*(o.roundness||0)};
  }
  function barrierFootprint(o){return {w:o.length??types.barrier.w,d:types.barrier.d};}
  function wallFootprint(o){return {w:o.length??types[o.type].w,d:types[o.type].d};}
  function asphaltOutline(o){
    const {w,d,radius:r}=asphaltFootprint(o);
    if(!r)return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    const points=[];
    for(const [x,y,start] of [[w/2-r,-d/2+r,-Math.PI/2],[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI]]){
      for(let i=0;i<=8;i++){
        const angle=start+i*Math.PI/16;
        points.push([x+r*Math.cos(angle),y+r*Math.sin(angle)]);
      }
    }
    return points;
  }
  function onAsphaltObject(o,x,y){
    const {w,d,radius:r}=asphaltFootprint(o),dx=x-o.x,dy=y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);
    const localX=Math.abs((dx*c+dy*s)/o.scale),localY=Math.abs((-dx*s+dy*c)/o.scale);
    if(localX>w/2||localY>d/2)return false;
    return !r||Math.hypot(Math.max(0,localX-(w/2-r)),Math.max(0,localY-(d/2-r)))<=r;
  }
  function createRoadMask(campus){
    const track=campus.track||[],width=campus.road?.kerbOuter??39;
    const area=p=>p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    const bounds=p=>({x0:Math.min(...p.map(v=>v[0])),x1:Math.max(...p.map(v=>v[0])),y0:Math.min(...p.map(v=>v[1])),y1:Math.max(...p.map(v=>v[1]))});
    const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
    const normals=track.map((p,i)=>{
      const a=track[(i+track.length-1)%track.length],b=track[(i+1)%track.length];
      let dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      if(!length){dx=b.x-p.x;dy=b.y-p.y;length=Math.hypot(dx,dy)||1;}
      return [-dy/length,dx/length];
    });
    const strips=track.length<3?[]:track.map((a,i)=>{
      const j=(i+1)%track.length,b=track[j],n=normals[i],m=normals[j];
      let poly=[[a.x-n[0]*width,a.y-n[1]*width],[b.x-m[0]*width,b.y-m[1]*width],
        [b.x+m[0]*width,b.y+m[1]*width],[a.x+n[0]*width,a.y+n[1]*width]];
      if(area(poly)<0)poly=poly.reverse();
      return {poly,...bounds(poly)};
    });
    function halfPlane(poly,a,b,inside){
      const result=[];
      for(let i=0;i<poly.length;i++){
        const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p),dq=cross(a,b,q);
        const pin=inside?dp>=0:dp<=0,qin=inside?dq>=0:dq<=0;
        if(pin)result.push(p);
        if(pin!==qin){const t=dp/(dp-dq);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
      }
      return result;
    }
    function subtract(poly,clip){
      const outside=[];let remaining=poly;
      for(let i=0;i<clip.length&&remaining.length>=3;i++){
        const a=clip[i],b=clip[(i+1)%clip.length],piece=halfPlane(remaining,a,b,false);
        if(piece.length>=3&&Math.abs(area(piece))>1e-6)outside.push(piece);
        remaining=halfPlane(remaining,a,b,true);
      }
      return outside;
    }
    function outside(outline){
      let pieces=[outline];const box=bounds(outline);
      for(const strip of strips){
        if(box.x1<strip.x0||box.x0>strip.x1||box.y1<strip.y0||box.y0>strip.y1)continue;
        pieces=pieces.flatMap(poly=>subtract(poly,strip.poly));
        if(!pieces.length)break;
      }
      return pieces;
    }
    const contains=(x,y)=>strips.some(s=>x>=s.x0&&x<=s.x1&&y>=s.y0&&y<=s.y1&&s.poly.every((a,i)=>cross(a,s.poly[(i+1)%s.poly.length],[x,y])>=-1e-8));
    return {outside,contains};
  }
  function asphaltPolygons(o,roadMask){
    const c=Math.cos(o.angle),s=Math.sin(o.angle);
    const outline=asphaltOutline(o).map(([x,y])=>[o.x+(x*c-y*s)*o.scale,o.y+(x*s+y*c)*o.scale]);
    return o.allowOnTrack===false&&roadMask?roadMask.outside(outline):[outline];
  }
  const api={maxObjects,maxDocumentBytes,types,validate,isScene,sceneDefaults,withSceneDefaults,barrierFootprint,wallFootprint,asphaltFootprint,asphaltOutline,onAsphaltObject,createRoadMask,asphaltPolygons};
  if(typeof module==='object') module.exports=api;
  else root.LPRTrackDocument=api;
})(typeof window==='object'?window:globalThis);
