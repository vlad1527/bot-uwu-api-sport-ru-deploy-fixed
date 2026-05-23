import { apiFetch, arr, pick, norm } from "./_common.js";
export const ENDPOINTS=["/live","/matches/live","/events/live","/basketball/live","/basketball/matches/live","/matches","/events","/basketball/matches","/basketball/events"];
const PRIME=["скорпионс","биверс","барракудас","хаскис","беарз","рейвенс","пираньяс","октопус"];
export function rowsFromMatches(matches,{live=false,line=55}={}){
 const rows=[];
 for(const m of matches){
  const league=pick(m,["league.name","league","tournament.name","tournament","competition.name","competition"],"—");
  const teamA=pick(m,["home.name","home","homeTeam.name","homeTeam","teamA","teams.home.name","teams.0.name"],"—");
  const teamB=pick(m,["away.name","away","awayTeam.name","awayTeam","teamB","teams.away.name","teams.1.name"],"—");
  const ln=norm(league), prime=ln.includes("prime"), pro=ln.includes("pro"), ipbl=ln.includes("ipbl")||prime||pro;
  if(!ipbl) continue;
  if(prime&&!PRIME.some(t=>norm(teamA+" "+teamB).includes(t))) continue;
  const time=pick(m,["time","date","start_at","startTime","datetime"],"LIVE");
  const sourceUrl=pick(m,["sourceUrl","matchUrl","eventUrl","url","link"],null)||("https://www.google.com/search?q="+encodeURIComponent(`${teamA} ${teamB} ${league} результат`));
  const period=pick(m,["period","quarter","currentPeriod","status.period"],"LIVE");
  const score=pick(m,["score","currentScore","scores.current"],"—");
  const totals=[pick(m,["total","line","market.total","markets.total"],null)];
  const markets=pick(m,["markets","odds","bets"],[]);
  if(Array.isArray(markets)) markets.forEach(x=>totals.push(pick(x,["total","line","value","name"],null)));
  const hasLine=totals.some(v=>String(v).includes(String(line))||Math.abs(Number(String(v).replace(/[^0-9.]/g,''))-Number(line))<0.01);
  if(live){
    if(!hasLine) continue;
    rows.push({id:pick(m,["id","eventId","matchId"],`${teamA}-${teamB}-${Date.now()}`),league,teamA,teamB,period,score,total:line,odds:pick(m,["odds","coefficient","price"],1.75),sourceUrl});
  } else {
    const periods=pick(m,["periods","quarters","scores.periods","score.periods"],null);
    if(Array.isArray(periods)) periods.slice(0,3).forEach((p,i)=>{let h=Number(p.home??p.homeScore??p.h),a=Number(p.away??p.awayScore??p.a);const st=p.score||"";if((!Number.isFinite(h)||!Number.isFinite(a))&&/\d+\s*[:\-]\s*\d+/.test(st)){[h,a]=String(st).split(/[:\-]/).map(n=>Number(n.trim()))}if(Number.isFinite(h)&&Number.isFinite(a)){const total=h+a,target=pro?"ТБ38.5":"ТБ55";rows.push({time,league,teamA,teamB,quarter:Number(p.quarter||p.period||i+1),qScore:`${h}:${a}`,qTotal:total,target,passed:total>(pro?38.5:55),sourceUrl})}});
  }
 }
 return rows;
}
export async function loadAny(params={},onlyLive=false){
 let last;
 for(const ep of ENDPOINTS.filter(e=>onlyLive?e.includes("live"):true)){
   try{const data=await apiFetch(ep,params);const matches=arr(data);if(Array.isArray(matches))return{endpoint:ep,matches}}catch(e){last=e}
 }
 throw last||new Error("Не найден рабочий endpoint")
}
