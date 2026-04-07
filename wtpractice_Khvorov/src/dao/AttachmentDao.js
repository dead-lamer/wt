const { Attachment } = require('../models');

class AttachmentDao {
  async createAttachment(messageId, filename, filepath, filesize, mediaType = null) {
    return Attachment.create({ messageId, filename, filepath, filesize, mediaType });
  }

  async findByMessageId(messageId) {
    return Attachment.findAll({
      where: { messageId },
      order: [['uploadedAt', 'ASC']]
    });
  }

  async findById(attachmentId) {
    return Attachment.findByPk(attachmentId);
  }

  async deleteByMessageId(messageId) {
    return Attachment.destroy({ where: { messageId } });
  }
}

module.exports = new AttachmentDao();
