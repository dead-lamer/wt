const express = require('express');
const sectionDao = require('../dao/SectionDao');
const topicDao = require('../dao/TopicDao');

const router = express.Router();
const PAGE_SIZE = 10;

router.get('/', async (req, res) => {
  try {
    const sections = await sectionDao.findAll();
    res.render('index', { title: 'Веб-форум', sections });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить список разделов',
      currentUser: res.locals.currentUser,
    });
  }
});

router.get('/section/:id', async (req, res) => {
  const sectionId = parseInt(req.params.id, 10);
  if (isNaN(sectionId)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Раздел не найден',
      currentUser: res.locals.currentUser,
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const sort = req.query.sort || 'newest';

    let order;
    if (sort === 'oldest') order = [['createdAt', 'ASC']];
    else if (sort === 'title') order = [['title', 'ASC']];
    else order = [['createdAt', 'DESC']];

    const total = await topicDao.countBySectionId(sectionId);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const topics = await topicDao.findBySectionId(sectionId, {
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
      order,
    });

    res.render('section', {
      title: section.title,
      section,
      topics,
      currentPage: safePage,
      totalPages,
      sort,
      errors: [],
    });
  } catch (err) {
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Не удалось загрузить раздел',
      currentUser: res.locals.currentUser,
    });
  }
});

module.exports = router;