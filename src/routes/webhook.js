const express = require('express');
const router  = express.Router();
const bot     = require('../bot/index');

/**
 * POST /webhook/jira
 * Приймає події від Jira і надсилає повідомлення в Telegram-групу.
 * Обробляємо: зміна статусу, назви задачі, виконавця; створення задачі.
 */
router.post('/jira', async (req, res) => {
  // Відразу повертаємо 200 щоб Jira не повторювала запит
  res.status(200).json({ ok: true });

  try {
    const payload = req.body;
    const event   = payload.webhookEvent;
    console.log('[Jira Webhook] event:', event);

    const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (!groupChatId) {
      console.warn('[Jira Webhook] TELEGRAM_GROUP_CHAT_ID not set — skipping');
      return;
    }

    const issue    = payload.issue;
    if (!issue) return;

    const issueKey     = issue.key;
    const summary      = issue.fields?.summary      || 'Без назви';
    const assignee     = issue.fields?.assignee?.displayName || 'Не призначено';
    const statusName   = issue.fields?.status?.name || '—';

    // ── Нова задача ────────────────────────────────────────────────────────────
    if (event === 'jira:issue_created') {
      const message =
        `🆕 *Нова задача ${issueKey}*\n` +
        `📝 ${summary}\n` +
        `📌 Статус: *${statusName}*\n` +
        `👤 Виконавець: ${assignee}`;

      await sendSafe(groupChatId, message);
      return;
    }

    // ── Зміни в задачі ────────────────────────────────────────────────────────
    const items = payload.changelog?.items || [];

    for (const item of items) {
      let message = null;

      if (item.field === 'status') {
        const from = item.fromString || '—';
        const to   = item.toString   || '—';
        message =
          `🔄 *${issueKey}*\n` +
          `📝 ${summary}\n` +
          `📌 Статус: *${from}* → *${to}*\n` +
          `👤 Виконавець: ${assignee}`;
      } else if (item.field === 'summary') {
        const from = item.fromString || '—';
        const to   = item.toString   || '—';
        message =
          `✏️ *${issueKey}* — змінено назву\n` +
          `«${from}»\n→ «${to}»\n` +
          `👤 Виконавець: ${assignee}`;
      } else if (item.field === 'assignee') {
        const from = item.fromString || 'Нікого';
        const to   = item.toString   || 'Нікого';
        message =
          `👤 *${issueKey}*\n` +
          `📝 ${summary}\n` +
          `Виконавець: *${from}* → *${to}*`;
      }

      if (message) {
        await sendSafe(groupChatId, message);
      }
    }
  } catch (err) {
    console.error('[Jira Webhook] processing error:', err);
  }
});

async function sendSafe(chatId, text) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Jira Webhook] sendMessage error:', err.message);
  }
}

module.exports = router;