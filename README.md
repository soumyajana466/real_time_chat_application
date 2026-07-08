# Real-Time Chat Application

A complete, full-stack real-time chat application featuring channel-based messaging, direct messaging, user authentication, profile customisation, status tracking, and file sharing capabilities.

---

## 🚀 Features

- **Real-time Messaging**: Socket.io integration for instant delivery of text messages, files, and emojis.
- **Channels**: Create public or private channels, browse active channels, and chat in channel rooms.
- **Direct Messaging (DMs)**: Chat one-on-one with other registered users in the network.
- **User Authentication**: Secure registration, login, and profile updates powered by JSON Web Tokens (JWT) and bcryptjs hashing.
- **User Presence & Status**: Live online, away, or offline status indicators for all users.
- **File Sharing**: Upload files (images, documents) directly in chat rooms with local storage fallback or Firebase Cloud Storage integration.
- **Rich Interface**: Built using modern UI practices, featuring sidebar navigation, responsive layout, emoji picker, user bios, avatars, and file lists.

---

## 🛠️ Tech Stack

### Client
- **React 19 & Vite**: High-performance frontend setup with Fast Refresh.
- **Socket.io Client**: For persistent real-time socket connections.
- **Firebase SDK**: Handles cloud storage upload fallback.
- **React Icons & Emoji Picker**: Interactive UI components.
- **Oxlint**: Super-fast JS/TS linter for code health.

### Server
- **Node.js & Express**: Extensible API framework.
- **Sequelize ORM & PostgreSQL**: Relational database persistence with auto-creation of schemas.
- **Socket.io**: Multi-client event handling and namespace syncing.
- **JWT & bcryptjs**: Secure stateless session authentication and password encryption.
- **Multer**: Local file storage handling.

---

## 📂 Project Structure

```text
├── client/                 # Frontend React + Vite app
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # UI components (Sidebar, Chat window, etc.)
│   │   ├── index.css       # Core design styles
│   │   ├── main.jsx        # App entrypoint
│   │   └── ...
│   ├── .env.example        # Client environment template
│   └── package.json
│
├── server/                 # Backend Express server
│   ├── public/uploads/     # Local uploaded files
│   ├── src/
│   │   ├── controllers/    # Request handlers (auth, chat)
│   │   ├── middleware/     # JWT authentication middlewares
│   │   ├── models/         # Sequelize schemas (User, Channel, Message)
│   │   ├── socket.js       # Socket.io event logic
│   │   ├── db.js           # Database connection and initialization
│   │   └── index.js        # Main server entrypoint
│   ├── .env.example        # Server environment template
│   └── package.json
```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- **PostgreSQL** database service (running locally or hosted)

---

## ⚙️ Configuration & Local Setup

### 1. Database Setup
1. Make sure your PostgreSQL server is running.
2. The backend server is configured to automatically check and create the database on startup if it doesn't already exist. However, you must provide valid database credentials in your `.env` file.

### 2. Backend Server Configuration
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file with your PostgreSQL credentials and JWT secret:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_NAME=chat_app
   JWT_SECRET=your_jwt_signing_secret
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the server in development mode (with hot reloading via nodemon):
   ```bash
   npm run dev
   ```

### 3. Frontend Client Configuration
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. (Optional) Provide Firebase credentials if you wish to use Firebase storage for uploads. If left blank, uploads will automatically fallback to the local server `public/uploads` folder:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the client development server:
   ```bash
   npm run dev
   ```

Now, open the URL provided by Vite (typically `http://localhost:5173` or similar) in your browser to access the application!

---

## 🔌 API Reference

### Authentication Endpoints
- `POST /api/auth/register` — Create a new user account.
- `POST /api/auth/login` — Sign in and get a JWT token.
- `GET /api/auth/me` — Retrieve current user profile (Authenticated).
- `PUT /api/auth/profile` — Update username, avatar, bio, or presence status (Authenticated).

### Chat Endpoints
- `GET /api/chat/channels` — Retrieve all channels (Authenticated).
- `POST /api/chat/channels` — Create a new channel (Authenticated).
- `GET /api/chat/users` — Retrieve all registered users for DMs (Authenticated).
- `GET /api/chat/messages` — Fetch message history for a channel or DM room (Authenticated).
- `GET /api/chat/files` — Fetch all shared files in the current chat scope (Authenticated).
- `POST /api/upload` — Upload a file locally (Authenticated).

---

## 📡 Socket.io Events

The application communicates in real-time using Socket.io:
- **`connection`**: Triggered when a client connects.
- **`join_room`**: Sent by the client to join a specific channel or direct message chat room.
- **`send_message`**: Sent by a user to transmit a new message (text, files, etc.).
- **`receive_message`**: Sent by the server to all users in the room to display the incoming message in real-time.
- **`update_status`**: Broadcasts presence changes (`online`, `away`, `offline`) when a user's status updates.
