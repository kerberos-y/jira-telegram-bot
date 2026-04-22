const express = require('express');
const router = express.Router();
const bot = require('../bot/index');
const { handleStart, handleReport, handleConnectJira, handleTextMessage } = require('../bot/commands');

// Регистрация команд
bot.onText(/\/start/, handleStart);
bot.onText(/\/report/, handleReport);
bot.onText(/\/connect_jira (.+)/, handleConnectJira);

// Обработка обычных сообщений (кнопка "Звіт")
bot.on('message', (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    handleTextMessage(msg);
  }
});

// Endpoint для Telegram webhook
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