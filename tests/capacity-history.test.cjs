const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createCapacityReporter}=require('../verification/capacity-reporter.cjs');
function binding(db){return {async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}},prepare(sql){let values=[];return {bind(...v){values=v;return this;},async run(){return db.prepare(sql).run(...values);},async first(){return db.prepare(sql).get(...values);},async all(){return {results:db.prepare(sql).all(...values)};}};}};}
(async()=>{
 const worker=(await import('../cloudflare/worker.mjs')).default,db=new DatabaseSync(':memory:');
 const token='private-metrics-token-'.repeat(3),env={DB:binding(db),VERIFICATION_METRICS_TOKEN:token,ANALYTICS_ADMIN_TOKEN:'private-admin-'.repeat(4)};
 const url='https://analytics.test/api/internal/capacity',now=Date.now();
 const request=(path,key=env.ANALYTICS_ADMIN_TOKEN)=>new Request('https://analytics.test'+path,{headers:{Authorization:'Bearer '+key}});
 const history=async()=>{const response=await worker.fetch(request('/api/admin/capacity-history?days=7'),env);assert.equal(response.status,200);return response.json();};
 assert.equal((await worker.fetch(request('/api/admin/capacity-history','wrong'),env)).status,401);
 assert.equal((await history()).totals.lastReportAt,null);
 assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer wrong'}}),env)).status,401);
 let online=true,loseAck=false,lastPayload;
 const fetcher=async(endpoint,options)=>{lastPayload=options.body;if(!online)throw Error('Offline');const r=await worker.fetch(new Request(endpoint,options),env);if(loseAck){loseAck=false;throw Error('Acknowledgement lost');}return r;};
 const make=(clock=()=>now)=>createCapacityReporter({url,token,fetcher,clock});
 const first=make();
 try{
  first.record('capacityRejected');await first.flush();
  assert.equal((await history()).totals.capacityRejected,1);
  // Losing the response after commit must not add a second rejection on retry.
  loseAck=true;first.record('capacityRejected');await first.flush();await first.flush();
  assert.equal((await history()).totals.capacityRejected,2);
  online=false;first.record('practiceLaps',3);await first.flush();
  assert.equal((await history()).totals.practiceLaps,0);
  online=true;await first.flush();assert.equal((await history()).totals.practiceLaps,3);
  const previous=JSON.parse(lastPayload);previous.counters.capacityRejected=0;
  await worker.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(previous)}),env);
  assert.equal((await history()).totals.capacityRejected,2,'Old retries cannot decrease totals');
 }finally{await first.close();}
 // New reporter = new verification process; both processes survive in the database.
 const restarted=make();try{restarted.record('capacityRejected',4);await restarted.flush();}finally{await restarted.close();}
 let report=await history();assert.equal(report.totals.capacityRejected,6);assert.equal(report.totals.practiceLaps,3);assert.equal(report.daily.length,1);
 const old=make(()=>now-8*86400000);try{old.record('capacityRejected',7);await old.flush();}finally{await old.close();}
 assert.equal((await history()).totals.capacityRejected,6);
 const wide=await (await worker.fetch(request('/api/admin/capacity-history?days=30'),env)).json();assert.equal(wide.totals.capacityRejected,13);assert.equal(wide.daily.length,2);
 const invalid=JSON.parse(lastPayload);invalid.counters.capacityRejected=-1;
 assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(invalid)}),env)).status,400);
 assert(!JSON.stringify(report).includes(token));assert.equal(report.totals.source,undefined);
 // A cold Worker module still reads the same database, without a live metrics service.
 const coldWorker=(await import('../cloudflare/worker.mjs?cold='+Date.now())).default;
 report=await (await coldWorker.fetch(request('/api/admin/capacity-history?days=7'),{...env,VERIFICATION_METRICS_URL:undefined})).json();assert.equal(report.totals.capacityRejected,6);
 const {Sessions}=require('../verification/sessions.cjs'),{revision}=require('../verification/world.cjs');
 const hook=make(),sessions=new Sessions({maxSessions:1,onMetric:hook.record});
 try{
  const live=await sessions.create(revision,{});
  assert.equal(sessions.snapshotMetrics().pool.workers,1,'The live session runs in the shared worker pool');
  await assert.rejects(()=>sessions.create(revision,{}),e=>e.code==='capacity');
  // Startup may already be uploading the same hour bucket; drain the newer version too.
  await hook.flush();await hook.flush();
  const combined=await history();assert.equal(combined.totals.capacityRejected,7);assert.equal(combined.totals.starts,1,'Pooled initialization reaches durable history exactly once');
  sessions.cancel(live.id,live.sessionToken);await sessions.pool.drain();
  assert((await sessions.pool.inspect()).every(s=>s.worlds===0));
 }finally{await sessions.close();await hook.close();}
 // A change made during an in-flight upload must also be drained at shutdown.
 let release;const gate=new Promise(r=>{release=r;});let writes=0;
 const draining=createCapacityReporter({url,token,fetcher:async(endpoint,options)=>{if(++writes===1)await gate;return fetcher(endpoint,options);},clock:()=>now});
 draining.record('capacityRejected');draining.record('capacityRejected');
 const closing=draining.close();release();await closing;
 assert.equal((await history()).totals.capacityRejected,9);
 db.close();console.log('PASS: durable history across server/Worker restart, authenticated ingestion, response-loss retries, offline recovery, old snapshots, date filtering and real rejection hook');
})().catch(e=>{console.error(e);process.exitCode=1;});
