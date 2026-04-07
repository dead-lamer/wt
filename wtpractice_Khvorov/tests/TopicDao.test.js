const { syncAndSeed } = require('./setup');
const topicDao = require('../src/dao/TopicDao');
const { Message } = require('../src/models');

beforeEach(async () => {
  await syncAndSeed();
});

describe('TopicDao', () => {

  describe('createTopic', () => {
    it('создает тему', async () => {
      const topic = await topicDao.createTopic(1, 2, 'Новая тема');

      expect(topic.topicId).toBeDefined();
      expect(topic.sectionId).toBe(1);
      expect(topic.userId).toBe(2);
      expect(topic.title).toBe('Новая тема');
      expect(topic.createdAt).toBeDefined();
    });
  });

  describe('findBySectionId', () => {
    test('возвращает темы раздела', async () => {
      const topics = await topicDao.findBySectionId(2);

      expect(topics).toHaveLength(2);
      // DESC по умолчанию — сначала более поздняя
      expect(topics[0].title).toBe('Лучшие практики Java');
      expect(topics[0].author.login).toBe('bob');
      expect(topics[1].title).toBe('Как начать с Python?');
      expect(topics[1].author.login).toBe('alice');
    });

    it('пустой массив для раздела без тем', async () => {
      const { Section } = require('../src/models');
      await Section.create({ title: 'Пустой', description: null, userId: 1 });
      const newSection = await Section.findOne({ where: { title: 'Пустой' } });

      const topics = await topicDao.findBySectionId(newSection.sectionId);
      expect(topics).toHaveLength(0);
    });

    it('пагинация', async () => {
      const page1 = await topicDao.findBySectionId(2, { limit: 1, offset: 0 });
      expect(page1).toHaveLength(1);

      const page2 = await topicDao.findBySectionId(2, { limit: 1, offset: 1 });
      expect(page2).toHaveLength(1);

      expect(page1[0].topicId).not.toBe(page2[0].topicId);
    });

    test('сортировка ASC', async () => {
      const asc = await topicDao.findBySectionId(2, { order: [['createdAt', 'ASC']] });

      expect(asc).toHaveLength(2);
      expect(asc[0].title).toBe('Как начать с Python?');
      expect(asc[1].title).toBe('Лучшие практики Java');
    });
  });

  describe('findById', () => {
    test('возвращает тему по id', async () => {
      const topic = await topicDao.findById(2);

      expect(topic).not.toBeNull();
      expect(topic.topicId).toBe(2);
      expect(topic.title).toBe('Как начать с Python?');
      expect(topic.sectionId).toBe(2);
      expect(topic.author.login).toBe('alice');
    });

    it('null если нет', async () => {
      const topic = await topicDao.findById(999);
      expect(topic).toBeNull();
    });
  });

  describe('deleteTopic', () => {
    it('удаляет тему + каскад сообщений', async () => {
      const deleted = await topicDao.deleteTopic(2);
      expect(deleted).toBe(1);

      const topic = await topicDao.findById(2);
      expect(topic).toBeNull();

      // сообщения topic 2 (msg 2, 3) и вложение msg 3 удалены каскадно
      const messages = await Message.findAll({ where: { topicId: 2 } });
      expect(messages).toHaveLength(0);
    });

    test('возвращает 0 при удалении несуществующей темы', async () => {
      const deleted = await topicDao.deleteTopic(999);
      expect(deleted).toBe(0);
    });
  });

  describe('getTopicsByUser', () => {
    test('возвращает темы пользователя', async () => {
      // root (id=1) создал topic 1
      const topics = await topicDao.getTopicsByUser(1);

      expect(topics).toHaveLength(1);
      expect(topics[0].title).toBe('Правила форума');
      expect(topics[0].userId).toBe(1);
    });

    test('пустой массив если нет тем', async () => {
      const topics = await topicDao.getTopicsByUser(999);
      expect(topics).toHaveLength(0);
    });
  });

  describe('countBySectionId', () => {
    test('считает темы в разделе', async () => {
      const count = await topicDao.countBySectionId(2);
      expect(count).toBe(2);
    });

    test('возвращает 0 для пустого раздела', async () => {
      const count = await topicDao.countBySectionId(999);
      expect(count).toBe(0);
    });
  });

});
