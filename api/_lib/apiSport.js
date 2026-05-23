const API_BASE = 'https://api.api-sport.ru/v2';

const PRIME_LEAGUE_KEYWORDS = ['ipbl', 'prime'];
const PRO_LEAGUE_KEYWORDS = ['ipbl', 'pro'];
const PRIME_TEAMS = ['Скорпионс','Биверс','Барракудас','Хаскис','Беарз','Рейвенс','Пираньяс','Октопус'];

function getApiKey() {
  return process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY || '';
}
function norm(v) { return String(v || '').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9. ]/g,' ').replace(/\s+/g,' ').trim(); }
function includesAll(text, words) { const n = norm(text); return words.every(w => n.includes(norm(w))); }
function hasAnyTeam(a,b,list) { const text = norm(`${a} ${b}`); return list.some(t => text.includes(norm(t))); }
function pick(obj, paths, fallback=undefined) {
  for (const p of paths) {
    const v = p.split('.').reduce((acc,k)=>acc && acc[k], obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}
function asArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of ['data','response','result','results','items','matches','events','games']) {
    if (Array.isArray(data[k])) return data[k];
    if (data[k] && typeof data[k] === 'object') {
      const inner = asArray(data[k]);
      if (inner.length) return inner;
    }
  }
  return [];
}
function findArraysDeep(obj, maxDepth=4, depth=0, out=[]) {
  if (!obj || depth > maxDepth) return out;
  if (Array.isArray(obj)) { if (obj.length && obj.some(x => x && typeof x === 'object')) out.push(obj); return out; }
  if (typeof obj === 'object') for (const v of Object.values(obj)) findArraysDeep(v, maxDepth, depth+1, out);
  return out;
}
function normalizeDateTime(v) {
  if (!v) return '—';
  if (typeof v === 'number') return new Date(v < 2000000000 ? v*1000 : v).toISOString();
  return String(v);
}
function extractLeague(match) {
  return pick(match, ['league.name','league.title','league','tournament.name','tournament.title','tournament','competition.name','competition.title','competition','championship.name','category.name'], '');
}
function extractTeamA(match) { return pick(match, ['teamA','homeTeam','home_team','home.name','home.title','teams.home.name','teams.home.title','team1.name','team1.title','participants.0.name','competitors.0.name','teams.0.name'], ''); }
function extractTeamB(match) { return pick(match, ['teamB','awayTeam','away_team','away.name','away.title','teams.away.name','teams.away.title','team2.name','team2.title','participants.1.name','competitors.1.name','teams.1.name'], ''); }
function extractTime(match) { return normalizeDateTime(pick(match, ['time','startTime','start_time','date','datetime','dateTime','scheduled_at','matchTime','timestamp'], '—')); }
function extractSourceUrl(match) { return pick(match, ['sourceUrl','url','link','eventUrl','matchUrl'], 'https://api.api-sport.ru/v2/docs/'); }

