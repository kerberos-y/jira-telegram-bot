const TelegramBot = require('node-telegram-bot-api');

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set!');
}

// polling: false — используем webhook
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

module.exports = bot;