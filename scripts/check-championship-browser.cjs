const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const {revision}=require('../verification/world.cjs'),{competitionDay,shiftDay}=await import('../cloudflare/championship.mjs');
 const game=require('../server.js').createServer();
 await new Promise(r=>game.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${game.address().port}`;
 const board=await require('../verification/local-leaderboard.cjs').createLocalLeaderboard({secret:'browser-championship-test-'.repeat(3),revision,origins:origin});
 await new Promise(r=>board.listen(0,'127.0.0.1',r));
 const api=`http://127.0.0.1:${board.address().port}`;
 let browser;
 try{
  const today=competitionDay(Date.now()),yesterday=shiftDay(today,-1);
  for(const [i,name] of ['Panu','Eve','Driver with long name'].entries()){
   board.db.prepare('INSERT INTO verified_accounts VALUES (?,?,?,?,?,?,?,?)').run(name.toLowerCase(),name,String(i),'x','x','x',10000,Date.now());
   for(let lap=1;lap<=i+1;lap++)board.db.prepare('INSERT INTO championship_laps VALUES (?,?,?,?,?,?)').run('session'+i,lap,today,String(i),revision,5000+i*100);
   board.db.prepare('INSERT INTO championship_laps VALUES (?,?,?,?,?,?)').run('previous'+i,1,yesterday,String(i),revision,6000+i*100);
  }
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{channel:'chrome'}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/verification/config.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.LPRVerificationConfig={leaderboard:${JSON.stringify(api)},service:''};`}));
  await page.route(api+'/**',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'Access-Control-Allow-Origin':origin}});});
  await page.goto(origin);
  await page.waitForFunction(()=>document.querySelector('#championship-fastest li')?.textContent.includes('Panu'));
  assert.match(await page.textContent('#championship-volume li'),'Driver with long name');
  await page.locator('#championship').scrollIntoViewIfNeeded();
  const dir=path.resolve(__dirname,'../artifacts/verification');fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'championship-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.locator('#championship').scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>{const panel=document.querySelector('#championship');return panel.scrollWidth<=panel.clientWidth+1;}),'Mobile championship does not overflow');
  await page.screenshot({path:path.join(dir,'championship-mobile.png')});
  await page.locator('#championship-day').fill(yesterday);await page.locator('#championship-day').dispatchEvent('change');
  await page.waitForFunction(()=>document.querySelector('#championship-clock').textContent==='Tulokset vahvistettu');
  await page.click('#championship-today');await page.waitForFunction(day=>document.querySelector('#championship-day').value===day,today);
  await page.evaluate(()=>window.LPRI18n.setLanguage('en'));
  assert.equal(await page.textContent('#championship-title'),'Daily race');
  await page.waitForFunction(()=>document.querySelector('#championship-personal').textContent.includes('Sign in'));
  assert.deepEqual(errors,[]);
  console.log('PASS: real daily API in desktop/mobile Chromium, rankings, date selection, today shortcut, localization and no script errors');
 }finally{await browser?.close();await new Promise(r=>{board.close(r);board.closeAllConnections();});await new Promise(r=>{game.close(r);game.closeAllConnections();});}
})().catch(e=>{console.error(e);process.exitCode=1;});
