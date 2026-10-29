const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const database=path.join(os.tmpdir(),`lpr-guest-recovery-${process.pid}.sqlite`),secret='guest-recovery-secret-'.repeat(4),revision='a'.repeat(64);
 const {hash,sign,verify}=await import('../verification/protocol.mjs');
 const {default:bundle}=await import('../cloudflare/verified-worker.bundle.mjs');
 const open=async signingSecret=>{const b=await require('../verification/local-leaderboard.cjs').createLocalLeaderboard({secret:signingSecret,revision,database,passwordIterations:10000});await new Promise(r=>b.listen(0,'127.0.0.1',r));return b;};
 const close=b=>new Promise(r=>{b.close(r);b.closeAllConnections();});
 let board=await open(secret);
 const post=(route,data,token)=>fetch('http://127.0.0.1:'+board.address().port+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 const list=async()=>(await(await fetch('http://127.0.0.1:'+board.address().port+'/api/verified/leaderboard')).json()).results;
 try{
  const g=await(await post('/api/verified/guest',{nickname:'Reconnect',series:'human'})).json();
  const start=await(await post('/api/verified/start',{revision},g.token)).json();const identity=await verify(start.ticket,secret);
  const replay=require('node:zlib').gzipSync(JSON.stringify({format:'recovery-test'})).toString('base64');
  const receipt=await sign({kind:'lap',protocol:'driving-v1',revision,playerHash:identity.playerHash,nickname:'Reconnect',sessionId:'a'.repeat(32),lap:1,startTick:0,endTick:6000,lapTicks:6000,sectorTicks:[2000,2000,2000],issuedAt:Date.now(),replayHash:await hash(replay)},secret);
  assert.equal((await post('/api/verified/laps',{receipt,replay},g.token)).status,200);
  await close(board);board=await open(secret);
  assert.equal((await list())[0].nickname,'Reconnect (vierailija)','Unclaimed official results survive a process restart');
  const resumed=await post('/api/verified/guest',{},g.token);assert.equal(resumed.status,200);assert.equal((await resumed.json()).token,g.token);
  // The pasteable production bundle uses the same ownership and transaction path.
  const env={DB:board.binding,SIMULATION_REVISION:revision,VERIFICATION_SECRET:secret,PASSWORD_ITERATIONS:10000};
  const promotion=await bundle.fetch(new Request('https://example.test/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+g.token},body:JSON.stringify({nickname:'Reconnect Owner',password:'recovery-password',create:true})}),env);
  assert.equal(promotion.status,201);assert.equal((await promotion.json()).claimed,true);
  const before=board.db.prepare('SELECT * FROM verified_laps').all();
  await close(board);board=await open(secret);
  const recover=await post('/api/verified/guest',{},g.token);assert.equal(recover.status,200);assert.equal((await recover.json()).guest,false,'A lost promotion response can be recovered by the original session');
  assert.equal((await list())[0].nickname,'Reconnect Owner');
  assert.equal((await(await post('/api/verified/laps',{receipt,replay},g.token)).json()).saved,false);
  assert.deepEqual(board.db.prepare('SELECT * FROM verified_laps').all(),before);
  // Rotation invalidates credentials, while persistent public evidence survives.
  await close(board);board=await open('new-recovery-secret-'.repeat(4));
  assert.equal((await post('/api/verified/guest',{},g.token)).status,401);
  assert.equal((await list())[0].nickname,'Reconnect Owner');
  assert.equal((await post('/api/verified/account',{nickname:'Reconnect Owner',password:'recovery-password'})).status,200);
  console.log('PASS: persistent guest records, authenticated reconnect, bundled Worker promotion, lost-response recovery after restart, immutable rows and signing-secret rotation');
 }finally{if(board.listening)await close(board);fs.rmSync(database,{force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
