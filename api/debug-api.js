const { API_KEY, getSports, getBasketballSlugs, loadMatchesForDate } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан' });
    const date = String(req.query.date || new Date().toISOString().slice(0,10));
    const sports = await getSports();
    const basketballSlugs = await getBasketballSlugs();
    const loaded = await loadMatchesForDate(date);
    res.status(200).json({ ok:true, date, sportsCount:sports.length, basketballSlugs, attempts: loaded.attempts, rawMatchesCount: loaded.matches.length, sample: loaded.matches.slice(0,3) });
  } catch (e) { res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data }); }
};
