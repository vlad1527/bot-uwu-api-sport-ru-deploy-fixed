import { apiFetch, arr } from "./_common.js";
import { rowsFromMatch } from "./_parser.js";

export default async function handler(req,res){
  try{
    const date = String(req.query.date || "").slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      return res.status(400).json({ok:false,error:"Нужна дата YYYY-MM-DD"});
    }

    const data = await apiFetch("/basketball/matches", { date });
    const matches = arr(data);
    const rows = matches.flatMap(m => rowsFromMatch(m, "history"));

    res.status(200).json({
      ok:true,
      provider:"api-sport.ru",
      endpoint:"/v2/basketball/matches",
      apiMatches:matches.length,
      count:rows.length,
      results:rows
    });
  }catch(e){
    res.status(500).json({ok:false,error:e.message});
  }
}
