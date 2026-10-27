const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{LPRVehicleSpec:require('../shared/vehicle-spec.js')}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('campus.js','utf8'),context);
const campus=context.window.LPRCampus;
const gate=campus.finishGate;
const along=(distance,lateral)=>({
  x:gate.x+gate.tangentX*distance+gate.normalX*lateral,
  y:gate.y+gate.tangentY*distance+gate.normalY*lateral
});

assert(campus.crossesFinishLine(along(-2,0),along(2,0)),'Forward crossing between the posts counts');
assert(!campus.crossesFinishLine(along(2,0),along(-2,0)),'Reverse crossing does not count');
assert(!campus.crossesFinishLine(along(-2,gate.halfWidth+1),along(2,gate.halfWidth+1)),
  'Crossing outside either post does not count');
assert.equal(campus.finishPostBounds.length,2,'The start line has two physical posts');
for(const [index,bounds] of campus.finishPostBounds.entries()) {
  assert(campus.obstacleBounds.includes(bounds),'Each post participates in obstacle collision');
  assert.equal(bounds.body.kind,'wall');
  assert.equal(bounds.body.mass,Infinity,'Posts remain fixed when hit');
  assert.equal(bounds.maxX-bounds.minX,3,'Collision matches the existing frame post width');
  assert.equal(bounds.maxY-bounds.minY,3,'Collision matches the existing frame post depth');
  const side=index===0?-1:1;
  assert.equal((bounds.minX+bounds.maxX)/2,
    gate.x+gate.normalX*campus.gantryHalfWidth*side,'Collision matches the existing post position');
  assert.equal((bounds.minY+bounds.maxY)/2,
    gate.y+gate.normalY*campus.gantryHalfWidth*side,'Collision matches the existing post position');
}
assert.equal(gate.halfWidth,campus.gantryHalfWidth-1.5,
  'The finish line ends at the inner faces of the existing posts');
const launch=campus.launchPosition;
const distances=[0];
for(let i=0;i<campus.track.length;i++) {
  const a=campus.track[i],b=campus.track[(i+1)%campus.track.length];
  distances.push(distances[i]+Math.hypot(b.x-a.x,b.y-a.y));
}
let nearestLaunch=Infinity,launchAlong=0;
for(let i=0;i<campus.track.length;i++) {
  const a=campus.track[i],b=campus.track[(i+1)%campus.track.length],dx=b.x-a.x,dy=b.y-a.y;
  const f=Math.max(0,Math.min(1,((launch.x-a.x)*dx+(launch.y-a.y)*dy)/(dx*dx+dy*dy)));
  const distance=Math.hypot(launch.x-a.x-dx*f,launch.y-a.y-dy*f);
  if(distance<nearestLaunch){nearestLaunch=distance;launchAlong=distances[i]+f*(distances[i+1]-distances[i]);}
}
assert(nearestLaunch<1e-8,'The launch position stays on the track');
assert(Math.abs((distances.at(-1)-launchAlong)*context.window.LPRVehicleSpec.metresPerWorldUnit-100)<.01,
  'The launch position is 100 metres before the finish line');

const {world, campus:physicsCampus}=require('../verification/world.cjs').createWorld();
assert(Math.hypot(world.car.x-physicsCampus.launchPosition.x,world.car.y-physicsCampus.launchPosition.y)<1e-8,
  'The authoritative driving world starts at the launch position');
const post=physicsCampus.finishPostBounds[0];
const postX=(post.minX+post.maxX)/2,postY=(post.minY+post.maxY)/2;
const car=world.car;
car.x=postX;
car.y=postY;
car.angle=Math.atan2(gate.tangentY,gate.tangentX);
const previous={
  x:postX-gate.tangentX*30,
  y:postY-gate.tangentY*30,
  angle:car.angle
};
assert(physicsCampus.resolveObstacleCollision(car,previous),'A swept vehicle collision hits the finish post');

console.log('PASS: physical finish posts and bounded, forward-only finish-line crossing');
