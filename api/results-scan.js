import { apiFetch, getMatchesArray, pick, normalizeText } from "./_common.js";

const ENDPOINTS = [
  "/basketball/matches",
  "/sport/basketball/matches",
  "/matches",
  "/events",
  "/basketball/events"
];

const PRIME_TEAMS = ["скорпионс","биверс","барракудас","хаскис","беарз","рейвенс","пираньяс","октопус"];

function extractQuarterRows(match) {
  const league = pick(match, ["league.name","league","tournament.name","tournament","competition.name","competition"], "—");
  const teamA = pick(match, ["home.name","home","homeTeam.name","homeTeam","teamA","teams.home.name","teams.0.name"], "—");
  const teamB = pick(match, ["away.name","away","awayTeam.name","awayTeam","teamB","teams.away.name","teams.1.name"], "—");
  const time = pick(match, ["time","date","start_at","startTime","datetime"], "—");
  const sourceUrl = pick(match, ["url","sourceUrl","link"], "https://api.api-sport.ru/");
  const leagueN = normalizeText(league);
  const isPrime = leagueN.includes("prime");
  const isPro = leagueN.includes("pro");
  const isIpbl = leagueN.includes("ipbl") || leagueN.includes("ибпл") || isPrime || isPro;
  if (!isIpbl) return [];
  if (isPrime) {
    const joined = normalizeText(teamA + " " + teamB);
    if (!PRIME_TEAMS.some(t => joined.includes(t))) return [];
  }

  const periods = pick(match, ["periods","quarters","scores.periods","score.periods"], null);
  const rows = [];

  if (Array.isArray(periods)) {
    periods.slice(0,3).forEach((p, idx) => {
      const q = Number(p.quarter || p.period || p.number || idx + 1);
      let home = Number(p.home ?? p.homeScore ?? p.scoreHome ?? p.h);
      let away = Number(p.away ?? p.awayScore ?? p.scoreAway ?? p.a);
      const scoreText = p.score || p.value || "";
      if ((!Number.isFinite(home) || !Number.isFinite(away)) && /\d+\s*[:\-]\s*\d+/.test(scoreText)) {
        const [h,a] = String(scoreText).split(/[:\-]/).map(x=>Number(x.trim()));
        home = h; away = a;
      }
      if ([1,2,3].includes(q) && Number.isFinite(home) && Number.isFinite(away)) {
        const qTotal = home + away;
        const target = isPro ? "ТБ38.5" : "ТБ55";
        rows.push({ time, league, teamA, teamB, quarter:q, qScore:`${home}:${away}`, qTotal, target, passed:qTotal > (isPro ? 38.5 : 55), sourceUrl });
      }
    });
  }

  // fallback: q1_home/q1_away variations
  for (let q=1; q<=3; q++) {
    if (rows.some(r=>r.quarter===q)) continue;
    const home = Number(pick(match, [`q${q}.home`,`q${q}Home`,`period${q}.home`,`score.q${q}.home`,`scores.home.q${q}`], NaN));
    const away = Number(pick(match, [`q${q}.away`,`q${q}Away`,`period${q}.away`,`score.q${q}.away`,`scores.away.q${q}`], NaN));
    if (Number.isFinite(home) && Number.isFinite(away)) {
      const qTotal = home + away;
      const target = isPro ? "ТБ38.5" : "ТБ55";
      rows.push({ time, league, teamA, teamB, quarter:q, qScore:`${home}:${away}`, qTotal, target, passed:qTotal > (isPro ? 38.5 : 55), sourceUrl });
    }
  }

  return rows;
}

async function loadMatches(date) {
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const data = await apiFetch(endpoint, { date });
      const matches = getMatchesArray(data);
      if (Array.isArray(matches)) return { endpoint, data, matches };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Не найден рабочий endpoint матчей");
}

export default async function handler(req, res) {
  try {
    const date = String(req.query.date || "").slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ ok:false, error:"Нужна дата YYYY-MM-DD" });
    }
    const loaded = await loadMatches(date);
    const rows = loaded.matches.flatMap(extractQuarterRows);
    res.status(200).json({
      ok: true,
      provider: "api-sport.ru",
      endpoint: loaded.endpoint,
      apiMatches: loaded.matches.length,
      count: rows.length,
      results: rows
    });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
