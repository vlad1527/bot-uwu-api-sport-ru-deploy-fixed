import { loadHistorical, rowsFromMatches } from "./_parser.js";
function today(){return new Date().toISOString().slice(0,10)}
export default async function handler(req,res){
 try{
  const line=Number(req.query.line||55);
  const l=await loadHistorical({date:today(), live:1, status:"live"});
  const rows=rowsFromMatches(l.matches,{live:true,line});
  res.status(200).json({ok:true,endpoint:l.endpoint,apiMatches:l.matches.length,count:rows.length,results:rows,note:"Постоянный LIVE-режим: endpoint вызывается фронтом каждые 1 сек."})
 } catch(e){res.status(500).json({ok:false,error:e.message})}
}
