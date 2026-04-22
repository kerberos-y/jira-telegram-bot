const bot = require('../bot/index');
const pool = require('../db/index');

async function getGroupMemberIds(chatId) {
  try {
    const chat = await bot.getChat(chatId);
    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      console.warn('Chat is not a group');
      return [];
    }
    const administrators = await bot.getChatAdministrators(chatId);
    const adminIds = administrators.map(adm => adm.user.id);

    // также берём всех пользователей из БД, которые когда-либо писали боту
    const { rows } = await pool.query('SELECT DISTINCT telegram_id FROM users');
    const userIds = [...new Set([...adminIds, ...rows.map(r => r.telegram_id)])];
    return userIds;
  } catch (error) {
    console.error('getGroupMemberIds error:', error);
    return [];
  }
}

module.exports = { getGroupMemberIds };