/**
 * Запустіть один раз для налаштування Jira:
 *   node src/scripts/setupJira.js
 *
 * Що робить:
 *   1. Перевіряє/створює проект
 *   2. Виводить поточні статуси
 *   3. Встановлює Jira webhook на ваш сервер
 */
require('dotenv').config();
const { createProject, getProjectStatuses, upsertWebhook, jiraClient } = require('../services/jira');

async function main() {
  console.log('=== Jira Setup ===\n');

  // 1. Авторизація
  try {
    const me = await jiraClient.get('/rest/api/3/myself');
    console.log('✅ Auth OK:', me.data.displayName, '|', me.data.emailAddress);
  } catch (e) {
    console.error('❌ Auth FAILED:', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Проект
  try {
    const project = await createProject();
    console.log('✅ Project:', project.key, '-', project.name);
  } catch (e) {
    console.error('❌ Project error:', e.response?.data || e.message);
  }

  // 3. Статуси
  try {
    const statuses = await getProjectStatuses();
    console.log('\n📋 Current project statuses:');
    for (const s of statuses) {
      console.log(`  - "${s.name}" (id: ${s.id})`);
    }
    console.log(
      '\n⚠️  Jira Cloud не дозволяє створювати статуси через REST API.\n' +
      '   Якщо потрібні статуси "To Do / In Progress / Ready for QA / Done" — \n' +
      '   додайте їх вручну: Project Settings → Board → Columns and statuses\n'
    );
  } catch (e) {
    console.error('❌ Statuses error:', e.response?.data || e.message);
  }

  // 4. Webhook
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.APP_DOMAIN;
  if (!domain) {
    console.warn('\n⚠️  Webhook not created — set RAILWAY_PUBLIC_DOMAIN or APP_DOMAIN in .env');
  } else {
    const webhookUrl = `https://${domain}/webhook/jira`;
    try {
      await upsertWebhook(webhookUrl);
      console.log(`\n✅ Webhook ready: ${webhookUrl}`);
    } catch (e) {
      console.error('❌ Webhook error:', e.response?.data || e.message);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);