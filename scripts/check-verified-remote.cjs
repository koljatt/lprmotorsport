// Two real-clock HTTP clients. No renderer, signing secrets or production writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomBytes}=require('node:crypto');
const {createWorld,revision}=require('../verification/world.cjs');
const {driver}=require('../tests/helpers-driving.cjs');
const {testURL}=require('./build-staging.cjs');
const LiveClient=require('../experiment/live-client.js');
async function request(base,route,{token,body,method=body?'POST':'GET',origin,timeout=25000}={}){
 const response=await fetch(base+route,{method,headers:{...(origin?{Origin:origin}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});
 const data=await response.json();
 if(!response.ok)throw Object.assign(Error(`${route}: HTTP ${response.status} (${data.code||data.error||'request failed'})`),{status:response.status,code:data.code});
 return data;
}
function fixture(){
 const {world,api}=createWorld(),batches=[];let inputs=[],fromTick=0;
 batches.inputs=[];batches.states=new Map();batches.finishes=new Set();
 for(let tick=0;tick<72000&&world.result().lap<3;tick++){
  const input=driver(world),encoded=api.encode(input);inputs.push(encoded);batches.inputs.push(encoded);const event=world.step(input);
  batches.states.set(world.ticks,world.result());if(event.completed)batches.finishes.add(world.ticks);
  if(inputs.length===60||event.completed){batches.push({fromTick,inputs,expected:world.result()});fromTick+=inputs.length;inputs=[];}
 }
 assert.equal(world.result().lap,3,'Fixture must complete a standing and a flying lap');return batches;
}
async function run({site,output=path.resolve(__dirname,'../artifacts/verification/remote-two-players.json'),progress=()=>{}}={}){
 const origin=testURL(site),manifest=await request(origin,'/staging.json');
 assert.equal(manifest.environment,'staging');assert.equal(manifest.revision,revision,'Test page must match this checkout');
 const service=testURL(manifest.service),leaderboard=testURL(manifest.leaderboard);
 const health=await request(service,'/health',{origin,timeout:90000});
 assert.equal(health.revision,revision);assert(health.ready&&health.streaming);assert.equal(health.activeSessions,0,'Wait until other testers finish');
 progress({phase:'preparing',revision});
 const batches=fixture(),runId=randomBytes(4).toString('hex'),players=[];
 const report={generatedAt:new Date().toISOString(),site:origin,service,leaderboard,revision,commit:manifest.commit,runId,
  scope:'Two paced Node clients through public HTTPS, signed account/start/lap APIs and D1; excludes real browser rendering and human input',passed:false,players:[]};
 try{
  for(let i=0;i<2;i++){
   const nickname=`NetTest ${runId} ${i+1}`,password=randomBytes(24).toString('hex');
   const account=await request(leaderboard,'/api/verified/account',{origin,body:{nickname,password,create:true,series:'human'}});
   const {ticket}=await request(leaderboard,'/api/verified/start',{origin,token:account.token,body:{revision}});
   const client=new LiveClient({base:service,revision,ticket,armed:true,fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,Origin:origin}})});
   const session=await client.start();players.push({nickname,account,session,client});
   report.testAccounts=players.map(player=>player.nickname);
  }
  assert.equal((await request(service,'/health',{origin})).activeSessions,2);
  progress({phase:'running',players:players.map(p=>p.nickname)});
  const outcomes=await Promise.allSettled(players.map(async p=>{
   const {client}=p,saves=[],latencies=[],completed=[];let timer,deadline,started,enqueued=0,maxAckLagMs=0,acks=0;
   let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});finished.catch(()=>{});
   client.onLost=(message,details)=>reject(Error(p.nickname+': '+message+' ('+(details.code||'unknown')+')'));
   client.onUpdate=ack=>{
    if(!ack.result||ack.seq===undefined)return;
    try{
     acks++;assert.deepEqual(ack.result,batches.states.get(ack.ackTick),'Server world equals local fixture');
     const lag=ack.serverElapsedMs-ack.ackTick*1000/120;maxAckLagMs=Math.max(maxAckLagMs,lag);
     latencies.push(lag);
     assert.equal(ack.eligibility.eligible,true,`The run lost eligibility at tick ${ack.ackTick}; arrival lag ${ack.eligibility.lagMs.toFixed(1)} ms, ack lag ${lag.toFixed(1)} ms`);assert.deepEqual(ack.practiceLaps,[]);
     for(const lap of ack.laps||[]){
      assert(lap.replay&&lap.receipt,'A verified lap must include its signed recording');completed.push(lap.lap.lap);progress({phase:'lap',nickname:p.nickname,lap:lap.lap.lap});
      const pending=request(leaderboard,'/api/verified/laps',{origin,token:p.account.token,body:{receipt:lap.receipt,replay:lap.replay}}).then(result=>{assert(result.verified&&result.saved);});
      pending.catch(reject);saves.push(pending);
     }
     if(ack.ackTick===batches.inputs.length)resolve();
    }catch(error){reject(error);}
   };
   try{
    await client.activate();started=performance.now();
    deadline=setTimeout(()=>reject(Error('Two-player test timed out')),batches.inputs.length*1000/120+45000);
    timer=setInterval(()=>{
     const target=Math.min(batches.inputs.length,Math.floor((performance.now()-started)*120/1000));
     while(client.active&&enqueued<target){client.enqueue(batches.inputs[enqueued++]);if(batches.finishes.has(enqueued))void client.flush(true).catch(reject);}
    },20);
    await finished;await Promise.all(saves);assert.deepEqual(completed,[1,2]);latencies.sort((a,b)=>a-b);
    return {nickname:p.nickname,sessionId:p.session.id,completedLaps:completed,elapsedMs:performance.now()-started,batches:acks,ackLagP95Ms:latencies[Math.ceil(latencies.length*.95)-1],maxAckLagMs};
   }finally{clearInterval(timer);clearTimeout(deadline);await client.cancel();}
  }));
  report.players=outcomes.filter(result=>result.status==='fulfilled').map(result=>result.value);
  report.failures=outcomes.flatMap((result,i)=>result.status==='rejected'?[{nickname:players[i].nickname,error:result.reason.message}]:[]);
  const failed=outcomes.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  const board=await request(leaderboard,'/api/verified/leaderboard?series=human',{origin});
  for(const p of report.players){
   const rows=board.results.filter(row=>row.session_id===p.sessionId);
   assert.equal(rows.length,2,'Both test laps must be on the public test leaderboard');
   for(const row of rows){const replay=await request(leaderboard,`/api/verified/replays/${row.session_id}/${row.lap}`,{origin});assert.equal(replay.format,'lpr-replay-v1');assert.equal(replay.sceneRevision,revision);}
  }
  report.passed=true;return report;
 }catch(error){report.error=error.message;throw error;}
 finally{
  await Promise.all(players.map(async p=>{try{await request(service,`/sessions/${p.session.id}`,{origin,token:p.session.sessionToken,method:'DELETE'});}catch{}try{await request(leaderboard,'/api/verified/logout',{origin,token:p.account.token,method:'POST'});}catch{}}));
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 }
}
module.exports={run,fixture};
if(require.main===module)run({site:process.env.LPR_TEST_SITE_URL,progress:event=>console.log(JSON.stringify(event))}).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
