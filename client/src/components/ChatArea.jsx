import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiPaperclip, FiSmile, FiFolder, FiHash, FiFileText, FiX, FiImage, FiMessageSquare } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';

export default function ChatArea({
  user,
  activeChannel,
  activeUser,
  messages,
  typingUsers,
  onSendMessage,
  onSendFile,
  onTypingStatus,
  onToggleFilesPanel,
  filesPanelOpen
}) {
  const [inputText, setInputText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Handle typing presence events
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    const roomId = activeChannel ? activeChannel.id : (activeUser ? activeUser.id : null);
    if (!roomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStatus(false);
    }, 2000);
  };

  // Send textual message
  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (selectedFile) {
      handleSendFile();
    } else {
      onSendMessage(inputText.trim());
      setInputText('');
      
      // Clear typing timeout
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStatus(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Add emoji to message input
  const handleEmojiClick = (emojiData) => {
    setInputText(prev => prev + emojiData.emoji);
    setEmojiOpen(false);
  };

  // File selection triggering
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload file and send message
  const handleSendFile = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      await onSendFile(selectedFile, inputText.trim());
      setSelectedFile(null);
      setInputText('');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Render attachment in message bubble
  const renderAttachment = (msg) => {
    const isImg = msg.fileType?.startsWith('image/');
    
    if (isImg) {
      return (
        <div style={styles.imageAttachment}>
          <img src={msg.fileUrl} alt={msg.fileName} style={styles.attachmentImg} onClick={() => window.open(msg.fileUrl)} />
        </div>
      );
    }

    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={styles.fileCard}>
        <FiFileText size={28} style={styles.fileCardIcon} />
        <div style={styles.fileCardDetails}>
          <span style={styles.fileCardName}>{msg.fileName}</span>
          <span style={styles.fileCardSize}>{formatBytes(msg.fileSize)}</span>
        </div>
      </a>
    );
  };

  const getChatTitle = () => {
    if (activeChannel) return `# ${activeChannel.name}`;
    if (activeUser) return activeUser.username;
    return 'Select a chat';
  };

  const getChatSubtitle = () => {
    if (activeChannel) return activeChannel.description || 'No description set';
    if (activeUser) {
      const statusText = activeUser.status.toUpperCase();
      return activeUser.bio ? `${statusText} • ${activeUser.bio}` : statusText;
    }
    return '';
  };

  const hasChatSelected = activeChannel || activeUser;

  return (
    <div style={styles.chatArea}>
      {hasChatSelected ? (
        <>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitleArea}>
              <h3 style={styles.title}>{getChatTitle()}</h3>
              <span style={styles.subtitle}>{getChatSubtitle()}</span>
            </div>
            <button
              onClick={onToggleFilesPanel}
              style={{
                ...styles.headerBtn,
                ...(filesPanelOpen ? styles.headerBtnActive : {})
              }}
              title="Shared Files"
            >
              <FiFolder size={20} />
            </button>
          </div>

          {/* Messages Scroll Panel */}
          <div style={styles.messagesContainer}>
            <div style={styles.messagesList}>
              {messages.map((msg) => {
                const isSelf = msg.senderId === user.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isSelf ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isSelf && (
                      <img src={msg.sender?.avatarUrl} alt={msg.sender?.username} style={styles.messageAvatar} />
                    )}
                    
                    <div style={styles.messageContentWrapper}>
                      {!isSelf && (
                        <span style={styles.senderName}>{msg.sender?.username}</span>
                      )}
                      
                      <div
                        style={{
                          ...styles.messageBubble,
                          ...(isSelf ? styles.bubbleSelf : styles.bubbleOther)
                        }}
                      >
                        {msg.isFile && renderAttachment(msg)}
                        {msg.content && <p style={styles.messageText}>{msg.content}</p>}
                      </div>
                      
                      <span style={{
                        ...styles.messageTime,
                        textAlign: isSelf ? 'right' : 'left'
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div style={styles.typingRow}>
                  <div className="glass-panel" style={styles.typingBubble}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                    <span style={styles.typingText}>
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Form / Inputs */}
          <form onSubmit={handleSendText} style={styles.inputContainer}>
            {/* Attachment preview area */}
            {selectedFile && (
              <div className="glass-panel animate-fade-in" style={styles.previewPanel}>
                <div style={styles.previewFileCard}>
                  {selectedFile.type.startsWith('image/') ? (
                    <FiImage size={24} style={styles.previewIcon} />
                  ) : (
                    <FiFileText size={24} style={styles.previewIcon} />
                  )}
                  <div style={styles.previewDetails}>
                    <span style={styles.previewName}>{selectedFile.name}</span>
                    <span style={styles.previewSize}>{formatBytes(selectedFile.size)}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFile(null)} style={styles.previewCloseBtn}>
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            )}

            <div style={styles.inputBar}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.iconBtn}
                title="Attach Document"
                disabled={uploading}
              >
                <FiPaperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <input
                className="glass-input"
                type="text"
                placeholder={uploading ? "Uploading file..." : `Message ${getChatTitle()}`}
                value={inputText}
                onChange={handleInputChange}
                style={styles.textInput}
                disabled={uploading}
              />

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setEmojiOpen(!emojiOpen)}
                  style={styles.iconBtn}
                  title="Emojis"
                  disabled={uploading}
                >
                  <FiSmile size={20} />
                </button>
                {emojiOpen && (
                  <div style={styles.emojiPopover}>
                    <EmojiPicker
                      theme="dark"
                      onEmojiClick={handleEmojiClick}
                      width={320}
                      height={400}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={styles.sendBtn}
                disabled={(!inputText.trim() && !selectedFile) || uploading}
              >
                <FiSend size={18} />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div style={styles.emptyWelcome}>
          <FiMessageSquare size={64} color="rgba(139, 92, 246, 0.25)" />
          <h2 style={styles.welcomeTitle}>Welcome to Velocity Chat</h2>
          <p style={styles.welcomeSubtitle}>Select a channel or direct message to start talking instantly.</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  chatArea: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    position: 'relative',
    background: 'rgba(15, 23, 42, 0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px',
    borderBottom: 'var(--border-glass)',
    background: 'rgba(15, 23, 42, 0.2)',
  },
  headerTitleArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  headerBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.05)',
    }
  },
  headerBtnActive: {
    color: 'var(--accent-violet)',
    background: 'rgba(139, 92, 246, 0.1)',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    maxWidth: '75%',
  },
  messageAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
  },
  messageContentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  senderName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginLeft: '2px',
  },
  messageBubble: {
    padding: '12px 16px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '100%',
  },
  bubbleSelf: {
    background: 'linear-gradient(135deg, var(--accent-violet) 0%, #6366f1 100%)',
    color: '#ffffff',
    borderBottomRightRadius: '4px',
  },
  bubbleOther: {
    background: 'rgba(30, 41, 59, 0.7)',
    color: 'var(--text-primary)',
    border: 'var(--border-glass)',
    borderBottomLeftRadius: '4px',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  messageTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    padding: '0 4px',
  },
  imageAttachment: {
    borderRadius: '10px',
    overflow: 'hidden',
    maxWidth: '320px',
    maxHeight: '220px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  attachmentImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: 'inherit',
    textDecoration: 'none',
    transition: 'background 0.2s',
    ':hover': {
      background: 'rgba(15, 23, 42, 0.6)',
    }
  },
  fileCardIcon: {
    color: 'var(--accent-cyan)',
  },
  fileCardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  fileCardName: {
    fontSize: '13px',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
  },
  fileCardSize: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  typingRow: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '14px',
    borderBottomLeftRadius: '4px',
  },
  typingText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  inputContainer: {
    padding: '20px 28px',
    borderTop: 'var(--border-glass)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'rgba(15, 23, 42, 0.15)',
  },
  previewPanel: {
    padding: '10px 16px',
    display: 'flex',
  },
  previewFileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    position: 'relative',
  },
  previewIcon: {
    color: 'var(--accent-violet)',
  },
  previewDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  previewName: {
    fontSize: '13px',
    fontWeight: '500',
  },
  previewSize: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  previewCloseBtn: {
    position: 'absolute',
    right: '0',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '50%',
    ':hover': {
      color: 'var(--accent-rose)',
      background: 'rgba(255,255,255,0.05)',
    }
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.05)',
    }
  },
  textInput: {
    flex: 1,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
  },
  emojiPopover: {
    position: 'absolute',
    bottom: '48px',
    right: '0',
    zIndex: 50,
  },
  emptyWelcome: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    textAlign: 'center',
    padding: '40px',
    gap: '16px',
  },
  welcomeTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '24px',
    fontWeight: '600',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '360px',
    lineHeight: '1.5',
  },
};
