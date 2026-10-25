(() => {
 'use strict';
 const panel=document.querySelector('#chat-panel'),button=document.querySelector('#chat-button');
 const form=document.querySelector('#chat-form'),input=document.querySelector('#chat-input');
 const list=document.querySelector('#chat-messages'),status=document.querySelector('#chat-status');
 const send=form.querySelector('button');
 const visibility=document.querySelector('#chat-visible');
 const visibilityKey='lpr-chat-visible';
 const t=text=>window.LPRI18n?.t(text)??text;
 const endpoint=window.LPRVerificationConfig.service+'/api/chat';
 let timer=null,loading=false,sending=false;
 function typing(){return panel.contains(document.activeElement)&&!panel.hidden;}
 window.LPRChat={get typing(){return typing();}};
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
  button.setAttribute('aria-expanded',String(visible));
  if(save)try{localStorage.setItem(visibilityKey,String(visible));}catch{}
  clearTimeout(timer);
  if(hadFocus){controls();button.focus();}
  // Reading the chat leaves the driving controls available; focus only when composing.
  if(visible)void refresh();
 }
 function close(){setVisible(false);button.focus();}
 document.querySelector('#chat-close').addEventListener('click',close);
 button.addEventListener('click',()=>setVisible(panel.hidden));
 visibility.addEventListener('change',()=>setVisible(visibility.checked));
 async function request(options){
  const response=await fetch(endpoint,{...options,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Object.assign(Error('Chat HTTP '+response.status),{status:response.status});
  return response.json();
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
   if(!sending)status.textContent=t(window.LPRLeaderboard?.identity?'Yhteys kunnossa':'Vahvista nimimerkki ennen lähettämistä.');
  }catch{if(!sending)status.textContent=t('Chat ei saa yhteyttä. Yritetään uudelleen…');}
  finally{loading=false;schedule();}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;
  const identity=window.LPRLeaderboard?.identity,text=input.value.trim();
  if(!identity){status.textContent=t('Vahvista nimimerkki ennen lähettämistä.');return;}
  if(!text)return;
  sending=true;send.disabled=true;status.textContent=t('Lähetetään…');
  try{
   await request({method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+identity.token},body:JSON.stringify({nickname:identity.nickname,text})});
   if(input.value.trim()===text)input.value='';
   status.textContent=t('Viesti lähetetty');void refresh();
  }catch(error){status.textContent=t(error.status===429?'Liikaa viestejä. Odota minuutti.':'Viestiä ei lähetetty. Yritä uudelleen.');}
  finally{sending=false;send.disabled=false;}
 });
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)void refresh();});
 window.addEventListener('online',()=>void refresh());
 let savedVisibility=false;
 try{savedVisibility=localStorage.getItem(visibilityKey)==='true';}catch{}
 setVisible(savedVisibility,{save:false});
})();
