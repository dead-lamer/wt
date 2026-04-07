const { syncAndSeed } = require('./setup');
const attachmentDao = require('../src/dao/AttachmentDao');
const { Attachment } = require('../src/models');

beforeEach(async () => {
  await syncAndSeed();
});

describe('AttachmentDao', () => {

  describe('createAttachment', () => {
    it('создает вложение с mediaType', async () => {
      const att = await attachmentDao.createAttachment(
        1, 'doc.pdf', '/uploads/doc.pdf', 50000, 'application/pdf'
      );

      expect(att.attachmentId).toBeDefined();
      expect(att.messageId).toBe(1);
      expect(att.filename).toBe('doc.pdf');
      expect(att.filepath).toBe('/uploads/doc.pdf');
      expect(att.filesize).toBe(50000);
      expect(att.mediaType).toBe('application/pdf');
      expect(att.uploadedAt).toBeDefined();
    });

    it('без mediaType — null', async () => {
      const att = await attachmentDao.createAttachment(
        1, 'archive.zip', '/uploads/archive.zip', 1024000
      );

      expect(att.filename).toBe('archive.zip');
      expect(att.mediaType).toBeNull();
    });
  });

  describe('findByMessageId', () => {
    test('вложения сообщения', async () => {
      // msg 1 — rules.txt
      const attachments = await attachmentDao.findByMessageId(1);

      expect(attachments).toHaveLength(1);
      expect(attachments[0].filename).toBe('rules.txt');
      expect(attachments[0].filepath).toBe('/uploads/rules.txt');
      expect(attachments[0].filesize).toBe(2048);
      expect(attachments[0].mediaType).toBe('text/plain');
    });

    it('пусто если вложений нет', async () => {
      // msg 2
      const attachments = await attachmentDao.findByMessageId(2);
      expect(attachments).toHaveLength(0);
    });
  });

  describe('findById', () => {
    test('находит по id', async () => {
      const att = await attachmentDao.findById(1);

      expect(att).not.toBeNull();
      expect(att.attachmentId).toBe(1);
      expect(att.filename).toBe('python_guide.pdf');
      expect(att.filesize).toBe(245760);
      expect(att.mediaType).toBe('application/pdf');
    });

    it('null если нет', async () => {
      const att = await attachmentDao.findById(999);
      expect(att).toBeNull();
    });
  });

  describe('deleteByMessageId', () => {
    it('удаляет все вложения', async () => {
      // у msg 1 одно вложение
      const deleted = await attachmentDao.deleteByMessageId(1);
      expect(deleted).toBe(1);

      const remaining = await attachmentDao.findByMessageId(1);
      expect(remaining).toHaveLength(0);
    });

    test('0 если вложений не было', async () => {
      const deleted = await attachmentDao.deleteByMessageId(2);
      expect(deleted).toBe(0);
    });
  });

});
