import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import FilesPanel from './components/FilesPanel';
import { isFirebaseConfigured, isStorageConfigured, uploadFileToFirebase } from './firebase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:4000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // Array of typing usernames
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const activeChannelRef = useRef(null);
  const activeUserRef = useRef(null);

  // Sync refs to avoid stale closures in socket event handlers
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  // Authenticate user on mount if token exists
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${SERVER_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          initSocket(token);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Load channels and users lists once authenticated
  useEffect(() => {
    if (!user) return;
    loadChannels();
    loadUsers();
  }, [user]);

  // Initialize Socket.io connection and listeners
  const initSocket = (authToken) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SERVER_URL, {
      auth: { token: authToken }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server.');
      
      // Re-join active room if connection dropped and restored
      if (activeChannelRef.current) {
        socket.emit('join_room', { channelId: activeChannelRef.current.id });
      } else if (activeUserRef.current) {
        socket.emit('join_room', { targetUserId: activeUserRef.current.id });
      }
    });

    // Listen for new messages
    socket.on('receive_message', (msg) => {
      const currentChannel = activeChannelRef.current;
      const currentUser = activeUserRef.current;

      // Determine if the message belongs in the currently active view
      let isForCurrentView = false;
      if (currentChannel && msg.channelId === currentChannel.id) {
        isForCurrentView = true;
      } else if (currentUser && !msg.channelId) {
        // DM: check if sender matches current active chat user and receiver is me, 
        // OR sender is me and receiver matches active chat user.
        const matchesSender = msg.senderId === currentUser.id || msg.senderId === socket.user?.id;
        const matchesReceiver = msg.receiverId === currentUser.id || msg.receiverId === socket.user?.id;
        if (matchesSender && matchesReceiver) {
          isForCurrentView = true;
        }
      }

      if (isForCurrentView) {
        setMessages((prev) => [...prev, msg]);
        
        // If it's a file upload, append to shared files list
        if (msg.isFile) {
          setSharedFiles((prev) => [msg, ...prev]);
        }
      }
    });

    // Listen for typing events
    socket.on('typing_status', (typingData) => {
      const currentChannel = activeChannelRef.current;
      const currentUser = activeUserRef.current;
      const { channelId, userId, username, isTyping } = typingData;

      // Verify typing event is for the current active conversation
      let isForCurrentConversation = false;
      if (currentChannel && channelId === currentChannel.id) {
        isForCurrentConversation = true;
      } else if (currentUser && !channelId && userId === currentUser.id) {
        isForCurrentConversation = true;
      }

      if (isForCurrentConversation) {
        setTypingUsers((prev) => {
          if (isTyping) {
            if (!prev.includes(username)) return [...prev, username];
            return prev;
          } else {
            return prev.filter((name) => name !== username);
          }
        });
      }
    });

    // Listen for presence status updates
    socket.on('user_status_change', ({ userId, status }) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, status } : u))
      );
      
      // Update my own user object status if it was me
      setUser((currentUser) => {
        if (currentUser && currentUser.id === userId) {
          return { ...currentUser, status };
        }
        return currentUser;
      });
    });
    // Listen for profile updates
    socket.on('user_profile_update', ({ userId, username, avatarUrl, bio }) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, avatarUrl, bio } : u))
      );

      // Update current active DM user if they updated
      setActiveUser((currentUser) => {
        if (currentUser && currentUser.id === userId) {
          return { ...currentUser, avatarUrl, bio };
        }
        return currentUser;
      });

      // Update message bubble avatars in current log
      setMessages((prevMessages) =>
        prevMessages.map((m) =>
          m.senderId === userId
            ? { ...m, sender: { ...m.sender, avatarUrl } }
            : m
        )
      );

      // Update current logged-in user if it was me
      setUser((currentUser) => {
        if (currentUser && currentUser.id === userId) {
          return { ...currentUser, avatarUrl, bio };
        }
        return currentUser;
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server.');
    });
  };

  // Fetch Channels
  const loadChannels = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/chat/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
        
        // Default join the first channel (e.g. #general) if nothing selected yet
        if (data.length > 0 && !activeChannelRef.current && !activeUserRef.current) {
          handleSelectChannel(data[0]);
        }
      }
    } catch (err) {
      console.error('Load channels error:', err);
    }
  };

  // Fetch registered users for DMs
  const loadUsers = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/chat/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  // Fetch message histories
  const loadMessages = async (channelId, targetUserId) => {
    try {
      let url = `${SERVER_URL}/api/chat/messages`;
      if (channelId) url += `?channelId=${channelId}`;
      if (targetUserId) url += `?targetUserId=${targetUserId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  // Fetch shared files list
  const loadSharedFiles = async (channelId, targetUserId) => {
    try {
      let url = `${SERVER_URL}/api/chat/files`;
      if (channelId) url += `?channelId=${channelId}`;
      if (targetUserId) url += `?targetUserId=${targetUserId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedFiles(data);
      }
    } catch (err) {
      console.error('Load files error:', err);
    }
  };

  // Channel select trigger
  const handleSelectChannel = (channel) => {
    // Leave previous room if any
    if (socketRef.current) {
      if (activeChannel) socketRef.current.emit('leave_room', { channelId: activeChannel.id });
      if (activeUser) socketRef.current.emit('leave_room', { targetUserId: activeUser.id });
      
      socketRef.current.emit('join_room', { channelId: channel.id });
    }

    setActiveChannel(channel);
    setActiveUser(null);
    setTypingUsers([]);
    loadMessages(channel.id, null);
    loadSharedFiles(channel.id, null);
  };

  // User/DM select trigger
  const handleSelectUser = (targetUser) => {
    // Leave previous room if any
    if (socketRef.current) {
      if (activeChannel) socketRef.current.emit('leave_room', { channelId: activeChannel.id });
      if (activeUser) socketRef.current.emit('leave_room', { targetUserId: activeUser.id });
      
      socketRef.current.emit('join_room', { targetUserId: targetUser.id });
    }

    setActiveUser(targetUser);
    setActiveChannel(null);
    setTypingUsers([]);
    loadMessages(null, targetUser.id);
    loadSharedFiles(null, targetUser.id);
  };

  // Authenticate triggers
  const handleAuthSuccess = (newToken, authenticatedUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setChannels([]);
    setUsers([]);
    setActiveChannel(null);
    setActiveUser(null);
    setMessages([]);
    setSharedFiles([]);
    setTypingUsers([]);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Change presence status
  const handleStatusChange = (status) => {
    if (socketRef.current) {
      socketRef.current.emit('status_change', { status });
    }
  };

  // Create channel trigger
  const handleCreateChannel = async (name, description) => {
    const response = await fetch(`${SERVER_URL}/api/chat/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create channel.');
    }

    // Refresh lists and join the newly created channel
    await loadChannels();
    handleSelectChannel(data);
  };

  // Upload any file (like avatar photos) and return download URL
  const handleUploadFile = async (file) => {
    if (isStorageConfigured) {
      return await uploadFileToFirebase(file, 'avatars');
    } else {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${SERVER_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server upload failed.');
      }
      return data.fileUrl;
    }
  };

  // Submit profile biography and profile photo changes
  const handleUpdateProfile = async ({ bio, avatarUrl }) => {
    const response = await fetch(`${SERVER_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bio, avatarUrl })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }

    // Update local current user state
    setUser(data.user);

    // Notify other users in real time via socket
    if (socketRef.current) {
      socketRef.current.emit('profile_update', {
        bio: data.user.bio,
        avatarUrl: data.user.avatarUrl
      });
    }
  };

  // Send message trigger
  const handleSendMessage = (content) => {
    if (!socketRef.current) return;

    const messagePayload = {
      content,
      channelId: activeChannel ? activeChannel.id : null,
      receiverId: activeUser ? activeUser.id : null,
      isFile: false
    };

    socketRef.current.emit('send_message', messagePayload);
  };

  // Send file upload trigger
  const handleSendFile = async (file, textContent) => {
    let fileUrl = '';
    let fileName = file.name;
    let fileSize = file.size;
    let fileType = file.type;

    if (isStorageConfigured) {
      console.log('Uploading file directly to Firebase Storage...');
      fileUrl = await uploadFileToFirebase(file);
    } else {
      console.log('Firebase storage not configured. Using backend local file upload fallback...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${SERVER_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server upload failed.');
      }
      fileUrl = data.fileUrl;
      fileName = data.fileName;
      fileSize = data.fileSize;
      fileType = data.fileType;
    }

    // Send the file details via Socket.io
    if (socketRef.current) {
      const messagePayload = {
        content: textContent || '', // user can append text messages alongside file
        channelId: activeChannel ? activeChannel.id : null,
        receiverId: activeUser ? activeUser.id : null,
        isFile: true,
        fileUrl,
        fileName,
        fileSize,
        fileType
      };

      socketRef.current.emit('send_message', messagePayload);
    }
  };

  // Emit typing indicators
  const handleTypingStatus = (isTyping) => {
    if (!socketRef.current) return;

    socketRef.current.emit('typing_status', {
      channelId: activeChannel ? activeChannel.id : null,
      targetUserId: activeUser ? activeUser.id : null,
      isTyping
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Initializing Velocity Chat...</p>
      </div>
    );
  }

  // If not authenticated, render login page
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} serverUrl={SERVER_URL} />;
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar
        user={user}
        channels={channels}
        users={users}
        activeChannel={activeChannel}
        activeUser={activeUser}
        onSelectChannel={handleSelectChannel}
        onSelectUser={handleSelectUser}
        onStatusChange={handleStatusChange}
        onCreateChannel={handleCreateChannel}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
        onUploadFile={handleUploadFile}
      />
      
      <ChatArea
        user={user}
        activeChannel={activeChannel}
        activeUser={activeUser}
        messages={messages}
        typingUsers={typingUsers}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onTypingStatus={handleTypingStatus}
        onToggleFilesPanel={() => setFilesPanelOpen(!filesPanelOpen)}
        filesPanelOpen={filesPanelOpen}
      />

      {filesPanelOpen && (
        <FilesPanel
          files={sharedFiles}
          onClose={() => setFilesPanelOpen(false)}
        />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    gap: '16px',
    background: 'var(--bg-dark)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.05)',
    borderTop: '3px solid var(--accent-violet)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-family)',
  },
};

// Insert spin keyframes dynamically into stylesheet if missing
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
