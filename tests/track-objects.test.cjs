const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const doc={version:1,objects:[{type:'barrier',x:4500,y:4000,angle:Math.PI/2,scale:2}]};
let stored=JSON.stringify(doc);
const context={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), LPRTrackData:doc},console};
vm.createContext(context);
for(const f of ['campus.js','shared/track-document.js','shared/track-objects.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
const api=context.window.LPRTrackObjects;
const tyreContext={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), LPRTrackData:{version:1,objects:[
  {type:'tyreWall',x:4500,y:4000,angle:Math.PI/2,scale:1,length:23}
]}}};
vm.createContext(tyreContext);
for(const f of ['campus.js','shared/track-document.js','shared/track-objects.js'])vm.runInContext(fs.readFileSync(f,'utf8'),tyreContext);
const tyreQuads=[];tyreContext.window.LPRTrackObjects.build({quad:(...args)=>tyreQuads.push(args)});
const tyrePoints=tyreQuads.flatMap(q=>q.slice(0,4));
assert(Math.abs(Math.min(...tyrePoints.map(p=>p[2]))-3988.5)<1e-8);
assert(Math.abs(Math.max(...tyrePoints.map(p=>p[2]))-4011.5)<1e-8);
assert.equal(Math.min(...tyrePoints.map(p=>p[1])),0,'Tyre stacks must rest on the ground');
assert.equal(Math.max(...tyrePoints.map(p=>p[1])),8,'Tyre stacks must match the declared wall height');
// Cast horizontal sight lines through the first stack at every height.
// A wall made of two floating tori passed footprint tests but exposed the
// guardrail behind it through a broad empty band at driver eye height.
function blocksSightLine(height){
  const z=4000-23/2+3.6;
  const hits=(a,b,c)=>{
    const determinant=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
    if(Math.abs(determinant)<1e-10)return false;
    const u=((height-a[1])*(c[2]-a[2])-(z-a[2])*(c[1]-a[1]))/determinant;
    const v=((b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(height-a[1]))/determinant;
    return u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8;
  };
  return tyreQuads.some(([a,b,c,d])=>hits(a,b,c)||hits(a,c,d));
}
for(let height=.125;height<8;height+=.25)assert(blocksSightLine(height),`Tyre wall must hide objects behind the stack at height ${height}`);
console.log('PASS: grounded tyre stacks with continuous opaque side coverage');
const tyreBound=tyreContext.window.LPRCampus.obstacleBounds.at(-1);
assert.equal(tyreBound.maxX-tyreBound.minX,23,'Collision footprint must use the saved segment length');
assert.equal(tyreBound.impactMaterial,'tyres');
assert.throws(()=>tyreContext.window.LPRTrackObjects.validate({version:1,objects:[
  {type:'tyreWall',x:100,y:100,angle:0,scale:1,length:0}
]}));
assert.equal(context.window.LPRCampus.trackCones,undefined,'No automatic trackside cones should remain');
assert.equal(api.active,true);
assert.throws(()=>api.validate({version:2,objects:[]}));
for(const patch of [{type:'unknown'},{x:NaN},{scale:0},{y:4401}])assert.throws(()=>api.validate({version:1,objects:[{...doc.objects[0],...patch}]}));
assert.equal(api.validate(JSON.parse(stored)).length,1);
const quads=[];api.build({quad:(...args)=>quads.push(args)});
assert(quads.length>50,'A guardrail should render posts and corrugated metal beam geometry');
const points=quads.flatMap(q=>q.slice(0,4));
assert.equal(Math.min(...points.map(p=>p[0])),4492);
assert.equal(Math.max(...points.map(p=>p[2])),4040);
const previous={x:4500,y:3900},car={x:4500,y:4100};
assert.ok(context.window.LPRCampus.resolveObstacleCollision(car,previous),'swept collision with rotated added barrier');
assert.ok(car.y<4000);
console.log('PASS: document validation, save/load, rotated geometry and swept collision');

const expandedContext={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), LPRTrackData:{version:1,objects:[
  {type:'tyreWall',x:2500,y:2200,angle:Math.PI/4,scale:1},
  {type:'building',x:3000,y:2200,angle:Math.PI/6,scale:1},
  {type:'asphalt',x:2000,y:2200,angle:Math.PI/3,scale:1}
]}}};
vm.createContext(expandedContext);
for(const f of ['campus.js','shared/track-document.js','shared/track-objects.js'])vm.runInContext(fs.readFileSync(f,'utf8'),expandedContext);
const expanded=expandedContext.window.LPRTrackObjects,expandedCampus=expandedContext.window.LPRCampus;
assert.deepEqual(Object.keys(expanded.types).filter(type=>['tyreWall','building','asphalt'].includes(type)).sort(),['asphalt','building','tyreWall']);
assert(expanded.onAsphalt(2000,2200),'Asphalt center should count as paved ground');
assert(!expanded.onAsphalt(2050,2200),'Rotated asphalt bounds should exclude points outside its footprint');
const customBounds=expandedCampus.obstacleBounds.filter(b=>[2500,3000].some(x=>Math.abs((b.minX+b.maxX)/2-x)<1&&Math.abs((b.minY+b.maxY)/2-2200)<1));
assert.equal(customBounds.length,2,'Only the tyre wall and building should have custom collision bounds');
assert.equal(customBounds.filter(b=>b.impactMaterial==='tyres').length,1);
const rendered=[];expanded.build({quad:(...args)=>rendered.push(args)});
assert(rendered.length>100,'Tyre wall and rotated building should generate 3D geometry');
assert(rendered.some(q=>q.slice(0,4).every(point=>point[1]===-.35)),'Asphalt should be a flat drivable-height surface');
const tireCar={x:2500,y:2200},tirePrevious={x:2450,y:2200};
assert.ok(expandedCampus.resolveObstacleCollision(tireCar,tirePrevious),'Tyre wall should block the car');
console.log('PASS: tyre walls, buildings, asphalt and rotation');
