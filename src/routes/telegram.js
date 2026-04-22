const express = require('express');
const router = express.Router();
const bot = require('../bot/index');
const { 
  handleStart, 
  handleReport, 
  handleConnectJira, 
  handleButtonPress 
} = require('../bot/commands');

// Реєстрація команд
bot.onText(/\/start/, handleStart);
bot.onText(/\/report/, handleReport);
bot.onText(/\/connect_jira (.+)/, handleConnectJira);

// Обробка текстових повідомлень (кнопки)
bot.on('message', (msg) => {
  // Ігноруємо команди, які починаються з "/"
  if (msg.text && !msg.text.startsWith('/')) {
    handleButtonPress(msg);
  }
});

// Webhook endpoint
router.post(`/telegram/${process.env.BOT_TOKEN}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Telegram route] processUpdate error:', err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;