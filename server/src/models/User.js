const { DataTypes } = require('sequelize');
const { getSequelize } = require('../db');

function defineUser() {
  const sequelize = getSequelize();
  
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 20],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('online', 'away', 'offline'),
      defaultValue: 'offline',
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
}

module.exports = defineUser;
