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

async function createProject() {
  try {
    const myself = await jira.get('/rest/api/3/myself');
    const leadAccountId = myself.data.accountId;

    const projectPayload = {
      key: process.env.JIRA_PROJECT_KEY,
      name: `${process.env.JIRA_PROJECT_KEY} Project`,
      projectTypeKey: 'software',
      leadAccountId: leadAccountId,
    };

    let project;
    try {
      const resp = await jira.post('/rest/api/3/project', projectPayload);
      project = resp.data;
      console.log(`✅ Project created: ${project.key}`);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors?.projectKey) {
        console.log(`ℹ️ Project ${process.env.JIRA_PROJECT_KEY} already exists`);
        const resp = await jira.get(`/rest/api/3/project/${process.env.JIRA_PROJECT_KEY}`);
        project = resp.data;
      } else {
        throw err;
      }
    }

    console.log('⚠️ Workflow statuses (Todo, In Progress, Ready for QA, Done) must be added manually in Jira project settings.');
  } catch (error) {
    console.error('❌ Setup error:', error.response?.data || error.message);
  }
}

createProject();