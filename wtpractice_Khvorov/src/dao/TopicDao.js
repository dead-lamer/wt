const { Topic, User, Message } = require('../models');

class TopicDao {
  async createTopic(sectionId, userId, title) {
    return Topic.create({ sectionId, userId, title });
  }

  async findBySectionId(sectionId, options = {}) {
    const { limit, offset, order = [['createdAt', 'DESC']] } = options;

    const queryOpts = {
      where: { sectionId },
      include: [
        { model: User, as: 'author', attributes: ['userId', 'login'] }
      ],
      order
    };

    if (limit !== undefined) queryOpts.limit = limit;
    if (offset !== undefined) queryOpts.offset = offset;

    return await Topic.findAll(queryOpts);
  }

  async findById(topicId) {
    return Topic.findByPk(topicId, {
      include: [
        { model: User, as: 'author', attributes: ['userId', 'login'] }
      ]
    });
  }

  async deleteTopic(topicId) {
    return Topic.destroy({ where: { topicId } });
  }

  async getTopicsByUser(userId) {
    return Topic.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async countBySectionId(sectionId) {
    return Topic.count({ where: { sectionId } });
  }
}

module.exports = new TopicDao();
