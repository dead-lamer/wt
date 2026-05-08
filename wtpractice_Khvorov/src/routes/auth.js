const express = require('express');
const bcrypt = require('bcryptjs');
const userDao = require('../dao/UserDao');

const router = express.Router();

router.get('/register', (req, res) => {
  if (res.locals.currentUser) return res.redirect('/');
  res.render('register', { title: 'Регистрация', errors: [] });
});

router.post('/register', async (req, res) => {
  const { login, password, confirm } = req.body;
  const errors = [];

  if (!login || !login.trim()) errors.push('Логин обязателен');
  if (!password) errors.push('Пароль обязателен');
  else if (password.length < 4) errors.push('Пароль должен содержать минимум 4 символа');
  else if (password !== confirm) errors.push('Пароли не совпадают');

  if (errors.length) {
    return res.status(422).render('register', { title: 'Регистрация', errors });
  }

  try {
    const existing = await userDao.findByLogin(login.trim());
    if (existing) {
      return res.status(422).render('register', {
        title: 'Регистрация',
        errors: ['Пользователь с таким логином уже существует'],
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await userDao.createUser(login.trim(), hash, 'user');

    req.session.userId = user.userId;
    req.session.login = user.login;
    req.session.role = user.role;

    res.redirect('/');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Внутренняя ошибка сервера',
      currentUser: res.locals.currentUser,
    });
  }
});

router.get('/login', (req, res) => {
  if (res.locals.currentUser) return res.redirect('/');
  res.render('login', { title: 'Вход', errors: [] });
});

router.post('/login', async (req, res) => {
  const errors = [];

  try {
    const user = await userDao.findByLogin((req.body.login || '').trim());
    if (!user) {
      errors.push('Неверный логин или пароль');
      return res.status(401).render('login', { title: 'Вход', errors });
    }

    if (user.isBlocked) {
      errors.push('Аккаунт заблокирован');
      return res.status(403).render('login', { title: 'Вход', errors });
    }

    const match = await bcrypt.compare(req.body.password || '', user.password);
    if (!match) {
      errors.push('Неверный логин или пароль');
      return res.status(401).render('login', { title: 'Вход', errors });
    }

    req.session.userId = user.userId;
    req.session.login = user.login;
    req.session.role = user.role;

    res.redirect('/');
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Внутренняя ошибка сервера',
      currentUser: res.locals.currentUser,
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;