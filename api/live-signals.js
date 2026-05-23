import { loadAny, rowsFromMatches } from "./_parser.js";
export default async function handler(req,res){
 try{const line=Number(req.query.line||55.5);const l=await loadAny({},true);const rows=rowsFromMatches(l.matches,{live:true,line});res.status(200).json({ok:true,endpoint:l.endpoint,apiMatches:l.matches.length,count:rows.length,results:rows})}
 catch(e){res.status(500).json({ok:false,error:e.message})}
}
