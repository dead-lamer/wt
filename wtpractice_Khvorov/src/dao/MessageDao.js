const { Message, User, Topic, Attachment, sequelize, Sequelize } = require('../models');
const { Op } = Sequelize;

class MessageDao {
  async createMessage(topicId, userId, body, title = null) {
    return Message.create({ topicId, userId, body, title });
  }

  async findByTopicId(topicId, options = {}) {
    const { limit, offset } = options;

    const queryOpts = {
      where: { topicId },
      include: [
        { model: User, as: 'author', attributes: ['userId', 'login'] },
        { model: Attachment, as: 'attachments' }
      ],
      order: [['postedAt', 'ASC']]
    };

    if (limit !== undefined) queryOpts.limit = limit;
    if (offset !== undefined) queryOpts.offset = offset;

    return await Message.findAll(queryOpts);
  }

  async deleteMessage(messageId) {
    return Message.destroy({ where: { messageId } });
  }

  async countByUserId(userId) {
    return Message.count({ where: { userId } });
  }

  async getLastMessageInSection(sectionId) {
    return await Message.findOne({
      include: [
        { model: Topic, as: 'topic', where: { sectionId }, attributes: [] },
        { model: User, as: 'author', attributes: ['userId', 'login'] }
      ],
      order: [['postedAt', 'DESC']]
    });
  }

  // статистика активности для панели модератора
  async getActivityStats(dateFrom, dateTo, sectionId = null, userId = null) {
    const where = {
      postedAt: { [Op.between]: [dateFrom, dateTo] }
    };

    if (userId) where.userId = userId;

    if (sectionId) {
      const topics = await Topic.findAll({
        where: { sectionId },
        attributes: ['topicId'],
        raw: true
      });
      where.topicId = { [Op.in]: topics.map(t => t.topicId) };
    }

    const rows = await Message.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('posted_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('message_id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('posted_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('posted_at')), 'ASC']],
      raw: true
    });

    return rows.map(r => ({
      date: r.date,
      count: Number(r.count)
    }));
  }
}

module.exports = new MessageDao();
