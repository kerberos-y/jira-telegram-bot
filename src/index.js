const express = require('express');
const runMigrations = require('./db/migrations');
const webhookRouter = require('./routes/webhook');
const telegramRouter = require('./routes/telegram');
const bot = require('./bot/index');

const app = express();
app.use(express.json());

app.use('/webhook', webhookRouter);
app.use('/', telegramRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/telegram/${process.env.BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      console.log('[Bot] Webhook set:', webhookUrl);
    } else {
      console.warn('[Bot] No domain provided, webhook not set.');
    }
  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
}

start();