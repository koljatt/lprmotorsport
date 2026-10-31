// Anonymous cumulative hour buckets. Retries overwrite the same row, never add twice.
const {randomUUID}=require('node:crypto');
const keys=['starts','capacityRejected','startRateRejected','practiceLaps','processingTimeouts','lagTerminations'];
function createCapacityReporter({url,token,fetcher=fetch,clock=Date.now}={}){
 if(!url)return {record(){},async flush(){},async close(){}};
 const endpoint=new URL(url);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.pathname!=='/api/internal/capacity'||endpoint.search||endpoint.hash||typeof token!=='string'||token.length<32)throw Error('Invalid capacity reporting configuration');
 const source=randomUUID(),pending=new Map();let inflight=null,closed=false;
 function record(key,count=1){
  if(!keys.includes(key)||!Number.isSafeInteger(count)||count<1)return;
  const bucket=Math.floor(clock()/3600000)*3600000;
  let row=pending.get(bucket);
  if(!row){if(pending.size>=2161){console.error('Capacity history queue full');return;}row={source,bucket,counters:Object.fromEntries(keys.map(k=>[k,0])),version:0};pending.set(bucket,row);}
  row.counters[key]+=count;row.version++;
  void flush();
 }
 async function flush(){
  if(inflight)return inflight;
  inflight=(async()=>{for(const [bucket,row]of pending){
   // Keep the current bucket's totals, including after a successful delivery.
   if(row.sentVersion===row.version)continue;
   const version=row.version;
   try{
    const response=await fetcher(endpoint.href,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(2000),body:JSON.stringify({source,bucket,counters:{...row.counters}})});
    await response.body?.cancel();if(!response.ok)throw Error('Report rejected');
    row.sentVersion=version;
   }catch{console.error('Capacity history delivery failed; retry queued');break;}
  }
  const current=Math.floor(clock()/3600000)*3600000;
  for(const [bucket,row]of pending)if(bucket<current&&row.sentVersion===row.version)pending.delete(bucket);
  })();
  try{await inflight;}finally{inflight=null;}
 }
 const timer=setInterval(()=>{if(!closed)void flush();},5000);timer.unref();
 return {record,flush,async close(){closed=true;clearInterval(timer);await flush();await flush();}};
}
module.exports={createCapacityReporter};
