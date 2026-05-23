import { loadHistorical, rowsFromMatches } from "./_parser.js";
export default async function handler(req,res){
 try{const date=String(req.query.date||"").slice(0,10);const l=await loadHistorical({date});const rows=rowsFromMatches(l.matches,{live:false});res.status(200).json({ok:true,endpoint:l.endpoint,apiMatches:l.matches.length,count:rows.length,results:rows})}
 catch(e){res.status(500).json({ok:false,error:e.message})}
}
