const request = require('supertest');

async function loginAs(app, login, password) {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send({ login, password })
    .expect(res => {
      if (res.status !== 302) {
        throw new Error(`loginAs(${login}): ожидался 302, получен ${res.status}`);
      }
    });
  return agent;
}

module.exports = { loginAs };