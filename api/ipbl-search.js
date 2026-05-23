const { API_KEY, loadMatchesForDate, norm } = require('./_lib');
function leagueText(m){ return [m?.tournament?.name,m?.tournament?.title,m?.league?.name,m?.competition?.name,m?.category?.name,m?.country?.name].filter(Boolean).join(' '); }
module.exports = async (req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    if(!API_KEY) return res.status(500).json({ok:false,error:'API_SPORT_KEY не задан'});
    const date=String(req.query.date || new Date().toISOString().slice(0,10));
    const loaded=await loadMatchesForDate(date);
    const leagues=new Map();
    for(const m of loaded.matches){
      const text=leagueText(m) || '—';
      const key=norm(text);
      if(!leagues.has(key)) leagues.set(key,{name:text,count:0,sportSlug:m.__sportSlug});
      leagues.get(key).count++;
    }
    const list=[...leagues.values()].sort((a,b)=>b.count-a.count);
    res.status(200).json({ok:true,date,realMatchesReturnedByApi:loaded.matches.length,leagueCount:list.length,leagues:list,attempts:loaded.attempts});
  }catch(e){ res.status(e.status||500).json({ok:false,error:e.message,data:e.data}); }
};
