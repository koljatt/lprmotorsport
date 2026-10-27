const assert=require('node:assert/strict');
const {createWorld}=require('../verification/world.cjs');
const fast=createWorld().world,reference=createWorld({trackIndexed:false}).world;
let seed=1977;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
// Whole map, well outside the map, exact endpoints and near ties at joins.
const points=Array.from({length:20000},()=>[random()*12000-4000,random()*12000-4000]);
for(let i=0;i<fast.track.length;i++){
 const a=fast.track[i],b=fast.track[(i+1)%fast.track.length];
 for(const t of [0,1e-12,.5,1-1e-12,1])for(const offset of [0,1e-9,-1e-9,33,-33])
  points.push([a.x+(b.x-a.x)*t+offset,a.y+(b.y-a.y)*t+offset]);
}
for(const [x,y] of points)assert.deepEqual(fast.nearestTrack(x,y),reference.nearestTrack(x,y),`Nearest segment at ${x},${y}`);
// Compare every state and lap boundary, including collisions/grass and a full lap.
const {driver}=require('./helpers-driving.cjs');let laps=0;
for(let tick=0;tick<30000 && laps<2;tick++){
 const input=driver(reference),a=reference.step(input),b=fast.step(input);
 assert.deepEqual(b,a);assert.deepEqual(fast.result(),reference.result(),`State at tick ${tick}`);
 if(a.completed)laps++;
}
assert(laps>=2);
for(const world of [fast,reference])world.reset();
for(let tick=0;tick<3000;tick++){
 const input={gas:.7,brake:0,steer:Math.sin(tick/70)*.8,analog:true,wheel:false,tc:tick%400<200};
 if(reference.car.crashed)break;
 assert.deepEqual(fast.step(input),reference.step(input));assert.deepEqual(fast.result(),reference.result());
}
console.log(`PASS: ${points.length} exact nearest-track queries, two full laps and off-road/collision state parity`);
