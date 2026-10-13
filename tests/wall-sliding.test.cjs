const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), }};
for(const file of ['campus.js','vehicle.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
}
const campus=context.window.LPRCampus,dynamics=new context.window.VehicleDynamics();
function velocity(car,x,y) {
  const c=Math.cos(car.angle),s=Math.sin(car.angle);
  car.vx=x*c+y*s;car.vy=-x*s+y*c;
}
function worldVelocity(car) {
  const c=Math.cos(car.angle),s=Math.sin(car.angle);
  return {x:car.vx*c-car.vy*s,y:car.vx*s+car.vy*c};
}
function move(car,previous) {
  return campus.resolveBuildingCollision(car,previous,
    hit=>dynamics.applyImpact(car,hit.normal,hit.impactMaterial));
}
const wall={minX:0,maxX:100,minY:-1000,maxY:1000};
for(const direction of [-1,1]) for(const rotation of [0,.6]) {
  const c=Math.cos(rotation),s=Math.sin(rotation);
  const point=(x,y)=>({x:x*c-y*s,y:x*s+y*c});
  const center=point(50,0);
  campus.buildingBounds.splice(0,campus.buildingBounds.length,
    {...wall,minX:center.x-50,maxX:center.x+50,minY:center.y-1000,maxY:center.y+1000,angle:rotation});
  const heading=Math.atan2(direction*30,1)+rotation;
  const previous={...point(-15,0),angle:heading};
  const car={...point(-5,direction*300),angle:heading,yawRate:0,damage:0};
  const speed=point(1,direction*30);velocity(car,speed.x,speed.y);
  assert(move(car,previous),'A shallow approach must contact the wall');
  const along=car.y*c-car.x*s;
  assert(direction*along>295,'The rest of the step must slide along the wall');
  assert(car.x*c+car.y*s<-10.28,'The slide must stay outside the visible wall');
  assert(!car.crashed && car.damage===0,'A gentle scrape must leave the car drivable');
  let v=worldVelocity(car);
  assert(Math.abs(v.x*c+v.y*s)<1e-8,'Only the velocity into the wall must be removed');
  assert(direction*(v.y*c-v.x*s)>29.8,'A shallow scrape must preserve tangential speed');
  for(let i=0;i<100;i++) {
    const from={x:car.x,y:car.y,angle:car.angle};
    const step=point(.001,direction);
    car.x+=step.x;car.y+=step.y;
    const speed=point(.001,direction*30);velocity(car,speed.x,speed.y);
    move(car,from);
    v=worldVelocity(car);
    assert(direction*(v.y*c-v.x*s)>29.99,'Repeated light contact must not cut speed every frame');
    assert(car.x*c+car.y*s<-10.28,'Repeated contact must not creep through the wall');
  }
  assert(direction*(car.y*c-car.x*s)>395,'Continued contact must keep making progress along the wall');
  const from={x:car.x,y:car.y,angle:car.angle},away=point(-2,0);
  car.x+=away.x;car.y+=away.y;velocity(car,away.x,away.y);
  assert(!move(car,from),'The car must be able to steer away after sliding');
}
campus.buildingBounds.splice(0,campus.buildingBounds.length,wall,
  {minX:-1000,maxX:0,minY:50,maxY:1000});
const angle=Math.atan2(30,1),corner={x:-5,y:100,angle,yawRate:0,damage:0};
velocity(corner,1,30);
assert(move(corner,{x:-15,y:0,angle}));
assert(corner.y>1 && corner.y<50-12,'A slide must stop at a second wall in a corner');
assert(corner.crashed,'A hard impact into the second wall must still wreck the car');

campus.buildingBounds.splice(0,campus.buildingBounds.length,wall);
const driving={x:-12,y:0,angle:Math.atan2(30,1),damage:0};
dynamics.reset(driving);velocity(driving,1,30);
let contacts=0;
for(let i=0;i<90;i++) {
  const previous={x:driving.x,y:driving.y,angle:driving.angle};
  dynamics.step(driving,{gas:1,brake:0,steer:0},1/90,0);
  if(move(driving,previous)) contacts++;
  assert(!driving.crashed && driving.damage===0,'Powered shallow contact must not wreck the car');
}
assert(contacts>10,'The driving test must exercise sustained wall contact');
assert(driving.y>250 && driving.speed>25,'Full driving physics must keep sliding along the wall');

const headOn={x:10,y:0,angle:0,yawRate:0,damage:0};velocity(headOn,12,0);
assert(move(headOn,{x:-30,y:0,angle:0}));
assert(headOn.crashed && headOn.speed===0,'A direct hard impact must still stop the car');
assert.equal(headOn.y,0,'A direct impact must not invent sideways movement');
console.log('PASS: shallow wall slides, rotated walls, both directions, repeated contact, departure, corners and head-on impacts');
