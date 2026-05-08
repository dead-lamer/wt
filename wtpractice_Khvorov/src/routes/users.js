const express = require('express');
const bcrypt = require('bcryptjs');
const userDao = require('../dao/UserDao');
const topicDao = require('../dao/TopicDao');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Пользователь не найден',
      currentUser: res.locals.currentUser,
    });
  }

  try {
    const profileUser = await userDao.findById(userId);
    if (!profileUser) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Пользователь не найден',
        currentUser: res.locals.currentUser,
      });
    }

    const stats = await userDao.getUserStats(userId);
    const topics = await topicDao.getTopicsByUser(userId);
    const current = res.locals.currentUser;
    const isOwner = current && current.userId === userId;
    const isModerator = current && current.role === 'moderator';

    res.render('user', {
      title: 'Профиль: ' + profileUser.login,
      profileUser,
      stats,
      topics,
      isOwner,
      isModerator,
      errors: [],
    });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить профиль',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/user/:id/password', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const current = res.locals.currentUser;

  if (isNaN(userId) || current.userId !== userId) {
    return res.status(403).render('error', {
      title: 'Доступ запрещён',
      message: 'Вы можете менять только собственный пароль',
      currentUser: current,
    });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  const errors = [];

  if (!currentPassword) errors.push('Текущий пароль обязателен');
  if (!newPassword) errors.push('Новый пароль обязателен');
  else if (newPassword.length < 4) errors.push('Новый пароль должен содержать минимум 4 символа');
  else if (newPassword !== confirmPassword) errors.push('Новые пароли не совпадают');

  const profileUser = await userDao.findById(userId).catch(() => null);
  const stats = await userDao.getUserStats(userId).catch(() => null);
  const topics = await topicDao.getTopicsByUser(userId).catch(() => []);

  if (errors.length) {
    return res.status(422).render('user', {
      title: 'Профиль: ' + (profileUser ? profileUser.login : ''),
      profileUser,
      stats,
      topics,
      isOwner: true,
      isModerator: current.role === 'moderator',
      errors,
    });
  }

  const match = await bcrypt.compare(currentPassword, profileUser.password);
  if (!match) {
    return res.status(422).render('user', {
      title: 'Профиль: ' + profileUser.login,
      profileUser,
      stats,
      topics,
      isOwner: true,
      isModerator: current.role === 'moderator',
      errors: ['Текущий пароль неверен'],
    });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await userDao.updatePassword(userId, hash);
    res.redirect('/user/' + userId);
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось сменить пароль',
      currentUser: current,
    });
  }
});

module.exports = router;