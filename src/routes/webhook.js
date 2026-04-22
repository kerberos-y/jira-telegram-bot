const express = require('express');
const router = express.Router();
const bot = require('../bot/index');

const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;

router.post('/jira', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Jira webhook received:', JSON.stringify(payload, null, 2));

    const issue = payload.issue;
    const changelog = payload.changelog;

    if (!issue) {
      return res.status(200).json({ ok: true });
    }

    const issueKey = issue.key;
    const issueSummary = issue.fields?.summary || 'Без назви';
    const assignee = issue.fields?.assignee?.displayName || 'Не призначено';

    // Определяем что изменилось
    const items = changelog?.items || [];

    for (const item of items) {
      let message = '';

      if (item.field === 'status') {
        const from = item.fromString || '—';
        const to = item.toString || '—';
        message = `🔄 *${issueKey}*: ${issueSummary}\nСтатус: *${from}* → *${to}*\nВиконавець: ${assignee}`;
      }

      if (item.field === 'summary') {
        const from = item.fromString || '—';
        const to = item.toString || '—';
        message = `✏️ *${issueKey}*: Назву змінено\n«${from}» → «${to}»\nВиконавець: ${assignee}`;
      }

      if (item.field === 'assignee') {
        const from = item.fromString || 'Нікого';
        const to = item.toString || 'Нікого';
        message = `👤 *${issueKey}*: ${issueSummary}\nВиконавець: *${from}* → *${to}*`;
      }

      if (message && GROUP_CHAT_ID) {
        await bot.sendMessage(GROUP_CHAT_ID, message, { parse_mode: 'Markdown' });
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Jira webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;