const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const { initDatabase, getSequelize } = require('./db');
const { initModels } = require('./models');
const { initSocket } = require('./socket');

const authController = require('./controllers/authController');
const chatController = require('./controllers/chatController');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Programmatically create the uploads directory if it does not exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created local uploads directory: ${uploadsDir}`);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for local upload fallback
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique name: timestamp-random-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

// API routes
// Auth routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authMiddleware, authController.getMe);
app.put('/api/auth/profile', authMiddleware, authController.updateProfile);

// Chat / Query routes
app.get('/api/chat/channels', authMiddleware, chatController.getChannels);
app.post('/api/chat/channels', authMiddleware, chatController.createChannel);
app.get('/api/chat/users', authMiddleware, chatController.getUsers);
app.get('/api/chat/messages', authMiddleware, chatController.getMessages);
app.get('/api/chat/files', authMiddleware, chatController.getSharedFiles);

// Local fallback upload endpoint
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Calculate file URL based on current server host
  const port = process.env.PORT || 4000;
  const fileUrl = `${req.protocol}://${req.hostname === '127.0.0.1' || req.hostname === 'localhost' ? `127.0.0.1:${port}` : req.headers.host}/uploads/${req.file.filename}`;

  return res.json({
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype
  });
});

// Main startup routine
async function startServer() {
  try {
    // 1. Database & Models Init
    await initDatabase();
    const modelsRegistry = initModels();
    
    // 2. Sync Models
    const sequelize = getSequelize();
    // Use alter:true to update table structures dynamically without losing data
    await sequelize.sync({ alter: true });
    console.log('Database models synced successfully.');

    // If we're just testing the database, exit here
    if (process.argv.includes('--test-db')) {
      console.log('Database test complete. Exiting.');
      process.exit(0);
    }

    // 3. Socket.io Init
    initSocket(server);

    // 4. Start listening
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`Chat Application server running on port ${PORT}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
