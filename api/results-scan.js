const { API_KEY, loadMatchesForDate, matchToRows, calculateSimulation, teamRating, summary } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан в Vercel Environment Variables.' });
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok:false, error:'Дата нужна в формате YYYY-MM-DD' });
    const startBank = Number(req.query.bank || 10000);
    const loaded = await loadMatchesForDate(date);
    const rowsBeforeBank = loaded.matches.flatMap(matchToRows);
    const results = calculateSimulation(rowsBeforeBank, Number.isFinite(startBank) ? startBank : 10000);
    const stats = summary(results, loaded.matches);
    if (results.length) stats.finalBank = results[results.length-1].bankAfter;
    stats.profit = stats.finalBank - (Number.isFinite(startBank) ? startBank : 10000);
    res.status(200).json({
      ok: true,
      provider: 'api-sport.ru',
      date,
      startBank: Number.isFinite(startBank) ? startBank : 10000,
      stake: 500,
      odds: 1.75,
      source: 'api.api-sport.ru/v2 dynamic sport endpoint',
      summary: stats,
      teamRating: teamRating(results),
      results,
      diagnostics: {
        basketballSlugsTried: loaded.slugs,
        attempts: loaded.attempts,
        rawMatchesReturnedByApi: loaded.matches.length,
        note: results.length ? 'Расчёт выполнен по строкам с найденным счётом 1–3 четвертей.' : 'API ответил, но не найдено IPBL Prime/Pro строк с доступным счётом четвертей. Смотри /api/debug-api?date=YYYY-MM-DD.'
      }
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data });
  }
};
