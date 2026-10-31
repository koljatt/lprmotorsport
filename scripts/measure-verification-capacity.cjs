// Local comparative CPU benchmark, not a claim about Render capacity.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {createWorld,revision}=require('../verification/world.cjs'),{Recorder}=require('../verification/replay.cjs');
const {driver}=require('../tests/helpers-driving.cjs');
async function run(trackIndexed,inputs){
 const {world,api}=createWorld({trackIndexed}),recorder=new Recorder(world,revision),hash=createHash('sha256');
 const cpu=process.cpuUsage(),start=performance.now();let laps=0,bytes=0;
 for(const value of inputs){
  const event=world.step(api.decode(value)),recording=recorder.step(value,event);
  hash.update(JSON.stringify(world.result()));
  if(event.completed){const replay=await recording;assert(replay);hash.update(replay.payload);bytes+=replay.payload.length;laps++;}
 }
 const elapsedMs=performance.now()-start,usage=process.cpuUsage(cpu);
 return {elapsedMs,cpuMs:(usage.user+usage.system)/1000,laps,replayBytes:bytes,hash:hash.digest('hex')};
}
async function main(){
 const source=createWorld({trackIndexed:false}),inputs=[];
 for(let i=0;i<24000;i++){const input=driver(source.world);inputs.push(source.api.encode(input));source.world.step(input);}
 const rounds=[];
 // Alternate order to limit JIT/thermal bias. Each run starts a fresh world.
 for(let i=0;i<4;i++){
  const order=i%2?[true,false]:[false,true],pair={};
  for(const enabled of order)pair[enabled?'indexed':'linear']=await run(enabled,inputs);
  assert.equal(pair.indexed.hash,pair.linear.hash);assert(pair.indexed.laps>=2);rounds.push(pair);
 }
 const mean=kind=>rounds.reduce((s,r)=>s+r[kind].cpuMs,0)/rounds.length;
 const report={generatedAt:new Date().toISOString(),scope:'Local single-process comparative benchmark, 24000 identical ticks with full recording per run; not production capacity',revision,
  cpuReductionPercent:100*(1-mean('indexed')/mean('linear')),rounds};
 const dir=path.resolve(__dirname,'../artifacts/verification');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'capacity-benchmark.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
