/* Shared editor document and geometry; world units are 10 per metre. */
window.LPRTrackObjects = (() => {
  const {types,validate}=window.LPRTrackDocument;
  const objects=validate(window.LPRTrackData);
  function bounds(o) {
    const t=types[o.type],w=(o.type==='tree'?3:t.w)*o.scale,d=(o.type==='tree'?3:t.d)*o.scale;
    return {minX:o.x-w/2,maxX:o.x+w/2,minY:o.y-d/2,maxY:o.y+d/2,angle:o.angle,...(o.type==='tyreWall'?{impactMaterial:'tyres'}:{})};
  }
  window.LPRCampus.obstacleBounds.push(...objects.filter(o=>o.type!=='asphalt').map(bounds));
  function onAsphalt(x,y) {
    return objects.some(o=>{
      if(o.type!=='asphalt')return false;
      const dx=x-o.x,dy=y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);
      return Math.abs(dx*c+dy*s)<=types.asphalt.w*o.scale/2&&Math.abs(-dx*s+dy*c)<=types.asphalt.d*o.scale/2;
    });
  }
  function build({quad}) {
    for(const o of objects) {
      const t=types[o.type],s=o.scale,c=Math.cos(o.angle),n=Math.sin(o.angle);
      const p=(x,h,y)=>[o.x+(x*c-y*n)*s,h*s,o.y+(x*n+y*c)*s];
      const cuboid=(w,d,h,color,base=0)=>{
        const a=p(-w/2,base,-d/2),b=p(w/2,base,-d/2),c=p(w/2,base,d/2),d0=p(-w/2,base,d/2);
        const A=p(-w/2,base+h,-d/2),B=p(w/2,base+h,-d/2),C=p(w/2,base+h,d/2),D=p(-w/2,base+h,d/2);
        quad(a,b,B,A,color);quad(b,c,C,B,color);quad(c,d0,D,C,color);quad(d0,a,A,D,color);quad(A,B,C,D,color);
      };
      if(o.type==='asphalt') {
        const a=[o.x+(-t.w/2*c+t.d/2*n)*s,-.35,o.y+(-t.w/2*n-t.d/2*c)*s];
        const b=[o.x+(t.w/2*c+t.d/2*n)*s,-.35,o.y+(t.w/2*n-t.d/2*c)*s];
        const d=[o.x+(-t.w/2*c-t.d/2*n)*s,-.35,o.y+(-t.w/2*n+t.d/2*c)*s];
        const e=[o.x+(t.w/2*c-t.d/2*n)*s,-.35,o.y+(t.w/2*n+t.d/2*c)*s];
        quad(a,d,e,b,t.color);
        continue;
      }
      if(o.type==='tyreWall') {
        const count=Math.max(1,Math.floor(t.w/10));
        for(let i=0;i<count;i++) {
          const center=-t.w/2+5+i*10;
          for(let layer=0;layer<2;layer++) {
            const base=layer*7.6;
            for(let major=0;major<16;major++) for(let minor=0;minor<8;minor++) {
              const a=major*Math.PI/8,b=(major+1)*Math.PI/8,u=minor*Math.PI/4,v=(minor+1)*Math.PI/4;
              const point=(around,section)=>{
                const radius=2.65+Math.cos(section)*.95;
                return p(center+radius*Math.cos(around),base+2.2+Math.sin(section)*.95,radius*Math.sin(around));
              };
              quad(point(a,u),point(b,u),point(b,v),point(a,v),t.color.map(value=>value*(minor===3?1.15:1)));
            }
          }
        }
      } else if(o.type==='barrier') {
        const postCount=Math.max(2,Math.ceil(t.w/20));
        const postSpacing=t.w/(postCount-1);
        const postColor=[.30,.34,.36],beamColors=[[.52,.56,.58],[.44,.48,.50],[.61,.64,.65]];
        for(let i=0;i<postCount;i++) {
          const x=-t.w/2+i*postSpacing;
          cuboid(1.35,1.35,8,postColor);
          cuboid(2.4,2.2,.65,[.38,.42,.44],5.2);
          if(i<postCount-1) {
            const nextX=x+postSpacing;
            const profile=[[5.8,.40],[6.35,.50],[6.95,.24],[7.55,.50],
              [8.15,.24],[8.75,.50],[9.35,.24],[9.95,.50],[10.5,.40]];
            for(const side of [-1,1]) for(let band=0;band<profile.length-1;band++) {
              const [h0,depth0]=profile[band],[h1,depth1]=profile[band+1];
              const color=beamColors[band%beamColors.length];
              const outer=depth=>side*(t.d*depth);
              const inner=depth=>side*(t.d*depth-.55);
              quad(p(x,h0,outer(depth0)),p(nextX,h0,outer(depth0)),
                p(nextX,h1,outer(depth1)),p(x,h1,outer(depth1)),color);
              quad(p(x,h1,inner(depth1)),p(nextX,h1,inner(depth1)),
                p(nextX,h0,inner(depth0)),p(x,h0,inner(depth0)),color.map(value=>value*.78));
            }
          }
        }
      } else if(o.type==='building') {
        cuboid(t.w,t.d,t.h,[.58,.57,.51]);
        cuboid(t.w+4,t.d+4,3,[.28,.29,.27],t.h);
      } else if(o.type==='cone') {
        cuboid(6,6,1,[.15,.15,.15]);
        for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;quad(p(3*Math.cos(a),1,3*Math.sin(a)),p(3*Math.cos(b),1,3*Math.sin(b)),p(0,8,0),p(0,8,0),t.color);}
      } else if(o.type==='tree') {cuboid(3,3,20,[.3,.2,.1]);cuboid(16,16,25,t.color,20);}
      else cuboid(t.w,t.d,t.h,t.color);
    }
  }
  return {types,validate,bounds,build,onAsphalt,active:objects.length>0};
})();
