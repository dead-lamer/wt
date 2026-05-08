const request = require('supertest');
const app = require('../../src/app');
const { systemSeed, closeDb, PASSWORDS } = require('./setup');
const { loginAs } = require('./agent');

beforeEach(async () => {
  await systemSeed();
});

afterAll(async () => {
  await closeDb();
});

describe('Просмотр профиля', () => {
  test('гость видит публичный профиль', async () => {
    const res = await request(app).get('/user/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('alice');
    expect(res.text).toContain('Пользователь');
  });

  test('обычный пользователь на чужом профиле — нет формы пароля и действий модератора', async () => {
    const agent = await loginAs(app, 'bob', PASSWORDS.bob);
    const res = await agent.get('/user/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('alice');
    expect(res.text).not.toContain('Текущий пароль');
    expect(res.text).not.toContain('Заблокировать');
  });

  test('владелец видит форму смены пароля', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get('/user/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Текущий пароль');
    expect(res.text).toContain('Новый пароль');
  });

  test('модератор на чужом профиле — видит кнопки блокировки и назначения роли', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/user/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Заблокировать');
    expect(res.text).toContain('Назначить модератором');
  });

  test('модератор на своём профиле — форма пароля есть, кнопок модератора нет', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/user/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Текущий пароль');
    expect(res.text).not.toContain('Заблокировать');
  });

  test('несуществующий пользователь — 404', async () => {
    const res = await request(app).get('/user/99999');
    expect(res.status).toBe(404);
  });

  test('нечисловой id — 404', async () => {
    const res = await request(app).get('/user/abc');
    expect(res.status).toBe(404);
  });

  test('статистика пользователя отображается', async () => {
    const res = await request(app).get('/user/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Сообщений');
  });

  test('темы пользователя отображаются', async () => {
    const res = await request(app).get('/user/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
  });
});

describe('Смена пароля', () => {
  test('успешная смена пароля', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({
        currentPassword: PASSWORDS.alice,
        newPassword: 'newpass1234',
        confirmPassword: 'newpass1234',
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/user/2');

    const newAgent = await loginAs(app, 'alice', 'newpass1234');
    const home = await newAgent.get('/');
    expect(home.text).toContain('alice');
  });

  test('пустой текущий пароль — ошибка', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({ currentPassword: '', newPassword: 'newpass', confirmPassword: 'newpass' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Текущий пароль обязателен');
  });

  test('пустой новый пароль — ошибка', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({ currentPassword: PASSWORDS.alice, newPassword: '', confirmPassword: '' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Новый пароль обязателен');
  });

  test('новый пароль короче 4 символов — ошибка', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({ currentPassword: PASSWORDS.alice, newPassword: 'ab', confirmPassword: 'ab' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('минимум 4 символа');
  });

  test('новые пароли не совпадают — ошибка', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({
        currentPassword: PASSWORDS.alice,
        newPassword: 'newpass1234',
        confirmPassword: 'DIFFERENT',
      });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Новые пароли не совпадают');
  });

  test('неверный текущий пароль — ошибка', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/user/2/password')
      .send({
        currentPassword: 'wrongpassword',
        newPassword: 'newpass1234',
        confirmPassword: 'newpass1234',
      });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Текущий пароль неверен');
  });

  test('смена пароля чужого профиля — 403', async () => {
    const agent = await loginAs(app, 'bob', PASSWORDS.bob);
    const res = await agent
      .post('/user/2/password')
      .send({
        currentPassword: PASSWORDS.alice,
        newPassword: 'newpass1234',
        confirmPassword: 'newpass1234',
      });

    expect(res.status).toBe(403);
  });

  test('гость — редирект на вход', async () => {
    const res = await request(app)
      .post('/user/2/password')
      .send({
        currentPassword: PASSWORDS.alice,
        newPassword: 'newpass1234',
        confirmPassword: 'newpass1234',
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});