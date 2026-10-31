const assert=require('node:assert/strict');
const {revision}=require('../verification/world.cjs');
(async()=>{
 let clock=0;
 const server=await require('../verification/server.cjs').createServer({secret:'spectator-test-secret-'.repeat(3),sessionsOptions:{clock:()=>clock}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=path=>fetch(base+path);
 try{
  const session=await server.sessions.create(revision,{nickname:'Driver',playerHash:'private-account'},{armed:true});
  assert.equal((await (await get('/spectate')).json()).results.length,0,'Armed sessions are not driving');
  server.sessions.activate(session.id,session.sessionToken);
  const list=await (await get('/spectate')).json();
  assert.equal(list.results.length,1);
  assert.equal(list.results[0].id,session.id);
  assert.equal(list.results[0].nickname,'Driver');
  assert.match(list.results[0].watchId,/^[a-f0-9]{32}$/);
  const stableWatchId=list.results[0].watchId;
  for(let seq=0;seq<12;seq++){
   clock+=500;
   await server.sessions.batch(session.id,session.sessionToken,{revision,seq,fromTick:seq*60,inputs:Array(60).fill([0,0,0,false,false,true])});
  }
  const response=await get('/spectate/'+session.id),live=await response.json();
  assert.equal(response.status,200);assert.equal(live.sceneRevision,revision);
  assert.equal(live.frames.at(-1)[0],720);assert(live.frames[0][0]>=120);
  assert(live.frames.length<=101);assert(live.inputs.length<=601);
  assert(live.frames.every(f=>f.length===7),'Authoritative visual poses are included');
  assert.deepEqual(live.lapStates,[{lap:1,startTick:0,bestLapMs:0}]);
  assert.equal(live.bestLapMs,0);
  assert(!JSON.stringify(live).includes(session.sessionToken));assert(!JSON.stringify(live).includes('private-account'));
  assert.equal((await fetch(base+'/spectate',{method:'POST'})).status,405);
  server.sessions.cancel(session.id,session.sessionToken);
  assert.equal((await get('/spectate/'+session.id)).status,410);
  assert.equal((await (await get('/spectate')).json()).results.length,0);
  const next=await server.sessions.create(revision,{nickname:'Driver',playerHash:'private-account'},{armed:true});
  server.sessions.activate(next.id,next.sessionToken);
  const restarted=(await (await get('/spectate')).json()).results[0];
  assert.notEqual(restarted.id,session.id);
  assert.equal(restarted.watchId,stableWatchId,'A new verified session retains the opaque player watch identity');
  console.log('PASS: public live list, authoritative poses, bounded buffer, hidden credentials and ended sessions');
 }finally{await server.sessions.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
