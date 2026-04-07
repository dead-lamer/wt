const { sequelize, User, Section, Topic, Message, Attachment } = require('../src/models');

async function syncAndSeed() {
  await sequelize.sync({ force: true });

  if (sequelize.getDialect() === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = ON');
  }

  await User.bulkCreate([
    { login: 'root', password: 'hashed+salt_admin_pass', role: 'moderator', registeredAt: '2026-01-01T00:00:00Z' },
    { login: 'alice', password: 'hashed+salt_alice_pass', role: 'user', registeredAt: '2026-01-15T00:00:00Z' },
    { login: 'bob', password: 'hashed+salt_bob_pass', role: 'user', registeredAt: '2026-02-01T00:00:00Z' },
    { login: 'eve', password: 'hashed+salt_eve_pass', role: 'moderator', registeredAt: '2026-02-10T00:00:00Z' }
  ]);

  await Section.bulkCreate([
    { title: 'Общие вопросы', description: 'Обсуждение любых тем', userId: 1, createdAt: '2026-02-26T10:00:00Z' },
    { title: 'Программирование', description: 'Языки, фреймворки, алгоритмы', userId: 1, createdAt: '2026-02-26T10:05:00Z' },
    { title: 'Базы данных', description: 'PostgreSQL, MySQL, проектирование БД', userId: 4, createdAt: '2026-02-26T14:30:00Z' }
  ]);

  await Topic.bulkCreate([
    { sectionId: 1, userId: 1, title: 'Правила форума', createdAt: '2026-02-26T10:30:00Z' },
    { sectionId: 2, userId: 2, title: 'Как начать с Python?', createdAt: '2026-02-27T08:00:00Z' },
    { sectionId: 2, userId: 3, title: 'Лучшие практики Java', createdAt: '2026-02-27T14:00:00Z' },
    { sectionId: 3, userId: 4, title: 'Нормализация БД', createdAt: '2026-02-28T09:00:00Z' }
  ]);

  await Message.bulkCreate([
    { topicId: 1, userId: 1, title: 'Добро пожаловать', body: 'Пожалуйста, соблюдайте правила форума!', postedAt: '2026-02-26T11:00:00Z' },
    { topicId: 2, userId: 2, title: 'Вопрос', body: 'С каких библиотек лучше начать изучение Python?', postedAt: '2026-02-27T09:00:00Z' },
    { topicId: 2, userId: 3, title: 'Ответ', body: 'рекомендую начать с requests и pandas', postedAt: '2026-02-27T15:00:00Z' },
    { topicId: 4, userId: 4, title: 'Статья', body: 'Нормализация позволяет уменьшить избыточность данных.', postedAt: '2026-02-28T10:00:00Z' },
    { topicId: 4, userId: 2, title: null, body: 'Спасибо, очень полезно!', postedAt: '2026-02-28T12:00:00Z' }
  ]);

  await Attachment.bulkCreate([
    { messageId: 3, filename: 'python_guide.pdf', filepath: '/uploads/python_guide.pdf', filesize: 245760, mediaType: 'application/pdf', uploadedAt: '2026-02-27T15:05:00Z' },
    { messageId: 4, filename: 'db_schema.png', filepath: '/uploads/db_schema.png', filesize: 102400, mediaType: 'image/png', uploadedAt: '2026-02-28T10:05:00Z' },
    { messageId: 1, filename: 'rules.txt', filepath: '/uploads/rules.txt', filesize: 2048, mediaType: 'text/plain', uploadedAt: '2026-02-26T11:05:00Z' }
  ]);
}

module.exports = { sequelize, syncAndSeed };
