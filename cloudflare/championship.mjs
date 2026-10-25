// Daily competition is separate from the all-time lap leaderboard. No browser scores.
export const championshipSchema=[
 `CREATE TABLE IF NOT EXISTS championship_laps (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,day TEXT NOT NULL,player_hash TEXT NOT NULL,
 revision TEXT NOT NULL,lap_ticks INTEGER NOT NULL,PRIMARY KEY(session_id,lap))`,
 'CREATE INDEX IF NOT EXISTS championship_days ON championship_laps(day,player_hash,lap_ticks)',
 'CREATE INDEX IF NOT EXISTS championship_player_days ON championship_laps(player_hash,day)',
 `CREATE TRIGGER IF NOT EXISTS championship_delete_lap AFTER DELETE ON verified_laps BEGIN
 DELETE FROM championship_laps WHERE session_id=OLD.session_id AND lap=OLD.lap; END`,
 `CREATE TRIGGER IF NOT EXISTS championship_delete_account AFTER DELETE ON verified_accounts BEGIN
 DELETE FROM championship_laps WHERE player_hash=OLD.player_hash; END`
];
const helsinki=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'});
export const competitionDay=ms=>helsinki.format(new Date(ms));
export const shiftDay=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function dayStart(day){
 const utc=Date.parse(day+'T00:00:00Z');
 // Resolve Helsinki midnight through the actual IANA time zone (including DST).
 for(const hours of [2,3]){const candidate=utc-hours*3600000;
  if(competitionDay(candidate)===day&&competitionDay(candidate-1)!==day)return candidate;
 }
 throw Error('Invalid competition day');
}
export const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export const scoring={speed:[25,18,15,12,10,8,6,4,2,1],volume:[10,8,6,5,4,3,2,1],participation:5,milestones:[5,15,30],milestonePoints:2,streakCap:7};
export const GRACE_MS=0;
export function championshipEntry(db,lap,now){
 const day=competitionDay(lap.issuedAt);
 // Old offline receipts still enter the all-time list; daily results settle at midnight.
 if(now>=dayStart(shiftDay(day,1))+GRACE_MS)return null;
 return db.prepare(`INSERT OR IGNORE INTO championship_laps(session_id,lap,day,player_hash,revision,lap_ticks)
 SELECT session_id,lap,?,player_hash,revision,lap_ticks FROM verified_laps
 WHERE session_id=? AND lap=? AND issued_ms=? AND player_hash=? AND revision=? AND lap_ticks=? AND CAST(strftime('%s','now') AS INTEGER)*1000<?`)
 .bind(day,lap.sessionId,lap.lap,lap.issuedAt,lap.playerHash,lap.revision,lap.lapTicks,dayStart(shiftDay(day,1)));
}
export function scoreDays(rows,from,to){
 const byDay=new Map(),streaks=new Map();
 for(const row of rows){if(!byDay.has(row.day))byDay.set(row.day,[]);byDay.get(row.day).push({...row});}
 const results=new Map();
 for(const day of [...byDay.keys()].sort()){
  const players=byDay.get(day);
  for(const p of players){const previous=streaks.get(p.player_hash);
   p.streak=previous?.day===shiftDay(day,-1)?previous.streak+1:1;
   streaks.set(p.player_hash,{day,streak:p.streak});
   p.speedRank=1+players.filter(other=>other.best_ticks<p.best_ticks).length;
   p.volumeRank=1+players.filter(other=>other.laps>p.laps).length;
   p.breakdown={speed:scoring.speed[p.speedRank-1]||0,volume:scoring.volume[p.volumeRank-1]||0,
    participation:scoring.participation,milestones:scoring.milestones.filter(n=>p.laps>=n).length*scoring.milestonePoints,streak:Math.min(p.streak,scoring.streakCap)};
   p.points=Object.values(p.breakdown).reduce((a,b)=>a+b,0);
  }
  if(day>=from&&day<=to)results.set(day,players);
 }
 return results;
}
export async function championship(db,url,now,playerHash){
 const today=competitionDay(now),day=url.searchParams.get('day')||today;
 if(!validDay(day)||day>today||day<'2026-01-01')throw Object.assign(Error('Invalid competition day'),{status:400});
 const month=day.slice(0,7),from=month+'-01',monthEnd=shiftDay(new Date(Date.UTC(Number(day.slice(0,4)),Number(day.slice(5,7)),1)).toISOString().slice(0,10),-1);
 const to=monthEnd<today?monthEnd:today;
 // Six preceding days suffice for a bonus capped at seven; no full-history scan per refresh.
 const {results:rows}=await db.prepare(`SELECT c.day,c.player_hash,a.nickname,COUNT(*) laps,MIN(c.lap_ticks) best_ticks
 FROM championship_laps c JOIN verified_accounts a ON a.player_hash=c.player_hash
 WHERE c.day>=? AND c.day<=? GROUP BY c.day,c.player_hash,a.nickname ORDER BY c.day,c.player_hash`).bind(shiftDay(from,-6),to).all();
 const scored=scoreDays(rows,from,to),daily=scored.get(day)||[],totals=new Map();
 const publicRow=p=>({nickname:p.nickname,laps:p.laps,bestMs:p.best_ticks*1000/120,speedRank:p.speedRank,volumeRank:p.volumeRank,points:p.points,breakdown:p.breakdown});
 const finalDay=d=>now>=dayStart(shiftDay(d,1))+GRACE_MS;
 for(const [d,players] of scored)if(finalDay(d))for(const p of players){
  const total=totals.get(p.player_hash)||{nickname:p.nickname,points:0,days:0,wins:0};
  total.points+=p.points;total.days++;if(p.speedRank===1)total.wins++;totals.set(p.player_hash,total);
 }
 const monthly=[...totals.values()].sort((a,b)=>b.points-a.points||a.nickname.localeCompare(b.nickname));
 let me=null;
 if(playerHash){
  const dates=await db.prepare('SELECT day,COUNT(*) laps FROM championship_laps WHERE player_hash=? AND day<=? GROUP BY day ORDER BY day DESC').bind(playerHash,today).all();
  const days=dates.results.map(r=>r.day);let streak=0,bestStreak=0,run=0,previous=null;
  for(const d of days){run=previous&&d===shiftDay(previous,-1)?run+1:1;bestStreak=Math.max(bestStreak,run);previous=d;}
  if(days[0]===today||days[0]===shiftDay(today,-1)){
   streak=1;for(let i=1;i<days.length&&days[i]===shiftDay(days[i-1],-1);i++)streak++;
  }
  const own=daily.find(p=>p.player_hash===playerHash);
  me={streak,bestStreak,activeToday:days[0]===today,todayLaps:dates.results.find(r=>r.day===today)?.laps||0,selectedDay:own?publicRow(own):null,monthly:totals.get(playerHash)||null};
 }
 return {day,today,month,timeZone:'Europe/Helsinki',serverNow:now,endsAt:dayStart(shiftDay(day,1)),finalizesAt:dayStart(shiftDay(day,1))+GRACE_MS,
 final:finalDay(day),scoring,fastest:[...daily].sort((a,b)=>a.speedRank-b.speedRank||a.nickname.localeCompare(b.nickname)).slice(0,10).map(publicRow),
 mostLaps:[...daily].sort((a,b)=>a.volumeRank-b.volumeRank||a.nickname.localeCompare(b.nickname)).slice(0,10).map(publicRow),
 monthly:monthly.slice(0,20).map(p=>({...p,rank:1+monthly.filter(other=>other.points>p.points).length})),me};
}
