const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const secret='chat-browser-test-'.repeat(4),{revision}=require('../verification/world.cjs');
 const game=require('../server.js').createServer();
 await new Promise(resolve=>game.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${game.address().port}`;
 const service=await require('../verification/server.cjs').createServer({secret,origins:[origin]});
 await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
 const serviceURL=`http://127.0.0.1:${service.address().port}`;
 const board=await require('../verification/local-leaderboard.cjs').createLocalLeaderboard({secret,revision,origins:origin});
 await new Promise(resolve=>board.listen(0,'127.0.0.1',resolve));
 const boardURL=`http://127.0.0.1:${board.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const errors=[];
  async function player(name){
   const context=await browser.newContext({viewport:{width:1280,height:800}});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await page.route('**/verification/config.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.LPRVerificationConfig=${JSON.stringify({service:serviceURL,leaderboard:boardURL})};`}));
   await page.route('https://lpr-leaderboard.panu-musakka.workers.dev/**',route=>route.fulfill({contentType:'application/json',body:'{}'}));
   await page.route('**/game.js?*',route=>{
    const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replaceAll('\r\n','\n').replace('  reset();\n  openTestScene','  window.__chatGame={held,readInput};\n  reset();\n  openTestScene');
    return route.fulfill({contentType:'text/javascript',body:source});
   });
   await page.goto(origin);await page.waitForFunction(()=>window.__chatGame,null,{polling:50});
   await page.locator('#leaderboard-name').fill(name);await page.locator('#leaderboard-password').fill('chat-browser-password');await page.locator('#leaderboard-start').click();
   await page.waitForFunction(()=>document.querySelector('#leaderboard-start-label').textContent==='Varaa nimimerkki',null,{polling:50}).catch(async error=>{console.error({status:await page.textContent('#leaderboard-status'),label:await page.textContent('#leaderboard-start-label'),config:await page.evaluate(()=>window.LPRVerificationConfig),errors});throw error;});
   await page.locator('#leaderboard-start').click();await page.waitForFunction(()=>!window.LPRLeaderboard.requiresName,null,{polling:50}).catch(async error=>{console.error({status:await page.textContent('#leaderboard-status'),label:await page.textContent('#leaderboard-start-label'),errors});throw error;});
   await page.locator('#chat-button').click();return page;
  }
  const first=await player('Kuljettaja'),second=await player('Varikko');
  await first.locator('#chat-input').fill('wasd E P B T <img src=x onerror=alert(1)>');
  await first.locator('#chat-input').press('w');
  assert.equal(await first.evaluate(()=>window.__chatGame.held.gas),false);
  assert.equal(await first.evaluate(()=>window.__chatGame.readInput().gas),0);
  await first.locator('#chat-input').press('Enter');
  await second.waitForFunction(()=>document.querySelector('#chat-messages').textContent.includes('wasd E P B T'),null,{timeout:15000,polling:50});
  assert.equal(await second.locator('#chat-messages img').count(),0,'HTML is shown as text');
  await second.locator('#chat-input').fill('Viesti vastaanotettu!');await second.locator('#chat-input').press('Enter');
  await first.waitForFunction(()=>document.querySelector('#chat-messages').textContent.includes('Viesti vastaanotettu!'),null,{timeout:15000,polling:50});
  await first.evaluate(()=>window.LPRI18n.setLanguage('en'));
  assert.equal(await first.locator('#chat-title').textContent(),'Paddock chat');
  assert((await first.locator('#chat-messages').textContent()).includes('Viesti vastaanotettu!'));
  await first.locator('#chat-input').press('Escape');assert(await first.locator('#chat-panel').isHidden());
  await first.locator('#chat-button').blur();await first.keyboard.down('w');
  assert.equal(await first.evaluate(()=>window.__chatGame.held.gas),true,'Driving controls work after leaving chat');
  await first.keyboard.up('w');
  await first.locator('#chat-button').click();
  assert.equal(await first.evaluate(()=>window.LPRChat.typing),false,'Opening chat for reading does not focus its input');
  await first.keyboard.down('w');
  assert.equal(await first.evaluate(()=>window.__chatGame.readInput().gas),1,'Driver can read visible chat while driving');
  await first.keyboard.up('w');
  const directory=path.join(__dirname,'../artifacts/chat');fs.mkdirSync(directory,{recursive:true});
  await first.screenshot({path:path.join(directory,'desktop.png')});
  await first.setViewportSize({width:360,height:800});
  const dimensions=await first.locator('#chat-panel').boundingBox();assert(dimensions.x>=0&&dimensions.x+dimensions.width<=360);
  assert.equal(await first.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile has no horizontal overflow');
  await first.screenshot({path:path.join(directory,'mobile.png')});
  await first.reload();await first.waitForFunction(()=>window.__chatGame,null,{polling:50});
  assert(await first.locator('#chat-visible').isChecked(),'Show-chat setting remembers opening the chat');
  assert(await first.locator('#chat-panel').isVisible(),'Visible chat is restored after reload');
  assert.equal(await first.evaluate(()=>window.LPRChat.typing),false);
  await first.locator('#chat-visible').uncheck();
  assert(await first.locator('#chat-panel').isHidden(),'Driver can hide chat from the settings');
  await first.reload();await first.waitForFunction(()=>window.__chatGame,null,{polling:50});
  assert.equal(await first.locator('#chat-visible').isChecked(),false);
  assert(await first.locator('#chat-panel').isHidden(),'Hidden chat stays hidden after reload');
  assert.deepEqual(errors,[]);console.log('Chat browser: two players, safe text, driving while reading, remembered visibility, language and mobile layout OK');
 }finally{
  await browser?.close();
  service.closeAllConnections();game.closeAllConnections();board.closeAllConnections();
  await Promise.all([new Promise(resolve=>board.close(resolve)),new Promise(resolve=>service.close(resolve)),new Promise(resolve=>game.close(resolve))]);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
