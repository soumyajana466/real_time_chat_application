import React, { useState } from 'react';
import { FiMail, FiLock, FiUser, FiMessageSquare } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { isFirebaseConfigured, auth, googleProvider, signInWithPopup } from '../firebase';

export default function AuthPage({ onAuthSuccess, serverUrl }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { username, email, password };

    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Save token and user details to parent state / localStorage
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      if (!isFirebaseConfigured || !auth || !googleProvider) {
        throw new Error('Firebase Authentication is not configured.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await fetch(`${serverUrl}/api/auth/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Firebase login failed.');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      console.error('Google login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google login is not enabled in the Firebase Console. Please go to Authentication > Sign-in method and enable Google.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Decorative Blobs */}
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

      <div className="glass-panel animate-fade-in" style={styles.authCard}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <FiMessageSquare size={28} color="#8b5cf6" />
          </div>
          <h2 style={styles.title}>Velocity Chat</h2>
          <p style={styles.subtitle}>
            {isLogin ? 'Sign in to connect instantly' : 'Create an account to get started'}
          </p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <FiUser style={styles.inputIcon} />
              <input
                className="glass-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <FiMail style={styles.inputIcon} />
            <input
              className="glass-input"
              type="text"
              placeholder={isLogin ? "Email or Username" : "Email Address"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <FiLock style={styles.inputIcon} />
            <input
              className="glass-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {isFirebaseConfigured && (
          <>
            <div style={styles.dividerContainer}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>or continue with</span>
              <div style={styles.dividerLine}></div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              style={styles.googleBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <FcGoogle size={20} />
              <span>Continue with Google</span>
            </button>
          </>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={styles.toggleBtn}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(99,102,241,0.05) 70%)',
    top: '10%',
    left: '15%',
    zIndex: 0,
    filter: 'blur(40px)',
  },
  blob2: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.05) 70%)',
    bottom: '10%',
    right: '15%',
    zIndex: 0,
    filter: 'blur(50px)',
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    marginBottom: '8px',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '28px',
    fontWeight: '600',
    background: 'linear-gradient(to right, #f8fafc, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    padding: '12px 16px',
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    borderRadius: '8px',
    color: 'var(--accent-rose)',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    fontSize: '18px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    paddingLeft: '44px',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '12px',
    fontSize: '15px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '8px',
  },
  footerText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-violet)',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '0 4px',
    transition: 'color 0.2s',
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'lowercase',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-primary)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
