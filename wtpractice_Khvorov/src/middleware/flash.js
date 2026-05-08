function flashMiddleware(req, res, next) {
  if (!req.session) return next();

  req.flash = function(type, message) {
    if (!req.session.flash) req.session.flash = {};
    if (!req.session.flash[type]) req.session.flash[type] = [];
    req.session.flash[type].push(message);
  };

  res.locals.flash = req.session.flash || {};
  req.session.flash = {};

  next();
}

module.exports = { flashMiddleware };