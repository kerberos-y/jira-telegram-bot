const express = require('express');
const router = express.Router();
const bot = require('../bot/index');

router.post('/jira', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Jira Webhook] received event:', payload.webhookEvent);

    const issue = payload.issue;
    const changelog = payload.changelog;

    if (!issue) {
      return res.status(200).json({ ok: true });
    }

    const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
    if (!groupChatId) {
      console.warn('[Jira Webhook] TELEGRAM_GROUP_CHAT_ID not set');
      return res.status(200).json({ ok: true });
    }

    const issueKey = issue.key;
    const issueSummary = issue.fields?.summary || 'Без назви';
    const assignee = issue.fields?.assignee?.displayName || 'Не призначено';
    const items = changelog?.items || [];

    for (const item of items) {
      let message = null;

      if (item.field === 'status') {
        const from = item.fromString || '—';
        const to = item.toString || '—';
        message = `🔄 *${issueKey}*: ${issueSummary}\nСтатус: *${from}* → *${to}*\nВиконавець: ${assignee}`;
      } else if (item.field === 'summary') {
        const from = item.fromString || '—';
        const to = item.toString || '—';
        message = `✏️ *${issueKey}*: Назву змінено\n«${from}» → «${to}»\nВиконавець: ${assignee}`;
      } else if (item.field === 'assignee') {
        const from = item.fromString || 'Нікого';
        const to = item.toString || 'Нікого';
        message = `👤 *${issueKey}*: ${issueSummary}\nВиконавець: *${from}* → *${to}*`;
      }

      if (message) {
        console.log('[Jira Webhook] sending to Telegram:', message);
        await bot.sendMessage(groupChatId, message, { parse_mode: 'Markdown' });
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Jira Webhook] error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;