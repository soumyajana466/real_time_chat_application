const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const { models } = require('../models');

async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await models.User.findOne({
      where: {
        [models.User.sequelize.Sequelize.Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create avatar url
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    // Create user
    const user = await models.User.create({
      username,
      email,
      passwordHash,
      avatarUrl,
      status: 'offline'
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'supersecretjwtkeyforchatapps',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        bio: user.bio || ''
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required.' });
  }

  try {
    // Support login via email or username
    const user = await models.User.findOne({
      where: {
        [models.User.sequelize.Sequelize.Op.or]: [{ email }, { username: email }]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'supersecretjwtkeyforchatapps',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        bio: user.bio || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

async function getMe(req, res) {
  try {
    const user = req.user;
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        bio: user.bio || ''
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Server error fetching user details.' });
  }
}

async function updateProfile(req, res) {
  const { bio, avatarUrl } = req.body;
  const user = req.user;

  try {
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    await models.User.update(updateData, {
      where: { id: user.id }
    });

    const updatedUser = await models.User.findByPk(user.id);

    return res.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        status: updatedUser.status,
        bio: updatedUser.bio || ''
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
}

// Cache for Google's public certificates
let googlePublicKeysCache = null;
let googlePublicKeysCacheExpires = 0;

function getGooglePublicKeys() {
  const now = Date.now();
  if (googlePublicKeysCache && now < googlePublicKeysCacheExpires) {
    return Promise.resolve(googlePublicKeysCache);
  }

  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      const cacheControl = res.headers['cache-control'] || '';
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600000;

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const keys = JSON.parse(data);
          googlePublicKeysCache = keys;
          googlePublicKeysCacheExpires = Date.now() + maxAge;
          resolve(keys);
        } catch (err) {
          reject(new Error('Failed to parse Google public keys: ' + err.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('Failed to fetch Google public keys: ' + err.message));
    });
  });
}

async function verifyFirebaseToken(idToken, projectId) {
  const decodedToken = jwt.decode(idToken, { complete: true });
  if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
    throw new Error('Invalid token format');
  }

  const kid = decodedToken.header.kid;
  const keys = await getGooglePublicKeys();
  const publicKey = keys[kid];
  if (!publicKey) {
    throw new Error('Public key not found for kid');
  }

  const verified = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`
  });

  return verified;
}

async function firebaseLogin(req, res) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID token is required.' });
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'chat-application-6c1bc';
    const decoded = await verifyFirebaseToken(idToken, projectId);

    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Firebase token.' });
    }

    const name = decoded.name || email.split('@')[0];
    const avatarUrl = decoded.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

    let [user, created] = await models.User.findOrCreate({
      where: { email },
      defaults: {
        username: name,
        passwordHash: 'firebase-auth-managed',
        avatarUrl,
        status: 'online'
      }
    });

    if (!created) {
      user.status = 'online';
      await user.save();
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'supersecretjwtkeyforchatapps',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        bio: user.bio || ''
      }
    });
  } catch (error) {
    console.error('Firebase login verification failed:', error);
    return res.status(401).json({ error: 'Firebase authentication failed: ' + error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  firebaseLogin
};
