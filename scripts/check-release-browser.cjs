const assert=require('node:assert/strict'),fs=require('node:fs');
const {launchBrowser}=require('./browser.cjs');
(async()=>{
 fs.mkdirSync('artifacts/release-20261027',{recursive:true});
 const game=require('../server.js').createServer();
 await new Promise(r=>game.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await launchBrowser({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**',r=>r.fulfill({json:{results:[],messages:[],onlineCount:0}}));
  await page.goto(`http://127.0.0.1:${game.address().port}`);
  await page.locator('#release-notes-close').waitFor();
  await page.screenshot({path:'artifacts/release-20261027/release-notes-mobile.png'});
  await page.locator('#release-notes-close').click();
  await page.click('#leaderboard-practice');
  await page.fill('#leaderboard-guest-name','Release Guest');
  await page.click('#leaderboard-guest-start');
  assert(await page.locator('#settings-dialog').evaluate(d=>d.open));
  await page.click('#leaderboard-drive');
  assert(!await page.locator('#settings-dialog').evaluate(d=>d.open));
  await page.reload();
  assert(await page.locator('#release-notes-panel').isHidden(),'Seen notes stay closed on reload');
  await page.locator('#settings-dialog [data-language="en"]').click();
  await page.click('#release-notes-open');
  assert.match(await page.textContent('#release-notes-title'),/new in LPR/);
  await page.click('#release-notes-close');
  await page.addScriptTag({content:fs.readFileSync('tests/determinism-scenario.js','utf8')});
  const recorded=await page.evaluate(()=>{
   const world=window.LPRDriving.create();
   return window.LPRDeterminismScenario.verifiedLap({world,api:window.LPRDriving,math:window.LPRMath});
  });
  const local=require('../tests/determinism-scenario.js').verifiedLap(require('../verification/world.cjs').createWorld());
  assert.deepEqual(recorded,local,'Browser and server reproduce every recorded physics bit');
  assert.deepEqual(errors,[]);
  fs.writeFileSync('artifacts/release-20261027/browser-determinism.json',JSON.stringify({browser:browser.version(),recorded},null,2));
  console.log('PASS: first-visit notes, seen state, guest lobby, explicit Drive, localization and browser/server determinism',JSON.stringify(recorded));
 }finally{await browser?.close();game.closeAllConnections();await new Promise(r=>game.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