function parseScoreString(score) {
  if (!score) return null;
  const m = String(score).match(/(\d+)\s*[:\-]\s*(\d+)/);
  return m ? {home: Number(m[1]), away: Number(m[2])} : null;
}
function scoreObjToPair(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return parseScoreString(obj);
  if (typeof obj !== 'object') return null;
  let home = Number(pick(obj, ['home','homeScore','scoreHome','team1','first','h','a'], NaN));
  let away = Number(pick(obj, ['away','awayScore','scoreAway','team2','second','v','b'], NaN));
  if (Number.isFinite(home) && Number.isFinite(away)) return {home, away};
  return parseScoreString(pick(obj, ['score','value','text','periodScore'], ''));
}
function extractPeriods(match) {
  const candidateArrays = [
    pick(match, ['quarters'], null), pick(match, ['periods'], null), pick(match, ['scores.periods'], null),
    pick(match, ['score.periods'], null), pick(match, ['period_scores'], null), pick(match, ['periodScores'], null)
  ].filter(Array.isArray);
  for (const arr of candidateArrays) {
    const periods = arr.map((p,i)=> {
      const pair = scoreObjToPair(p);
      const quarter = Number(pick(p, ['quarter','period','number','num','id'], i+1));
      return pair ? {quarter, ...pair} : null;
    }).filter(x => x && [1,2,3,4].includes(x.quarter));
    if (periods.length) return periods;
  }
  const periods = [];
  for (let q=1; q<=4; q++) {
    const pair = scoreObjToPair(pick(match, [`q${q}`,`quarter_${q}`,`quarter${q}`,`period${q}`,`score.q${q}`,`scores.q${q}`], null));
    const h = Number(pick(match, [`q${q}Home`,`quarter_${q}_home`,`period${q}Home`,`scores.home.quarter_${q}`,`scores.home.q${q}`], NaN));
    const a = Number(pick(match, [`q${q}Away`,`quarter_${q}_away`,`period${q}Away`,`scores.away.quarter_${q}`,`scores.away.q${q}`], NaN));
    if (pair) periods.push({quarter:q, ...pair});
    else if (Number.isFinite(h) && Number.isFinite(a)) periods.push({quarter:q, home:h, away:a});
  }
  return periods;
}
function extractFinalTotal(match, periods) {
  const pair = scoreObjToPair(pick(match, ['score','finalScore','fullScore','result.score','scores.full','scores.total'], null));
  if (pair) return {home: pair.home, away: pair.away, total: pair.home + pair.away, source: 'finalScore'};
  const h = Number(pick(match, ['homeScore','scoreHome','scores.home.total','scores.home.over_time','scores.home.total_score'], NaN));
  const a = Number(pick(match, ['awayScore','scoreAway','scores.away.total','scores.away.over_time','scores.away.total_score'], NaN));
  if (Number.isFinite(h) && Number.isFinite(a)) return {home:h, away:a, total:h+a, source:'totalFields'};
  if (periods && periods.length) {
    const home = periods.reduce((s,p)=>s+p.home,0);
    const away = periods.reduce((s,p)=>s+p.away,0);
    return {home, away, total:home+away, source:'sumPeriods'};
  }
  return {home:0, away:0, total:0, source:'missing'};
}
function classifyLeague(league) {
  if (includesAll(league, PRIME_LEAGUE_KEYWORDS)) return {kind:'PRIME', target:'ТБ55', line:55};
  if (includesAll(league, PRO_LEAGUE_KEYWORDS)) return {kind:'PRO', target:'ТБ38.5', line:38.5};
  return null;
}
function normalizeMatch(match) {
  const league = extractLeague(match);
  const teamA = extractTeamA(match);
  const teamB = extractTeamB(match);
  const cls = classifyLeague(league);
  if (!cls) return null;
  if (cls.kind === 'PRIME' && !hasAnyTeam(teamA, teamB, PRIME_TEAMS)) return null;
  const periods = extractPeriods(match);
  const final = extractFinalTotal(match, periods);
  const passed = final.total > cls.line;
  return {
    id: String(pick(match, ['id','matchId','eventId','game_id'], `${league}-${teamA}-${teamB}-${extractTime(match)}`)),
    time: extractTime(match), league, leagueKind: cls.kind, teamA, teamB,
    q1: periods.find(p=>p.quarter===1) || null,
    q2: periods.find(p=>p.quarter===2) || null,
    q3: periods.find(p=>p.quarter===3) || null,
    finalScore: `${final.home}:${final.away}`,
    matchTotal: final.total,
    totalSource: final.source,
    target: cls.target,
    line: cls.line,
    passed,
    odds: 1.75,
    sourceUrl: extractSourceUrl(match)
  };
}
function sortByTime(a,b) { return String(a.time).localeCompare(String(b.time), 'ru'); }
function simulate(rows, startBank=10000) {
  let bank = Number(startBank) || 10000;
  return rows.slice().sort(sortByTime).map((r, idx) => {
    const stake = 500, odds = 1.75;
    const profit = r.passed ? Math.round(stake * odds - stake) : -stake;
    bank += profit;
    return {...r, order: idx+1, stake, odds, profit, bankAfter: bank};
  });
}
function buildTeamRanking(rows) {
  const map = new Map();
  for (const r of rows) {
    for (const team of [r.teamA, r.teamB]) {
      if (!team) continue;
      if (!map.has(team)) map.set(team, {team, matches:0, passed:0, failed:0, passPercent:0, failPercent:0});
      const item = map.get(team);
      item.matches += 1;
      if (r.passed) item.passed += 1; else item.failed += 1;
    }
  }
  return [...map.values()].map(x => ({...x, passPercent: x.matches ? Number((x.passed*100/x.matches).toFixed(2)) : 0, failPercent: x.matches ? Number((x.failed*100/x.matches).toFixed(2)) : 0})).sort((a,b)=> b.passPercent - a.passPercent || b.matches - a.matches || a.team.localeCompare(b.team,'ru'));
}
function aggregate(rows, startBank=10000) {
  const simulated = simulate(rows, startBank);
  const passed = simulated.filter(r=>r.passed).length;
  const failed = simulated.length - passed;
  const finalBank = simulated.length ? simulated[simulated.length-1].bankAfter : Number(startBank)||10000;
  return {
    matchesCount: simulated.length,
    passed, failed,
    passPercent: simulated.length ? Number((passed*100/simulated.length).toFixed(2)) : 0,
    failPercent: simulated.length ? Number((failed*100/simulated.length).toFixed(2)) : 0,
    startBank: Number(startBank)||10000,
    finalBank,
    profit: finalBank - (Number(startBank)||10000),
    stake: 500, odds: 1.75,
    rows: simulated,
    ranking: buildTeamRanking(simulated)
  };
}
async function apiFetch(path, query={}) {
  const key = getApiKey();
  if (!key) throw new Error('API_SPORT_KEY не задан в Vercel Environment Variables');
  const url = new URL(API_BASE + path);
  Object.entries(query).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k,v); });
  const res = await fetch(url, { headers: { 'Accept':'application/json', 'X-API-KEY': key } });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = {raw:text}; }
  if (!res.ok) throw new Error(`api-sport.ru HTTP ${res.status}: ${text.slice(0,220)}`);
  return data;
}
async function fetchMatchesByDate(date) {
  const attempts = [
    {date}, {day:date}, {from:date, to:date}, {dateFrom:date, dateTo:date}, {startDate:date, endDate:date}
  ];
  let last = null;
  for (const q of attempts) {
    try {
      const data = await apiFetch('/basketball/matches', q);
      const direct = asArray(data);
      const deep = direct.length ? direct : findArraysDeep(data).sort((a,b)=>b.length-a.length)[0] || [];
      if (deep.length) return {raw: deep, query:q, rawCount: deep.length};
      last = {raw: [], query:q, rawCount:0};
    } catch(e) { last = {error:e.message, query:q}; }
  }
  if (last && last.error) throw new Error(last.error);
  return last || {raw:[], query:{date}, rawCount:0};
}
async function searchLeagues(q='ipbl') {
  const data = await apiFetch('/basketball/leagues', {search:q});
  const arr = asArray(data).length ? asArray(data) : findArraysDeep(data).sort((a,b)=>b.length-a.length)[0] || [];
  return arr;
}
module.exports = { getApiKey, apiFetch, fetchMatchesByDate, searchLeagues, normalizeMatch, aggregate, classifyLeague };
