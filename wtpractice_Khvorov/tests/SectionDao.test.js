const { syncAndSeed } = require('./setup');
const sectionDao = require('../src/dao/SectionDao');
const topicDao = require('../src/dao/TopicDao');
const { Topic, Message } = require('../src/models');

beforeEach(async () => {
  await syncAndSeed();
});

describe('SectionDao', () => {

  describe('createSection', () => {
    it('создает раздел', async () => {
      const section = await sectionDao.createSection('Новый раздел', 'Описание', 1);

      expect(section.sectionId).toBeDefined();
      expect(section.title).toBe('Новый раздел');
      expect(section.description).toBe('Описание');
      expect(section.userId).toBe(1);
      expect(section.createdAt).toBeDefined();
    });

    test('можно без описания', async () => {
      const section = await sectionDao.createSection('Без описания', null, 1);

      expect(section.title).toBe('Без описания');
      expect(section.description).toBeNull();
    });

    test('пустой title — ошибка', async () => {
      await expect(
        sectionDao.createSection(null, 'Описание', 1)
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('возвращает разделы со счетчиками', async () => {
      const sections = await sectionDao.findAll();

      expect(sections).toHaveLength(3);

      // Общие вопросы
      expect(sections[0].title).toBe('Общие вопросы');
      expect(sections[0].description).toBe('Обсуждение любых тем');
      expect(sections[0].creator.login).toBe('root');
      expect(sections[0].topicCount).toBe(1);
      expect(sections[0].lastMessage).not.toBeNull();
      expect(sections[0].lastMessage.title).toBe('Добро пожаловать');

      // Программирование - 2 темы, последнее сообщение из topic 2
      expect(sections[1].title).toBe('Программирование');
      expect(sections[1].topicCount).toBe(2);
      expect(sections[1].lastMessage).not.toBeNull();
      expect(sections[1].lastMessage.body).toBe('рекомендую начать с requests и pandas');

      // Базы данных
      expect(sections[2].title).toBe('Базы данных');
      expect(sections[2].creator.login).toBe('eve');
      expect(sections[2].topicCount).toBe(1);
      expect(sections[2].lastMessage.body).toBe('Спасибо, очень полезно!');
    });
  });

  describe('findById', () => {
    it('возвращает раздел с данными создателя', async () => {
      const section = await sectionDao.findById(1);

      expect(section).not.toBeNull();
      expect(section.sectionId).toBe(1);
      expect(section.title).toBe('Общие вопросы');
      expect(section.creator).toBeDefined();
      expect(section.creator.login).toBe('root');
    });

    test('null если нет такого id', async () => {
      const section = await sectionDao.findById(999);
      expect(section).toBeNull();
    });
  });

  describe('findByTitle', () => {
    it('находит по названию', async () => {
      const section = await sectionDao.findByTitle('Программирование');

      expect(section).not.toBeNull();
      expect(section.sectionId).toBe(2);
      expect(section.title).toBe('Программирование');
    });

    test('null если названия нет', async () => {
      const section = await sectionDao.findByTitle('Несуществующий');
      expect(section).toBeNull();
    });
  });

  describe('deleteSection', () => {
    test('удаляет раздел и возвращает 1', async () => {
      const deleted = await sectionDao.deleteSection(2);
      expect(deleted).toBe(1);

      const section = await sectionDao.findById(2);
      expect(section).toBeNull();
    });

    it('каскадно удаляет темы и сообщения', async () => {
      await sectionDao.deleteSection(2);

      // темы section 2 (topics 2, 3) должны быть удалены
      const topics = await Topic.findAll({ where: { sectionId: 2 } });
      expect(topics).toHaveLength(0);

      // сообщения topic 2 (msg 2, 3) тоже
      const messages = await Message.findAll({ where: { topicId: 2 } });
      expect(messages).toHaveLength(0);
    });

    test('0 при удалении несуществующего', async () => {
      const deleted = await sectionDao.deleteSection(999);
      expect(deleted).toBe(0);
    });
  });

});
