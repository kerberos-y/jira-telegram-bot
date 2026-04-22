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
  const payload = {
    name: 'Telegram Bot Webhook',
    url: webhookUrl,
    events: [
      'jira:issue_updated',
      'jira:issue_created',
    ],
    filters: {
      issue_related_fields_sync_id: 'issue.summary,issue.status,issue.assignee',
    },
  };

  try {
    const res = await jira.post('/rest/webhooks/1.0/webhook', payload);
    console.log('✅ Webhook created:', res.data);
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️ Webhook already exists, skipping.');
    } else {
      console.error('❌ Failed to create webhook:', err.response?.data || err.message);
    }
  }
}

createWebhook();