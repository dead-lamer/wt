const express = require('express');
const sectionDao = require('../dao/SectionDao');
const userDao = require('../dao/UserDao');
const messageDao = require('../dao/MessageDao');
const { requireModerator } = require('../middleware/auth');

const router = express.Router();

router.use(requireModerator);

router.get('/', async (req, res) => {
  try {
    const sections = await sectionDao.findAll();
    const statusFilter = req.query.status;
    let usersFilter = {};
    if (statusFilter === 'blocked') usersFilter = { isBlocked: true };
    else if (statusFilter === 'active') usersFilter = { isBlocked: false };

    const users = await userDao.findAll(usersFilter);

    res.render('admin', {
      title: 'Панель модератора',
      sections,
      users,
      statusFilter: statusFilter || '',
      sectionErrors: [],
      statsData: null,
      statsParams: {},
    });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить панель модератора',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/section', async (req, res) => {
  const { title, description } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Заголовок раздела обязателен');

  const sections = await sectionDao.findAll().catch(() => []);
  const users = await userDao.findAll({}).catch(() => []);

  if (errors.length) {
    return res.status(422).render('admin', {
      title: 'Панель модератора',
      sections,
      users,
      statusFilter: '',
      sectionErrors: errors,
      statsData: null,
      statsParams: {},
    });
  }

  const existing = await sectionDao.findByTitle(title.trim()).catch(() => null);
  if (existing) {
    return res.status(422).render('admin', {
      title: 'Панель модератора',
      sections,
      users,
      statusFilter: '',
      sectionErrors: ['Раздел с таким названием уже существует'],
      statsData: null,
      statsParams: {},
    });
  }

  try {
    await sectionDao.createSection(
      title.trim(),
      description && description.trim() ? description.trim() : null,
      res.locals.currentUser.userId
    );
    res.redirect('/admin');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось создать раздел',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/section/:id/delete', async (req, res) => {
  const sectionId = parseInt(req.params.id, 10);
  if (isNaN(sectionId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Раздел не найден',
      currentUser: res.locals.currentUser,
    });
  }
  try {
    await sectionDao.deleteSection(sectionId);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось удалить раздел',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/user/:id/block', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Пользователь не найден',
      currentUser: res.locals.currentUser,
    });
  }
  try {
    await userDao.setBlocked(userId, true);
    res.redirect('/user/' + userId);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось заблокировать пользователя',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/user/:id/unblock', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Пользователь не найден',
      currentUser: res.locals.currentUser,
    });
  }
  try {
    await userDao.setBlocked(userId, false);
    res.redirect('/user/' + userId);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось разблокировать пользователя',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/user/:id/role', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Пользователь не найден',
      currentUser: res.locals.currentUser,
    });
  }
  let { role } = req.body;
  if (role !== 'moderator') role = 'user';

  try {
    await userDao.updateRole(userId, role);
    res.redirect('/user/' + userId);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось обновить роль',
      currentUser: res.locals.currentUser,
    });
  }
});

router.get('/stats', async (req, res) => {
  const { from, to, sectionId, userId } = req.query;

  const sections = await sectionDao.findAll().catch(() => []);
  const users = await userDao.findAll({}).catch(() => []);

  if (!from || !to) {
    return res.render('admin', {
      title: 'Панель модератора',
      sections,
      users,
      statusFilter: '',
      sectionErrors: [],
      statsData: null,
      statsParams: { from, to, sectionId, userId },
    });
  }

  try {
    const secId = sectionId ? parseInt(sectionId, 10) : null;
    const uId = userId ? parseInt(userId, 10) : null;

    const stats = await messageDao.getActivityStats(
      from,
      to,
      isNaN(secId) ? null : secId,
      isNaN(uId) ? null : uId
    );

    res.render('admin', {
      title: 'Панель модератора',
      sections,
      users,
      statusFilter: '',
      sectionErrors: [],
      statsData: stats,
      statsParams: { from, to, sectionId: sectionId || '', userId: userId || '' },
    });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить статистику',
      currentUser: res.locals.currentUser,
    });
  }
});

module.exports = router;