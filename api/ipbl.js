import { apiFetch, arr, pick, norm } from "./_common.js";

export default async function handler(req,res){
  try{
    const date = String(req.query.date || new Date().toISOString().slice(0,10)).slice(0,10);
    const data = await apiFetch("/basketball/matches", { date });
    const matches = arr(data);
    const leagues = {};

    matches.forEach(m => {
      const league = pick(m, ["league.name","league","tournament.name","tournament","competition.name","competition"], "—");
      leagues[league] = (leagues[league] || 0) + 1;
    });

    const ipbl = Object.entries(leagues).filter(([name]) => {
      const n = norm(name);
      return n.includes("ipbl") || n.includes("prime") || n.includes("pro") || n.includes("ибпл");
    });

    res.status(200).json({
      ok:true,
      endpoint:"/v2/basketball/matches",
      totalMatches:matches.length,
      uniqueLeagues:Object.keys(leagues).length,
      ipblLeagues:ipbl,
      leagues
    });
  }catch(e){
    res.status(500).json({ok:false,error:e.message});
  }
}
