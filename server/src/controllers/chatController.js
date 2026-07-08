const { models } = require('../models');
const { Op } = require('sequelize');

async function getChannels(req, res) {
  try {
    let channels = await models.Channel.findAll({
      order: [['name', 'ASC']]
    });

    // Seed default channels if none exist
    if (channels.length === 0) {
      console.log('Seeding default channels...');
      const defaultChannels = [
        { name: 'general', description: 'General chat and announcements' },
        { name: 'development', description: 'Development discussions' },
        { name: 'random', description: 'Off-topic banter and jokes' }
      ];
      channels = await models.Channel.bulkCreate(defaultChannels);
    }

    return res.json(channels);
  } catch (error) {
    console.error('Fetch channels error:', error);
    return res.status(500).json({ error: 'Server error fetching channels.' });
  }
}

async function createChannel(req, res) {
  const { name, description, isPrivate } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Channel name is required.' });
  }

  // Format channel name: lowercased, spaces replaced with hyphens, symbols removed
  const formattedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/\s+/g, '-');

  if (formattedName.length < 2) {
    return res.status(400).json({ error: 'Invalid channel name. Must be at least 2 alphanumeric characters.' });
  }

  try {
    const existingChannel = await models.Channel.findOne({ where: { name: formattedName } });
    if (existingChannel) {
      return res.status(400).json({ error: `Channel #${formattedName} already exists.` });
    }

    const channel = await models.Channel.create({
      name: formattedName,
      description,
      isPrivate: !!isPrivate
    });

    return res.status(201).json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    return res.status(500).json({ error: 'Server error creating channel.' });
  }
}

async function getUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    // Get all users except the current authenticated user
    const users = await models.User.findAll({
      where: {
        id: {
          [Op.ne]: currentUserId
        }
      },
      attributes: ['id', 'username', 'email', 'avatarUrl', 'status', 'bio', 'updatedAt'],
      order: [['username', 'ASC']]
    });
    return res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Server error fetching users.' });
  }
}

async function getMessages(req, res) {
  const { channelId, targetUserId } = req.query;
  const currentUserId = req.user.id;

  try {
    let whereClause = {};

    if (channelId) {
      // Channel messages
      whereClause = { channelId };
    } else if (targetUserId) {
      // Direct messages between current user and target user
      whereClause = {
        [Op.or]: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId }
        ],
        channelId: null // ensure it's a DM
      };
    } else {
      return res.status(400).json({ error: 'Either channelId or targetUserId must be specified.' });
    }

    const messages = await models.Message.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'username', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: 100 // load last 100 messages
    });

    return res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ error: 'Server error fetching messages.' });
  }
}

async function getSharedFiles(req, res) {
  const { channelId, targetUserId } = req.query;
  const currentUserId = req.user.id;

  try {
    let whereClause = { isFile: true };

    if (channelId) {
      whereClause.channelId = channelId;
    } else if (targetUserId) {
      whereClause.channelId = null;
      whereClause[Op.or] = [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId }
      ];
    } else {
      return res.status(400).json({ error: 'Either channelId or targetUserId must be specified.' });
    }

    const files = await models.Message.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'username']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json(files);
  } catch (error) {
    console.error('Fetch files error:', error);
    return res.status(500).json({ error: 'Server error fetching shared files.' });
  }
}

module.exports = {
  getChannels,
  createChannel,
  getUsers,
  getMessages,
  getSharedFiles
};
