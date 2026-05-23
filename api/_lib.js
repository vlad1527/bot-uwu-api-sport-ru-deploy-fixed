const API_BASE = 'https://api.api-sport.ru/v2';
const API_KEY = process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY || '';
const PRIME_TEAMS = ['Скорпионс', 'Биверс', 'Барракудас', 'Хаскис', 'Беарз', 'Рейвенс', 'Пираньяс', 'Октопус'];

function mskNow(){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date())}
function mskDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const y=parts.find(p=>p.type==='year').value,m=parts.find(p=>p.type==='month').value,d=parts.find(p=>p.type==='day').value;return `${y}-${m}-${d}`}
function norm(v){return String(v??'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9. ]/g,' ').replace(/\s+/g,' ').trim()}
function pick(obj,paths,f){for(const p of paths){const v=p.split('.').reduce((a,k)=>a&&a[k],obj);if(v!==undefined&&v!==null&&v!=='')return v}return f}
function toArray(data,keys=[]){if(Array.isArray(data))return data;for(const k of keys){const v=pick(data,[k]);if(Array.isArray(v))return v}return[]}
async function apiFetch(path,params={}){
 if(!API_KEY)throw Object.assign(new Error('API_SPORT_KEY не задан в Vercel Environment Variables.'),{status:500});
 const url=new URL(API_BASE+path);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});
 const r=await fetch(url,{headers:{Authorization:API_KEY,Accept:'application/json'}});
 const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={raw:text},mskNow,mskDate};
 if(!r.ok)throw Object.assign(new Error(`api-sport.ru HTTP ${r.status}: ${JSON.stringify(data).slice(0,400)}`),{status:r.status,data});
 return data
}
async function safeApiFetch(path,params={}){try{return{ok:true,data:await apiFetch(path,params)}}catch(e){return{ok:false,error:e.message,status:e.status,data:e.data}}}
async function getSports(){const data=await apiFetch('/sport');return toArray(data,['sports','data','items','response','result'])}
async function getBasketballSlugs(){const sports=await getSports();const detected=sports.filter(s=>norm([s.slug,s.name,s.title,s.translations?.ru,s.translations?.en].filter(Boolean).join(' ')).includes('basket')).map(s=>String(s.slug||s.key||s.name||s.id)).filter(Boolean);return[...new Set(['basketball','basketball3x3','basketball-3x3','basket'].concat(detected))]}
function getLeague(m){return[pick(m,['category.name','country.name','sport.name'],''),pick(m,['tournament.name','tournament.title','league.name','competition.name','leagueName'],'')].filter(Boolean).join(' ')}
function isIpbl(m){const t=norm(getLeague(m));return t.includes('ipbl')||t.includes('prime')||t.includes('pro')}
function isPrime(m){return norm(getLeague(m)).includes('prime')}
function isPro(m){return norm(getLeague(m)).includes('pro')}
function team(m,side){return pick(m,side==='home'?['homeTeam.name','home.name','teams.home.name','participants.0.name','competitors.0.name']:['awayTeam.name','away.name','teams.away.name','participants.1.name','competitors.1.name'],'')}
function targetPrime(a,b){const t=norm(a+' '+b);return PRIME_TEAMS.some(x=>t.includes(norm(x)))}
function parseNum(v){if(v===undefined||v===null||v==='')return NaN;if(typeof v==='number')return v;const m=String(v).replace(',','.').match(/-?\d+(\.\d+)?/);return m?Number(m[0]):NaN}
function source(m){return pick(m,['url','link','sourceUrl','eventUrl','matchUrl','betcityUrl'],'https://api.api-sport.ru/v2/docs/')}
function currentScore(m){return pick(m,['score','currentScore','scores.current','fullScore'],'—')}
function status(m){return pick(m,['status','phase','state','status.name'],'')}
function period(m){return pick(m,['period','quarter','currentPeriod','status.period'], 'LIVE')}
function markets(m){
 const list=[];const groups=[pick(m,['markets']),pick(m,['odds']),pick(m,['bets']),pick(m,['lines'])].filter(Array.isArray);
 for(const g of groups){for(const x of g){const raw=[x.type,x.name,x.title,x.marketName,x.selectionName].filter(Boolean).join(' ');const n=norm(raw);let type='';if(n.includes('under')||n.includes('tm')||n.includes('тм')||n.includes('меньше'))type='TM';if(n.includes('over')||n.includes('tb')||n.includes('тб')||n.includes('больше'))type='TB';const line=parseNum(pick(x,['line','total','value','name','title']));if(Number.isFinite(line))list.push({type,line,odds:parseNum(pick(x,['odds','price','coefficient'],1.75))||1.75,name:raw})}}
 const direct=[['TM',pick(m,['under','tm','market.under','odds.under'])],['TB',pick(m,['over','tb','market.over','odds.over'])]];
 for(const [type,v]of direct){const line=parseNum(v);if(Number.isFinite(line))list.push({type,line,odds:1.75})}
 return list
}
function scorePeriods(m){
 const out=[];
 const arrs=[pick(m,['periods']),pick(m,['quarters']),pick(m,['scores.periods']),pick(m,['score.periods']),pick(m,['periodScores']),pick(m,['period_scores'])].filter(Array.isArray);
 for(const arr of arrs){
  arr.slice(0,3).forEach((p,i)=>{
   let h=parseNum(pick(p,['home','homeScore','h','scoreHome','home_score'])),a=parseNum(pick(p,['away','awayScore','a','scoreAway','away_score']));
   const st=pick(p,['score','value','result'],'');const mm=String(st).match(/(\d+)\s*[:-]\s*(\d+)/);
   if((!Number.isFinite(h)||!Number.isFinite(a))&&mm){h=Number(mm[1]);a=Number(mm[2])}
   if(Number.isFinite(h)&&Number.isFinite(a))out.push({quarter:parseNum(pick(p,['quarter','period','number'],i+1))||i+1,home:h,away:a})
  })
 }
 // object formats: scores.home.q1 / scores.away.q1, score.period1.home, etc.
 for(let q=1;q<=3;q++){
  const h=parseNum(pick(m,[`scores.home.q${q}`,`scores.home.quarter${q}`,`scores.home.period${q}`,`score.home.q${q}`,`homeScore.q${q}`,`homeScore.period${q}`,`q${q}Home`,`period${q}.home`,`quarter${q}.home`]));
  const a=parseNum(pick(m,[`scores.away.q${q}`,`scores.away.quarter${q}`,`scores.away.period${q}`,`score.away.q${q}`,`awayScore.q${q}`,`awayScore.period${q}`,`q${q}Away`,`period${q}.away`,`quarter${q}.away`]));
  if(Number.isFinite(h)&&Number.isFinite(a))out.push({quarter:q,home:h,away:a})
 }
 const byQ=new Map();
 out.forEach(x=>{if(!byQ.has(x.quarter))byQ.set(x.quarter,x)});
 return [...byQ.values()].sort((a,b)=>a.quarter-b.quarter)
}
function matchToRows(m){
 if(!isIpbl(m))return[];const prime=isPrime(m),pro=isPro(m);if(!prime&&!pro)return[];const a=team(m,'home'),b=team(m,'away');if(prime&&!targetPrime(a,b))return[];
 return scorePeriods(m).map(q=>{const line=prime?55:38.5,total=q.home+q.away;return{time:pick(m,['time','date','startTime','startTimestamp'],'—'),league:getLeague(m),teamA:a||'—',teamB:b||'—',quarter:q.quarter,qScore:`${q.home}:${q.away}`,qTotal:total,target:prime?'ТБ55':'ТБ38.5',passed:total>line,sourceUrl:source(m)}})
}
function livePrimeSignal(m,line=55){
 if(!isIpbl(m)||!isPrime(m))return null;const a=team(m,'home'),b=team(m,'away');if(!targetPrime(a,b))return null;
 const has=markets(m).some(x=>x.type==='TB'&&Math.abs(x.line-line)<.01);if(!has)return null;
 return{id:pick(m,['id','matchId','eventId'],`${a}-${b}-${Date.now()}`),league:getLeague(m),teamA:a,teamB:b,period:period(m),score:currentScore(m),total:line,odds:(markets(m).find(x=>x.type==='TB'&&Math.abs(x.line-line)<.01)||{}).odds||1.75,sourceUrl:source(m)}
}

