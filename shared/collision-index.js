// Conservative broad phase; preserves obstacle order for collision tie-breaking.
(function(root){
 // Shared physics must give bit-identical results in the browser and on the verification server.
 const Math=root.LPRMath||globalThis.Math;
 function createCollisionIndex(bounds,cellSize=160,prepared){
  if(prepared&&prepared.cellSize===cellSize&&prepared.matches(bounds)){
   const dynamic=[];bounds.forEach((b,i)=>{if(b.body&&Number.isFinite(b.body.mass))dynamic.push(i);});
   return (x0,y0,x1,y1,padding)=>{
    const ids=new Set(dynamic);for(const i of prepared.candidates(x0,y0,x1,y1,padding))ids.add(i);
    return [...ids].sort((a,b)=>a-b).map(i=>bounds[i]);
   };
  }
  const cells=new Map(),dynamic=[],order=new Map();
  bounds.forEach((b,i)=>{
   order.set(b,i);
   if(b.body&&Number.isFinite(b.body.mass)){dynamic.push(b);return;}
   const x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2,r=Math.hypot(b.maxX-b.minX,b.maxY-b.minY)/2;
   for(let cx=Math.floor((x-r)/cellSize);cx<=Math.floor((x+r)/cellSize);cx++)
    for(let cy=Math.floor((y-r)/cellSize);cy<=Math.floor((y+r)/cellSize);cy++){
     const key=cx+','+cy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);
    }
  });
  return function query(x0,y0,x1,y1,padding){
   const candidates=new Set(dynamic);
   for(let cx=Math.floor((Math.min(x0,x1)-padding)/cellSize);cx<=Math.floor((Math.max(x0,x1)+padding)/cellSize);cx++)
    for(let cy=Math.floor((Math.min(y0,y1)-padding)/cellSize);cy<=Math.floor((Math.max(y0,y1)+padding)/cellSize);cy++)
     for(const b of cells.get(cx+','+cy)||[])candidates.add(b);
   return [...candidates].sort((a,b)=>order.get(a)-order.get(b));
  };
 }
 // Store ordinal IDs, never mutable obstacle or body references.
 createCollisionIndex.prepare=function(bounds,cellSize=160){
  const cells=new Map(),statics=[],count=bounds.length;
  bounds.forEach((b,i)=>{
   if(b.body&&Number.isFinite(b.body.mass))return;
   statics.push({i,minX:b.minX,maxX:b.maxX,minY:b.minY,maxY:b.maxY});
   const x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2,r=Math.hypot(b.maxX-b.minX,b.maxY-b.minY)/2;
   for(let cx=Math.floor((x-r)/cellSize);cx<=Math.floor((x+r)/cellSize);cx++)
    for(let cy=Math.floor((y-r)/cellSize);cy<=Math.floor((y+r)/cellSize);cy++){
     const key=cx+','+cy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
    }
  });
  const staticIds=new Set(statics.map(b=>b.i));
  return Object.freeze({cellSize,
   matches(local){
    if(local.length<count)return false;
    for(const s of statics){const b=local[s.i];
     if((b.body&&Number.isFinite(b.body.mass))||b.minX!==s.minX||b.maxX!==s.maxX||b.minY!==s.minY||b.maxY!==s.maxY)return false;
    }
    return local.every((b,i)=>staticIds.has(i)||(b.body&&Number.isFinite(b.body.mass)));
   },
   candidates(x0,y0,x1,y1,padding){
    const ids=new Set();
    for(let cx=Math.floor((Math.min(x0,x1)-padding)/cellSize);cx<=Math.floor((Math.max(x0,x1)+padding)/cellSize);cx++)
     for(let cy=Math.floor((Math.min(y0,y1)-padding)/cellSize);cy<=Math.floor((Math.max(y0,y1)+padding)/cellSize);cy++)
      for(const i of cells.get(cx+','+cy)||[])ids.add(i);
    return ids;
   }
  });
 };
 root.LPRCreateCollisionIndex=createCollisionIndex;
 if(typeof module==='object')module.exports=createCollisionIndex;
})(typeof window==='object'?window:globalThis);
