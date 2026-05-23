const API_BASE = 'https://api.api-sport.ru/v2';
const API_KEY = process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY || '';

const TARGET_LEAGUE_KEYWORDS = ['ipbl', 'prime division', 'pro division', 'prime', 'pro'];
const PRIME_TEAMS = ['Скорпионс', 'Биверс', 'Барракудас', 'Хаскис', 'Беарз', 'Рейвенс', 'Пираньяс', 'Октопус'];
const BASKETBALL_WORDS = ['basketball', 'basket', 'баскетбол', 'баскет'];

function norm(v) {
  return String(v ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function pick(obj, paths, fallback = undefined) {
  for (const path of paths) {
    const val = path.split('.').reduce((acc, k) => acc && acc[k], obj);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}
function toArray(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    const v = pick(data, [k]);
    if (Array.isArray(v)) return v;
  }
  return [];
}
function sportName(s) {
  return [s.slug, s.name, s.title, s.translations?.ru, s.translations?.en, s.translation?.ru].filter(Boolean).join(' ');
}
function getSportSlug(s) {
  return s.slug || s.key || s.name || s.id;
}
function isBasketballSport(s) {
  const text = norm(sportName(s));
  return BASKETBALL_WORDS.some(w => text.includes(norm(w)));
}
async function apiFetch(path, params = {}) {
  if (!API_KEY) {
    const err = new Error('API_SPORT_KEY не задан в Vercel Environment Variables.');
    err.status = 500;
    throw err;
  }
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: API_KEY,
      Accept: 'application/json'
    }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const err = new Error(`api-sport.ru HTTP ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}
async function getSports() {
  const data = await apiFetch('/sport');
  return toArray(data, ['sports', 'data', 'items', 'response', 'result']);
}
async function getBasketballSlugs() {
  const sports = await getSports();
  const detected = sports.filter(isBasketballSport).map(getSportSlug).filter(Boolean).map(String);
  const candidates = ['basketball', 'basketball3x3', 'basketball-3x3', 'basket', 'basketbol', 'basketball3'].concat(detected);
  return [...new Set(candidates)];
}
async function safeApiFetch(path, params) {
  try { return { ok: true, data: await apiFetch(path, params) }; }
  catch (e) { return { ok: false, error: e.message, status: e.status, data: e.data }; }
}
function getLeagueName(match) {
  return pick(match, [
    'tournament.name', 'tournament.title', 'tournament.translations.ru',
    'league.name', 'league.title', 'competition.name', 'category.name',
    'tournamentName', 'leagueName', 'competitionName'
  ], '');
}
function getFullLeagueName(match) {
  return [
    pick(match, ['category.name', 'country.name', 'sport.name'], ''),
    getLeagueName(match)
  ].filter(Boolean).join(' ');
}
function isIpblMatch(match) {
  const text = norm(getFullLeagueName(match));
  return text.includes('ipbl') || text.includes('prime division') || text.includes('pro division');
}
function isPrime(match) { return norm(getFullLeagueName(match)).includes('prime'); }
function isPro(match) { return norm(getFullLeagueName(match)).includes('pro'); }
function teamName(match, side) {
  const h = side === 'home';
  return pick(match, h ? [
    'homeTeam.name','homeTeam.title','home.name','home.title','teams.home.name','participants.0.name','competitors.0.name'
  ] : [
    'awayTeam.name','awayTeam.title','away.name','away.title','teams.away.name','participants.1.name','competitors.1.name'
  ], '');
}
function isTargetPrimeTeam(a, b) {
  const text = norm(`${a} ${b}`);
  return PRIME_TEAMS.some(t => text.includes(norm(t)));
}
function matchTimestamp(match) {
  return pick(match, ['startTime','startTimestamp','timestamp','date','time','startAt','utcDate'], '');
}
function parseNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : NaN;
}
function parseScoreText(text) {
  const m = String(text || '').match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}
function scorePair(obj, hPaths, aPaths) {
  const h = parseNumber(pick(obj, hPaths));
  const a = parseNumber(pick(obj, aPaths));
  if (Number.isFinite(h) && Number.isFinite(a)) return { home: h, away: a };
  return null;
}
function extractQuarterScores(match) {
  const rows = [];
  const periodArrays = [
    pick(match, ['periods']), pick(match, ['scores.periods']), pick(match, ['score.periods']),
    pick(match, ['homeScore.periods']), pick(match, ['awayScore.periods'])
  ].filter(Array.isArray);

  for (const arr of periodArrays) {
    for (let i = 0; i < Math.min(arr.length, 3); i++) {
      const p = arr[i];
      const q = parseNumber(pick(p, ['number','period','quarter'], i + 1)) || i + 1;
      let pair = scorePair(p, ['home','homeScore','scoreHome','home.score'], ['away','awayScore','scoreAway','away.score']);
      if (!pair) pair = parseScoreText(pick(p, ['score','periodScore','value']));
      if (pair && [1,2,3].includes(q)) rows.push({ quarter: q, ...pair });
    }
  }

  // Common explicit paths
  for (let q = 1; q <= 3; q++) {
    const explicit = scorePair(match, [
      `homeScore.q${q}`, `awayScore.home.q${q}`,
      `homeScore.period${q}`, `homeScore.period_${q}`, `homeScore.quarter${q}`, `homeScore.quarter_${q}`,
      `scores.home.q${q}`, `scores.home.quarter_${q}`, `score.home.q${q}`,
      `q${q}Home`, `period${q}.home`, `quarter${q}.home`
    ], [
      `awayScore.q${q}`, `awayScore.away.q${q}`,
      `awayScore.period${q}`, `awayScore.period_${q}`, `awayScore.quarter${q}`, `awayScore.quarter_${q}`,
      `scores.away.q${q}`, `scores.away.quarter_${q}`, `score.away.q${q}`,
      `q${q}Away`, `period${q}.away`, `quarter${q}.away`
    ]);
    if (explicit) rows.push({ quarter: q, ...explicit });
  }

  // Deduplicate by quarter
  const byQ = new Map();
  for (const r of rows) if (!byQ.has(r.quarter) && Number.isFinite(r.home) && Number.isFinite(r.away)) byQ.set(r.quarter, r);
  return [...byQ.values()].sort((a,b) => a.quarter - b.quarter);
}
function matchToRows(match) {
  if (!isIpblMatch(match)) return [];
  const prime = isPrime(match);
  const pro = isPro(match);
  if (!prime && !pro) return [];
  const home = teamName(match, 'home');
  const away = teamName(match, 'away');
  if (prime && !isTargetPrimeTeam(home, away)) return [];
  const league = getFullLeagueName(match) || (prime ? 'IPBL Prime Division' : 'IPBL Pro Division');
  return extractQuarterScores(match).map(q => {
    const line = prime ? 55 : 38.5;
    const total = q.home + q.away;
    return {
      time: matchTimestamp(match) || '—',
      league,
      teamA: home || '—',
      teamB: away || '—',
      quarter: q.quarter,
      qScore: `${q.home}:${q.away}`,
      qTotal: total,
      target: prime ? 'ТБ55' : 'ТБ38.5',
      odds: 1.75,
      passed: total > line,
      sourceUrl: `https://api.api-sport.ru/v2`,
      matchId: pick(match, ['id','matchId','eventId'], '')
    };
  });
}
async function loadMatchesForDate(date) {
  const slugs = await getBasketballSlugs();
  const attempts = [];
  const allMatches = [];
  for (const slug of slugs) {
    const paramsList = [
      { date, status: 'finished' },
      { date },
      { status: 'finished' }
    ];
    for (const params of paramsList) {
      const path = `/${slug}/matches`;
      const r = await safeApiFetch(path, params);
      attempts.push({ path, params, ok: r.ok, error: r.error, status: r.status });
      if (r.ok) {
        const arr = toArray(r.data, ['matches', 'data', 'items', 'events', 'response', 'result']);
        for (const m of arr) allMatches.push({ ...m, __sportSlug: slug });
        if (arr.length) break;
      }
    }
    if (allMatches.length) break;
  }
  return { slugs, attempts, matches: allMatches };
}
function calculateSimulation(rows, startBank = 10000) {
  const sorted = [...rows].sort((a,b) => String(a.time).localeCompare(String(b.time)) || Number(a.quarter) - Number(b.quarter));
  let bank = startBank;
  return sorted.map(row => {
    const stake = 500;
    const odds = 1.75;
    const profit = row.passed ? Math.round(stake * odds - stake) : -stake; // +375 or -500
    bank += profit;
    return { ...row, odds, stake, profit, bankAfter: bank };
  });
}
function teamRating(rows) {
  const map = new Map();
  function add(team, passed) {
    const key = team || '—';
    const cur = map.get(key) || { team: key, total: 0, passed: 0, failed: 0, percent: 0 };
    cur.total += 1;
    if (passed) cur.passed += 1; else cur.failed += 1;
    cur.percent = cur.total ? Number(((cur.passed / cur.total) * 100).toFixed(2)) : 0;
    map.set(key, cur);
  }
  rows.forEach(r => { add(r.teamA, r.passed); add(r.teamB, r.passed); });
  return [...map.values()].sort((a,b) => b.percent - a.percent || b.total - a.total || a.team.localeCompare(b.team));
}
function summary(rows, rawMatches = []) {
  const passed = rows.filter(r => r.passed).length;
  const failed = rows.length - passed;
  const finalBank = rows.length ? rows[rows.length - 1].bankAfter : 10000;
  return {
    realMatchesReturnedByApi: rawMatches.length,
    ipblQualifiedRows: rows.length,
    passed,
    failed,
    passPercent: rows.length ? Number(((passed / rows.length) * 100).toFixed(2)) : 0,
    profit: finalBank - 10000,
    finalBank
  };
}
module.exports = {
  API_KEY, apiFetch, getSports, getBasketballSlugs, loadMatchesForDate,
  matchToRows, calculateSimulation, teamRating, summary, norm, toArray
};
