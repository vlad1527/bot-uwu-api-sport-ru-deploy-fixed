const { API_KEY, loadMatchesForDate, liveMatchToSignal } = require('./_lib');

function today() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан в Vercel Environment Variables.' });

    const line = Number(req.query.line || 55);
    const loaded = await loadMatchesForDate(today(), { live: true });
    const results = loaded.matches
      .map(m => liveMatchToSignal(m, line))
      .filter(Boolean);

    res.status(200).json({
      ok: true,
      provider: 'api-sport.ru',
      mode: 'persistent-live-polling',
      line,
      apiMatches: loaded.matches.length,
      count: results.length,
      results,
      diagnostics: {
        basketballSlugsTried: loaded.slugs,
        attempts: loaded.attempts,
        note: 'LIVE работает постоянным polling на фронте. Этот endpoint не использует прямой обход Betcity.'
      }
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data });
  }
};
