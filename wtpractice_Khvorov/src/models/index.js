const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config);

const User = require('./User')(sequelize);
const Section = require('./Section')(sequelize);
const Topic = require('./Topic')(sequelize);
const Message = require('./Message')(sequelize);
const Attachment = require('./Attachment')(sequelize);

// ассоциации

User.hasMany(Section, { foreignKey: 'userId', as: 'sections', onDelete: 'CASCADE' });
Section.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

User.hasMany(Topic, { foreignKey: 'userId', as: 'topics', onDelete: 'CASCADE' });
Topic.belongsTo(User, { foreignKey: 'userId', as: 'author' });

User.hasMany(Message, { foreignKey: 'userId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'author' });

Section.hasMany(Topic, { foreignKey: 'sectionId', as: 'topics', onDelete: 'CASCADE' });
Topic.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

Topic.hasMany(Message, { foreignKey: 'topicId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic' });

Message.hasMany(Attachment, { foreignKey: 'messageId', as: 'attachments', onDelete: 'CASCADE' });
Attachment.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });

module.exports = { sequelize, Sequelize, User, Section, Topic, Message, Attachment };
