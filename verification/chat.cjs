const {createHash,randomUUID}=require('node:crypto');
const digest=value=>createHash('sha256').update(value).digest('hex');
const TICKET_MAX_MS=15*60*1000;
const validName=value=>typeof value==='string'&&/^[\p{L}\p{N} _.-]{1,24}$/u.test(value);
// One shared room per server process. No database or driving-session capacity required.
// post() receives the payload of a chat ticket whose signature the caller has already verified.
function createChat({now=Date.now,protocol='driving-v1'}={}) {
 const messages=[],limits=new Map(),visitors=new Map();
 const retention=24*60*60*1000;
 function clean() {
  const time=now();
  while(messages.length && messages[0].at<=time-retention)messages.shift();
  for(const [key,item]of limits)if(item.expires<=time)limits.delete(key);
  for(const [key,expires]of visitors)if(expires<=time)visitors.delete(key);
 }
 function consume(key,max) {
  let item=limits.get(key);
  if(!item){if(limits.size>=4096)throw fail(429,'Chat busy');item={count:0,expires:now()+60000};limits.set(key,item);}
  if(++item.count>max)throw fail(429,'Too many messages');
 }
 return {
  presence(visitor){
   clean();
   if(typeof visitor!=='string'||!/^[a-f0-9-]{36}$/.test(visitor))throw fail(400,'Invalid visitor');
   if(!visitors.has(visitor)&&visitors.size>=10000)throw fail(429,'Presence busy');
   visitors.set(visitor,now()+45000);
   return {onlineCount:visitors.size};
  },
  list(){clean();return {messages:messages.map(({owner,...message})=>message)};},
  post(identity,ip,data){
   clean();
   const time=now();
   // The nickname always comes from a signed ticket, never from the chat request body.
   const guest=identity?.kind==='guest-chat';
   if(!['chat','guest-chat'].includes(identity?.kind)||identity.protocol!==protocol||typeof identity.playerHash!=='string'||!/^[a-f0-9]{64}$/.test(identity.playerHash)||
    !validName(identity.nickname)||!Number.isSafeInteger(identity.issuedAt)||!Number.isSafeInteger(identity.expiresAt)||
    identity.issuedAt>time+5000||identity.expiresAt<=time||identity.expiresAt-identity.issuedAt>TICKET_MAX_MS)throw fail(401,'Sign in required');
   const nickname=guest?`${identity.nickname} (vierailija)`:identity.nickname;
   const text=typeof data?.text==='string'?data.text.trim().normalize('NFC'):'';
   if(!text||text.length>280||/[\p{Cc}\p{Cf}]/u.test(text))throw fail(400,'Invalid message');
   const owner=identity.playerHash;
   consume('ip:'+digest(ip),30);consume('player:'+owner,6);
   const message={id:randomUUID(),nickname,text,at:time,owner};
   messages.push(message);if(messages.length>100)messages.shift();
   const {owner:_,...publicMessage}=message;
   return {message:publicMessage};
  },
  discard(id){const index=messages.findIndex(message=>message.id===id);if(index>=0)messages.splice(index,1);}
 };
}
function fail(status,message){return Object.assign(Error(message),{status});}
module.exports={createChat};
