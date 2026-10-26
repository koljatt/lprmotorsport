// Isolated Node processes compare full simulation/recording CPU and memory.
// This is a local benchmark, not a Render capacity or browser FPS claim.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {createWorld}=require('../tests/helpers-collision-cache.cjs');
const {driver}=require('../tests/helpers-driving.cjs');
const {Recorder}=require('../verification/replay.cjs');
async function measure(baseline,inputFile){
 const inputs=JSON.parse(fs.readFileSync(inputFile,'utf8'));
 let warm=createWorld({baseline});
 for(const input of inputs.slice(0,1200))warm.world.step(warm.api.decode(input));
 warm=null;global.gc?.();
 const built=createWorld({baseline}),recorder=new Recorder(built.world,built.revision),hash=createHash('sha256');
 global.gc?.();const before=process.memoryUsage(),cpu=process.cpuUsage(),started=performance.now();let laps=0,replayBytes=0;
 for(const input of inputs){
  const event=built.world.step(built.api.decode(input)),recording=recorder.step(input,event);
  hash.update(JSON.stringify(built.world.result()));
  if(event.completed){const replay=await recording;assert(replay);hash.update(replay.payload);laps++;replayBytes+=replay.payload.length;}
 }
 const elapsedMs=performance.now()-started,used=process.cpuUsage(cpu),beforeGC=process.memoryUsage();
 global.gc?.();const afterGC=process.memoryUsage();
 return {variant:baseline?'uncached':'cached',ticks:inputs.length,laps,replayBytes,hash:hash.digest('hex'),elapsedMs,cpuMs:(used.user+used.system)/1000,
  memoryBytes:{before,beforeGC,afterGC},peakRssKiB:process.resourceUsage().maxRSS};
}
async function main(){
 if(process.argv[2]==='--child')return console.log(JSON.stringify(await measure(process.argv[3]==='uncached',process.argv[4])));
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'lpr-collision-cache-'));
 try{
  const source=createWorld({baseline:true}),inputs=[];
  for(let i=0;i<24000;i++){const input=driver(source.world);inputs.push(source.api.encode(input));source.world.step(input);}
  const file=path.join(directory,'inputs.json');fs.writeFileSync(file,JSON.stringify(inputs));
  const rounds=[];
  for(let round=0;round<3;round++){
   const pair={};
   for(const variant of round%2?['cached','uncached']:['uncached','cached']){
    const child=spawnSync(process.execPath,['--expose-gc',__filename,'--child',variant,file],{encoding:'utf8',timeout:180000,maxBuffer:1048576});
    if(child.status!==0)throw Error(child.stderr||child.error?.message||'Benchmark child failed');
    pair[variant]=JSON.parse(child.stdout);assert(pair[variant].laps>=2);
   }
   assert.equal(pair.cached.hash,pair.uncached.hash);rounds.push(pair);
  }
  const mean=(variant,key)=>rounds.reduce((sum,pair)=>sum+pair[variant][key],0)/rounds.length;
  const report={generatedAt:new Date().toISOString(),revision:source.revision,node:process.version,
   scope:'Three alternating pairs of isolated Node processes, each with 24000 identical ticks, recording and state hashing after 1200 warmup ticks. Memory includes benchmark inputs and runtime. No remote capacity or browser FPS claim.',
   cpuReductionPercent:100*(1-mean('cached','cpuMs')/mean('uncached','cpuMs')),elapsedReductionPercent:100*(1-mean('cached','elapsedMs')/mean('uncached','elapsedMs')),rounds};
  const output=path.resolve(__dirname,'../artifacts/verification');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'collision-cache-benchmark.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
