const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://bryanwakuoo:12qw12qw@cluster0.hvbciik.mongodb.net/chatdb?retryWrites=true&w=majority");

// User schema
const userSchema = new mongoose.Schema({ username: String, password: String });
const User = mongoose.model("User", userSchema);

// Message schema
const messageSchema = new mongoose.Schema({ username: String, text: String, time: { type: Date, default: Date.now } });
const Message = mongoose.model("Message", messageSchema);

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if(await User.findOne({ username })) return res.json({ success: false, message: "Username taken" });
  await new User({ username, password }).save();
  res.json({ success: true });
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if(user) res.json({ success: true });
  else res.json({ success: false, message: "Invalid username or password" });
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
    const newMsg = new Message(msg);
    await newMsg.save();
    io.emit("chatMessage", newMsg);
  });

  socket.on("disconnect", () => console.log("🔴 User disconnected"));
});

// Serve frontend
app.use(express.static("public"));


const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
