const assert=require('node:assert/strict');
const {Sessions}=require('../verification/sessions.cjs'),{VerificationPool}=require('../verification/worker-pool.cjs');
const {createWorld,revision}=require('../verification/world.cjs'),{driver}=require('./helpers-driving.cjs');
const waitFor=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Condition timed out');};
(async()=>{
 for(const bad of [0,-1,1.5,17,NaN])assert.throws(()=>new VerificationPool({workerCount:bad}),/Worker count/);
 for(const bad of [0,63,2049,NaN])assert.throws(()=>new VerificationPool({workerHeapMb:bad}),/Worker heap/);
 const watchdog=new VerificationPool();let terminated=false;
 const fakeEntry={dead:false,worker:{postMessage(){},terminate(){terminated=true;return Promise.resolve();}}};
 await assert.rejects(watchdog.request(fakeEntry,'stats',undefined,{},1),e=>e.code==='budget');
 assert(terminated);assert.equal(watchdog.pending.size,0);await watchdog.close();
 await assert.rejects(watchdog.request(fakeEntry,'stats'),e=>e.code==='worker_lost');
 let now=0;
 const sessions=new Sessions({clock:()=>now,maxSessions:4,maxStartsPerMinute:64,workerCount:1,signLap:async(s,lap)=>'signed-'+s.id+'-'+lap.lap});
 try{
  const players=await Promise.all(Array.from({length:4},()=>sessions.create(revision,{}, {armed:true})));
  for(const p of players)sessions.activate(p.id,p.sessionToken);
  assert.equal(sessions.pool.snapshot().workers,1);assert.equal(sessions.pool.snapshot().sessions,4);
  await assert.rejects(()=>sessions.create(revision,{}),e=>e.code==='capacity');
  const worlds=players.map(()=>createWorld()),laps=Array(4).fill(0);
  for(let from=0,seq=0;from<30000 && laps.some(n=>n<2);from+=60,seq++){
   const batches=worlds.map(({world,api},i)=>{
    const inputs=[];for(let tick=0;tick<60;tick++){
     const input=driver(world);input.gas*=1-i*.03;input.tc=i%2===0;inputs.push(api.encode(input));world.step(input);
    }
    return {revision,seq,fromTick:from,inputs};
   });
   now=(from+60)*1000/120+50;
   const jobs=players.map((p,i)=>sessions.batch(p.id,p.sessionToken,batches[i]));
   // Duplicate requests share one promise and cannot enqueue or simulate twice.
   if(seq===0){const duplicate=sessions.batch(players[0].id,players[0].sessionToken,batches[0]);assert.deepEqual(await duplicate,await jobs[0]);}
   const replies=await Promise.all(jobs);
   for(let i=0;i<players.length;i++){
    assert.deepEqual(replies[i].result,worlds[i].world.result());laps[i]+=replies[i].laps.length;
    assert.equal(replies[i].practiceLaps.length,0);
    for(const lap of replies[i].laps){assert(lap.replay&&lap.receipt);assert(lap.receipt.startsWith('signed-'+players[i].id+'-'));}
   }
  }
  assert(laps.every(n=>n>=2));assert.equal(new Set(worlds.map(w=>JSON.stringify(w.world.result().state))).size,4,'Different drivers must retain different states');assert.equal(sessions.pool.snapshot().workers,1);
  const reused=[...sessions.pool.entries][0].worker.threadId;
  for(const p of players)sessions.cancel(p.id,p.sessionToken);
  await sessions.pool.drain();const stats=await sessions.pool.inspect();assert(stats.every(s=>s.worlds===0&&s.queued===0));
  const fresh=await sessions.create(revision,{});assert.equal([...sessions.pool.entries][0].worker.threadId,reused);
  assert.equal(sessions.pool.snapshot().sessions,1);sessions.cancel(fresh.id,fresh.sessionToken);await sessions.pool.drain();
  // Cancel a queued/in-flight batch, then reuse the slot without retaining its world.
  const p=await sessions.create(revision,{});now+=500;
  const pending=sessions.batch(p.id,p.sessionToken,{revision,seq:0,fromTick:0,inputs:Array(60).fill([0,0,0,false,false,true])});
  const rejected=assert.rejects(pending,e=>e.code==='session_closed');sessions.cancel(p.id,p.sessionToken);await rejected;
  await sessions.pool.drain();assert((await sessions.pool.inspect()).every(s=>s.worlds===0));
  // TTL cleanup releases the worker-side world too.
  const expiring=await sessions.create(revision,{});now+=25000;sessions.sweep();await sessions.pool.drain();
  assert.equal(sessions.sessions.get(expiring.id).phase,'invalid');assert((await sessions.pool.inspect()).every(s=>s.worlds===0));
 }finally{await sessions.close();}
 assert.equal(sessions.sessions.size,0);assert.equal(sessions.pool.snapshot().workers,0);
 await assert.rejects(()=>sessions.create(revision,{}),e=>e.code==='session_closed');
 // A failed worker invalidates all its sessions, without affecting another worker.
 const two=new Sessions({workerCount:2,maxSessions:4,maxStartsPerMinute:64});
 try{
  const players=await Promise.all(Array.from({length:4},()=>two.create(revision,{})));
  assert.equal(two.pool.snapshot().workers,2);
  const entry=[...two.pool.entries][0],victims=new Set(entry.owners);await entry.worker.terminate();
  await waitFor(()=>[...victims].every(id=>two.sessions.get(id).phase==='invalid'));
  for(const p of players)assert.equal(two.sessions.get(p.id).phase,victims.has(p.id)?'invalid':'running');
  const fresh=await two.create(revision,{});assert.equal(two.sessions.get(fresh.id).phase,'running');assert(two.pool.snapshot().workers<=2);
 }finally{await two.close();}
 // Cancelling initialization never leaves an unowned world behind.
 const init=new Sessions();
 try{const creating=init.create(revision,{}),id=[...init.sessions.keys()][0],token=init.sessions.get(id).token;
  const rejected=assert.rejects(creating,e=>e.code==='session_closed');init.cancel(id,token);await rejected;await init.pool.drain();
  assert((await init.pool.inspect()).every(s=>s.worlds===0));
 }finally{await init.close();}
 console.log('PASS: bounded worker count, shared two-lap state/receipts, exact-once retries, cancellation, expiry, worker reuse/failure isolation and initialization cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