function liveMatchInfo(m){
 const a=team(m,'home'), b=team(m,'away');
 return {
  id: pick(m,['id','matchId','eventId'],`${a}-${b}`),
  league: getLeague(m)||'—',
  teamA:a||'—',
  teamB:b||'—',
  period: period(m),
  score: currentScore(m) || 'API не дал счёт',
  status: status(m)||'live',
  mskTime: mskNow(),
  sourceUrl: source(m)
 }
}

function liveProMatch(m){
 if(!isIpbl(m)||!isPro(m))return null;const a=team(m,'home'),b=team(m,'away');const ms=markets(m).filter(x=>x.type==='TM'||x.type==='TB');
 return{id:pick(m,['id','matchId','eventId'],`${a}-${b}`),league:getLeague(m),teamA:a,teamB:b,period:period(m),quarter:period(m),score:currentScore(m),status:status(m),isLive:norm(status(m)).includes('live')||norm(status(m)).includes('playing'),isBreak:norm(status(m)).includes('break')||norm(status(m)).includes('перерыв')||norm(status(m)).includes('pause'),quarterFinished:norm(status(m)).includes('finish')||norm(status(m)).includes('ended')||norm(status(m)).includes('заверш'),markets:ms,sourceUrl:source(m)}
}
async function loadMatches(date,{live=false}={}){
 const slugs=await getBasketballSlugs(),attempts=[],matches=[];
 for(const slug of slugs){
  const path=`/${slug}/matches`;const paramsList=live?[{date,live:1,status:'live'},{date,status:'live'},{live:1},{date}]:[{date,status:'finished'},{date},{status:'finished'}];
  for(const params of paramsList){const r=await safeApiFetch(path,params);attempts.push({path,params,ok:r.ok,error:r.error,status:r.status});if(r.ok){const arr=toArray(r.data,['matches','data','items','events','response','result']);for(const x of arr)matches.push({...x,__sportSlug:slug});if(arr.length)break}}
  if(matches.length)break
 }
 return{slugs,attempts,matches}
}

function rawMatchInfo(m){
 const a=team(m,'home'), b=team(m,'away');
 return {
  id: pick(m,['id','matchId','eventId'],''),
  time: pick(m,['time','date','startTime','startTimestamp'],'—'),
  league: getLeague(m)||'—',
  teamA:a||'—',
  teamB:b||'—',
  status: status(m)||'нет счёта по четвертям',
  sourceUrl: source(m)
 }
}

module.exports={API_KEY,getSports,loadMatches,matchToRows,livePrimeSignal,liveProMatch,liveMatchInfo,rawMatchInfo,isIpbl,isPrime,isPro,mskNow,mskDate};
