const express = require('express');
const router = express.Router();
const bot = require('../bot/index');
const { handleStart, handleReport, handleConnectJira } = require('../bot/commands');

router.post(`/telegram/${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.status(200).json({ ok: true });
});

// Регистрируем команды
bot.onText(/\/start/, handleStart);
bot.onText(/\/report/, handleReport);
bot.onText(/\/connect_jira (.+)/, handleConnectJira);

module.exports = router;