export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    provider: "api-sport.ru",
    hasKey: Boolean(process.env.API_SPORT_KEY || process.env.API_SPORT_RU_KEY || process.env.API_SPORTS_KEY)
  });
}
