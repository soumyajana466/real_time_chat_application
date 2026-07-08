const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { models } = require('./models');

// Track active users and their sockets: userId -> set of socketIds
const activeUsers = new Map();

function getDmRoomId(userId1, userId2) {
  return `dm_${[userId1, userId2].sort().join('_')}`;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // in production, specify client URL
      methods: ['GET', 'POST']
    }
  });

  // Socket middleware for authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token missing.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforchatapps');
      const user = await models.User.findByPk(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalid.'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user.id;

    console.log(`User connected: ${user.username} (${socket.id})`);

    // Track active connection
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Update status to online in database
    try {
      await models.User.update({ status: 'online' }, { where: { id: userId } });
      
      // Broadcast status update
      io.emit('user_status_change', {
        userId: userId,
        status: 'online'
      });
    } catch (err) {
      console.error('Error updating user connection status:', err);
    }

    // Event: join room (channel or DM)
    socket.on('join_room', (roomData) => {
      let roomId;
      if (roomData.channelId) {
        roomId = roomData.channelId;
      } else if (roomData.targetUserId) {
        roomId = getDmRoomId(userId, roomData.targetUserId);
      }

      if (roomId) {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
      }
    });

    // Event: leave room
    socket.on('leave_room', (roomData) => {
      let roomId;
      if (roomData.channelId) {
        roomId = roomData.channelId;
      } else if (roomData.targetUserId) {
        roomId = getDmRoomId(userId, roomData.targetUserId);
      }

      if (roomId) {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
      }
    });

    // Event: send message
    socket.on('send_message', async (messageData) => {
      const { content, channelId, receiverId, isFile, fileUrl, fileName, fileSize, fileType } = messageData;

      try {
        // Save message to database
        const msg = await models.Message.create({
          content,
          senderId: userId,
          channelId: channelId || null,
          receiverId: receiverId || null,
          isFile: !!isFile,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          fileType: fileType || null,
        });

        // Fetch sender details to include in broadcast
        const fullMessage = await models.Message.findByPk(msg.id, {
          include: [
            {
              model: models.User,
              as: 'sender',
              attributes: ['id', 'username', 'avatarUrl']
            }
          ]
        });

        // Determine destination room
        let roomId;
        if (channelId) {
          roomId = channelId;
        } else if (receiverId) {
          roomId = getDmRoomId(userId, receiverId);
        }

        if (roomId) {
          io.to(roomId).emit('receive_message', fullMessage);
        }
      } catch (err) {
        console.error('Error saving/sending socket message:', err);
        socket.emit('error_message', { error: 'Failed to send message.' });
      }
    });

    // Event: typing status
    socket.on('typing_status', (typingData) => {
      const { channelId, targetUserId, isTyping } = typingData;
      
      let roomId;
      if (channelId) {
        roomId = channelId;
      } else if (targetUserId) {
        roomId = getDmRoomId(userId, targetUserId);
      }

      if (roomId) {
        // Broadcast typing status to everyone in the room except the typing sender
        socket.to(roomId).emit('typing_status', {
          roomId,
          userId,
          username: user.username,
          isTyping
        });
      }
    });

    // Event: manual status change
    socket.on('status_change', async (statusData) => {
      const { status } = statusData; // 'online', 'away', 'offline'
      if (!['online', 'away', 'offline'].includes(status)) return;

      try {
        await models.User.update({ status }, { where: { id: userId } });
        
        io.emit('user_status_change', {
          userId,
          status
        });
      } catch (err) {
        console.error('Error updating manual status:', err);
      }
    });

    // Event: manual profile update broadcast
    socket.on('profile_update', (profileData) => {
      const { bio, avatarUrl } = profileData;
      io.emit('user_profile_update', {
        userId,
        username: user.username,
        avatarUrl,
        bio
      });
    });

    // Event: disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If user has no more active socket connections, set status to offline
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          
          try {
            await models.User.update({ status: 'offline' }, { where: { id: userId } });
            
            // Broadcast offline status
            io.emit('user_status_change', {
              userId,
              status: 'offline'
            });
          } catch (err) {
            console.error('Error setting user offline on disconnect:', err);
          }
        }
      }
    });
  });

  return io;
}

module.exports = {
  initSocket
};
