const assert=require('node:assert/strict');
const {createServer}=require('../experiment/server.cjs');
const LiveClient=require('../experiment/live-client.js');
const {revision}=require('../scripts/lib/replay-probe.cjs');
(async()=>{
 let clock=0;const server=createServer({sessionsOptions:{clock:()=>clock}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`,acks=[],lost=[];let requests=0;
 const client=new LiveClient({base,revision,onUpdate:a=>acks.push(a),onLost:e=>lost.push(e),fetch:async(url,options)=>{
  const response=await fetch(url,options);
  if(url.endsWith('/inputs')&&++requests===1){await response.arrayBuffer();throw TypeError('Simulated lost acknowledgement');}
  return response;
 }});
 try{
  await client.start();clock=500;
  for(let i=0;i<60;i++)client.enqueue([0,0,0]);await client.flush();
  assert.equal(requests,2,'Lost acknowledgement retries the identical request');assert.equal(client.tick,60);
  assert.equal(client.seq,1);assert.equal(acks.at(-1).ackTick,60);assert.equal(lost.length,0);
  const status=await (await fetch(base+'/sessions/'+client.session.id,{headers:{Authorization:'Bearer '+client.session.sessionToken}})).json();
  assert.equal(status.ackTick,60,'Retry did not advance server physics twice');
  const unauthorized=await fetch(base+'/sessions/'+client.session.id+'/inputs',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(unauthorized.status,401,'Session ID is insufficient without its secret');
  clock=18000;for(let i=0;i<60;i++)client.enqueue([0,0,0]);await assert.rejects(()=>client.flush());
  assert(!client.active);assert.equal(lost.length,1,'Disconnect becomes practice instead of claiming verification');
  const overflow=new LiveClient({base,revision,maxBufferedTicks:5,onLost:e=>lost.push(e)});await overflow.start();
  for(let i=0;i<6;i++)overflow.enqueue([0,0,0]);assert(!overflow.active);await overflow.cancel();
  assert.equal(lost.length,2,'Unbounded offline buffering is prohibited');
  console.log('PASS: HTTP session auth, client queue, lost acknowledgment retry, exact-once ticks, expiry and bounded practice fallback');
 }finally{await client.cancel();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1});
