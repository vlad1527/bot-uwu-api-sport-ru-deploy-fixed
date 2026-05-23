const { API_KEY, getSports } = require('./_lib');

module.exports = async (req, res) => {
  try {
    let sportsCount = 0;
    if (API_KEY) {
      try {
        const sports = await getSports();
        sportsCount = sports.length;
      } catch (_) {}
    }
    res.status(200).json({
      ok: true,
      provider: 'api-sport.ru',
      keyPresent: Boolean(API_KEY),
      hasKey: Boolean(API_KEY),
      resultsFeedConnected: Boolean(API_KEY),
      sportsCount,
      message: API_KEY ? 'API key найден.' : 'API_SPORT_KEY не задан.'
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};
