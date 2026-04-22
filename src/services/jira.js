const axios = require('axios');

const jiraClient = axios.create({
  baseURL: process.env.JIRA_BASE_URL,
  auth: {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

// Получить задачи пользователя в статусе "In Progress"
async function getJiraUserTasks(accountId) {
  try {
    const jql = `assignee = "${accountId}" AND status = "In Progress" AND project = "${process.env.JIRA_PROJECT_KEY}"`;
    const response = await jiraClient.get('/rest/api/3/search', {
      params: { jql, fields: 'summary,status,assignee' },
    });
    return response.data.issues || [];
  } catch (error) {
    console.error('getJiraUserTasks error:', error?.response?.data || error.message);
    return [];
  }
}

module.exports = { getJiraUserTasks };