const {getApiKey} = require('./_lib/apiSport');
module.exports = async (req, res) => {
  res.status(200).json({ok:true, provider:'api-sport.ru', finalBuild:'calculated-no-apisports-io', apiKeyConnected:Boolean(getApiKey()), requiredEnv:'API_SPORT_KEY'});
};
