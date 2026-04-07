const { syncAndSeed } = require('./setup');
const messageDao = require('../src/dao/MessageDao');
const { Attachment } = require('../src/models');

beforeEach(async () => {
  await syncAndSeed();
});

describe('MessageDao', () => {

  describe('createMessage', () => {
    it('создает сообщение с заголовком', async () => {
      const msg = await messageDao.createMessage(1, 2, 'Текст сообщения', 'Заголовок');

      expect(msg.messageId).toBeDefined();
      expect(msg.topicId).toBe(1);
      expect(msg.userId).toBe(2);
      expect(msg.title).toBe('Заголовок');
      expect(msg.body).toBe('Текст сообщения');
      expect(msg.postedAt).toBeDefined();
    });

    it('без заголовка — title = null', async () => {
      const msg = await messageDao.createMessage(1, 2, 'Просто текст');

      expect(msg.title).toBeNull();
      expect(msg.body).toBe('Просто текст');
    });
  });

  describe('findByTopicId', () => {
    it('сообщения с авторами и вложениями', async () => {
      // topic 2 : msg 2 (alice), msg 3 (bob + attachment)
      const messages = await messageDao.findByTopicId(2);

      expect(messages).toHaveLength(2);

      expect(messages[0].title).toBe('Вопрос');
      expect(messages[0].author.login).toBe('alice');
      expect(messages[0].attachments).toHaveLength(0);

      expect(messages[1].title).toBe('Ответ');
      expect(messages[1].author.login).toBe('bob');
      expect(messages[1].attachments).toHaveLength(1);
      expect(messages[1].attachments[0].filename).toBe('python_guide.pdf');
    });

    test('пагинация', async () => {
      const page1 = await messageDao.findByTopicId(2, { limit: 1, offset: 0 });
      expect(page1).toHaveLength(1);

      const page2 = await messageDao.findByTopicId(2, { limit: 1, offset: 1 });
      expect(page2).toHaveLength(1);

      expect(page1[0].messageId).not.toBe(page2[0].messageId);
    });

    test('пустой массив если тема пустая', async () => {
      // topic 3 (Java) нет сообщений
      const messages = await messageDao.findByTopicId(3);
      expect(messages).toHaveLength(0);
    });
  });

  describe('deleteMessage', () => {
    test('удаляет сообщение', async () => {
      const deleted = await messageDao.deleteMessage(2);
      expect(deleted).toBe(1);

      const messages = await messageDao.findByTopicId(2);
      expect(messages).toHaveLength(1);
      expect(messages[0].messageId).toBe(3);
    });

    it('каскадно удаляет вложения', async () => {
      // msg 3 имеет вложение python_guide.pdf
      await messageDao.deleteMessage(3);

      const attachments = await Attachment.findAll({ where: { messageId: 3 } });
      expect(attachments).toHaveLength(0);
    });

    test('0 если id не существует', async () => {
      const deleted = await messageDao.deleteMessage(999);
      expect(deleted).toBe(0);
    });
  });

  describe('countByUserId', () => {
    test('считает сообщения пользователя', async () => {
      // alice (id=2): msg 2 и msg 5
      const count = await messageDao.countByUserId(2);
      expect(count).toBe(2);
    });

    test('возвращает 0 для пользователя без сообщений', async () => {
      const count = await messageDao.countByUserId(999);
      expect(count).toBe(0);
    });
  });

  describe('getLastMessageInSection', () => {
    it('последнее сообщение в разделе', async () => {
      // section 2: topic 2 -> msg 2 (09:00), msg 3 (15:00) -> последнее msg 3
      const msg = await messageDao.getLastMessageInSection(2);

      expect(msg).not.toBeNull();
      expect(msg.messageId).toBe(3);
      expect(msg.body).toBe('рекомендую начать с requests и pandas');
      expect(msg.author.login).toBe('bob');
    });

    // проверяем еще и для другого раздела
    test('другой раздел', async () => {
      // section 3: topic 4 -> msg 4 (10:00), msg 5 (12:00) -> последнее msg 5
      const msg = await messageDao.getLastMessageInSection(3);

      expect(msg).not.toBeNull();
      expect(msg.messageId).toBe(5);
      expect(msg.body).toBe('Спасибо, очень полезно!');
      expect(msg.author.login).toBe('alice');
    });

    test('null если нет сообщений', async () => {
      const msg = await messageDao.getLastMessageInSection(999);
      expect(msg).toBeNull();
    });
  });

  describe('getActivityStats', () => {
    it('статистика по дням', async () => {
      const stats = await messageDao.getActivityStats(
        '2026-02-26T00:00:00Z',
        '2026-02-28T23:59:59Z'
      );

      expect(stats).toHaveLength(3);
      expect(stats[0].date).toBe('2026-02-26');
      expect(stats[0].count).toBe(1);
      expect(stats[1].date).toBe('2026-02-27');
      expect(stats[1].count).toBe(2);
      expect(stats[2].date).toBe('2026-02-28');
      expect(stats[2].count).toBe(2);
    });

    it('фильтр по пользователю', async () => {
      // alice (id=2): msg 2 (27 фев), msg 5 (28 фев)
      const stats = await messageDao.getActivityStats(
        '2026-02-26T00:00:00Z',
        '2026-02-28T23:59:59Z',
        null,
        2
      );

      expect(stats).toHaveLength(2);
      expect(stats[0].date).toBe('2026-02-27');
      expect(stats[0].count).toBe(1);
      expect(stats[1].date).toBe('2026-02-28');
      expect(stats[1].count).toBe(1);
    });

    test('фильтр по разделу', async () => {
      // section 2: topics 2,3 -> msg 2,3 (обе 27 февраля)
      const stats = await messageDao.getActivityStats(
        '2026-02-26T00:00:00Z',
        '2026-02-28T23:59:59Z',
        2
      );

      expect(stats).toHaveLength(1);
      expect(stats[0].date).toBe('2026-02-27');
      expect(stats[0].count).toBe(2);
    });

    test('пусто если даты мимо', async () => {
      const stats = await messageDao.getActivityStats(
        '2020-01-01T00:00:00Z',
        '2020-01-31T23:59:59Z'
      );

      expect(stats).toEqual([]);
    });
  });

});
