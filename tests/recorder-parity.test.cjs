const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{gunzipSync}=require('node:zlib');
const {createWorld}=require('../verification/world.cjs'),{Recorder}=require('../verification/replay.cjs'),{driver}=require('./helpers-driving.cjs');
(async()=>{
 const {world,api}=createWorld(),recorder=new Recorder(world,'recorder-parity'),hashes=[];
 // Rolling-start recordings from the 200-metre launch. Hash JSON so gzip-library
 // version differences do not matter. Replay boundaries exclude the warmup.
 const expected=['e73650ab7fef4655d950e5a2cc85e5d36f1164108a1673a1488a41dde71675ec','7058abae5fd0b14eaf2de7334676b40ace793f86f7fce495b1234483d4795fcf'];
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
