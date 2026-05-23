const { API_KEY, getSports } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (!API_KEY) return res.status(500).json({ ok:false, error:'API_SPORT_KEY не задан' });
    const sports = await getSports();
    res.status(200).json({ ok:true, count:sports.length, sports });
  } catch (e) { res.status(e.status || 500).json({ ok:false, error:e.message, data:e.data }); }
};
