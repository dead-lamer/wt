const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Attachment', {
    attachmentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    filepath: {
      type: DataTypes.STRING(512),
      allowNull: false
    },
    filesize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mediaType: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'attachment'
  });
};
