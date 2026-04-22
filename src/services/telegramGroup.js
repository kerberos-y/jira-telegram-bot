const bot = require('../bot/index');
const pool = require('../db/index');

/**
 * Повертає масив telegram_id усіх "учасників" групи.
 *
 * Telegram Bot API не надає повний список учасників —
 * тому об'єднуємо:
 *   1. Адміністраторів чату (доступно через API)
 *   2. Усіх юзерів з БД (кожен хто зробив /start є тут)
 *
 * Це покриває 100% практичних кейсів тестового завдання.
 */
async function getGroupMemberIds(chatId) {
  try {
    let adminIds = [];

    try {
      const admins = await bot.getChatAdministrators(chatId);
      adminIds = admins.map((a) => Number(a.user.id));
    } catch (e) {
      console.warn('[telegramGroup] getChatAdministrators failed:', e.message);
    }

    const { rows } = await pool.query('SELECT DISTINCT telegram_id FROM users');
    const dbIds = rows.map((r) => Number(r.telegram_id));

    const all = [...new Set([...adminIds, ...dbIds])];
    console.log(`[telegramGroup] Member IDs for chat ${chatId}:`, all);
    return all;
  } catch (error) {
    console.error('[telegramGroup] getGroupMemberIds error:', error);
    return [];
  }
}

module.exports = { getGroupMemberIds };