const BASE="https://api.api-sport.ru/v2";
export function key(){return process.env.API_SPORT_KEY||process.env.API_SPORT_RU_KEY||process.env.API_SPORTS_KEY||""}
export async function apiFetch(path,params={}){
 const k=key(); if(!k) throw new Error("API_SPORT_KEY не задан");
 const url=new URL(BASE+path); Object.entries(params).forEach(([a,b])=>{if(b!==undefined&&b!==null&&b!=="")url.searchParams.set(a,b)});
 const headers={accept:"application/json",Authorization:`Bearer ${k}`,"X-API-Key":k,"x-api-key":k,"api-key":k};
 const r=await fetch(url,{headers}); const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
 if(!r.ok) throw new Error(`api-sport.ru HTTP ${r.status}: ${typeof data==="object"?JSON.stringify(data):text}`);
 return data
}
export function arr(d){return Array.isArray(d)?d:(d?.data||d?.response||d?.results||d?.matches||d?.items||d?.events||[])}
export function pick(o,paths,f){for(const p of paths){const v=p.split(".").reduce((a,k)=>a&&a[k],o);if(v!==undefined&&v!==null&&v!=="")return v}return f}
export function norm(v){return String(v||"").toLowerCase().replace(/ё/g,"е")}
