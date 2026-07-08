import React, { useState } from 'react';
import { FiPlus, FiHash, FiUser, FiSearch, FiLogOut, FiMessageSquare, FiChevronDown, FiGlobe } from 'react-icons/fi';

export default function Sidebar({
  user,
  channels,
  users,
  activeChannel,
  activeUser,
  onSelectChannel,
  onSelectUser,
  onStatusChange,
  onCreateChannel,
  onLogout,
  onUpdateProfile,
  onUploadFile
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [modalError, setModalError] = useState('');

  // Edit Profile States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Keep state sync'd when user profile changes externally
  React.useEffect(() => {
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    setProfileError('');
    try {
      const url = await onUploadFile(file);
      setAvatarUrl(url);
    } catch (err) {
      setProfileError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      await onUpdateProfile({ bio, avatarUrl });
      setEditProfileOpen(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  // Handle status selections
  const handleStatusSelect = (status) => {
    onStatusChange(status);
    setStatusDropdownOpen(false);
  };

  // Filter channels & users based on search
  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form submission for channel creation
  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newChannelName) return;

    try {
      await onCreateChannel(newChannelName, newChannelDesc);
      setNewChannelName('');
      setNewChannelDesc('');
      setModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Failed to create channel.');
    }
  };

  return (
    <div style={styles.sidebar}>
      {/* User Info Header */}
      <div style={styles.profileHeader}>
        <div style={styles.avatarWrapper}>
          <img src={user.avatarUrl} alt={user.username} style={styles.avatar} />
          <div className={`status-indicator status-${user.status}`} style={styles.statusIndicator}></div>
        </div>

        <div style={styles.profileDetails}>
          <div style={styles.nameDropdown} onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}>
            <span style={styles.username}>{user.username}</span>
            <FiChevronDown size={14} color="var(--text-secondary)" />
          </div>
          <span style={styles.statusText}>{user.status.toUpperCase()}</span>

          {statusDropdownOpen && (
            <div className="glass-panel" style={styles.statusDropdown}>
              <div style={styles.dropdownItem} onClick={() => handleStatusSelect('online')}>
                <div className="status-indicator status-online" style={{ marginRight: '8px' }}></div>
                Online
              </div>
              <div style={styles.dropdownItem} onClick={() => handleStatusSelect('away')}>
                <div className="status-indicator status-away" style={{ marginRight: '8px' }}></div>
                Away
              </div>
              <div style={styles.dropdownItem} onClick={() => handleStatusSelect('offline')}>
                <div className="status-indicator status-offline" style={{ marginRight: '8px' }}></div>
                Offline
              </div>
              <div style={styles.dropdownSeparator}></div>
              <div style={styles.dropdownItem} onClick={() => { setEditProfileOpen(true); setStatusDropdownOpen(false); }}>
                Edit Profile
              </div>
            </div>
          )}
        </div>

        <button onClick={onLogout} style={styles.logoutBtn} title="Logout">
          <FiLogOut size={18} />
        </button>
      </div>

      {/* Global Search Bar */}
      <div style={styles.searchContainer}>
        <FiSearch style={styles.searchIcon} />
        <input
          className="glass-input"
          type="text"
          placeholder="Search channels or users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Navigation Sections */}
      <div style={styles.scrollArea}>
        {/* Channels Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>CHANNELS</span>
            <button onClick={() => setModalOpen(true)} style={styles.addBtn} title="Create Channel">
              <FiPlus size={16} />
            </button>
          </div>
          <div style={styles.list}>
            {filteredChannels.map(ch => (
              <div
                key={ch.id}
                onClick={() => onSelectChannel(ch)}
                style={{
                  ...styles.listItem,
                  ...(activeChannel?.id === ch.id ? styles.activeListItem : {})
                }}
              >
                <FiHash size={18} style={styles.listIcon} />
                <span style={styles.itemText}>{ch.name}</span>
              </div>
            ))}
            {filteredChannels.length === 0 && (
              <span style={styles.emptyText}>No channels found</span>
            )}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>DIRECT MESSAGES</span>
          </div>
          <div style={styles.list}>
            {filteredUsers.map(u => (
              <div
                key={u.id}
                onClick={() => onSelectUser(u)}
                style={{
                  ...styles.listItem,
                  ...(activeUser?.id === u.id ? styles.activeListItem : {})
                }}
              >
                <div style={styles.userIconWrapper}>
                  <img src={u.avatarUrl} alt={u.username} style={styles.userAvatar} />
                  <div className={`status-indicator status-${u.status}`} style={styles.userStatusIndicator}></div>
                </div>
                <span style={styles.itemText}>{u.username}</span>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <span style={styles.emptyText}>No users found</span>
            )}
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Create a Channel</h3>
            {modalError && <div style={styles.modalError}>{modalError}</div>}
            
            <form onSubmit={handleCreateChannelSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Channel Name</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="e.g. marketing"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  style={styles.modalInput}
                  required
                  maxLength={30}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description (Optional)</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="What is this channel about?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Edit Profile</h3>
            {profileError && <div style={styles.modalError}>{profileError}</div>}
            
            <form onSubmit={handleProfileUpdateSubmit} style={styles.modalForm}>
              <div style={styles.avatarEditContainer}>
                <div style={styles.avatarWrapperBig}>
                  <img src={avatarUrl || user.avatarUrl} alt="Avatar Preview" style={styles.avatarBig} />
                  {uploadingAvatar && <div style={styles.avatarSpinner}>Uploading...</div>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  style={{ display: 'none' }}
                  id="avatar-upload-input"
                  disabled={uploadingAvatar}
                />
                <label htmlFor="avatar-upload-input" className="btn-secondary" style={styles.uploadPhotoBtn}>
                  Change Photo
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Bio</label>
                <textarea
                  className="glass-input"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={styles.textarea}
                  maxLength={150}
                />
                <span style={styles.charCount}>{bio.length}/150</span>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn-secondary" onClick={() => setEditProfileOpen(false)} disabled={uploadingAvatar}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploadingAvatar}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    height: '100%',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRight: 'var(--border-glass)',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderBottom: 'var(--border-glass)',
    gap: '12px',
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    width: '42px',
    height: '42px',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    cursor: 'pointer',
    position: 'relative',
  },
  nameDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  username: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusText: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
  },
  statusDropdown: {
    position: 'absolute',
    top: '40px',
    left: '0',
    zIndex: 10,
    width: '130px',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: 'var(--text-primary)',
    ':hover': {
      background: 'rgba(255,255,255,0.05)',
    }
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      color: 'var(--accent-rose)',
      background: 'rgba(244, 63, 94, 0.1)',
    }
  },
  searchContainer: {
    position: 'relative',
    padding: '16px 20px',
  },
  searchIcon: {
    position: 'absolute',
    left: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    paddingLeft: '36px',
    fontSize: '13px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 12px 20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 8px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '1px',
  },
  addBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: '4px',
    ':hover': {
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.05)',
    }
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: 'var(--text-secondary)',
  },
  activeListItem: {
    background: 'rgba(139, 92, 246, 0.15)',
    color: 'var(--text-primary)',
    borderLeft: '3px solid var(--accent-violet)',
    paddingLeft: '9px',
  },
  listIcon: {
    marginRight: '8px',
  },
  userIconWrapper: {
    position: 'relative',
    width: '24px',
    height: '24px',
    marginRight: '8px',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.05)',
  },
  userStatusIndicator: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '8px',
    height: '8px',
  },
  itemText: {
    fontSize: '14px',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    padding: '8px',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '100%',
    maxWidth: '400px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  modalTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '20px',
    fontWeight: '600',
  },
  modalError: {
    padding: '8px 12px',
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: '6px',
    color: 'var(--accent-rose)',
    fontSize: '12px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  modalInput: {
    width: '100%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  dropdownSeparator: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '4px 0',
  },
  avatarEditContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  avatarWrapperBig: {
    position: 'relative',
    width: '80px',
    height: '80px',
  },
  avatarBig: {
    width: '100%',
    height: '100%',
    borderRadius: '20px',
    objectFit: 'cover',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(139, 92, 246, 0.3)',
  },
  avatarSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(15, 23, 42, 0.75)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#ffffff',
  },
  uploadPhotoBtn: {
    fontSize: '12px',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    height: '80px',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  charCount: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textAlign: 'right',
    marginTop: '2px',
  },
};
