const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{}};
vm.createContext(context);
for(const file of ['renderer3d.js','vehicle.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const makeRenderer=()=>{
  const renderer=Object.create(context.window.LPRRenderer3D.prototype);
  renderer.gl=new Proxy({}, {get:(_,key)=>key==='bufferData' ? (_,data)=>{renderer.mesh=data;}
    : key==='uniform3f' ? (name,...values)=>{renderer.camera[name]=values;} : ()=>{}});
  renderer.camera={};
  renderer.locations={camera:'camera',forward:'forward',right:'right',up:'up'};
  for(const name of ['bindMesh','drawCampusMaterials','drawRoadPaint','drawKerbs','drawSpectators','drawCockpit']) renderer[name]=()=>{};
  renderer.width=1280;renderer.height=720;renderer.wheelPhase=0;
  return renderer;
};
const run=(hz,longitudinalG,lateralG,configure=()=>{})=>{
  const model=new context.window.VehicleDynamics();configure(model.parameters.suspension);
  const car={x:100,y:200,angle:0,vx:15,longitudinalG,lateralG};
  for(let frame=0;frame<hz*2;frame++) model.stepSuspension(car,1/hz);
  return car.suspension;
};
const rest=run(90,0,0);
assert(Math.abs(rest.heave)<1e-10 && Math.abs(rest.pitch)<1e-10);
assert(Math.abs(rest.wheels.reduce((sum,w)=>sum+w.load,0)-275*9.81)<1e-6,'Static tyre loads must support total mass');
const braking=run(90,-1,0),accelerating=run(90,1,0);
assert(braking.pitch<0,'Braking must lower the nose');
assert(accelerating.pitch>0,'Acceleration must raise the nose');
assert(Math.abs(braking.pitch)<Math.PI/180,'Stiff student car must not pitch several degrees per G');
assert(Math.abs(braking.pitch+accelerating.pitch)<.0001);
assert(braking.wheels[0].load>braking.wheels[2].load,'Braking must transfer tyre load forward');
assert(braking.wheels[0].travel>0 && braking.wheels[2].travel<0,'Front compresses and rear extends under braking');
assert(Math.abs(run(90,-1,0,p=>{p.wheelRate*=2;}).pitch)<Math.abs(braking.pitch)*.8,'Spring stiffness must affect body motion');
const left=run(90,0,-1),right=run(90,0,1);
assert(left.roll<0 && right.roll>0,'Outside of the body must lean down in turns');
assert(Math.abs(left.roll+right.roll)<1e-8);
assert(right.wheels[0].load>right.wheels[1].load,'Outside tyres must carry greater load');
for(const hz of [180,360]) {
  const state=run(hz,-1,1);
  assert(Math.abs(state.pitch-braking.pitch)<.0001,'Pitch must be consistent across refresh rates');
  assert(Math.abs(state.roll-right.roll)<.0001,'Roll must be consistent across refresh rates');
}
const renderer=makeRenderer(),car={x:100,y:200,angle:0,vx:15,longitudinalG:0,lateralG:0};
const dynamics=new context.window.VehicleDynamics();
dynamics.createSuspension(car);
const bodyProjection=()=>{
  const result=[];
  for(let i=0;i<renderer.mesh.length;i+=6) {
    if(![.055,.075,.065].every((value,j)=>Math.abs(renderer.mesh[i+3+j]-value)<1e-6)) continue;
    const relative=Array.from(renderer.mesh.slice(i,i+3),(value,j)=>value-renderer.camera.camera[j]);
    const dot=axis=>relative.reduce((sum,value,j)=>sum+value*renderer.camera[axis][j],0);
    const depth=dot('forward');
    if(depth>1) result.push([dot('right')/depth,dot('up')/depth]);
  }
  return result;
};
renderer.render(car,0);
const neutral=bodyProjection();
car.longitudinalG=-1;car.lateralG=1;
for(let frame=0;frame<180;frame++) dynamics.stepSuspension(car,1/90);
const snapshot=JSON.stringify(car.suspension);
renderer.render(car,2000);renderer.render(car,2010);
assert.equal(JSON.stringify(car.suspension),snapshot,'Rendering must not advance suspension physics');
const loaded=bodyProjection();
assert.equal(loaded.length,neutral.length);
loaded.forEach((point,i)=>point.forEach((value,j)=>assert(Math.abs(value-neutral[i][j])<.00001,
  'Body and driver camera must move together without nose sliding')));
let tyreMin=Infinity,tyreXMin=Infinity,tyreXMax=-Infinity;
for(let i=0;i<renderer.mesh.length;i+=6) {
  if([.075,.085,.09].every((value,j)=>Math.abs(renderer.mesh[i+3+j]-value)<1e-6)) {
    tyreMin=Math.min(tyreMin,renderer.mesh[i+1]);
    tyreXMin=Math.min(tyreXMin,renderer.mesh[i]);tyreXMax=Math.max(tyreXMax,renderer.mesh[i]);
  }
}
assert(Math.abs(tyreMin-.07)<.00001,'Loaded tyres must have a contact patch on the road');
assert(Math.abs((tyreXMin+tyreXMax)/2-108.1)<.00001,'Chassis pitch must not move tyre centres horizontally');
assert([...renderer.mesh].every(Number.isFinite));
car.longitudinalG=car.lateralG=0;
for(let frame=0;frame<270;frame++) dynamics.stepSuspension(car,1/90);
assert(Math.abs(car.suspension.pitch)<.00001 && Math.abs(car.suspension.roll)<.00001,'Suspension must settle after unloading');
dynamics.reset(car);
assert.equal(car.suspension,undefined,'Restart must clear suspension');
console.log('PASS: physical load transfer, wheel travel, stiffness, symmetry, integration rates, camera, contact patch and reset');
