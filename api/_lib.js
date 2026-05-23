const BASE = 'https://api.api-sport.ru/v2';

export function getKey() {
  return process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY || '';
}

export function norm(v) {
  return String(v || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9. ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function pick(obj, paths, fallback = undefined) {
  for (const p of paths) {
    const val = p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

export function arr(data) {
  if (Array.isArray(data)) return data;
  for (const k of ['data','items','matches','events','result','results','response','rows']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

function headerVariants(key) {
  return [
    { Authorization: `Bearer ${key}` },
    { Authorization: key },
    { 'X-API-Key': key },
    { 'x-api-key': key },
    { token: key },
    { apiKey: key }
  ];
}

export async function apiGet(path, params = {}) {
  const key = getKey();
  if (!key) throw new Error('API_SPORT_KEY не задан в Vercel Environment Variables');
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });

  let lastText = '';
  let lastStatus = 0;
  for (const authHeaders of headerVariants(key)) {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders } });
    lastStatus = res.status;
    lastText = await res.text();
    if (res.status === 401 || res.status === 403) continue;
    if (!res.ok) throw new Error(`api-sport.ru HTTP ${res.status}: ${lastText.slice(0, 500)}`);
    try { return JSON.parse(lastText); } catch { throw new Error(`api-sport.ru вернул не JSON: ${lastText.slice(0, 300)}`); }
  }
  throw new Error(`api-sport.ru HTTP ${lastStatus}: ${lastText.slice(0, 500)}`);
}

export async function firstWorking(requests) {
  const errors = [];
  for (const req of requests) {
    try {
      const data = await apiGet(req.path, req.params || {});
      return { ...req, data };
    } catch (e) {
      errors.push(`${req.path}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}

export async function findBasketballSlug() {
  const endpoints = ['/sport', '/sports'];
  for (const ep of endpoints) {
    try {
      const sports = arr(await apiGet(ep));
      const found = sports.find(s => {
        const text = norm([s.slug, s.code, s.name, s.title, s.sportSlug].join(' '));
        return text.includes('basket') || text.includes('баскет');
      });
      if (found) return pick(found, ['slug','code','id','sportSlug','key'], 'basketball');
    } catch (_) {}
  }
  return 'basketball';
}
