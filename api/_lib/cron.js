/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set,
 * and always the `vercel-cron` user agent.
 */
function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || '';
  if (secret) return auth === `Bearer ${secret}`;
  return /vercel-cron/i.test(req.headers?.['user-agent'] || '');
}

module.exports = { isCronRequest };
