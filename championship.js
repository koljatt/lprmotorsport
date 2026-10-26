(() => {
 'use strict';
 const panel=document.querySelector('#championship');if(!panel)return;
 const $=id=>document.querySelector('#championship-'+id);
 const date=$('day'),notice=$('notice'),personal=$('personal'),clock=$('clock');
 const t=(fi,en)=>document.documentElement.lang==='en'?en:fi;
 let data=null,requestId=0,selected='',busy=false,boundaryTimer=null,series='human';
 const seriesTabs=[['human','#championship-series-human'],['bot','#championship-series-bot']];
 for(const [value,selector] of seriesTabs)document.querySelector(selector).addEventListener('click',()=>{
  series=value;for(const [option,tab]of seriesTabs)document.querySelector(tab).setAttribute('aria-pressed',String(option===value));void refresh();
 });
 const seconds=ms=>(ms/1000).toFixed(3)+' s';
 function table(id,rows,kind){
  const body=$(id);body.replaceChildren();
  if(!rows.length){const p=document.createElement('p');p.textContent=t('Ei vielä tuloksia.','No results yet.');body.append(p);return;}
  const list=document.createElement('ol');
  for(const row of rows){const item=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');
   const rank=kind==='speed'?row.speedRank:kind==='volume'?row.volumeRank:row.rank;
   name.textContent=rank+'. '+row.nickname;name.className='standing-name';
   value.textContent=kind==='speed'?seconds(row.bestMs):kind==='volume'?row.laps+' '+t('kierrosta','laps'):row.points+' p';
   item.append(name,value);list.append(item);
  }body.append(list);
 }
 function countdown(){
  if(!data)return;
  const remaining=Math.max(0,data.endsAt-(Date.now()+data.serverNow-data.receivedAt));
  if(data.final)clock.textContent=t('Tulokset vahvistettu','Results final');
  else if(!remaining)clock.textContent=t('Tulokset vahvistetaan','Finalizing results');
  else {const minutes=Math.ceil(remaining/60000);clock.textContent=t('Aikaa jäljellä: ','Time left: ')+Math.floor(minutes/60)+' h '+minutes%60+' min';}
 }
 function render(){
  if(!data)return;
  date.max=data.today;date.value=data.day;
  table('fastest',data.fastest,'speed');table('volume',data.mostLaps,'volume');table('monthly',data.monthly,'points');
  $('month').textContent=data.month+' · '+t('Vahvistettujen päivien pisteet','Points from finalized days');
  if(data.me){const me=data.me;
   personal.textContent=`🔥 ${t('Ajoputki','Streak')}: ${me.streak} ${t('päivää','days')} · ${t('Pisin','Longest')}: ${me.bestStreak} · ${t('Tänään','Today')}: ${me.todayLaps} ${t('kierrosta','laps')}`;
   if(me.selectedDay){const p=me.selectedDay,b=p.breakdown;
    personal.textContent+=`\n${t('Valitun päivän pisteet','Selected day points')}: ${p.points} (${t('nopeus','speed')} ${b.speed}, ${t('kierrosmäärä','volume')} ${b.volume}, ${t('osallistuminen','participation')} ${b.participation}, ${t('rajapyykit','milestones')} ${b.milestones}, streak ${b.streak})`;
   }
   if(!me.activeToday)personal.textContent+='\n'+t('Aja tänään yksi varmennettu kierros jatkaaksesi ajoputkea.','Complete one verified lap today to continue your streak.');
  }else personal.textContent=t('Kirjaudu ja aja varmennettu kierros kerätäksesi pisteitä ja kasvattaaksesi ajoputkea.','Sign in and complete a verified lap to earn points and build your streak.');
  countdown();
 }
 async function refresh(){
  const endpoint=window.LPRVerificationConfig?.leaderboard;if(!endpoint)return;
  const attempt=++requestId,identity=window.LPRLeaderboard?.identity;busy=true;
  try{notice.textContent=t('Ladataan päivän kisaa…','Loading daily race…');
   const response=await fetch(endpoint+'/api/verified/championship?series='+series+(selected?'&day='+encodeURIComponent(selected):''),{
    headers:identity?{Authorization:'Bearer '+identity.token}:{},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();const result=await response.json();
   if(attempt!==requestId)return;
   data={...result,receivedAt:Date.now()};notice.textContent='';render();
   clearTimeout(boundaryTimer);
   if(!data.final)boundaryTimer=setTimeout(()=>void refresh(),Math.max(50,data.endsAt-data.serverNow+50));
  }catch{if(attempt===requestId)notice.textContent=t('Päivän kisa ei ole juuri nyt saatavilla. Yritä Päivitä-painikkeella uudelleen.','Daily race is unavailable. Press Refresh to retry.');}
  finally{if(attempt===requestId)busy=false;}
 }
 date.addEventListener('change',()=>{if(date.validity.valid&&date.value){selected=date.value;void refresh();}});
 $('refresh').addEventListener('click',()=>void refresh());
 $('today').addEventListener('click',()=>{selected='';void refresh();});
 document.addEventListener('lpr-lap-saved',()=>void refresh());
 document.querySelector('#leaderboard-start-form').addEventListener('submit',()=>setTimeout(()=>void refresh(),0));
 // Accounts can change asynchronously without submitting the start form again.
 let identityKey='';
 setInterval(()=>{
  if(document.hidden||!document.querySelector('#settings-dialog').open)return;
  const next=window.LPRLeaderboard?.identity?.nickname||'';
  if(next!==identityKey){identityKey=next;void refresh();}
  countdown();
 },1000);
 setInterval(()=>{if(!busy&&!document.hidden&&document.querySelector('#settings-dialog').open)void refresh();},30000);
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 void refresh();
})();
