import { apiFetch, arr } from "./_common.js";
import { rowsFromMatch } from "./_parser.js";

export default async function handler(req,res){
  try{
    // api-sport.ru использует /v2/{sportSlug}/matches. Для live пробуем status=live.
    // Если API отдаёт live без status-фильтра, frontend всё равно отфильтрует IPBL.
    let data = await apiFetch("/basketball/matches", { status:"live" });
    let matches = arr(data);

    // fallback: если live-фильтр у тарифа/API не поддержан и вернул пусто
    if(!matches.length){
      const today = new Date().toISOString().slice(0,10);
      data = await apiFetch("/basketball/matches", { date: today });
      matches = arr(data).filter(m => {
        const s = String(m.status || m.state || m.matchStatus || "").toLowerCase();
        return s.includes("live") || s.includes("inplay") || s.includes("playing") || s.includes("1q") || s.includes("2q") || s.includes("3q") || s.includes("4q");
      });
    }

    const rows = matches.flatMap(m => rowsFromMatch(m, "live"));

    res.status(200).json({
      ok:true,
      provider:"api-sport.ru",
      endpoint:"/v2/basketball/matches?status=live",
      apiMatches:matches.length,
      count:rows.length,
      results:rows
    });
  }catch(e){
    res.status(500).json({ok:false,error:e.message});
  }
}
