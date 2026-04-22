const bot = require('./index');
const pool = require('../db/index');
const { getJiraUserTasks } = require('../services/jira');

// Обработка команды /start
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const username = msg.from.username || '';

  try {
    // Сохраняем пользователя в БД если ещё нет
    await pool.query(`
      INSERT INTO users (telegram_id, telegram_username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) DO UPDATE
        SET telegram_username = $2,
            first_name = $3,
            last_name = $4
    `, [telegramId, username, firstName, lastName]);

    await bot.sendMessage(chatId, `Привіт, ${firstName}! 👋 Ласкаво просимо!`);
    console.log(`User saved: ${telegramId} ${firstName}`);
  } catch (error) {
    console.error('handleStart error:', error);
    await bot.sendMessage(chatId, 'Щось пішло не так. Спробуй ще раз.');
  }
}

// Обработка команды /report — показывает задачи в работе
async function handleReport(msg) {
  const chatId = msg.chat.id;

  try {
    // Получаем всех пользователей группы у которых есть Jira аккаунт
    const { rows: users } = await pool.query(`
      SELECT * FROM users WHERE jira_account_id IS NOT NULL
    `);

    if (users.length === 0) {
      await bot.sendMessage(chatId, 'Немає підключених Jira акаунтів.');
      return;
    }

    let report = '📊 *Звіт по задачах в роботі:*\n\n';

    for (const user of users) {
      const tasks = await getJiraUserTasks(user.jira_account_id);
      const name = user.first_name || user.telegram_username || 'Unknown';
      report += `👤 *${name}*: ${tasks.length} задач\n`;
      for (const task of tasks) {
        report += `  • ${task.key}: ${task.fields.summary}\n`;
      }
      report += '\n';
    }

    // Пользователи без Jira аккаунта
    const { rows: noJiraUsers } = await pool.query(`
      SELECT * FROM users WHERE jira_account_id IS NULL
    `);

    for (const user of noJiraUsers) {
      const name = user.first_name || user.telegram_username || 'Unknown';
      report += `👤 *${name}*: Jira не підключено\n`;
    }

    await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('handleReport error:', error);
    await bot.sendMessage(chatId, 'Помилка при формуванні звіту.');
  }
}

// Обработка команды /connect_jira email@example.com
async function handleConnectJira(msg, match) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const jiraEmail = match[1]?.trim();

  if (!jiraEmail) {
    await bot.sendMessage(chatId, 'Використання: /connect_jira your@email.com');
    return;
  }

  try {
    const axios = require('axios');
    // Ищем пользователя в Jira по email
    const response = await axios.get(
      `${process.env.JIRA_BASE_URL}/rest/api/3/user/search?query=${jiraEmail}`,
      {
        auth: {
          username: process.env.JIRA_EMAIL,
          password: process.env.JIRA_API_TOKEN,
        },
      }
    );

    const jiraUser = response.data?.[0];
    if (!jiraUser) {
      await bot.sendMessage(chatId, `Користувача з email ${jiraEmail} не знайдено в Jira.`);
      return;
    }

    await pool.query(`
      UPDATE users SET jira_account_id = $1, jira_email = $2
      WHERE telegram_id = $3
    `, [jiraUser.accountId, jiraEmail, telegramId]);

    await bot.sendMessage(chatId, `✅ Jira акаунт ${jiraUser.displayName} підключено!`);
  } catch (error) {
    console.error('handleConnectJira error:', error);
    await bot.sendMessage(chatId, 'Помилка при підключенні Jira акаунту.');
  }
}

module.exports = { handleStart, handleReport, handleConnectJira };