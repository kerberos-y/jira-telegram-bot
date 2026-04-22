const bot = require('./index');
const pool = require('../db/index');
const axios = require('axios');
const { getGroupMemberIds } = require('../services/telegramGroup');

// Клавиатура с кнопкой "Звіт"
async function sendReportKeyboard(chatId) {
  const keyboard = {
    reply_markup: {
      keyboard: [[{ text: '📊 Звіт' }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
  await bot.sendMessage(chatId, 'Оберіть дію:', keyboard);
}

// /start
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const username = msg.from.username || '';

  try {
    await pool.query(
      `INSERT INTO users (telegram_id, telegram_username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE
         SET telegram_username = $2,
             first_name = $3,
             last_name = $4`,
      [telegramId, username, firstName, lastName]
    );
    console.log(`[Bot] /start from ${telegramId} (${firstName})`);
    await bot.sendMessage(chatId, `Привіт, ${firstName}! 👋 Ласкаво просимо!`);
    await sendReportKeyboard(chatId);
  } catch (error) {
    console.error('[Bot] handleStart error:', error);
    await bot.sendMessage(chatId, 'Щось пішло не так. Спробуй ще раз.');
  }
}

// /report
async function handleReport(msg) {
  const chatId = msg.chat.id;

  try {
    const memberIds = await getGroupMemberIds(chatId);
    if (memberIds.length === 0) {
      await bot.sendMessage(chatId, 'Не вдалося визначити учасників групи.');
      return;
    }

    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE telegram_id = ANY($1::bigint[])',
      [memberIds]
    );

    if (users.length === 0) {
      await bot.sendMessage(chatId, 'Немає зареєстрованих користувачів серед учасників групи.');
      return;
    }

    let report = '📊 *Звіт по задачах в роботі:*\n\n';

    for (const user of users) {
      const name = user.first_name || user.telegram_username || `User ${user.telegram_id}`;

      if (!user.jira_account_id) {
        report += `👤 *${name}*: Jira не підключено\n\n`;
        continue;
      }

      try {
        const jql = `assignee = "${user.jira_account_id}" AND status = "In Progress" AND project = "${process.env.JIRA_PROJECT_KEY}"`;
        const response = await axios.get(
          `${process.env.JIRA_BASE_URL}/rest/api/3/search`,
          {
            params: { jql, fields: 'summary,status' },
            auth: {
              username: process.env.JIRA_EMAIL,
              password: process.env.JIRA_API_TOKEN,
            },
          }
        );
        const tasks = response.data.issues || [];
        report += `👤 *${name}*: ${tasks.length} задач\n`;
        for (const task of tasks) {
          report += `  • ${task.key}: ${task.fields.summary}\n`;
        }
        report += '\n';
      } catch (err) {
        console.error(`Jira error for ${user.jira_account_id}:`, err?.response?.data || err.message);
        report += `👤 *${name}*: Помилка отримання задач\n\n`;
      }
    }

    await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('handleReport error:', error);
    await bot.sendMessage(chatId, 'Помилка при формуванні звіту.');
  }
}

// /connect_jira <email>
async function handleConnectJira(msg, match) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const jiraEmail = match[1]?.trim();

  if (!jiraEmail) {
    await bot.sendMessage(chatId, 'Використання: /connect_jira your@email.com');
    return;
  }

  try {
    const response = await axios.get(
      `${process.env.JIRA_BASE_URL}/rest/api/3/user/search`,
      {
        params: { query: jiraEmail },
        auth: {
          username: process.env.JIRA_EMAIL,
          password: process.env.JIRA_API_TOKEN,
        },
      }
    );

    const jiraUser = response.data?.[0];
    if (!jiraUser) {
      await bot.sendMessage(chatId, `❌ Користувача з email *${jiraEmail}* не знайдено в Jira.`, { parse_mode: 'Markdown' });
      return;
    }

    await pool.query(
      `UPDATE users SET jira_account_id = $1, jira_email = $2 WHERE telegram_id = $3`,
      [jiraUser.accountId, jiraEmail, telegramId]
    );

    console.log(`[Bot] Jira linked: telegramId=${telegramId} jiraEmail=${jiraEmail} accountId=${jiraUser.accountId}`);
    await bot.sendMessage(
      chatId,
      `✅ Jira акаунт *${jiraUser.displayName}* підключено!`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('[Bot] handleConnectJira error:', error?.response?.data || error.message);
    await bot.sendMessage(chatId, 'Помилка при підключенні Jira акаунту.');
  }
}

// Обробка текстової кнопки "📊 Звіт"
async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text === '📊 Звіт') {
    await handleReport(msg);
  }
}

module.exports = { handleStart, handleReport, handleConnectJira, handleTextMessage, sendReportKeyboard };