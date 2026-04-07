const { Section, User, Topic, Message } = require('../models');

class SectionDao {
  async createSection(title, description, userId) {
    return Section.create({ title, description, userId });
  }


   // возвращает все разделы + кол-во тем и последнее сообщение
   // да, тут N+1, но разделов немного, поэтому ок
  async findAll() {
    const sections = await Section.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['userId', 'login'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    const result = [];
    for (const section of sections) {
      const topicCount = await Topic.count({
        where: { sectionId: section.sectionId }
      });

      const lastMessage = await Message.findOne({
        include: [
          { model: Topic, as: 'topic', where: { sectionId: section.sectionId }, attributes: [] },
          { model: User, as: 'author', attributes: ['userId', 'login'] }
        ],
        order: [['postedAt', 'DESC']]
      });

      result.push({
        ...section.toJSON(),
        topicCount,
        lastMessage: lastMessage ? lastMessage.toJSON() : null
      });
    }

    return result;
  }

  async findById(sectionId) {
    return Section.findByPk(sectionId, {
      include: [
        { model: User, as: 'creator', attributes: ['userId', 'login'] }
      ]
    });
  }

  async deleteSection(sectionId) {
    return Section.destroy({ where: { sectionId } });
  }

  async findByTitle(title) {
    return Section.findOne({ where: { title } });
  }
}

module.exports = new SectionDao();
