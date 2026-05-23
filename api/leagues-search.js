const {searchLeagues} = require('./_lib/apiSport');
module.exports = async (req, res) => {
  try {
    const q = String(req.query.q || 'ipbl');
    const leagues = await searchLeagues(q);
    res.status(200).json({ok:true, provider:'api-sport.ru', query:q, count:leagues.length, leagues});
  } catch (e) { res.status(500).json({ok:false, error:e.message}); }
};
