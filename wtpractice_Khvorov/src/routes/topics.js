const express = require('express');
const topicDao = require('../dao/TopicDao');
const messageDao = require('../dao/MessageDao');
const attachmentDao = require('../dao/AttachmentDao');
const sectionDao = require('../dao/SectionDao');
const { requireAuth, requireModerator } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { Message } = require('../models/index');

const router = express.Router();
const PAGE_SIZE = 10;

async function countMessages(topicId) {
  const all = await messageDao.findByTopicId(topicId, {});
  return all.length;
}

router.get('/topic/:id', async (req, res) => {
  const topicId = parseInt(req.params.id, 10);
  if (isNaN(topicId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Тема не найдена',
      currentUser: res.locals.currentUser,
    });
  }

  try {
    const topic = await topicDao.findById(topicId);
    if (!topic) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Тема не найдена',
        currentUser: res.locals.currentUser,
      });
    }

    const section = await sectionDao.findById(topic.sectionId);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const totalCount = await countMessages(topicId);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const messages = await messageDao.findByTopicId(topicId, {
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
    });

    res.render('topic', {
      title: topic.title,
      topic,
      section,
      messages,
      currentPage: safePage,
      totalPages,
      errors: [],
    });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить тему',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/section/:id/topic', requireAuth, upload.single('file'), async (req, res) => {
  const sectionId = parseInt(req.params.id, 10);
  if (isNaN(sectionId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Раздел не найден',
      currentUser: res.locals.currentUser,
    });
  }

  const { title, body } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Заголовок темы обязателен');
  if (!body || !body.trim()) errors.push('Текст первого сообщения обязателен');

  if (errors.length) {
    const section = await sectionDao.findById(sectionId).catch(() => null);
    const topics = await topicDao.findBySectionId(sectionId, {}).catch(() => []);
    return res.status(422).render('section', {
      title: section ? section.title : 'Раздел',
      section,
      topics,
      currentPage: 1,
      totalPages: 1,
      sort: 'newest',
      errors,
    });
  }

  try {
    const section = await sectionDao.findById(sectionId);
    if (!section) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Раздел не найден',
        currentUser: res.locals.currentUser,
      });
    }

    const userId = res.locals.currentUser.userId;
    const topic = await topicDao.createTopic(sectionId, userId, title.trim());
    const message = await messageDao.createMessage(topic.topicId, userId, body.trim(), null);

    if (req.file) {
      await attachmentDao.createAttachment(
        message.messageId,
        req.file.originalname,
        '/uploads/' + req.file.filename,
        req.file.size,
        req.file.mimetype || null
      );
    }

    res.redirect('/topic/' + topic.topicId);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось создать тему',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/topic/:id/message', requireAuth, upload.single('file'), async (req, res) => {
  const topicId = parseInt(req.params.id, 10);
  if (isNaN(topicId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Тема не найдена',
      currentUser: res.locals.currentUser,
    });
  }

  const { body, title: msgTitle } = req.body;
  const errors = [];

  if (!body || !body.trim()) errors.push('Текст сообщения обязателен');

  if (errors.length) {
    const topic = await topicDao.findById(topicId).catch(() => null);
    const section = topic ? await sectionDao.findById(topic.sectionId).catch(() => null) : null;
    const messages = await messageDao.findByTopicId(topicId, {}).catch(() => []);
    const totalPages = Math.max(1, Math.ceil(messages.length / PAGE_SIZE));
    return res.status(422).render('topic', {
      title: topic ? topic.title : 'Тема',
      topic,
      section,
      messages: messages.slice(0, PAGE_SIZE),
      currentPage: 1,
      totalPages,
      errors,
    });
  }

  try {
    const topic = await topicDao.findById(topicId);
    if (!topic) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Тема не найдена',
        currentUser: res.locals.currentUser,
      });
    }

    const userId = res.locals.currentUser.userId;
    const message = await messageDao.createMessage(
      topicId,
      userId,
      body.trim(),
      msgTitle && msgTitle.trim() ? msgTitle.trim() : null
    );

    if (req.file) {
      await attachmentDao.createAttachment(
        message.messageId,
        req.file.originalname,
        '/uploads/' + req.file.filename,
        req.file.size,
        req.file.mimetype || null
      );
    }

    const totalCount = await countMessages(topicId);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    res.redirect('/topic/' + topicId + '?page=' + totalPages);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось отправить сообщение',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/topic/:id/delete', requireModerator, async (req, res) => {
  const topicId = parseInt(req.params.id, 10);
  if (isNaN(topicId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Тема не найдена',
      currentUser: res.locals.currentUser,
    });
  }
  try {
    const topic = await topicDao.findById(topicId);
    const sectionId = topic ? topic.sectionId : null;
    await topicDao.deleteTopic(topicId);
    if (sectionId) return res.redirect('/section/' + sectionId);
    res.redirect('/');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось удалить тему',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/message/:id/delete', requireModerator, async (req, res) => {
  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Сообщение не найдено',
      currentUser: res.locals.currentUser,
    });
  }
  try {
    const message = await Message.findByPk(messageId);
    const topicId = message ? message.topicId : null;
    await messageDao.deleteMessage(messageId);
    if (topicId) return res.redirect('/topic/' + topicId);
    res.redirect('/');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось удалить сообщение',
      currentUser: res.locals.currentUser,
    });
  }
});

module.exports = router;