const {fetchMatchesByDate, normalizeMatch, aggregate} = require('./_lib/apiSport');
module.exports = async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    const bank = Number(req.query.bank || 10000) || 10000;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ok:false,error:'Дата должна быть YYYY-MM-DD'});
    const loaded = await fetchMatchesByDate(date);
    const normalizedAll = (loaded.raw || []).map(normalizeMatch).filter(Boolean);
    const report = aggregate(normalizedAll, bank);
    res.status(200).json({
      ok:true,
      provider:'api-sport.ru',
      date,
      usedQuery: loaded.query,
      rawMatchesCount: loaded.rawCount || (loaded.raw||[]).length,
      targetMatchesCount: report.matchesCount,
      ...report
    });
  } catch (e) { res.status(500).json({ok:false, error:e.message, provider:'api-sport.ru'}); }
};
