const { API_KEY, loadMatchesForDate } = require('./_lib');

function pick(obj, paths, fallback = undefined) {
  for (const path of paths) {
    const val = path.split('.').reduce((acc, k) => acc && acc[k], obj);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

function norm(v) {
  return String(v ?? '').toLowerCase().replace(/ё/g, 'е');
}

module.exports = async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан.' });

    const date = String(req.query.date || '').trim() || new Date().toISOString().slice(0,10);
    const loaded = await loadMatchesForDate(date, { live: false });
    const leagues = new Map();

    for (const m of loaded.matches) {
      const name = [
        pick(m, ['category.name','country.name','sport.name'], ''),
        pick(m, ['tournament.name','tournament.title','league.name','competition.name','leagueName'], '')
      ].filter(Boolean).join(' ');
      if (!leagues.has(name)) leagues.set(name, { name, count: 0, sportSlug: m.__sportSlug });
      leagues.get(name).count += 1;
    }

    const list = [...leagues.values()]
      .filter(x => norm(x.name).includes('ipbl') || norm(x.name).includes('prime') || norm(x.name).includes('pro'))
      .sort((a,b) => b.count - a.count);

    res.status(200).json({
      ok: true,
      date,
      totalMatches: loaded.matches.length,
      uniqueLeagues: leagues.size,
      ipblLeagues: list,
      leagues: list,
      attempts: loaded.attempts
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data });
  }
};
