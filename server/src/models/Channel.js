const { DataTypes } = require('sequelize');
const { getSequelize } = require('../db');

function defineChannel() {
  const sequelize = getSequelize();

  const Channel = sequelize.define('Channel', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 30],
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'channels',
    timestamps: true,
  });

  return Channel;
}

module.exports = defineChannel;
