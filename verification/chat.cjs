const {createHash,randomUUID}=require('node:crypto');
const digest=value=>createHash('sha256').update(value).digest('hex');
// One shared room per server process. No database or driving-session capacity required.
function createChat({now=Date.now}={}) {
 const messages=[],limits=new Map();
 const retention=24*60*60*1000;
 function clean() {
  const time=now();
  while(messages.length && messages[0].at<=time-retention)messages.shift();
  for(const [key,item]of limits)if(item.expires<=time)limits.delete(key);
 }
 function consume(key,max) {
  let item=limits.get(key);
  if(!item){if(limits.size>=4096)throw fail(429,'Chat busy');item={count:0,expires:now()+60000};limits.set(key,item);}
  if(++item.count>max)throw fail(429,'Too many messages');
 }
 return {
  list(){clean();return {messages:messages.map(({owner,...message})=>message)};},
  post(token,ip,data){
   clean();
   if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw fail(401,'Player credential required');
   const nickname=typeof data?.nickname==='string'?data.nickname.trim().normalize('NFC'):'';
   const text=typeof data?.text==='string'?data.text.trim().normalize('NFC'):'';
   if(!/^[\p{L}\p{N} _.-]{1,24}$/u.test(nickname)||!text||text.length>280||/[\p{Cc}\p{Cf}]/u.test(text))throw fail(400,'Invalid message');
   const owner=digest(token);
   consume('ip:'+digest(ip),30);consume('player:'+owner,6);
   const message={id:randomUUID(),nickname,text,at:now(),owner};
   messages.push(message);if(messages.length>100)messages.shift();
   const {owner:_,...publicMessage}=message;
   return {message:publicMessage};
  }
 };
}
function fail(status,message){return Object.assign(Error(message),{status});}
module.exports={createChat};
