const defineUser = require('./User');
const defineChannel = require('./Channel');
const defineMessage = require('./Message');

let models = {};

function initModels() {
  const User = defineUser();
  const Channel = defineChannel();
  const Message = defineMessage();

  // Define Associations
  
  // Message - Sender (User)
  User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

  // Message - Channel (Optional, null for DMs)
  Channel.hasMany(Message, { foreignKey: 'channelId', as: 'messages', onDelete: 'CASCADE' });
  Message.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

  // Message - Receiver (User) (Optional, null for Channel messages)
  User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
  Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

  models = { User, Channel, Message };
  return models;
}

module.exports = {
  initModels,
  models: new Proxy({}, {
    get: (target, prop) => models[prop],
  })
};
