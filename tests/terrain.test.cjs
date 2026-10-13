const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {create}=require('../shared/terrain.js');
const {validate}=require('../shared/track-document.js');
const hill={type:'hill',x:1000,y:1000,angle:0,scale:1,height:5};
const terrain=create([hill]);
assert.equal(terrain.heightAt(1000,1000),50);
assert.equal(terrain.heightAt(1200,1000),0);
assert.equal(terrain.heightAt(0,0),0);
assert(terrain.heightAt(1199.9,1000)<.0001,'The edge must meet level ground smoothly');
assert.equal(create([hill,hill]).heightAt(1100,1000),terrain.heightAt(1100,1000),'Repeated paint must not accumulate elevation');
const s=terrain.sample(1100,1000),epsilon=.001;
assert(Math.abs(s.dx-(terrain.heightAt(1100+epsilon,1000)-terrain.heightAt(1100-epsilon,1000))/(2*epsilon))<1e-8);
assert(s.dy===0);
assert.deepEqual(validate({version:1,objects:[hill]}),[hill]);
for(const height of [NaN,0,21])assert.throws(()=>validate({version:1,objects:[{...hill,height}]}));
const vertices=[800,0,800,1,1,1,0,0,1200,0,800,1,1,1,1,0,1000,0,1200,1,1,1,.5,1];
const raised=terrain.mesh(vertices);
assert(raised.length>vertices.length,'A hill inside a large triangle must be represented even if its corners are flat');
let peak=0;
for(let i=0;i<raised.length;i+=8){
  assert(Math.abs(raised[i+1]-terrain.heightAt(raised[i],raised[i+2]))<1e-8);
  assert(raised[i+6]>=0&&raised[i+6]<=1&&raised[i+7]>=0&&raised[i+7]<=1);
  peak=Math.max(peak,raised[i+1]);
}
assert(peak>49,'The mesh must include the summit');
for(let i=0;i<raised.length;i+=24){
  const a=raised.slice(i,i+8),b=raised.slice(i+8,i+16),c=raised.slice(i+16,i+24);
  const h=terrain.heightAt((a[0]+b[0]+c[0])/3,(a[2]+b[2]+c[2])/3);
  assert(Math.abs(h-(a[1]+b[1]+c[1])/3)<=.0081,'Surface interpolation must stay below the asphalt-to-paint clearance');
}
const context={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), }};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../vehicle.js'),'utf8'),context);
const Dynamics=context.window.VehicleDynamics,dynamics=new Dynamics();
const p=dynamics.parameters;
const car={x:1000,y:1000,angle:0,vx:0,vy:0,yawRate:0,roadHeights:[5,5,5,5]};
dynamics.createSuspension(car);
assert(Math.abs(car.suspension.heave-5)<1e-10,'Starting on a hill must settle the body immediately');
for(let i=0;i<180;i++)dynamics.stepSuspension(car,1/90);
assert(Math.abs(car.suspension.heave-5)<1e-8);
assert(car.suspension.wheels.every(w=>Math.abs(w.z-5)<1e-8));
const slope=.1;
const incline={...car,suspension:undefined,roadHeights:[5+p.frontAxle*slope,5+p.frontAxle*slope,5-p.rearAxle*slope,5-p.rearAxle*slope]};
dynamics.createSuspension(incline);assert(Math.abs(incline.suspension.pitch-slope)<1e-8);
function coast(grade){
  const model=new Dynamics();
  const state={x:100,y:200,angle:0};model.reset(state);
  state.vx=10;state.terrainSlope={forward:grade,right:0};
  for(let i=0;i<90;i++)model.step(state,{gas:0,brake:0,steer:0},1/90,0);
  return state.speed;
}
assert(coast(-.1)>coast(0)&&coast(0)>coast(.1),'Gravity must accelerate downhill and slow uphill travel');
console.log('PASS: hill elevation, smooth edges, overlapping strokes, gradients, tessellation, textures, suspension and gravity');

// Build the actual outdoor mesh and its separate kerb/paint textures.
const renderContext={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), },Image:class{}};
vm.createContext(renderContext);
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
for(const file of ['campus.js','shared/track-document.js','shared/terrain.js'])vm.runInContext(read(file),renderContext);
const start=renderContext.window.LPRCampus.track[0];
renderContext.window.LPRTrackData={version:1,objects:[{...hill,x:start.x,y:start.y}]};
vm.runInContext(read('shared/track-objects.js'),renderContext);
vm.runInContext(read('renderer3d.js'),renderContext);
let buffer;const uploads=new Map();
const gl=new Proxy({}, {get:(_,key)=>key==='createBuffer'?()=>({}):
  key==='bindBuffer'?(_,value)=>{buffer=value;}:
  key==='bufferData'?(_,data)=>{uploads.set(buffer,data);}:
  key==='getShaderParameter'||key==='getProgramParameter'?()=>true:()=>0});
const renderer=new renderContext.window.LPRRenderer3D({getContext:()=>gl},{getContext:()=>({})},renderContext.window.LPRCampus.track);
const field=renderContext.window.LPRTrackObjects.terrain;
const world=uploads.get(renderer.buffer);
let roadVertices=0,summitGround=false;
for(let i=0;i<world.length;i+=6){
  const height=field.heightAt(world[i],world[i+2]);
  if(height<1)continue;
  const base=world[i+1]-height;
  if(Math.abs(base-.05)<.00001)roadVertices++;
  if(height>49&&Math.abs(base+.39)<.00001)summitGround=true;
}
assert(roadVertices>50&&summitGround,'The main road and ground mesh must rise onto the hill');
for(const [mesh,base] of [[renderer.roadPaintMesh,.075],[renderer.kerbMesh,null]]){
  const data=uploads.get(mesh.buffer);assert.equal(mesh.count,data.length/8);
  let elevated=0;
  for(let i=0;i<data.length;i+=8){
    const h=field.heightAt(data[i],data[i+2]);
    if(h<1)continue;elevated++;
    if(base!==null)assert(Math.abs(data[i+1]-h-base)<.001,'Road paint must remain just above the raised asphalt within GPU float precision');
  }
  assert(elevated>0,'Separate textured road meshes must follow the hill');
}
assert.equal(renderContext.window.LPRCampus.obstacleBounds.some(o=>o.minX===start.x-200&&o.maxX===start.x+200),false,
  'A hill must be drivable terrain, not a solid collision box');
console.log('PASS: raised game terrain, road, kerbs, paint, draw counts and drivable hill footprint');
