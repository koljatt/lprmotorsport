const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const spec=require('../shared/vehicle-spec.js');
const context={window:{LPRVehicleSpec:spec}};
vm.createContext(context);
for(const file of ['campus.js','vehicle.js','renderer3d.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const dynamics=new context.window.VehicleDynamics();
const state={x:0,y:0,angle:0};
dynamics.reset(state);
const suspension=dynamics.createSuspension(state);
const near=(a,b,tolerance=1e-5)=>assert(Math.abs(a-b)<tolerance,`${a} must match ${b}`);
near(dynamics.parameters.mass,450);
near(suspension.wheels[0].x-suspension.wheels[2].x,1.525);
near(suspension.wheels[1].y-suspension.wheels[0].y,1.472);
near(suspension.wheels.reduce((sum,w)=>sum+w.load,0),450*9.81);
const renderer=Object.create(context.window.LPRRenderer3D.prototype);
let mesh;
renderer.gl=new Proxy({},{get:(_,key)=>key==='bufferData'?(_,data)=>{mesh=data;}:()=>{}});
renderer.locations={};renderer.bindMesh=()=>{};renderer.wheelPhase=0;
renderer.drawWheels(state,0);
const all=[],tyres=[],rims=[],rubber=[];
for(let i=0;i<mesh.length;i+=6) {
  const point=Array.from(mesh.slice(i,i+3));all.push(point);
  const colorMatches=color=>color.every((v,j)=>Math.abs(mesh[i+3+j]-v)<1e-6);
  if(colorMatches([.38,.42,.43])) rims.push(point);
  if([[.075,.085,.09],[.11,.12,.125],[.085,.095,.10]].some(colorMatches)) rubber.push(point);
  if([.075,.085,.09].every((v,j)=>Math.abs(mesh[i+3+j]-v)<1e-6)) tyres.push(point);
}
const bounds=points=>[0,1,2].map(axis=>[Math.min(...points.map(p=>p[axis])),Math.max(...points.map(p=>p[axis]))]);
const total=bounds(all);
near((total[0][1]-total[0][0])*.1,2.9);
near(total[1][1]*.1,1.3);
for(const axle of [0,1]) for(const side of [-1,1]) {
  const wheel=suspension.wheels[axle*2+(side<0?0:1)];
  const points=tyres.filter(p=>Math.abs(p[0]*.1-wheel.x)<.3 && Math.abs(p[2]*.1-wheel.y)<.1);
  assert(points.length>0,'All four physical wheels must have rendered tyres');
  const b=bounds(points);
  near((b[0][1]-b[0][0])*.1,20.5*.0254);
  near((b[0][0]+b[0][1])*.05,wheel.x);
  near((b[2][0]+b[2][1])*.05,wheel.y);
  near(b[1][0],0);
  const belongs=p=>Math.abs(p[0]*.1-wheel.x)<.3 && Math.abs(p[2]*.1-wheel.y)<.1;
  const rim=bounds(rims.filter(belongs)),tyre=bounds(rubber.filter(belongs));
  near((rim[0][1]-rim[0][0])*.1,13*.0254);
  near((rim[2][1]-rim[2][0])*.1,7*.0254);
  near((tyre[2][1]-tyre[2][0])*.1,7*.0254);
}
const collision=context.window.LPRCampus.carCollisionParts(state);
near(Math.max(...collision.flat().map(p=>p[0]))-Math.min(...collision.flat().map(p=>p[0])),29);
assert.equal(collision.length,context.window.LPRCampus.carCollisionParts({...state,steerAngle:.36}).length);
assert([...mesh].every(Number.isFinite));
renderer.drawWheels({...state,vx:10},100);
renderer.drawWheels({...state,vx:10},150);
near(renderer.wheelPhase,.05*10/(20.5*.0254/2));
// With the same motor and gearing, a heavier car must accelerate more slowly.
const accelerate=mass=>{
  const model=new context.window.VehicleDynamics();model.parameters.mass=mass;
  const car={x:0,y:0,angle:0};model.reset(car);
  for(let i=0;i<90;i++) model.step(car,{gas:1,brake:0,steer:0},1/90,0);
  return car.vx;
};
assert(accelerate(450)<accelerate(275)*.75);
console.log('PASS: supplied mass, static loads, axle positions, four tyres, overall dimensions, collision length and mass-dependent acceleration');
