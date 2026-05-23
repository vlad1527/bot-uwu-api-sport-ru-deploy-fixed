import { apiFetch, getMatchesArray, pick, normalizeText } from "./_common.js";

const ENDPOINTS = ["/basketball/matches","/sport/basketball/matches","/matches","/events","/basketball/events"];

export default async function handler(req, res) {
  const date = String(req.query.date || "").slice(0,10);
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      const data = await apiFetch(endpoint, { date });
      const matches = getMatchesArray(data);
      const leagues = {};
      matches.forEach(m => {
        const league = pick(m, ["league.name","league","tournament.name","tournament","competition.name","competition"], "—");
        leagues[league] = (leagues[league] || 0) + 1;
      });
      const ipbl = Object.entries(leagues).filter(([name]) => normalizeText(name).includes("ipbl") || normalizeText(name).includes("prime") || normalizeText(name).includes("pro"));
      return res.status(200).json({
        ok:true, endpoint, totalMatches:matches.length, uniqueLeagues:Object.keys(leagues).length, ipblLeagues:ipbl, leagues
      });
    } catch(e) { lastError = e; }
  }
  res.status(500).json({ok:false,error:lastError?.message || "Не найден endpoint"});
}
