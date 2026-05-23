import { key } from "./_common.js";
export default function handler(req,res){
  res.status(200).json({
    ok:true,
    provider:"api-sport.ru",
    endpoint:"/v2/basketball/matches",
    hasKey:Boolean(key())
  });
}
