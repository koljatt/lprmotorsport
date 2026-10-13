const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const api=require('../shared/track-document.js');
const campus={track:[{x:1000,y:1000},{x:1400,y:1000},{x:1400,y:1400},{x:1000,y:1400}],road:{kerbOuter:39},obstacleBounds:[]};
const mask=api.createRoadMask(campus);
const object={type:'asphalt',x:1200,y:1000,angle:.4,scale:1,square:true,roundness:.2,allowOnTrack:false};
assert(mask.contains(1200,1000));assert(!mask.contains(1200,1100));
const polys=api.asphaltPolygons(object,mask);assert(polys.length>=2);
for(const poly of polys)for(let i=1;i<poly.length-1;i++){
  const t=[poly[0],poly[i],poly[i+1]];
  assert(!mask.contains(t.reduce((s,p)=>s+p[0],0)/3,t.reduce((s,p)=>s+p[1],0)/3),'Clipped asphalt triangles must stay outside the track');
}
assert.deepEqual(api.validate({version:1,objects:[object]}),[object]);
assert.throws(()=>api.validate({version:1,objects:[{...object,allowOnTrack:'yes'}]}));
function render(allowOnTrack){
  const context={window:{LPRTrackDocument:api,LPRCampus:{...campus,obstacleBounds:[]},LPRTrackData:{version:1,objects:[{...object,allowOnTrack}]}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../shared/track-objects.js'),'utf8'),context);
  const faces=[];context.window.LPRTrackObjects.build({quad:(...args)=>faces.push(args)});
  return {faces,objects:context.window.LPRTrackObjects};
}
const protectedGame=render(false);
assert(!protectedGame.objects.onAsphalt(1200,1000));
assert(protectedGame.objects.onAsphalt(1200,1050));
for(const q of protectedGame.faces){
  const triangle=q.slice(0,3);
  assert(!mask.contains(triangle.reduce((s,p)=>s+p[0],0)/3,triangle.reduce((s,p)=>s+p[2],0)/3));
}
const allowedGame=render(true);
assert(allowedGame.objects.onAsphalt(1200,1000));
assert(allowedGame.faces.every(q=>q.slice(0,4).every(p=>p[1]===.06)),'Explicitly allowed painting must appear above the road');
console.log('PASS: rotated rounded asphalt clipping, persistence, validation, game geometry, grip and allowed overlap');
