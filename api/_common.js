const BASE = "https://api.api-sport.ru/v2";

export function getKey() {
  return process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY || "";
}

export async function apiFetch(path, params = {}) {
  const key = getKey();
  if (!key) throw new Error("API_SPORT_KEY не задан в Vercel Environment Variables");

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const headers = {
    "accept": "application/json",
    "Authorization": `Bearer ${key}`,
    "X-API-Key": key,
    "x-api-key": key,
    "api-key": key
  };

  const r = await fetch(url, { headers });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = typeof data === "object" ? JSON.stringify(data) : String(text);
    throw new Error(`api-sport.ru HTTP ${r.status}: ${msg}`);
  }
  return data;
}

export function unwrap(data) {
  if (Array.isArray(data)) return data;
  return data?.data || data?.response || data?.results || data?.matches || data?.items || data?.events || [];
}

export function normalizeText(v) {
  return String(v || "").toLowerCase().replace(/ё/g, "е");
}

export function pick(obj, paths, fallback = undefined) {
  for (const path of paths) {
    const val = path.split(".").reduce((a,k)=>a && a[k], obj);
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return fallback;
}

export function getMatchesArray(data) {
  const arr = unwrap(data);
  return Array.isArray(arr) ? arr : [];
}
