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

describe('Список разделов', () => {
  test('гость видит все разделы', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Общие вопросы');
    expect(res.text).toContain('Программирование');
    expect(res.text).toContain('Базы данных');
  });

  test('гость не видит панель модератора', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('root');
    expect(res.text).not.toContain('Панель модератора');
  });

  test('авторизованный пользователь видит разделы', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Общие вопросы');
    expect(res.text).not.toContain('Панель модератора');
  });

  test('модератор видит ссылку на панель управления', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Панель модератора');
  });

  test('отображается количество тем в разделе', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('2');
  });
});

describe('Темы в разделе', () => {
  test('гость видит список тем', async () => {
    const res = await request(app).get('/section/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
    expect(res.text).toContain('Лучшие практики Java');
  });

  test('авторизованный пользователь видит форму создания темы', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get('/section/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Создать тему');
  });

  test('гость не видит форму создания темы', async () => {
    const res = await request(app).get('/section/2');
    expect(res.text).not.toContain('action="/section/2/topic"');
    expect(res.text).toContain('Войдите');
  });

  test('модератор видит кнопки удаления тем', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/section/2');
    expect(res.text).toContain('Удалить');
  });

  test('пагинация — страница 1', async () => {
    const res = await request(app).get('/section/2?page=1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
  });

  test('пагинация — страница 2 при малом количестве тем', async () => {
    const res = await request(app).get('/section/2?page=2');
    expect(res.status).toBe(200);
  });

  test('пагинация — номер за пределами диапазона', async () => {
    const res = await request(app).get('/section/2?page=999');
    expect(res.status).toBe(200);
  });

  test('сортировка по новизне', async () => {
    const res = await request(app).get('/section/2?sort=newest');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
  });

  test('сортировка по дате создания (старые)', async () => {
    const res = await request(app).get('/section/2?sort=oldest');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
  });

  test('сортировка по заголовку', async () => {
    const res = await request(app).get('/section/2?sort=title');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
  });

  test('несуществующий раздел — 404', async () => {
    const res = await request(app).get('/section/99999');
    expect(res.status).toBe(404);
  });

  test('нечисловой id раздела — 404', async () => {
    const res = await request(app).get('/section/abc');
    expect(res.status).toBe(404);
  });
});