const axios = require('axios');

const jiraClient = axios.create({
  baseURL: process.env.JIRA_BASE_URL,
  auth: {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN,
  },
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Знайти Jira-юзера за email
 */
async function findJiraUser(email) {
  const res = await jiraClient.get('/rest/api/3/user/search', {
    params: { query: email },
  });
  const users = res.data || [];
  return (
    users.find((u) => u.emailAddress?.toLowerCase() === email.toLowerCase()) ||
    users[0] ||
    null
  );
}

/**
 * Отримати задачі юзера зі статусом "В работе"
 * Використовує новий endpoint /rest/api/3/search/jql
 */
async function getUserInProgressTasks(accountId) {
  // accountId НЕ береться в лапки в JQL
  const jql = `assignee = ${accountId} AND status = "In Progress" AND project = "${process.env.JIRA_PROJECT_KEY}"`;
  const res = await jiraClient.get('/rest/api/3/search/jql', {
    params: { jql, fields: 'summary,status,assignee', maxResults: 50 },
  });
  return res.data.issues || [];
}

/**
 * Створити проект у Jira
 */
async function createProject() {
  const myself = await jiraClient.get('/rest/api/3/myself');
  const leadAccountId = myself.data.accountId;

  try {
    const res = await jiraClient.post('/rest/api/3/project', {
      key: process.env.JIRA_PROJECT_KEY,
      name: `${process.env.JIRA_PROJECT_KEY} Project`,
      projectTypeKey: 'software',
      leadAccountId,
    });
    console.log('✅ Project created:', res.data.key);
    return res.data;
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.errors?.projectKey) {
      console.log(`ℹ️ Project ${process.env.JIRA_PROJECT_KEY} already exists`);
      const res = await jiraClient.get(`/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}`);
      return res.data;
    }
    throw err;
  }
}

/**
 * Отримати доступні статуси проекту
 */
async function getProjectStatuses() {
  const res = await jiraClient.get(
    `/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}/statuses`
  );
  const seen = new Set();
  const statuses = [];
  for (const issueType of res.data) {
    for (const s of issueType.statuses) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        statuses.push(s);
      }
    }
  }
  return statuses;
}

/**
 * Додати юзера до проекту
 */
async function addUserToProject(accountId) {
  // Jira Cloud — додавання через role
  const rolesRes = await jiraClient.get(
    `/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}/role`
  );
  const roles = rolesRes.data;
  // Беремо першу доступну роль (зазвичай Developer або Member)
  const roleUrl = Object.values(roles)[0];
  const roleId = roleUrl.split('/').pop();

  await jiraClient.post(
    `/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}/role/${roleId}`,
    { user: [accountId] }
  );
}

/**
 * Створити або оновити webhook
 */
async function upsertWebhook(webhookUrl) {
  // Перевіряємо чи існує
  try {
    const existing = await jiraClient.get('/rest/webhooks/1.0/webhook');
    const found = existing.data?.find((wh) => wh.url === webhookUrl);
    if (found) {
      console.log('ℹ️ Webhook already exists:', found.self);
      return found;
    }
  } catch (_) {}

  const res = await jiraClient.post('/rest/webhooks/1.0/webhook', {
    name: 'Telegram Bot Webhook',
    url: webhookUrl,
    events: ['jira:issue_created', 'jira:issue_updated'],
    excludeBody: false,
  });
  console.log('✅ Webhook created:', res.data.self || res.data);
  return res.data;
}

module.exports = {
  findJiraUser,
  getUserInProgressTasks,
  createProject,
  getProjectStatuses,
  addUserToProject,
  upsertWebhook,
  jiraClient,
};