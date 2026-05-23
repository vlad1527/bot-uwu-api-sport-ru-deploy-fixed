import { arr, firstWorking, findBasketballSlug, norm, pick } from './_lib.js';
function name(m){return [pick(m,['league.name','tournament.name','competition.name','championship.name','league','tournament','competition'],''), pick(m,['home.name','homeTeam','teams.home.name','participants.0.name'],''), pick(m,['away.name','awayTeam','teams.away.name','participants.1.name'],'')].join(' ')}
export default async function handler(req,res){
  try{
    const date=String(req.query.date||new Date().toISOString().slice(0,10));
    const slug=await findBasketballSlug();
    const r=await firstWorking([
      {path:`/${slug}/matches`,params:{date}}, {path:`/${slug}/matches`,params:{from:date,to:date}}, {path:'/basketball/matches',params:{date}}
    ]);
    const all=arr(r.data); const ipbl=all.filter(x=>{const t=norm(name(x)); return t.includes('ipbl')||t.includes('prime')||t.includes('pro')});
    const leagues=[...new Set(ipbl.map(x=>pick(x,['league.name','tournament.name','competition.name','championship.name','league','tournament','competition'],'Не указана')).filter(Boolean))];
    res.status(200).json({ok:true,date,slug,endpoint:r.path,apiMatches:all.length,ipblMatches:ipbl.length,leagues,sample:ipbl.slice(0,10)});
  }catch(e){res.status(500).json({ok:false,error:e.message})}
}
