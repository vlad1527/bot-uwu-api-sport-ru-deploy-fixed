const { API_KEY, loadMatchesForDate, matchToRows, calculateSimulation, teamRating } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан в Vercel Environment Variables.' });

    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ ok:false, error:'Дата нужна в формате YYYY-MM-DD' });
    }

    const startBank = Number(req.query.bank || 10000);
    const loaded = await loadMatchesForDate(date, { live: false });
    const rowsBeforeBank = loaded.matches.flatMap(matchToRows);
    const results = calculateSimulation(rowsBeforeBank, Number.isFinite(startBank) ? startBank : 10000);

    const wins = results.filter(r => r.passed).length;
    const losses = results.length - wins;
    const finalBank = results.length ? results[results.length - 1].bankAfter : startBank;

    res.status(200).json({
      ok: true,
      provider: 'api-sport.ru',
      date,
      source: 'api.api-sport.ru/v2 dynamic /sport -> /{basketballSlug}/matches',
      apiMatches: loaded.matches.length,
      count: results.length,
      results,
      rows: results,
      teamRating: teamRating(results),
      ranking: teamRating(results),
      summary: {
        apiMatches: loaded.matches.length,
        calculableRows: results.length,
        wins,
        losses,
        finalBank,
        profit: finalBank - startBank
      },
      diagnostics: {
        basketballSlugsTried: loaded.slugs,
        attempts: loaded.attempts
      }
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data });
  }
};
