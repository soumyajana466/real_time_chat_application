import React from 'react';
import { FiX, FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';

export default function FilesPanel({
  files,
  onClose
}) {
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Shared Files</h3>
        <button onClick={onClose} style={styles.closeBtn}>
          <FiX size={18} />
        </button>
      </div>

      <div style={styles.list}>
        {files.map((file) => (
          <div key={file.id} style={styles.fileItem}>
            <div style={styles.fileIconWrapper}>
              <FiFileText size={20} color="var(--accent-cyan)" />
            </div>

            <div style={styles.fileDetails}>
              <span style={styles.fileName} title={file.fileName}>
                {file.fileName}
              </span>
              <div style={styles.fileMeta}>
                <span>Uploaded by {file.sender?.username}</span>
                <span style={styles.dot}>•</span>
                <span>{formatBytes(file.fileSize)}</span>
              </div>
              <span style={styles.fileDate}>
                {new Date(file.createdAt).toLocaleDateString()} at {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div style={styles.actions}>
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.actionBtn}
                title="Download / Open"
              >
                <FiDownload size={16} />
              </a>
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div style={styles.emptyState}>
            <FiFileText size={36} color="var(--text-muted)" />
            <span style={styles.emptyText}>No files shared in this chat yet</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '300px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: 'var(--border-glass)',
    borderRadius: '0', // overlay flat with screen side
    background: 'rgba(15, 23, 42, 0.45)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: 'var(--border-glass)',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.05)',
    }
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(30, 41, 59, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  fileIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(6, 182, 212, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  dot: {
    margin: '0 4px',
  },
  fileDate: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  actions: {
    display: 'flex',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    ':hover': {
      color: 'var(--accent-cyan)',
      background: 'rgba(6, 182, 212, 0.1)',
    }
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px',
    textAlign: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
};
