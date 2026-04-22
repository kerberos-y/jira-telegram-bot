require('dotenv').config();
const express = require('express');
const app = express();
const runMigrations = require('./db/migrations');
const webhookRouter = require('./routes/webhook');
const telegramRouter = require('./routes/telegram');
const bot = require('./bot/index');

app.use(express.json());

// Роуты
app.use('/webhook', webhookRouter);
app.use('/', telegramRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await runMigrations();
    console.log('DB ready');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Устанавливаем Telegram webhook
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/telegram/${process.env.BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      console.log('Telegram webhook set:', webhookUrl);
    }
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

start();