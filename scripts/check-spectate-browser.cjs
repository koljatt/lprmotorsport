const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {launchBrowser}=require('./browser.cjs');
const {revision}=require('../verification/world.cjs');
(async()=>{
 const browser=await launchBrowser({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ids=['a'.repeat(32),'b'.repeat(32)];let ended=false,offline=false;
  const {world}=require('../verification/world.cjs').createWorld();
  const recorder=new (require('../verification/replay.cjs').Recorder)(world,revision);
  const frame=recorder.frame();
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/spectate')){
    if(offline)return route.fulfill({status:503,json:{}});
    if(url.pathname==='/spectate')return route.fulfill({json:{results:ended?[]:ids.map((id,i)=>({id,nickname:i?'Second':'Driver'})),revision}});
    if(ended)return route.fulfill({status:410,json:{}});
    return route.fulfill({json:{format:'lpr-live-v1',sceneRevision:revision,hz:120,nickname:url.pathname.endsWith(ids[0])?'Driver':'Second',track:recorder.track,
     frames:[frame,[120,...frame.slice(1)]],inputs:[[0,1,0,0,false,false,true]]}});
   }
   if(url.pathname==='/verification/revision.js')return route.fulfill({contentType:'text/javascript',body:'window.LPRDrivingRevision='+JSON.stringify(revision)});
   if(url.pathname==='/data/track-data.js')return route.fulfill({contentType:'text/javascript',body:require('./build.cjs').dataScript()});
   const file=path.resolve(__dirname,'..','.'+url.pathname);
   if(!file.startsWith(path.resolve(__dirname,'..')+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({path:file});
  });
  await page.goto('http://127.0.0.1:8000/replay.html?live=1');
  await page.locator('#live-driver option').nth(2).waitFor({state:'attached'});
  await page.locator('#live-driver').selectOption(ids[0]);
  await page.locator('#viewer').waitFor();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Driver'));
  assert.match(await page.locator('#view-badge').textContent(),/3D/);
  assert.equal(await page.locator('#play').isDisabled(),true);
  await page.locator('#view').selectOption('map');
  assert.match(await page.locator('#view-badge').textContent(),/RATAKUVA/);
  await page.locator('#live-driver').selectOption(ids[1]);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Second'));
  offline=true;await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('katkesi'));
  offline=false;await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Second'));
  await page.setViewportSize({width:390,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile has no horizontal overflow');
  ended=true;await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('päättyi'));
  assert.equal(await page.locator('#viewer').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: live selection, 3D/map, driver switching, reconnect, ended session and mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
