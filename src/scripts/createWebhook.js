require('dotenv').config();
const axios = require('axios');

const jira = axios.create({
  baseURL: process.env.JIRA_BASE_URL,
  auth: {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN,
  },
  headers: { 'Content-Type': 'application/json' },
});

async function createWebhook() {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_DOMAIN;
  if (!domain) {
    console.error('❌ No domain provided. Set RAILWAY_PUBLIC_DOMAIN or APP_DOMAIN');
    return;
  }

  const webhookUrl = `https://${domain}/webhook/jira`;
  console.log(`[Webhook] Target URL: ${webhookUrl}`);

  // Перевіряємо чи вже існує вебхук з таким URL
  try {
    const existing = await jira.get('/rest/webhooks/1.0/webhook');
    const alreadyExists = existing.data?.find(wh => wh.url === webhookUrl);
    if (alreadyExists) {
      console.log('ℹ️ Webhook already exists:', alreadyExists.self);
      return;
    }
  } catch (err) {
    console.warn('[Webhook] Could not fetch existing webhooks:', err.response?.data || err.message);
  }

  // ВИПРАВЛЕНО: прибрано некоректне поле filters.issue_related_fields_sync_id
  const payload = {
    name: 'Telegram Bot Webhook',
    url: webhookUrl,
    events: [
      'jira:issue_updated',
      'jira:issue_created',
    ],
    // Фільтр по проекту (опціонально)
    filters: {
      'issue-related-events-section': `project = "${process.env.JIRA_PROJECT_KEY}"`,
    },
    excludeBody: false,
  };

  try {
    const res = await jira.post('/rest/webhooks/1.0/webhook', payload);
    console.log('✅ Webhook created:', res.data.self || res.data);
  } catch (err) {
    console.error('❌ Failed to create webhook:', JSON.stringify(err.response?.data) || err.message);
  }
}

createWebhook();