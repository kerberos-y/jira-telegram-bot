const bot = require('./index');
const pool = require('../db/index');
const axios = require('axios');
const { getGroupMemberIds } = require('../services/telegramGroup');

// --- Клавіатура з кнопками ---
function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📊 Звіт' }, { text: '🔗 Підключити Jira' }],
        [{ text: '❓ Допомога' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
}

// --- Відправка привітання з клавіатурою ---
async function sendWelcomeMessage(chatId, firstName) {
  await bot.sendMessage(
    chatId,
    `Привіт, ${firstName}! 👋 Ласкаво просимо!\n\nОберіть дію з меню нижче:`,
    getMainKeyboard()
  );
}

// --- Команда /start ---
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
    await sendWelcomeMessage(chatId, firstName);
  } catch (error) {
    console.error('[Bot] handleStart error:', error);
    await bot.sendMessage(chatId, '❌ Щось пішло не так. Спробуй ще раз.');
  }
}

// --- Команда /report ---
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

// --- Команда /connect_jira (текстова) ---
async function handleConnectJira(msg, match) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const jiraEmail = match[1]?.trim();

  if (!jiraEmail) {
    await bot.sendMessage(chatId, '📧 Використання: `/connect_jira your@email.com`', { parse_mode: 'Markdown' });
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
    await bot.sendMessage(chatId, '❌ Помилка при підключенні Jira акаунту.');
  }
}

// --- Обробка натискань на кнопки ---
async function handleButtonPress(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '📊 Звіт') {
    await handleReport(msg);
  } 
  else if (text === '🔗 Підключити Jira') {
    await bot.sendMessage(
      chatId,
      '🔗 *Як підключити Jira:*\nНадішліть команду:\n`/connect_jira your@email.com`\n(замініть your@email.com на вашу пошту в Jira)',
      { parse_mode: 'Markdown' }
    );
  }
  else if (text === '❓ Допомога') {
    await bot.sendMessage(
      chatId,
      `📖 *Доступні команди:*\n\n` +
      `/start – Зареєструватися та показати меню\n` +
      `/report – Показати звіт по задачах\n` +
      `/connect_jira email – Прив'язати обліковий запис Jira\n\n` +
      `Або просто натискайте кнопки нижче.`,
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = { 
  handleStart, 
  handleReport, 
  handleConnectJira, 
  handleButtonPress,
  sendWelcomeMessage,
  getMainKeyboard 
};