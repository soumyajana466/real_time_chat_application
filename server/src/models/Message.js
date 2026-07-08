const { DataTypes } = require('sequelize');
const { getSequelize } = require('../db');

function defineMessage() {
  const sequelize = getSequelize();

  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true, // can be null if it's purely a file upload
    },
    isFile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'messages',
    timestamps: true,
  });

  return Message;
}

module.exports = defineMessage;
