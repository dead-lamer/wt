const express = require('express');
const session = require('express-session');
const path = require('path');

const { injectUser } = require('./middleware/auth');
const { flashMiddleware } = require('./middleware/flash');

const authRoutes = require('./routes/auth');
const sectionRoutes = require('./routes/sections');
const topicRoutes = require('./routes/topics');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'forum-secret-key-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use(flashMiddleware);
app.use(injectUser);

app.use('/', authRoutes);
app.use('/', sectionRoutes);
app.use('/', topicRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Страница не найдена',
    message: 'Запрошенная страница не существует',
    currentUser: res.locals.currentUser,
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Внутренняя ошибка',
    message: 'Что-то пошло не так. Попробуйте позже',
    currentUser: res.locals.currentUser,
  });
});

module.exports = app;