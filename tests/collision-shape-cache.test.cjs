'use strict';
const assert=require('node:assert/strict');
const {createWorld}=require('./helpers-collision-cache.cjs');
const {Recorder}=require('../verification/replay.cjs');
const {driver}=require('./helpers-driving.cjs');
(async()=>{
 const fast=createWorld(),old=createWorld({baseline:true});
 const cached=fast.campus.carCollisionParts,reference=old.campus.carCollisionParts;
 const state={damage:0,impactSide:0,steerAngle:0};
 function compare(){const value=cached(state);assert.deepEqual(value,reference(state));return value;}
 let first=compare();assert.strictEqual(compare(),first,'Unchanged shape must reuse geometry');
 Object.assign(state,{x:123,y:456,angle:2,vx:4});assert.strictEqual(compare(),first,'Position, heading and velocity do not change local geometry');
 assert.throws(()=>{first[0][0][0]=100;},TypeError,'Cached points cannot be corrupted by callers');
 state.steerAngle=.2;const turned=compare();
 assert.strictEqual(turned[0],first[0],'Steering must reuse the unchanged chassis');
 assert.strictEqual(turned.at(-1),first.at(-1),'Steering must reuse rear tyres');
 assert.notStrictEqual(turned.at(-4),first.at(-4),'Steering must update front tyres');
 state.damage=.3;const damaged=compare();assert.notStrictEqual(damaged[0],turned[0]);assert.notStrictEqual(damaged.at(-1),turned.at(-1));
 for(const field of ['damage','impactSide','steerAngle'])for(const value of [0,-0,.1,-.3,1,undefined,NaN]){
  state[field]=value;const shape=compare();assert.strictEqual(compare(),shape);
 }
 let seed=9;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
 for(let i=0;i<4000;i++){
  Object.assign(state,{damage:random(),impactSide:random()*2-1,steerAngle:random()*2-1});compare();
 }
 const other={...state},a=cached(state),b=cached(other);assert.notStrictEqual(a,b,'Car caches are independent');
 other.damage=.5;cached(other);assert.strictEqual(cached(state),a);
 // Every mutable geometry input used by the original function invalidates the cache.
 for(const field of ['wheelForward','wheelRear','wheelSide','rimRadius','tyreRadius','tyreHalfWidth']){
  fast.campus.carGeometry[field]+=.01;old.campus.carGeometry[field]+=.01;
  assert.notStrictEqual(compare(),first);first=compare();
 }
 fast.campus.carGeometry.tyreProfile[0][0]+=.02;old.campus.carGeometry.tyreProfile[0][0]+=.02;compare();
 fast.campus.carGeometry.tyreProfile=fast.campus.carGeometry.tyreProfile.map(p=>p.slice());
 old.campus.carGeometry.tyreProfile=old.campus.carGeometry.tyreProfile.map(p=>p.slice());compare();
 // New worlds avoid carrying deliberate geometry edits into driving parity.
 const optimized=createWorld(),baseline=createWorld({baseline:true});
 const recordings=[new Recorder(optimized.world,optimized.revision),new Recorder(baseline.world,baseline.revision)];
 let laps=0;
 for(let tick=0;tick<24000;tick++){
  const input=driver(baseline.world),value=baseline.api.encode(input);
  const oldEvent=baseline.world.step(input),newEvent=optimized.world.step(input);
  assert.deepEqual(newEvent,oldEvent);assert.deepEqual(optimized.world.car,baseline.world.car,`Full car state at tick ${tick}`);
  assert.deepEqual(optimized.world.result(),baseline.world.result());
  const one=recordings[0].step(value,newEvent),two=recordings[1].step(value,oldEvent);
  if(oldEvent.completed){assert.deepEqual(await one,await two);laps++;}
 }
 assert(laps>=2);
 // Impacts may change damage between queries in the same physics tick.
 for(const built of [optimized,baseline])built.world.reset();
 for(let tick=0;tick<3600;tick++){
  if(baseline.world.car.crashed)break;
  const input={gas:1,brake:0,steer:Math.sin(tick/80)*.7,analog:true,wheel:false,tc:tick%400<200};
  assert.deepEqual(optimized.world.step(input),baseline.world.step(input));
  assert.deepEqual(optimized.world.car,baseline.world.car);
 }
 console.log('PASS: cache reuse, all shape inputs, read-only geometry, per-car isolation, 4000 shapes, two full laps/replays and impact state parity');
})().catch(e=>{console.error(e);process.exitCode=1;});
