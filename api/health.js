import { getKey, findBasketballSlug } from './_lib.js';
export default async function handler(req, res) {
  try {
    const slug = getKey() ? await findBasketballSlug() : null;
    res.status(200).json({ ok: true, provider: 'api-sport.ru', keyPresent: Boolean(getKey()), basketballSlug: slug });
  } catch (e) {
    res.status(200).json({ ok: true, provider: 'api-sport.ru', keyPresent: Boolean(getKey()), warning: e.message });
  }
}
