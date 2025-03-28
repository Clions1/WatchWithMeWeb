# 🎬 Watch With Me

![GitHub](https://img.shields.io/github/license/Clions1/WatchWithMeWeb)
![GitHub last commit](https://img.shields.io/github/last-commit/Clions1/WatchWithMeWeb)

> **Watch videos together with friends, in perfect sync, wherever they are!**


## 🌟 Features

- 🔄 **Real-time Video Synchronization** - Watch videos in perfect sync with others
- 💬 **Live Chat** - Communicate with other viewers in real-time
- 🔐 **Private Rooms** - Password-protected rooms for private viewing sessions
- 🎮 **Video Controls** - Play, pause, seek, and volume controls synchronized across all viewers
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 👥 **User Presence** - See who's watching with you
- 🛡️ **Admin Panel** - Secure admin interface for room management

## 🚀 Technologies

- ⚡ **Node.js** & **Express.js** - Fast, unopinionated backend
- 🔌 **Socket.io** - Real-time, bidirectional communication
- 🎭 **WebRTC** - Peer-to-peer video streaming
- 💾 **MongoDB** - Database for user and room management
- 🔐 **bcrypt.js** - Secure password hashing
- 🌐 **HTML5 Video API** - Advanced video playback controls

## 📋 Prerequisites

- Node.js (v14.0.0 or higher)
- MongoDB account
- Modern web browser

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Clions1/WatchWithMeWeb.git
   cd WatchWithMeWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a .env file**
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=3001
   ```

4. **Create an admin user**
   ```bash
   node createAdmin.js
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   ```
   http://localhost:3001
   ```

## 📝 Usage

### Creating a Room

1. Visit the homepage
2. Enter a username and room name
3. Optionally set a room password
4. Click "Create Room"
5. Share the room URL with friends

### Joining a Room

1. Visit the room URL or enter the room ID on the homepage
2. Enter your username
3. Enter the room password (if required)
4. Click "Join Room"

### Watching Together

- The video will be synchronized for all participants
- Play/pause actions are synchronized
- Seeking through the video is synchronized
- Chat with other viewers in real-time

## 👮 Admin Panel

Access the admin panel at `/admin` to:

- Monitor active rooms
- Review user activities
- Manage system settings
- View contact form submissions

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Project Link: [https://github.com/Clions1/WatchWithMeWeb](https://github.com/Clions1/WatchWithMeWeb)

My Website: [https://www.clionsdev.com/](https://www.clionsdev.com)

---

<p align="center">
  Made with ⭐ by <a href="https://github.com/Clions1">Clions</a>
</p>
