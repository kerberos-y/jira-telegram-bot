/**
 * Діагностика Jira з'єднання:
 *   node src/scripts/debugJira.js
 */
require('dotenv').config();
const { jiraClient } = require('../services/jira');

async function debug() {
  console.log('=== Jira Debug ===');
  console.log('Base URL:    ', process.env.JIRA_BASE_URL);
  console.log('Email:       ', process.env.JIRA_EMAIL);
  console.log('Project Key: ', process.env.JIRA_PROJECT_KEY);
  console.log('');

  // 1. Auth
  let accountId;
  try {
    const me = await jiraClient.get('/rest/api/3/myself');
    accountId = me.data.accountId;
    console.log('✅ Auth OK:', me.data.displayName, '| accountId:', accountId);
  } catch (e) {
    console.error('❌ Auth FAILED:', e.response?.data || e.message);
    return;
  }

  // 2. Project
  try {
    const proj = await jiraClient.get(`/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}`);
    console.log('✅ Project:', proj.data.key, '-', proj.data.name);
  } catch (e) {
    console.error('❌ Project NOT found:', e.response?.data || e.message);
  }

  // 3. Statuses
  try {
    const res = await jiraClient.get(
      `/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}/statuses`
    );
    const seen = new Set();
    console.log('\n📋 Statuses:');
    for (const t of res.data) {
      for (const s of t.statuses) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          console.log(`  - "${s.name}" (id: ${s.id})`);
        }
      }
    }
  } catch (e) {
    console.error('❌ Statuses error:', e.response?.data || e.message);
  }

  // 4. All issues
  try {
    const jql = `project = "${process.env.JIRA_PROJECT_KEY}" ORDER BY created DESC`;
    const res = await jiraClient.get('/rest/api/3/search/jql', {
      params: { jql, maxResults: 10, fields: 'summary,status,assignee' },
    });
    console.log(`\n📋 Recent issues (total: ${res.data.total}):`);
    for (const issue of res.data.issues) {
      const a = issue.fields.assignee;
      console.log(
        `  ${issue.key}: "${issue.fields.summary}"` +
        ` | status: "${issue.fields.status?.name}"` +
        ` | assignee: ${a ? `${a.displayName} (${a.accountId})` : 'none'}`
      );
    }
  } catch (e) {
    console.error('❌ Issues list error:', e.response?.data || e.message);
  }

  // 5. My "В работе" tasks
  try {
    const jql = `assignee = ${accountId} AND status = "В работе" AND project = "${process.env.JIRA_PROJECT_KEY}"`;
    const res = await jiraClient.get('/rest/api/3/search/jql', {
      params: { jql, maxResults: 10, fields: 'summary,status' },
    });
    console.log(`\n✅ My "В работе" tasks: ${res.data.total}`);
    for (const issue of res.data.issues) {
      console.log(`  ${issue.key}: ${issue.fields.summary}`);
    }
  } catch (e) {
    console.error('❌ JQL "В работе" FAILED:', e.response?.data || e.message);
  }

  // 6. Webhooks
  try {
    const res = await jiraClient.get('/rest/webhooks/1.0/webhook');
    console.log(`\n📋 Registered webhooks (${res.data.length}):`);
    for (const wh of res.data) {
      console.log(`  - ${wh.name}: ${wh.url}`);
    }
  } catch (e) {
    console.error('❌ Webhooks error:', e.response?.data || e.message);
  }
}

debug().catch(console.error);