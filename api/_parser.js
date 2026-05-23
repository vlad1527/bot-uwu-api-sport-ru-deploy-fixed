import { pick, norm, sourceUrlFor } from "./_common.js";

const PRIME_TEAMS = ["скорпионс","биверс","барракудас","хаскис","беарз","рейвенс","пираньяс","октопус"];

function scorePairFromText(value){
  if(!/\d+\s*[:\-]\s*\d+/.test(String(value || ""))) return null;
  const [h,a] = String(value).split(/[:\-]/).map(x=>Number(x.trim()));
  return Number.isFinite(h) && Number.isFinite(a) ? {home:h, away:a} : null;
}

export function rowsFromMatch(m, mode = "history"){
  const league = pick(m, ["league.name","league","tournament.name","tournament","competition.name","competition"], "—");
  const teamA = pick(m, ["home.name","home","homeTeam.name","homeTeam","teamA","teams.home.name","teams.0.name"], "—");
  const teamB = pick(m, ["away.name","away","awayTeam.name","awayTeam","teamB","teams.away.name","teams.1.name"], "—");
  const time = pick(m, ["time","date","start_at","startTime","datetime"], "—");
  const status = String(pick(m, ["status","state","matchStatus"], "")).toLowerCase();
  const sourceUrl = pick(m, ["sourceUrl","matchUrl","eventUrl","url","link"], null) || sourceUrlFor(teamA, teamB, league);

  const ln = norm(league);
  const prime = ln.includes("prime");
  const pro = ln.includes("pro");
  const ipbl = ln.includes("ipbl") || ln.includes("ибпл") || prime || pro;
  if(!ipbl) return [];
  if(prime && !PRIME_TEAMS.some(t => norm(teamA + " " + teamB).includes(t))) return [];

  const periods = pick(m, ["periods","quarters","scores.periods","score.periods","periodScores"], null);
  const rows = [];

  if(Array.isArray(periods)){
    periods.slice(0,3).forEach((p, idx) => {
      const q = Number(p.quarter || p.period || p.number || idx + 1);
      let home = Number(p.home ?? p.homeScore ?? p.scoreHome ?? p.h);
      let away = Number(p.away ?? p.awayScore ?? p.scoreAway ?? p.a);
      const pair = scorePairFromText(p.score || p.value || p.periodScore);
      if((!Number.isFinite(home) || !Number.isFinite(away)) && pair){
        home = pair.home; away = pair.away;
      }
      if([1,2,3].includes(q) && Number.isFinite(home) && Number.isFinite(away)){
        const total = home + away;
        const target = pro ? "ТБ38.5" : "ТБ55";
        rows.push({ time, league, teamA, teamB, quarter:q, qScore:`${home}:${away}`, qTotal:total, target, passed: total > (pro ? 38.5 : 55), sourceUrl, status, mode });
      }
    });
  }

  for(let q=1; q<=3; q++){
    if(rows.some(r=>r.quarter===q)) continue;
    const home = Number(pick(m, [`q${q}.home`,`q${q}Home`,`period${q}.home`,`score.q${q}.home`,`scores.home.q${q}`], NaN));
    const away = Number(pick(m, [`q${q}.away`,`q${q}Away`,`period${q}.away`,`score.q${q}.away`,`scores.away.q${q}`], NaN));
    if(Number.isFinite(home) && Number.isFinite(away)){
      const total = home + away;
      const target = pro ? "ТБ38.5" : "ТБ55";
      rows.push({ time, league, teamA, teamB, quarter:q, qScore:`${home}:${away}`, qTotal:total, target, passed: total > (pro ? 38.5 : 55), sourceUrl, status, mode });
    }
  }

  return rows;
}
