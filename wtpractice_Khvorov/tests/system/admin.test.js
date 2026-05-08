const request = require('supertest');
const app = require('../../src/app');
const { systemSeed, closeDb, PASSWORDS } = require('./setup');
const { loginAs } = require('./agent');
const topicDao = require('../../src/dao/TopicDao');
const messageDao = require('../../src/dao/MessageDao');
const sectionDao = require('../../src/dao/SectionDao');
const userDao = require('../../src/dao/UserDao');

beforeEach(async () => {
  await systemSeed();
});

afterAll(async () => {
  await closeDb();
});

function sumStatsCount(html) {
  const match = html.match(/STATS_TABLE_START -->([\s\S]*?)<!-- STATS_TABLE_END/);
  if (!match) return 0;
  const cells = [...match[1].matchAll(/<td>(\d+)<\/td>/g)];
  return cells.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
}

describe('Создание раздела', () => {
  test('успешное создание с описанием', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent
      .post('/admin/section')
      .send({ title: 'Новый раздел', description: 'Описание' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin');

    const section = await sectionDao.findByTitle('Новый раздел');
    expect(section).not.toBeNull();
    expect(section.description).toBe('Описание');
  });

  test('успешное создание без описания', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent
      .post('/admin/section')
      .send({ title: 'Раздел без описания', description: '' });

    expect(res.status).toBe(302);
    const section = await sectionDao.findByTitle('Раздел без описания');
    expect(section).not.toBeNull();
    expect(section.description).toBeNull();
  });

  test('пустой заголовок ошибка', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent
      .post('/admin/section')
      .send({ title: '', description: 'Описание' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Заголовок раздела обязателен');
  });

  test('дублирующееся название  ошибка', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent
      .post('/admin/section')
      .send({ title: 'Общие вопросы', description: '' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Раздел с таким названием уже существует');
  });

  test('обычный пользователь  403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/admin/section')
      .send({ title: 'Тест', description: '' });

    expect(res.status).toBe(403);
  });

  test('гость  редирект на вход', async () => {
    const res = await request(app)
      .post('/admin/section')
      .send({ title: 'Тест', description: '' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('Удаление раздела', () => {
  test('успешное удаление  редирект на панель', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.post('/admin/section/1/delete');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin');

    const section = await sectionDao.findById(1);
    expect(section).toBeNull();
  });

  test('каскадное удаление тем и сообщений', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    await agent.post('/admin/section/2/delete');

    const t2 = await topicDao.findById(2);
    const t3 = await topicDao.findById(3);
    expect(t2).toBeNull();
    expect(t3).toBeNull();

    const msgs = await messageDao.findByTopicId(2, {});
    expect(msgs.length).toBe(0);
  });

  test('несуществующий раздел  без ошибки сервера', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.post('/admin/section/99999/delete');
    expect([302, 404]).toContain(res.status);
  });

  test('обычный пользователь  403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.post('/admin/section/1/delete');
    expect(res.status).toBe(403);
  });

  test('гость  редирект на вход', async () => {
    const res = await request(app).post('/admin/section/1/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('Блокировка пользователей', () => {
  test('модератор блокирует пользователя', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.post('/admin/user/2/block');

    expect(res.status).toBe(302);
    const u = await userDao.findById(2);
    expect(u.isBlocked).toBe(true);
  });

  test('заблокированный не может войти', async () => {
    await userDao.setBlocked(2, true);
    const res = await request(app)
      .post('/login')
      .send({ login: 'alice', password: PASSWORDS.alice });

    expect(res.status).toBe(403);
    expect(res.text).toContain('Аккаунт заблокирован');
  });

  test('модератор разблокирует пользователя', async () => {
    await userDao.setBlocked(2, true);
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    await agent.post('/admin/user/2/unblock');

    const u = await userDao.findById(2);
    expect(u.isBlocked).toBe(false);
  });

  test('разблокированный пользователь может войти', async () => {
    await userDao.setBlocked(2, true);
    await userDao.setBlocked(2, false);

    const agent = request.agent(app);
    const res = await agent
      .post('/login')
      .send({ login: 'alice', password: PASSWORDS.alice });
    expect(res.status).toBe(302);
  });

  test('обычный пользователь  403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.post('/admin/user/3/block');
    expect(res.status).toBe(403);
  });

  test('гость  редирект на вход', async () => {
    const res = await request(app).post('/admin/user/2/block');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('фильтр заблокированных пользователей', async () => {
    await userDao.setBlocked(2, true);
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/admin?status=blocked');
    expect(res.status).toBe(200);
    expect(res.text).toContain('alice');
  });

  test('фильтр активных пользователей', async () => {
    await userDao.setBlocked(2, true);
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/admin?status=active');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('alice');
    expect(res.text).toContain('bob');
  });
});

describe('Назначение роли модератора', () => {
  test('повышение до модератора', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    await agent.post('/admin/user/2/role').send({ role: 'moderator' });

    const u = await userDao.findById(2);
    expect(u.role).toBe('moderator');
  });

  test('после повышения пользователь видит панель управления', async () => {
    await userDao.updateRole(2, 'moderator');
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get('/');
    expect(res.text).toContain('Панель модератора');
  });

  test('понижение до обычного пользователя', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    await agent.post('/admin/user/4/role').send({ role: 'user' });

    const u = await userDao.findById(4);
    expect(u.role).toBe('user');
  });

  test('невалидная роль приводится к user', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    await agent.post('/admin/user/2/role').send({ role: 'superadmin' });

    const u = await userDao.findById(2);
    expect(u.role).toBe('user');
  });

  test('обычный пользователь  403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.post('/admin/user/3/role').send({ role: 'moderator' });
    expect(res.status).toBe(403);
  });

  test('гость  редирект на вход', async () => {
    const res = await request(app)
      .post('/admin/user/2/role')
      .send({ role: 'moderator' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('Статистика активности', () => {
  const FROM = '2020-01-01';
  const TO = '2099-12-31';

  test('обычный пользователь  403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get(`/admin/stats?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(403);
  });

  test('гость  редирект на вход', async () => {
    const res = await request(app).get(`/admin/stats?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('общая статистика за весь период  5 сообщений', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get(`/admin/stats?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(200);
    expect(sumStatsCount(res.text)).toBe(5);
  });

  test('фильтр по разделу 2  2 сообщения', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get(`/admin/stats?from=${FROM}&to=${TO}&sectionId=2`);
    expect(res.status).toBe(200);
    expect(sumStatsCount(res.text)).toBe(2);
  });

  test('фильтр по пользователю alice  2 сообщения', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get(`/admin/stats?from=${FROM}&to=${TO}&userId=2`);
    expect(res.status).toBe(200);
    expect(sumStatsCount(res.text)).toBe(2);
  });

  test('фильтр по разделу 2 и пользователю alice  1 сообщение', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get(`/admin/stats?from=${FROM}&to=${TO}&sectionId=2&userId=2`);
    expect(res.status).toBe(200);
    expect(sumStatsCount(res.text)).toBe(1);
  });

  test('пустой диапазон  нет данных', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/admin/stats?from=2000-01-01&to=2000-01-02');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Нет данных');
  });

  test('без дат  таблица статистики не отображается', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/admin/stats');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('Нет данных');
    expect(res.text).not.toContain('STATS_TABLE_START');
  });

  test('панель модератора доступна модератору', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Панель модератора');
    expect(res.text).toContain('Общие вопросы');
    expect(res.text).toContain('alice');
  });
});