import { apiGet, arr, firstWorking, findBasketballSlug, norm, pick } from './_lib.js';

const PRIME_TEAMS = ['скорпионс','биверс','барракудас','хаскис','беарз','рейвенс','пираньяс','октопус'];

function leagueName(m) {
  return [
    pick(m, ['league.name','league.title','tournament.name','competition.name','championship.name','category.name','league','tournament','competition','championship'], ''),
    pick(m, ['name','title'], '')
  ].filter(Boolean).join(' ');
}
function teamA(m){ return pick(m, ['home.name','homeTeam.name','teamHome.name','teams.home.name','participants.0.name','competitors.0.name','homeTeam','home'], ''); }
function teamB(m){ return pick(m, ['away.name','awayTeam.name','teamAway.name','teams.away.name','participants.1.name','competitors.1.name','awayTeam','away'], ''); }
function matchTime(m){ return pick(m, ['time','startTime','dateTime','date','start_at','startedAt','scheduledAt'], '—'); }
function matchId(m){ return pick(m, ['id','matchId','eventId','uuid'], ''); }
function sourceUrl(m){ return pick(m, ['url','link','sourceUrl','betcityUrl'], 'https://betcity.ru/'); }

function extractPeriods(m) {
  const candidates = [
    pick(m, ['periods','quarters','scores.periods','score.periods','periodScores'], null),
    pick(m, ['score.quarters','scores.quarters','quartersScore'], null)
  ].filter(Boolean);
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) {
      const out = c.map((p, i) => {
        const q = Number(pick(p, ['quarter','period','number','num'], i + 1));
        let home = Number(pick(p, ['home','homeScore','scoreHome','team1','a'], NaN));
        let away = Number(pick(p, ['away','awayScore','scoreAway','team2','b'], NaN));
        const s = pick(p, ['score','value','periodScore'], '');
        if ((!Number.isFinite(home) || !Number.isFinite(away)) && /\d+\s*[:\-]\s*\d+/.test(String(s))) {
          const [h, a] = String(s).split(/[:\-]/).map(x => Number(x.trim())); home = h; away = a;
        }
        return { q, home, away };
      }).filter(x => [1,2,3,4].includes(x.q) && Number.isFinite(x.home) && Number.isFinite(x.away));
      if (out.length) return out;
    }
  }
  const homeObj = pick(m, ['scores.home','score.home','home.scores'], {});
  const awayObj = pick(m, ['scores.away','score.away','away.scores'], {});
  const out = [];
  for (let q=1; q<=4; q++) {
    const h = Number(homeObj[`quarter_${q}`] ?? homeObj[`q${q}`] ?? pick(m,[`q${q}Home`,`period${q}.home`], NaN));
    const a = Number(awayObj[`quarter_${q}`] ?? awayObj[`q${q}`] ?? pick(m,[`q${q}Away`,`period${q}.away`], NaN));
    if (Number.isFinite(h) && Number.isFinite(a)) out.push({ q, home:h, away:a });
  }
  return out;
}

async function getMatches(date) {
  const slug = await findBasketballSlug();
  const reqs = [
    { path: `/${slug}/matches`, params: { date } },
    { path: `/${slug}/matches`, params: { day: date } },
    { path: `/${slug}/matches`, params: { from: date, to: date } },
    { path: `/${slug}/matches`, params: { dateFrom: date, dateTo: date } },
    { path: `/basketball/matches`, params: { date } },
    { path: `/basketball/matches`, params: { from: date, to: date } }
  ];
  const response = await firstWorking(reqs);
  return { slug, endpoint: response.path, raw: arr(response.data) };
}

async function enrichIfNeeded(slug, matches) {
  const out = [];
  for (const m of matches) {
    if (extractPeriods(m).length >= 3) { out.push(m); continue; }
    const id = matchId(m);
    if (!id) { out.push(m); continue; }
    try {
      const detail = await apiGet(`/${slug}/matches/${id}`);
      const a = arr(detail);
      out.push(a[0] || detail?.data || detail?.result || detail || m);
    } catch (_) { out.push(m); }
  }
  return out;
}

function isIpbl(m) {
  const text = norm(`${leagueName(m)} ${teamA(m)} ${teamB(m)}`);
  return text.includes('ipbl') || text.includes('prime division') || text.includes('pro division');
}
function isPrime(m) { return norm(leagueName(m)).includes('prime'); }
function isPro(m) { return norm(leagueName(m)).includes('pro'); }
function primeTeamOk(m) {
  const t = norm(`${teamA(m)} ${teamB(m)}`);
  return PRIME_TEAMS.some(x => t.includes(x));
}

function rowsFromMatches(matches) {
  const rows = [];
  for (const m of matches) {
    const prime = isPrime(m), pro = isPro(m);
    if (!prime && !pro) continue;
    if (prime && !primeTeamOk(m)) continue;
    const periods = extractPeriods(m).sort((a,b)=>a.q-b.q);
    let cumulative = 0;
    for (const p of periods) {
      cumulative += p.home + p.away;
      if (![1,2,3].includes(p.q)) continue;
      const line = prime ? 55 : 38.5;
      rows.push({
        time: matchTime(m), league: leagueName(m) || (prime ? 'IPBL Prime Division' : 'IPBL Pro Division'),
        teamA: teamA(m), teamB: teamB(m), quarter: p.q, qScore: `${p.home}:${p.away}`,
        qTotal: cumulative, target: prime ? 'ТБ55' : 'ТБ38.5', odds: 1.75,
        passed: cumulative > line, sourceUrl: sourceUrl(m)
      });
    }
  }
  return rows.sort((a,b)=>String(a.time).localeCompare(String(b.time)) || a.quarter-b.quarter);
}

function simulate(rows, bankStart) {
  let bank = Number(bankStart || 10000);
  return rows.map(r => {
    const profit = r.passed ? 375 : -500;
    bank += profit;
    return { ...r, profit, bankAfter: bank };
  });
}

function rankTeams(rows) {
  const map = new Map();
  for (const r of rows) for (const team of [r.teamA, r.teamB]) {
    if (!team) continue;
    const x = map.get(team) || { team, total: 0, wins: 0, losses: 0, percent: 0 };
    x.total++; if (r.passed) x.wins++; else x.losses++;
    x.percent = x.total ? Math.round((x.wins / x.total) * 1000) / 10 : 0;
    map.set(team, x);
  }
  return [...map.values()].sort((a,b)=>b.percent-a.percent || b.total-a.total || a.team.localeCompare(b.team));
}

export default async function handler(req, res) {
  try {
    const date = String(req.query.date || new Date().toISOString().slice(0,10));
    const bank = Number(req.query.bank || 10000);
    const base = await getMatches(date);
    const ipbl = base.raw.filter(isIpbl);
    const enriched = await enrichIfNeeded(base.slug, ipbl.slice(0, 160));
    const rows = simulate(rowsFromMatches(enriched), bank);
    const wins = rows.filter(r=>r.passed).length;
    res.status(200).json({ ok: true, date, endpoint: base.endpoint, apiMatches: base.raw.length, ipblMatches: ipbl.length, bettingRows: rows.length, wins, losses: rows.length-wins, finalBank: rows.length ? rows[rows.length-1].bankAfter : bank, profit: (rows.length ? rows[rows.length-1].bankAfter : bank)-bank, ranking: rankTeams(rows), results: rows, sampleIpbl: ipbl.slice(0,5).map(m=>({id:matchId(m), league:leagueName(m), teamA:teamA(m), teamB:teamB(m), periods:extractPeriods(m).length})) });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
