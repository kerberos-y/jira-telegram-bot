const bot = require('./index');
const pool = require('../db/index');
const { findJiraUser, getUserInProgressTasks } = require('../services/jira');
const { getGroupMemberIds } = require('../services/telegramGroup');

// ─── Клавіатура ──────────────────────────────────────────────────────────────

function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📊 Звіт' }, { text: '🔗 Підключити Jira' }],
        [{ text: '❓ Допомога' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

// ─── /start ───────────────────────────────────────────────────────────────────

async function handleStart(msg) {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName  = msg.from.first_name  || '';
  const lastName   = msg.from.last_name   || '';
  const username   = msg.from.username    || '';

  try {
    await pool.query(
      `INSERT INTO users (telegram_id, telegram_username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE
         SET telegram_username = EXCLUDED.telegram_username,
             first_name        = EXCLUDED.first_name,
             last_name         = EXCLUDED.last_name`,
      [telegramId, username, firstName, lastName]
    );

    console.log(`[Bot] /start — telegramId=${telegramId} name=${firstName}`);

    await bot.sendMessage(
      chatId,
      `Привіт, ${firstName}! 👋 Ласкаво просимо!\n\nОберіть дію з меню нижче:`,
      getMainKeyboard()
    );
  } catch (err) {
    console.error('[Bot] handleStart error:', err);
    await bot.sendMessage(chatId, '❌ Щось пішло не так. Спробуй ще раз.');
  }
}

// ─── /report ──────────────────────────────────────────────────────────────────

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
        const tasks = await getUserInProgressTasks(user.jira_account_id);
        report += `👤 *${name}*: ${tasks.length} задач\n`;
        for (const task of tasks) {
          report += `  • ${task.key}: ${task.fields.summary}\n`;
        }
        report += '\n';
      } catch (err) {
        const errMsg = err?.response?.data?.errorMessages?.[0] || err.message;
        console.error(`[Report] Jira error for accountId=${user.jira_account_id}:`, errMsg);
        report += `👤 *${name}*: Помилка отримання задач\n\n`;
      }
    }

    await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] handleReport error:', err);
    await bot.sendMessage(chatId, 'Помилка при формуванні звіту.');
  }
}

// ─── /connect_jira ────────────────────────────────────────────────────────────

async function handleConnectJira(msg, match) {
  const chatId     = msg.chat.id;
  const telegramId = msg.from.id;
  const jiraEmail  = match[1]?.trim();

  if (!jiraEmail) {
    await bot.sendMessage(
      chatId,
      '📧 Використання: `/connect_jira your@email.com`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const jiraUser = await findJiraUser(jiraEmail);

    if (!jiraUser) {
      await bot.sendMessage(
        chatId,
        `❌ Користувача з email *${jiraEmail}* не знайдено в Jira.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await pool.query(
      `UPDATE users SET jira_account_id = $1, jira_email = $2 WHERE telegram_id = $3`,
      [jiraUser.accountId, jiraEmail, telegramId]
    );

    console.log(`[Bot] Jira linked: telegramId=${telegramId} accountId=${jiraUser.accountId}`);

    await bot.sendMessage(
      chatId,
      `✅ Jira акаунт *${jiraUser.displayName}* підключено!\nAccountId: \`${jiraUser.accountId}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[Bot] handleConnectJira error:', err?.response?.data || err.message);
    await bot.sendMessage(chatId, '❌ Помилка при підключенні Jira акаунту.');
  }
}

// ─── Кнопки ───────────────────────────────────────────────────────────────────

async function handleButtonPress(msg) {
  const chatId = msg.chat.id;
  const text   = msg.text;

  if (text === '📊 Звіт') {
    await handleReport(msg);
  } else if (text === '🔗 Підключити Jira') {
    await bot.sendMessage(
      chatId,
      '🔗 *Як підключити Jira:*\nНадішліть команду:\n`/connect_jira your@email.com`\n\n(замініть your@email.com на вашу пошту в Jira)',
      { parse_mode: 'Markdown' }
    );
  } else if (text === '❓ Допомога') {
    await bot.sendMessage(
      chatId,
      `📖 *Доступні команди:*\n\n` +
      `/start — Зареєструватися та показати меню\n` +
      `/report — Показати звіт по задачах\n` +
      `/connect\\_jira email — Прив'язати Jira акаунт\n\n` +
      `Або натискайте кнопки нижче.`,
      { parse_mode: 'Markdown' }
    );
  }
}

module.exports = {
  handleStart,
  handleReport,
  handleConnectJira,
  handleButtonPress,
  getMainKeyboard,
};