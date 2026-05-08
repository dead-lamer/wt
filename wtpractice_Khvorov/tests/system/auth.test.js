const request = require('supertest');
const app = require('../../src/app');
const { systemSeed, closeDb, PASSWORDS } = require('./setup');
const { loginAs } = require('./agent');
const userDao = require('../../src/dao/UserDao');

beforeEach(async () => {
  await systemSeed();
});

afterAll(async () => {
  await closeDb();
});

describe('Регистрация', () => {
  test('успешная регистрация — автовход и редирект на главную', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/register')
      .send({ login: 'newuser', password: 'pass1234', confirm: 'pass1234' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    const home = await agent.get('/');
    expect(home.status).toBe(200);
    expect(home.text).toContain('newuser');

    const u = await userDao.findByLogin('newuser');
    expect(u).not.toBeNull();
    expect(u.role).toBe('user');
    expect(u.isBlocked).toBe(false);
  });

  test('пустой логин — ошибка валидации', async () => {
    const res = await request(app)
      .post('/register')
      .send({ login: '', password: 'pass1234', confirm: 'pass1234' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Логин обязателен');
  });

  test('пустой пароль — ошибка валидации', async () => {
    const res = await request(app)
      .post('/register')
      .send({ login: 'someone', password: '', confirm: '' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Пароль обязателен');
  });

  test('пароль короче 4 символов — ошибка валидации', async () => {
    const res = await request(app)
      .post('/register')
      .send({ login: 'someone', password: 'ab', confirm: 'ab' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('минимум 4 символа');
  });

  test('пароли не совпадают — ошибка валидации', async () => {
    const res = await request(app)
      .post('/register')
      .send({ login: 'someone', password: 'pass1234', confirm: 'DIFFERENT' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Пароли не совпадают');
  });

  test('занятый логин — ошибка', async () => {
    const res = await request(app)
      .post('/register')
      .send({ login: 'alice', password: 'pass1234', confirm: 'pass1234' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Пользователь с таким логином уже существует');
  });
});

describe('Авторизация', () => {
  test('успешный вход обычного пользователя', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/login')
      .send({ login: 'alice', password: PASSWORDS.alice });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    const home = await agent.get('/');
    expect(home.text).toContain('alice');
  });

  test('успешный вход модератора — видит панель управления', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ login: 'root', password: PASSWORDS.root });

    const home = await agent.get('/');
    expect(home.text).toContain('Панель модератора');
  });

  test('несуществующий логин — ошибка', async () => {
    const res = await request(app)
      .post('/login')
      .send({ login: 'nobody', password: 'xxx' });

    expect(res.status).toBe(401);
    expect(res.text).toContain('Неверный логин или пароль');
  });

  test('неверный пароль — ошибка', async () => {
    const res = await request(app)
      .post('/login')
      .send({ login: 'alice', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.text).toContain('Неверный логин или пароль');
  });

  test('заблокированный пользователь не может войти', async () => {
    await userDao.setBlocked(2, true);

    const res = await request(app)
      .post('/login')
      .send({ login: 'alice', password: PASSWORDS.alice });

    expect(res.status).toBe(403);
    expect(res.text).toContain('Аккаунт заблокирован');
  });

  test('выход из системы — сессия сбрасывается', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);

    const logoutRes = await agent.post('/logout');
    expect(logoutRes.status).toBe(302);

    const home = await agent.get('/');
    expect(home.text).toContain('Войти');
    expect(home.text).not.toContain('action="/logout"');
  });

  test('заблокированный пользователь с активной сессией — принудительный выход', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);

    await userDao.setBlocked(2, true);

    const res = await agent.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });
});