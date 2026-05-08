const request = require('supertest');
const path = require('path');
const app = require('../../src/app');
const { systemSeed, closeDb, PASSWORDS } = require('./setup');
const { loginAs } = require('./agent');
const attachmentDao = require('../../src/dao/AttachmentDao');
const topicDao = require('../../src/dao/TopicDao');
const messageDao = require('../../src/dao/MessageDao');

beforeEach(async () => {
  await systemSeed();
});

afterAll(async () => {
  await closeDb();
});

describe('Просмотр сообщений в теме', () => {
  test('гость видит сообщения темы', async () => {
    const res = await request(app).get('/topic/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Как начать с Python?');
    expect(res.text).toContain('С каких библиотек лучше начать');
  });

  test('авторизованный пользователь видит форму ответа', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.get('/topic/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Ответить');
  });

  test('гость не видит форму ответа', async () => {
    const res = await request(app).get('/topic/2');
    expect(res.text).not.toContain('action="/topic/2/message"');
    expect(res.text).toContain('Войдите');
  });

  test('модератор видит кнопки удаления сообщений', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.get('/topic/2');
    expect(res.text).toContain('Удалить');
  });

  test('вложения отображаются', async () => {
    const res = await request(app).get('/topic/2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('python_guide.pdf');
  });

  test('пагинация — страница 1', async () => {
    const res = await request(app).get('/topic/2?page=1');
    expect(res.status).toBe(200);
  });

  test('несуществующая тема — 404', async () => {
    const res = await request(app).get('/topic/99999');
    expect(res.status).toBe(404);
  });

  test('нечисловой id темы — 404', async () => {
    const res = await request(app).get('/topic/xyz');
    expect(res.status).toBe(404);
  });
});

describe('Создание темы', () => {
  test('успешное создание — редирект на новую тему', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/section/1/topic')
      .send({ title: 'Новая тема', body: 'Текст первого поста' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/topic\/\d+$/);
  });

  test('создание с файлом — вложение сохраняется в БД', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/section/1/topic')
      .field('title', 'Тема с файлом')
      .field('body', 'Текст')
      .attach('file', path.join(__dirname, '../setup.js'));

    expect(res.status).toBe(302);

    const topicId = parseInt(res.headers.location.split('/topic/')[1], 10);
    const messages = await messageDao.findByTopicId(topicId, {});
    expect(messages.length).toBe(1);
    const attachments = await attachmentDao.findByMessageId(messages[0].messageId);
    expect(attachments.length).toBe(1);
    expect(attachments[0].filename).toBe('setup.js');
  });

  test('гость — редирект на вход', async () => {
    const res = await request(app)
      .post('/section/1/topic')
      .send({ title: 'Тема', body: 'Текст' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('пустой заголовок — ошибка валидации', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/section/1/topic')
      .send({ title: '', body: 'Текст' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Заголовок темы обязателен');
  });

  test('пустое тело — ошибка валидации', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/section/1/topic')
      .send({ title: 'Тема', body: '' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Текст первого сообщения обязателен');
  });

  test('несуществующий раздел — 404', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/section/99999/topic')
      .send({ title: 'Тема', body: 'Текст' });

    expect(res.status).toBe(404);
  });
});

describe('Создание сообщения', () => {
  test('успешная отправка — редирект на последнюю страницу темы', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/topic/1/message')
      .send({ body: 'Новый ответ' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/topic\/1\?page=\d+$/);
  });

  test('отправка с файлом — вложение сохраняется в БД', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/topic/1/message')
      .field('body', 'Ответ с файлом')
      .attach('file', path.join(__dirname, '../setup.js'));

    expect(res.status).toBe(302);

    const messages = await messageDao.findByTopicId(1, {});
    const lastMsg = messages[messages.length - 1];
    const atts = await attachmentDao.findByMessageId(lastMsg.messageId);
    expect(atts.length).toBe(1);
  });

  test('гость — редирект на вход', async () => {
    const res = await request(app)
      .post('/topic/1/message')
      .send({ body: 'Ответ' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('пустое тело — ошибка валидации', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/topic/1/message')
      .send({ body: '' });

    expect(res.status).toBe(422);
    expect(res.text).toContain('Текст сообщения обязателен');
  });

  test('несуществующая тема — 404', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent
      .post('/topic/99999/message')
      .send({ body: 'Текст' });

    expect(res.status).toBe(404);
  });
});

describe('Удаление темы', () => {
  test('модератор удаляет тему — редирект на раздел', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.post('/topic/2/delete');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/section/2');

    const topicRes = await request(app).get('/topic/2');
    expect(topicRes.status).toBe(404);
  });

  test('обычный пользователь — 403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.post('/topic/2/delete');
    expect(res.status).toBe(403);
  });

  test('гость — редирект на вход', async () => {
    const res = await request(app).post('/topic/2/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('Удаление сообщения', () => {
  test('модератор удаляет сообщение', async () => {
    const agent = await loginAs(app, 'root', PASSWORDS.root);
    const res = await agent.post('/message/2/delete');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/topic/2');
  });

  test('обычный пользователь — 403', async () => {
    const agent = await loginAs(app, 'alice', PASSWORDS.alice);
    const res = await agent.post('/message/2/delete');
    expect(res.status).toBe(403);
  });

  test('гость — редирект на вход', async () => {
    const res = await request(app).post('/message/2/delete');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});