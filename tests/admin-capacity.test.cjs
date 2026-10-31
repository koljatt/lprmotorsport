const assert=require('node:assert/strict');
(async()=>{
 const worker=(await import('../cloudflare/worker.mjs')).default;
 const env={ANALYTICS_ADMIN_TOKEN:'admin-'.repeat(8),VERIFICATION_METRICS_TOKEN:'metrics-'.repeat(8),VERIFICATION_METRICS_URL:'https://verification.test/metrics'};
 const req=(token=env.ANALYTICS_ADMIN_TOKEN,method='GET')=>new Request('https://admin.test/api/admin/capacity',{method,headers:{Authorization:'Bearer '+token}});
 const original=global.fetch;let calls=0;
 const counters={starts:3,capacityRejected:2,startRateRejected:1,practiceLaps:4,processingTimeouts:1,lagTerminations:2};
 global.fetch=async(url,options)=>{calls++;assert.equal(url,env.VERIFICATION_METRICS_URL);assert.equal(options.headers.Authorization,'Bearer '+env.VERIFICATION_METRICS_TOKEN);assert.equal(options.redirect,'error');return Response.json({since:Date.now(),activeSessions:1,maxSessions:2,counters,nickname:'MUST NOT LEAK',sessionToken:'MUST NOT LEAK'});};
 try{
  assert.equal((await worker.fetch(req('wrong'),env)).status,401);assert.equal(calls,0);
  assert.equal((await worker.fetch(req(undefined,'POST'),env)).status,405);
  const response=await worker.fetch(req(),env);assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.counters,counters);assert.equal(data.nickname,undefined);assert.equal(data.sessionToken,undefined);assert(!JSON.stringify(data).includes(env.VERIFICATION_METRICS_TOKEN));
  assert.equal((await worker.fetch(req(),{...env,VERIFICATION_METRICS_TOKEN:''})).status,503);
  global.fetch=async()=>{throw Error('connection failed');};assert.equal((await worker.fetch(req(),env)).status,503);
  global.fetch=async()=>new Response('x'.repeat(32769));assert.equal((await worker.fetch(req(),env)).status,503);
  global.fetch=async()=>Response.json({counters});assert.equal((await worker.fetch(req(),env)).status,503);
  global.fetch=async()=>Response.json({since:Date.now(),activeSessions:0,maxSessions:2,counters:{...counters,capacityRejected:-1}});assert.equal((await worker.fetch(req(),env)).status,503);
  console.log('PASS: admin capacity authentication, methods, secret isolation, bounded upstream data and unavailable states');
 }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
