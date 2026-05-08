const userDao = require('../dao/UserDao');

async function injectUser(req, res, next) {
  res.locals.currentUser = null;
  if (!req.session || !req.session.userId) {
    return next();
  }
  try {
    const user = await userDao.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return next();
    }
    if (user.isBlocked) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
      return;
    }
    res.locals.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAuth(req, res, next) {
  if (!res.locals.currentUser) {
    return res.redirect('/login');
  }
  next();
}

function requireModerator(req, res, next) {
  const u = res.locals.currentUser;
  if (!u) {
    return res.redirect('/login');
  }
  if (u.role !== 'moderator') {
    return res.status(403).render('error', {
      title: 'Доступ запрещён',
      message: 'Эта страница доступна только модераторам',
      currentUser: u,
    });
  }
  next();
}

module.exports = { injectUser, requireAuth, requireModerator };