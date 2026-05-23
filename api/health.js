const { API_KEY, getSports, getBasketballSlugs } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    let sports = [];
    let basketballSlugs = [];
    if (API_KEY) {
      sports = await getSports();
      basketballSlugs = await getBasketballSlugs();
    }
    res.status(200).json({
      ok: true,
      provider: 'api-sport.ru',
      base: 'https://api.api-sport.ru/v2',
      keyPresent: Boolean(API_KEY),
      resultsFeedConnected: Boolean(API_KEY),
      sportsCount: sports.length,
      basketballSlugs,
      message: API_KEY ? 'API key найден. /v2/sport отвечает.' : 'API_SPORT_KEY не задан.'
    });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, provider: 'api-sport.ru', keyPresent: Boolean(API_KEY), error: error.message });
  }
};
