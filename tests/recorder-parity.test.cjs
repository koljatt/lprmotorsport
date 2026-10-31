const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{gunzipSync}=require('node:zlib');
const {createWorld}=require('../verification/world.cjs'),{Recorder}=require('../verification/replay.cjs'),{driver}=require('./helpers-driving.cjs');
(async()=>{
 const {world,api}=createWorld(),recorder=new Recorder(world,'recorder-parity'),hashes=[];
 // Rolling-start recordings from the 200-metre launch, reference driver on a
 // direct-drive wheel rack (wheel-ffb). Hash JSON so gzip-library
 // version differences do not matter. Replay boundaries exclude the warmup.
 const expected=['7dec098815703310d01f90c730e3aa1c4dda31123b7ba8869e507777b452560d','66a7460d37503f239e6230d7bf3979aa6620138cb5903c75d90289604c53ed62'];
 for(let tick=0;tick<30000 && hashes.length<2;tick++){
  const input=driver(world),value=api.encode(input),event=world.step(input),recording=recorder.step(value,event);
  if(event.completed){
   const replay=await recording;assert(replay);assert.equal(createHash('sha256').update(replay.payload).digest('hex'),replay.hash);
   const document=JSON.parse(gunzipSync(Buffer.from(replay.payload,'base64')));
   assert.equal(document.endTick-document.startTick,event.completed.lapTicks);
   assert.equal(document.frames[0][0],document.startTick);
   assert.equal(document.frames.at(-1)[0],document.endTick);
   assert.equal(!!document.warmupInputs,hashes.length===0,'Only the first lap carries the acceleration inputs');
   hashes.push(createHash('sha256').update(gunzipSync(Buffer.from(replay.payload,'base64'))).digest('hex'));
  }else assert.equal(recording,null);
 }
 assert.deepEqual(hashes,expected);assert.equal(hashes.length,2,'Both rolling-start and flying lap recordings are exercised');
 console.log('PASS: rolling-start and flying replay snapshots, exact timing boundaries, warmup isolation and payload hashes');
})().catch(e=>{console.error(e);process.exitCode=1;});
