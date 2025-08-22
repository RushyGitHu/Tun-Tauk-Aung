require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/chatdb";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// User schema
const userSchema = new mongoose.Schema({ username: String, password: String });
const User = mongoose.model("User", userSchema);

// Message schema
const messageSchema = new mongoose.Schema({ username: String, text: String, time: { type: Date, default: Date.now } });
const Message = mongoose.model("Message", messageSchema);

// Register endpoint
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (await User.findOne({ username })) return res.json({ success: false, message: "Username taken" });
    await new User({ username, password }).save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) res.json({ success: true });
    else res.json({ success: false, message: "Invalid username or password" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Socket.io chat server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("🟢 User connected");

  Message.find().sort({ time: 1 }).limit(50).then(messages => {
    socket.emit("loadMessages", messages);
  });

  socket.on("chatMessage", async (msg) => {
    try {
      const newMsg = new Message(msg);
      await newMsg.save();
      io.emit("chatMessage", newMsg);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => console.log("🔴 User disconnected"));
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Fallback route for frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Use Render's dynamic port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
