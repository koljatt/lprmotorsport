const fs=require('node:fs');
const directory='artifacts/verification/';
const samples=fs.readFileSync(directory+'render-capacity-metrics.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.metrics);
const summaries=[];
for(const name of ['render-capacity-2','render-capacity-4','render-capacity-2-confirmation','render-capacity-1']){
 const file=directory+name+'.json';if(!fs.existsSync(file))continue;
 const run=JSON.parse(fs.readFileSync(file));
 const data=samples.filter(x=>x.at>=run.startedAt&&Date.parse(x.at)<=Date.parse(run.finishedAt)+5000);
 const cpu=[];
 for(let i=1;i<data.length;i++){
  const a=data[i-1].metrics,b=data[i].metrics;if(a.since!==b.since||!a.activeSessions||!b.activeSessions)continue;
  const wall=b.uptimeMs-a.uptimeMs;
  if(wall>0)cpu.push(((b.cpuMicroseconds.user+b.cpuMicroseconds.system)-(a.cpuMicroseconds.user+a.cpuMicroseconds.system))/(wall*1000));
 }
 const last=data.at(-1)?.metrics;
 summaries.push({name,requestedPlayers:run.requestedPlayers,passed:run.passed,startedAt:run.startedAt,finishedAt:run.finishedAt,
  acceptedLaps:run.savedLaps?run.savedLaps.reduce((n,p)=>n+p.laps.length,0):(last?.counters.verifiedLaps??run.players.reduce((n,p)=>n+p.completedLaps.length,0)),failedPlayers:run.failures?.length||0,
  maxSuccessfulPlayerAckP95Ms:run.players.length?Math.max(...run.players.map(p=>p.ackLagP95Ms)):null,
  maxAckMs:Math.max(last?.timings.ackLagMs?.maxMs||0,...run.players.map(p=>p.maxAckLagMs)),
  metricSampleCount:data.length,peakRssMiB:data.length?Math.max(...data.map(x=>x.metrics.memoryBytes.rss))/1048576:null,
  averageCpuCores:cpu.length?cpu.reduce((a,b)=>a+b,0)/cpu.length:null,peakSampleCpuCores:cpu.length?Math.max(...cpu):null,
  finalCounters:last?.counters,finalTimings:last?.timings});
}
const report={generatedAt:new Date().toISOString(),summaries};
fs.writeFileSync(directory+'render-capacity-summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
