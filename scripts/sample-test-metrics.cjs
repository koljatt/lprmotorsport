// Read-only sampler, strictly restricted to the isolated Render test service.
const fs=require('node:fs');
const {token}=JSON.parse(fs.readFileSync('artifacts/verification/render-metrics-secret.json','utf8'));
const output=process.argv[2];
if(!output||!output.startsWith('artifacts/verification/'))throw Error('Report path required');
let stopping=false;
const deadline=Date.now()+Number(process.argv[3]||300)*1000;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;});
(async()=>{
 while(!stopping&&Date.now()<deadline){
  const at=new Date().toISOString();
  try{
   const r=await fetch('https://lpr-verification-test-ziev.onrender.com/metrics',{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('Metrics HTTP '+r.status);
   const metrics=await r.json();fs.appendFileSync(output,JSON.stringify({at,metrics})+'\n');
  }catch(e){fs.appendFileSync(output,JSON.stringify({at,error:e.message})+'\n');}
  await new Promise(r=>setTimeout(r,2000));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
