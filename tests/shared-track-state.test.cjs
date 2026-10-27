'use strict';
const assert=require('node:assert/strict');
const {createWorldFactory,createIsolatedWorld}=require('../verification/world.cjs');
const {driver}=require('./helpers-driving.cjs');
const {Recorder}=require('../verification/replay.cjs');
(async()=>{
 const factory=createWorldFactory(),a=factory.create(),b=factory.create(),reference=createIsolatedWorld();
 assert.deepEqual({x:a.world.car.x,y:a.world.car.y,angle:a.world.car.angle},factory.definition.launchPosition,
  'Pooled verification sessions use the same 200-metre pre-finish launch as browser sessions');
 assert.deepEqual({x:a.world.car.x,y:a.world.car.y,angle:a.world.car.angle},
  {x:reference.world.car.x,y:reference.world.car.y,angle:reference.world.car.angle},
  'Pooled and isolated driving worlds start at the same position');
 assert.strictEqual(a.definition,b.definition);assert.strictEqual(a.world.track,b.world.track);
 assert.strictEqual(a.world.trackDistances,b.world.trackDistances);assert.strictEqual(a.campus.carGeometry,b.campus.carGeometry);
 assert.strictEqual(a.campus.collisionIndex,b.campus.collisionIndex);
 assert(Object.isFrozen(a.definition)&&Object.isFrozen(a.definition.spawns[0]));
 assert.throws(()=>{a.world.track[0].x++;},TypeError);
 assert.notStrictEqual(a.world.car,b.world.car);assert.notStrictEqual(a.world.dynamics.parameters,b.world.dynamics.parameters);
 assert.notStrictEqual(a.campus.bodies,b.campus.bodies);assert.deepEqual(a.campus.bodies,reference.campus.bodies);
 for(let i=0;i<a.campus.bodies.length;i++){
  const x=a.campus.bodies[i],y=b.campus.bodies[i];
  assert.notStrictEqual(x,y);assert.notStrictEqual(x.bounds,y.bounds);assert.notStrictEqual(x.spawn,y.spawn);
  assert.notStrictEqual(x.origin,y.origin);assert.notStrictEqual(x.dents,y.dents);
 }
 const bInitial=JSON.stringify({bodies:b.campus.bodies,result:b.world.result()});
 const spawnsBefore=JSON.stringify(factory.definition);
 const ra=new Recorder(a.world,'shared-state-parity'),rr=new Recorder(reference.world,'shared-state-parity');let laps=0;
 for(let tick=0;tick<30000;tick++){
  const input=driver(reference.world),value=reference.api.encode(input),oldEvent=reference.world.step(input),event=a.world.step(input);
  assert.deepEqual(event,oldEvent);assert.deepEqual(a.world.car,reference.world.car);
  assert.deepEqual(a.world.result(),reference.world.result());
  if(tick%120===0)assert.deepEqual(a.campus.bodies,reference.campus.bodies);
  const one=ra.step(value,event),two=rr.step(value,oldEvent);
  if(event.completed){assert.deepEqual(await one,await two);laps++;}
 }
 assert(laps>=2);assert.equal(JSON.stringify({bodies:b.campus.bodies,result:b.world.result()}),bInitial);
 // Damage, movement, dents, people pose and reset must all stay local.
 const victim=a.campus.bodies.find(x=>Number.isFinite(x.mass)&&x.kind!=='person');
 victim.vx=3;victim.spin=.1;victim.damage=.4;victim.dents.push({x:1,y:2,depth:3});
 a.campus.stepObstacles(1/120,a.world.car);
 a.world.people.update(12345);a.campus.placeBody(victim,1000,1200);
 assert.equal(JSON.stringify({bodies:b.campus.bodies,result:b.world.result()}),bInitial);
 a.world.reset();assert.equal(JSON.stringify({bodies:b.campus.bodies,result:b.world.result()}),bInitial);
 assert.equal(JSON.stringify(factory.definition),spawnsBefore);
 const fresh=factory.create();assert.deepEqual(fresh.world.result(),b.world.result());assert.deepEqual(fresh.campus.bodies,b.campus.bodies);
 // Interleave two sessions and an independently initialized world with different inputs.
 const bRef=createIsolatedWorld();
 for(let tick=0;tick<2400;tick++){
  const input=driver(bRef.world);assert.deepEqual(b.world.step(input),bRef.world.step(input));
  const other={gas:.8,brake:0,steer:Math.sin(tick/80)*.7,analog:true,wheel:false,tc:true};
  if(!a.world.car.crashed)a.world.step(other);
  if(tick%200===0)a.world.reset();
  assert.deepEqual(b.world.car,bRef.world.car);
  if(tick%120===0)assert.deepEqual(b.campus.bodies,bRef.campus.bodies);
 }
 // Warm shared index and ordinary index must return exactly the same local objects/order.
 const index=require('../shared/collision-index.js'),plain=index(b.campus.obstacleBounds),shared=index(b.campus.obstacleBounds,160,b.campus.collisionIndex);
 for(let i=0;i<500;i++){
  const x=(i*7919)%5200,y=(i*1021)%4400;
  assert.deepEqual(shared(x,y,x+20,y-30,25),plain(x,y,x+20,y-30,25));
 }
 // A moved static shape cannot accidentally keep using its old shared index cells.
 b.campus.obstacleBounds[0].minX+=100;
 const fallback=index(b.campus.obstacleBounds,160,b.campus.collisionIndex),rebuilt=index(b.campus.obstacleBounds);
 assert.deepEqual(fallback(0,0,5200,4400,20),rebuilt(0,0,5200,4400,20));
 console.log('PASS: immutable shared definitions, private bodies/bounds/people/dents, resets/new sessions, two exact laps/replays, interleaved sessions and shared index parity/fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
