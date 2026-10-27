(() => {
 'use strict';
 const panel=document.querySelector('#chat-panel'),button=document.querySelector('#chat-restore');
 const activeButton=()=>button;
 const form=document.querySelector('#chat-form'),input=document.querySelector('#chat-input');
 const list=document.querySelector('#chat-messages'),status=document.querySelector('#chat-status');
 const send=form.querySelector('button');
 const visibility=document.querySelector('#chat-visible');
 const visibilityKey='lpr-chat-visible';
 const dialog=document.querySelector('#settings-dialog');
 // A modal makes its siblings inert. Keep chat inside the active modal so it
 // remains readable and interactive, then return it to the page for driving.
 function placePanel(){
  const parent=dialog.open?dialog:document.body;
  if(panel.parentElement!==parent)parent.append(panel);
  if(button.parentElement!==parent)parent.append(button);
 }
 new MutationObserver(placePanel).observe(dialog,{attributes:true,attributeFilter:['open']});
 placePanel();
 const t=text=>window.LPRI18n?.t(text)??text;
 const endpoint=window.LPRVerificationConfig.service+'/api/chat';
 const onlineCount=document.querySelector('#chat-online-count');
 let visitor=crypto.randomUUID(),presenceTimer=null,presenceLoading=false;
 try{
  const saved=localStorage.getItem('lpr-chat-visitor');
  if(/^[a-f0-9-]{36}$/.test(saved))visitor=saved;
  else localStorage.setItem('lpr-chat-visitor',visitor);
 }catch{}
 // Count active browsers, including guests and drivers who have closed chat.
 // A shared browser ID avoids counting multiple tabs as multiple people.
 async function heartbeat(){
  clearTimeout(presenceTimer);
  if(document.hidden||presenceLoading)return;
  presenceLoading=true;
  try{
   const response=await fetch(endpoint+'/presence?visitor='+encodeURIComponent(visitor),{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Presence unavailable');
   const data=await response.json();
   if(!Number.isSafeInteger(data.onlineCount)||data.onlineCount<0)throw Error('Invalid presence');
   onlineCount.textContent=String(data.onlineCount);
  }catch{onlineCount.textContent='—';}
  finally{presenceLoading=false;if(!document.hidden)presenceTimer=setTimeout(heartbeat,15000);}
 }
 document.addEventListener('visibilitychange',()=>{clearTimeout(presenceTimer);if(!document.hidden)void heartbeat();});
 window.addEventListener('online',()=>void heartbeat());
 void heartbeat();
 let timer=null,loading=false,sending=false,ticket=null;
 function typing(){return panel.contains(document.activeElement)&&!panel.hidden;}
 const identity=()=>window.LPRLeaderboard?.chatIdentity;
 const signedOut='Valitse nimimerkki tai kirjaudu sisään lähettääksesi viestejä.';
 function identityChanged(){
  ticket=null;
  if(!sending)status.textContent=t(identity()?'Yhteys kunnossa':signedOut);
 }
 window.LPRChat={get typing(){return typing();},identityChanged};
 function controls(){window.dispatchEvent(new Event('lpr-chat-focus'));}
 panel.addEventListener('focusin',controls);
 // Keep typing, cursor movement and spaces away from every game keyboard handler.
 for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>{
  event.stopPropagation();
  if(type==='keydown'&&event.key==='Escape'){event.preventDefault();close();}
 });
 function setVisible(visible,{save=true}={}){
  const hadFocus=panel.contains(document.activeElement);
  panel.hidden=!visible;visibility.checked=visible;
  document.body.classList.toggle('chat-open',visible);
  button.hidden=visible;
  button.setAttribute('aria-expanded',String(visible));
  if(save)try{localStorage.setItem(visibilityKey,String(visible));}catch{}
  clearTimeout(timer);
  if(hadFocus){controls();if(!visible)activeButton().focus();}
  // Reading the chat leaves the driving controls available; focus only when composing.
  if(visible)void refresh();
 }
 function close(){setVisible(false);activeButton().focus();}
 document.querySelector('#chat-close').addEventListener('click',close);
 button.addEventListener('click',()=>{button.blur();setVisible(true);});
 visibility.addEventListener('change',()=>setVisible(visibility.checked));
 async function request(options){
  const response=await fetch(endpoint,{...options,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Object.assign(Error('Chat HTTP '+response.status),{status:response.status});
  return response.json();
 }
 // The account service signs account and guest nicknames into short-lived tickets.
 async function chatTicket(identity,renew){
  const key=identity.guest?'guest:'+identity.nickname:identity.token;
  if(!renew&&ticket?.key===key&&ticket.expires-Date.now()>30000)return ticket.value;
  ticket=null;
  const guest=identity.guest===true;
  const response=await fetch(window.LPRVerificationConfig.leaderboard+(guest?'/api/verified/guest-chat-ticket':'/api/verified/chat-ticket'),{
   method:'POST',headers:guest?{'Content-Type':'application/json'}:{Authorization:'Bearer '+identity.token},
   ...(guest?{body:JSON.stringify({nickname:identity.nickname})}:{}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Object.assign(Error('Chat ticket HTTP '+response.status),{status:response.status,signIn:!guest&&response.status===401});
  const data=await response.json();
  if(typeof data?.ticket!=='string'||!Number.isSafeInteger(data.expiresInMs))throw Error('Invalid chat ticket');
  ticket={key,value:data.ticket,expires:Date.now()+data.expiresInMs};
  return ticket.value;
 }
 async function post(identity,text){
  const attempt=async renew=>request({method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await chatTicket(identity,renew)},body:JSON.stringify({text})});
  try{return await attempt(false);}
  catch(error){if(error.status!==401||error.signIn)throw error;return attempt(true);}
 }
 function render(messages){
  const nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<45;
  const previous=list.lastElementChild?.dataset.id;
  const rows=messages.slice(-100);
  if(rows.at(-1)?.id===previous&&list.children.length===rows.length)return;
  const fragment=document.createDocumentFragment();
  for(const message of rows){
   const row=document.createElement('li');row.dataset.id=message.id;
   const name=document.createElement('strong');name.textContent=message.nickname;
   const time=document.createElement('time');time.dateTime=new Date(message.at).toISOString();
   time.textContent=new Date(message.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
   const text=document.createElement('p');text.textContent=message.text;
   row.append(name,time,text);fragment.append(row);
  }
  list.replaceChildren(fragment);if(nearBottom)list.scrollTop=list.scrollHeight;
 }
 function schedule(){clearTimeout(timer);if(!panel.hidden&&!document.hidden)timer=setTimeout(refresh,3000);}
 async function refresh(){
  if(loading||panel.hidden||document.hidden)return;
  loading=true;
  try{
   const data=await request();if(!Array.isArray(data.messages))throw Error('Invalid chat');
   render(data.messages);
   if(!sending)status.textContent=t(identity()?'Yhteys kunnossa':signedOut);
  }catch{if(!sending)status.textContent=t('Chat ei saa yhteyttä. Yritetään uudelleen…');}
  finally{loading=false;schedule();}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;
  const login=identity(),text=input.value.trim();
  if(!login){status.textContent=t(signedOut);return;}
  if(!text)return;
  sending=true;send.disabled=true;status.textContent=t('Lähetetään…');
  try{
   await post(login,text);
   if(input.value.trim()===text)input.value='';
   status.textContent=t('Viesti lähetetty');void refresh();
  }catch(error){status.textContent=t(error.signIn?'Kirjaudu uudelleen ennen lähettämistä.':error.status===409?'Tämä nimimerkki kuuluu rekisteröityneelle käyttäjälle. Valitse vierailijalle toinen nimimerkki.':error.status===429?'Liikaa viestejä. Odota minuutti.':'Viestiä ei lähetetty. Yritä uudelleen.');}
  finally{sending=false;send.disabled=false;}
 });
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)void refresh();});
 window.addEventListener('online',()=>void refresh());
 let savedVisibility=true;
 try{savedVisibility=localStorage.getItem(visibilityKey)!=='false';}catch{}
 setVisible(savedVisibility,{save:false});
})();
