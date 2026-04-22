require('dotenv').config();

const express        = require('express');
const runMigrations  = require('./db/migrations');
const telegramRouter = require('./routes/telegram');
const webhookRouter  = require('./routes/webhook');
const bot            = require('./bot/index');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);   // POST /webhook/jira
app.use('/', telegramRouter);         // POST /telegram/<token>

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/telegram/${process.env.BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      console.log('[Bot] Webhook set:', webhookUrl);
    } else {
      console.warn('[Bot] No domain env var — webhook NOT set. Set RAILWAY_PUBLIC_DOMAIN or APP_DOMAIN.');
    }
  } catch (err) {
    console.error('[Server] Startup error:', err);
    process.exit(1);
  }
}

start();