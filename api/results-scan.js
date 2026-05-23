import { apiFetch, arr, pick, norm } from "./_common.js";
const ENDPOINTS=["/matches","/events","/basketball/matches","/basketball/events","/basketball-3x3/matches","/basketball3x3/matches"];
const PRIME=["скорпионс","биверс","барракудас","хаскис","беарз","рейвенс","пираньяс","октопус"];
function qRows(m){
 const league=pick(m,["league.name","league","tournament.name","tournament","competition.name","competition"],"—");
 const teamA=pick(m,["home.name","home","homeTeam.name","homeTeam","teamA","teams.home.name","teams.0.name"],"—");
 const teamB=pick(m,["away.name","away","awayTeam.name","awayTeam","teamB","teams.away.name","teams.1.name"],"—");
 const time=pick(m,["time","date","start_at","startTime","datetime"],"—");
 const sourceUrl=pick(m,["sourceUrl","matchUrl","eventUrl","url","link"],null) || ("https://www.google.com/search?q="+encodeURIComponent(`${teamA} ${teamB} ${league} результат матча`));
 const ln=norm(league), prime=ln.includes("prime"), pro=ln.includes("pro"), ipbl=ln.includes("ipbl")||ln.includes("ибпл")||prime||pro;
 if(!ipbl) return [];
 if(prime && !PRIME.some(t=>norm(teamA+" "+teamB).includes(t))) return [];
 const rows=[], periods=pick(m,["periods","quarters","scores.periods","score.periods"],null);
 if(Array.isArray(periods)) periods.slice(0,3).forEach((p,idx)=>{const q=Number(p.quarter||p.period||p.number||idx+1);let home=Number(p.home??p.homeScore??p.scoreHome??p.h),away=Number(p.away??p.awayScore??p.scoreAway??p.a);const st=p.score||p.value||""; if((!Number.isFinite(home)||!Number.isFinite(away))&&/\d+\s*[:\-]\s*\d+/.test(st)){const [h,a]=String(st).split(/[:\-]/).map(x=>Number(x.trim()));home=h;away=a} if([1,2,3].includes(q)&&Number.isFinite(home)&&Number.isFinite(away)){const total=home+away,target=pro?"ТБ38.5":"ТБ55";rows.push({time,league,teamA,teamB,quarter:q,qScore:`${home}:${away}`,qTotal:total,target,passed:total>(pro?38.5:55),sourceUrl})}});
 for(let q=1;q<=3;q++){if(rows.some(r=>r.quarter===q))continue;const home=Number(pick(m,[`q${q}.home`,`q${q}Home`,`period${q}.home`,`score.q${q}.home`,`scores.home.q${q}`],NaN));const away=Number(pick(m,[`q${q}.away`,`q${q}Away`,`period${q}.away`,`score.q${q}.away`,`scores.away.q${q}`],NaN));if(Number.isFinite(home)&&Number.isFinite(away)){const total=home+away,target=pro?"ТБ38.5":"ТБ55";rows.push({time,league,teamA,teamB,quarter:q,qScore:`${home}:${away}`,qTotal:total,target,passed:total>(pro?38.5:55),sourceUrl})}}
 return rows
}
async function load(date){let last; for(const ep of ENDPOINTS){try{const data=await apiFetch(ep,{date}); const matches=arr(data); if(Array.isArray(matches)) return {ep,matches}}catch(e){last=e}} throw last||new Error("Не найден рабочий endpoint матчей")}
export default async function handler(req,res){try{const date=String(req.query.date||"").slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({ok:false,error:"Нужна дата YYYY-MM-DD"}); const l=await load(date); const rows=l.matches.flatMap(qRows); res.status(200).json({ok:true,provider:"api-sport.ru",endpoint:l.ep,apiMatches:l.matches.length,count:rows.length,results:rows})}catch(e){res.status(500).json({ok:false,error:e.message})}}
