const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
