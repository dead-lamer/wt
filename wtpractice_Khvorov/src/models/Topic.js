const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Topic', {
    topicId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'topic'
  });
};
