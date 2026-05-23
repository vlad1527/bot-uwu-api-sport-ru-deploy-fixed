import { loadAny } from "./_parser.js";
import { pick, norm } from "./_common.js";
export default async function handler(req,res){
 try{const date=String(req.query.date||"").slice(0,10);const l=await loadAny({date},false);const leagues={};l.matches.forEach(m=>{const x=pick(m,["league.name","league","tournament.name","tournament","competition.name","competition"],"—");leagues[x]=(leagues[x]||0)+1});const ipbl=Object.entries(leagues).filter(([n])=>norm(n).includes("ipbl")||norm(n).includes("prime")||norm(n).includes("pro"));res.status(200).json({ok:true,endpoint:l.endpoint,totalMatches:l.matches.length,uniqueLeagues:Object.keys(leagues).length,ipblLeagues:ipbl,leagues})}
 catch(e){res.status(500).json({ok:false,error:e.message})}
}
