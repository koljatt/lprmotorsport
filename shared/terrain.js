/* One elevation field for the editor, rendered terrain and wheel contacts.
 * Coordinates/elevations use world units (10 per metre). Overlapping brush
 * stamps join by maximum height instead of growing with pointer-event count. */
(function(root){
  'use strict';
  function create(objects){
    const hills=objects.filter(o=>o.type==='hill'),cells=new Map(),cellSize=200;
    const radius=o=>200*o.scale;
    for(const hill of hills){
      const r=radius(hill);
      for(let x=Math.floor((hill.x-r)/cellSize);x<=Math.floor((hill.x+r)/cellSize);x++)
        for(let y=Math.floor((hill.y-r)/cellSize);y<=Math.floor((hill.y+r)/cellSize);y++){
          const key=`${x},${y}`;
          if(!cells.has(key))cells.set(key,[]);
          cells.get(key).push(hill);
        }
    }
    function sample(x,y){
      let height=0,dx=0,dy=0;
      for(const hill of cells.get(`${Math.floor(x/cellSize)},${Math.floor(y/cellSize)}`)||[]){
        const r=radius(hill),a=x-hill.x,b=y-hill.y,q=(a*a+b*b)/(r*r);
        if(q>=1)continue;
        const peak=(hill.height??3)*10,value=peak*(1-q)**2;
        if(value>height){height=value;dx=-4*peak*a*(1-q)/(r*r);dy=-4*peak*b*(1-q)/(r*r);}
      }
      return {height,dx,dy};
    }
    const heightAt=(x,y)=>sample(x,y).height;
    function intersects(points){
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[2]);
      const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
      return hills.some(o=>{const r=radius(o);return x0<=o.x+r&&x1>=o.x-r&&y0<=o.y+r&&y1>=o.y-r;});
    }
    // Interpolate every vertex attribute when splitting textured triangles.
    function triangle(a,b,c,emit,split=true,depth=0){
      if(!hills.length){emit(a,b,c);return;}
      const pairs=[[a,b,c],[b,c,a],[c,a,b]];
      const lengths=pairs.map(([p,q])=>Math.hypot(p[0]-q[0],p[2]-q[2]));
      const edge=lengths.indexOf(Math.max(...lengths));
      let refine=false;
      if(split&&depth<16&&intersects([a,b,c])){
        const heights=[a,b,c].map(p=>heightAt(p[0],p[2]));
        // Keep interpolation error below the gap between asphalt and paint.
        const errors=pairs.map(([p,q],i)=>Math.abs(heightAt((p[0]+q[0])/2,(p[2]+q[2])/2)-
          (heights[i]+heights[(i+1)%3])/2));
        errors.push(Math.abs(heightAt((a[0]+b[0]+c[0])/3,(a[2]+b[2]+c[2])/3)-
          (heights[0]+heights[1]+heights[2])/3));
        refine=lengths[edge]>20||Math.max(...errors)>.008;
      }
      if(refine){
        const [p,q,r]=pairs[edge],mid=p.map((v,i)=>(v+q[i])/2);
        triangle(p,mid,r,emit,true,depth+1);triangle(mid,q,r,emit,true,depth+1);return;
      }
      emit(...[a,b,c].map(p=>{const v=p.slice();v[1]+=heightAt(v[0],v[2]);return v;}));
    }
    function mesh(vertices,stride=8,split=true){
      if(!hills.length)return vertices;
      const result=[];
      for(let i=0;i<vertices.length;i+=stride*3)triangle(
        Array.from(vertices.slice(i,i+stride)),Array.from(vertices.slice(i+stride,i+stride*2)),
        Array.from(vertices.slice(i+stride*2,i+stride*3)),(a,b,c)=>result.push(...a,...b,...c),split);
      return result;
    }
    function groundTiles(emit){
      const tiles=new Set(),size=20;
      for(const hill of hills){
        const r=radius(hill);
        for(let x=Math.floor(Math.max(-2200,hill.x-r)/size);x<=Math.floor(Math.min(6500,hill.x+r)/size);x++)
          for(let y=Math.floor(Math.max(-2200,hill.y-r)/size);y<=Math.floor(Math.min(6500,hill.y+r)/size);y++)tiles.add(`${x},${y}`);
      }
      for(const key of tiles){const [x,y]=key.split(',').map(v=>Number(v)*size);emit(x,y,size);}
    }
    return {active:hills.length>0,heightAt,sample,triangle,mesh,groundTiles};
  }
  const api={create};
  if(typeof module==='object')module.exports=api;else root.LPRTerrain=api;
})(typeof window==='object'?window:globalThis);
