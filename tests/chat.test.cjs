const assert=require('node:assert/strict');
const {createChat}=require('../verification/chat.cjs');
const token='a'.repeat(64);
let time=0;
const chat=createChat({now:()=>time});
const post=(text='Moi',nickname='Kuljettaja')=>chat.post(token,'local',{nickname,text});
assert.deepEqual(chat.list(),{messages:[]});
assert.throws(()=>chat.post('', 'local',{nickname:'Test',text:'Moi'}),{status:401});
for(const text of ['', ' '.repeat(10), 'x'.repeat(281),'a\nb','a\u202Eb'])assert.throws(()=>post(text),{status:400});
assert.throws(()=>post('Moi','<script>'),{status:400});
post('<img src=x onerror=alert(1)>');
assert.equal(chat.list().messages[0].text,'<img src=x onerror=alert(1)>','Messages are plain data, rendered as text by the client');
assert(!JSON.stringify(chat.list()).includes(token));
assert(!('owner' in chat.list().messages[0]));
for(let i=1;i<6;i++)post();
assert.throws(()=>post(),{status:429});
time+=60000;post('Again');
for(let i=0;i<110;i++){time+=60000;post('message '+i);}
assert.equal(chat.list().messages.length,100);
time+=86400000;assert.equal(chat.list().messages.length,0);
const shared=createChat();
for(let i=0;i<30;i++)shared.post(i.toString(16).padStart(64,'0'),'shared',{nickname:'Player',text:'Hi'});
assert.throws(()=>shared.post('f'.repeat(64),'shared',{nickname:'Player',text:'Hi'}),{status:429},'IP limit also applies when player tokens rotate');
(async()=>{
 const server=await require('../verification/server.cjs').createServer({secret:'test-secret-'.repeat(4),origins:['https://game.test']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/chat`;
 const send=(data,credential=token,origin='https://game.test')=>fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+credential},body:JSON.stringify(data)});
 try{
  const response=await send({nickname:'Pelaaja',text:'Terve varikko!'});
  assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://game.test');
  const other=await fetch(url);const data=await other.json();
  assert.equal(data.messages.length,1);assert.equal(data.messages[0].text,'Terve varikko!','Another client sees shared messages');
  assert.equal((await send({nickname:'Pelaaja',text:'No'},token,'https://evil.test')).status,403);
  assert.equal((await send({nickname:'Pelaaja',text:'No'},'bad')).status,401);
  assert.equal((await send({nickname:'Pelaaja',text:'x'.repeat(3000)})).status,413);
  assert.equal((await fetch(url,{method:'DELETE'})).status,405);
  assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://game.test'}})).status,204);
  for(let i=1;i<6;i++)assert.equal((await send({nickname:'Pelaaja',text:'Moi'})).status,201);
  assert.equal((await send({nickname:'Pelaaja',text:'Liikaa'})).status,429);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 console.log('Chat: shared messages, validation, rate limits, expiry and HTTP routes OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
