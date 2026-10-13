const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function scene() {
  const context={window:{LPRVehicleSpec:require('../shared/vehicle-spec.js')}};
  vm.createContext(context);
  for(const file of ['campus.js','vehicle.js','renderer3d.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const campus=context.window.LPRCampus;
  campus.bodies.splice(0);campus.obstacleBounds.splice(0);
  return {campus,dynamics:new context.window.VehicleDynamics(),Renderer:context.window.LPRRenderer3D};
}
function obstacle(campus,kind,mass,x=100,y=100,width=30,depth=30,angle=0) {
  const bounds={minX:x-width/2,maxX:x+width/2,minY:y-depth/2,maxY:y+depth/2,angle};
  campus.obstacleBounds.push(bounds);
  return campus.makeBody(bounds,kind,mass);
}
function strike(campus,dynamics,body,speed=6,offset=0) {
  const car={x:body.x,y:body.y+offset,angle:0};dynamics.reset(car);car.vx=speed;
  const hit=campus.resolveObstacleCollision(car,{x:body.x-80,y:car.y,angle:0},contact=>
    dynamics.applyImpact(car,contact.normal,contact.impactMaterial,contact));
  assert(hit,'Swept contact must reach the target');
  return {car,hit};
}
{
  const {campus,dynamics}=scene(),target=obstacle(campus,'car',1200);
  const {car,hit}=strike(campus,dynamics,target);
  assert.equal(hit.body,target);
  assert(Math.abs(car.vx-target.vx)<1e-8,'An inelastic contact shares normal velocity according to mass');
  assert(Math.abs(dynamics.parameters.mass*car.vx+target.mass*target.vx-dynamics.parameters.mass*6)<1e-6,
    'A moderate central impact conserves normal momentum');
  assert(target.damage>0 && target.dents.length>0,'The target must retain damage and a local dent');
  const before=target.x;
  campus.stepObstacles(.1);
  assert(target.x>before && target.bounds.minX===target.x-target.width/2,'The collision footprint follows the moving mesh');
  assert(target.vx<car.vx,'Ground friction slows the target');
  const source=[target.origin.x-15,6,target.origin.y];
  assert.notDeepEqual(campus.deformPoint(target,...source),source,'Damage deforms the contacted bodywork');
  campus.resetObstacles();
  assert.equal(target.x,before);assert.equal(target.damage,0);assert.equal(target.dents.length,0);
  assert.deepEqual(Array.from(campus.deformPoint(target,...source)),source,'Reset restores original geometry');
}
{
  const {campus,dynamics}=scene(),target=obstacle(campus,'car',1200);
  strike(campus,dynamics,target,6,8);
  assert(Math.abs(target.spin)>0,'An off-centre impulse must rotate a parked car');
  campus.stepObstacles(.1);
  assert.notEqual(target.bounds.angle,0,'Rotation also updates collision orientation');
}
{
  const {campus,dynamics}=scene(),wall=obstacle(campus,'wall',Infinity);
  strike(campus,dynamics,wall,12);
  campus.stepObstacles(.1);
  assert.equal(wall.x,100);assert.equal(wall.vx,0);
  assert(wall.damage>0 && wall.dents.length>0,'Anchored walls chip at the contact without translating');
}
{
  const {campus,dynamics}=scene(),tree=obstacle(campus,'tree',Infinity,100,100,5,5);
  strike(campus,dynamics,tree,12);campus.stepObstacles(.1);
  assert(tree.damage>0 && tree.bend>0,'A trunk impact creates damped bending and permanent damage');
  assert(campus.deformPoint(tree,100,80,100)[0]>100,'The crown bends in the direction of the impulse');
  assert.equal(tree.bounds.minX,97.5,'The rooted trunk remains anchored');
}
for(const [kind,mass] of [['pool',2200],['sauna',3500],['person',80]]) {
  const {campus,dynamics}=scene(),target=obstacle(campus,kind,mass);
  strike(campus,dynamics,target,12);campus.stepObstacles(.1);
  assert(target.x>100 && target.damage>0,`${kind} reacts to an impact`);
  if(kind==='person')assert(campus.deformPoint(target,100,17,100)[1]<17,'A struck person falls');
}
{
  const {campus}=scene(),a=obstacle(campus,'car',1200,100,100),b=obstacle(campus,'car',1200,140,100);
  obstacle(campus,'wall',Infinity,190,100,2,100);
  a.vx=12;
  for(let i=0;i<90;i++)campus.stepObstacles(1/90);
  assert(b.x>140 && b.damage>0,'A pushed vehicle transfers momentum and damage to another vehicle');
  assert(b.bounds.maxX<=189.01,'Moving vehicles cannot tunnel through a thin wall');
}
{
  const {campus,dynamics}=scene(),target=obstacle(campus,'car',1200,145,100);
  const car={x:100,y:100,angle:0};dynamics.reset(car);target.vx=-6;
  let hits=0;
  for(let i=0;i<30;i++)campus.stepObstacles(1/90,car,contact=>{
    hits++;dynamics.applyImpact(car,contact.normal,contact.impactMaterial,contact);
  });
  assert(hits>0 && car.vx<0,'A moving target can strike a stationary player');
}
{
  const {campus,Renderer}=scene(),body=obstacle(campus,'pool',2200);
  const renderer=Object.create(Renderer.prototype),uploads=[];
  renderer.gl={bindBuffer(){},bufferSubData(_,offset,vertices){assert([...vertices].every(Number.isFinite));uploads.push({offset,vertices});}};
  renderer.buffer={};renderer.worldSource=new Float32Array([85,6,100,1,1,1,85,9,100,1,1,1,85,6,101,1,1,1]);
  renderer.obstacleMeshes=[{body,start:0,end:18}];
  renderer.updateObstacleMeshes();assert.equal(uploads.length,0,'Undamaged scenery requires no per-frame uploads');
  body.x+=10;renderer.updateObstacleMeshes();
  assert.equal(uploads.at(-1).vertices[0],95,'GPU vertices follow target translation');
  const count=uploads.length;renderer.updateObstacleMeshes();assert.equal(uploads.length,count,'Settled bodies are cached');
  campus.resetObstacles();renderer.updateObstacleMeshes();
  assert.equal(uploads.at(-1).vertices[0],85,'Reset also restores GPU geometry');
}
console.log('PASS: target momentum, mass, rotation, dents, walls, trees, people, pool, sauna, secondary collisions, thin walls and mesh reset');
