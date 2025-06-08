const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Paths to data files
const usersFile = path.join(__dirname, "users.json");
const chatFile = path.join(__dirname, "chat.json");

// Load or initialize users
let users = {};
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
} else {
  fs.writeFileSync(usersFile, JSON.stringify({}));
}

// Load or initialize chat
let chatData = [];
if (fs.existsSync(chatFile)) {
  chatData = JSON.parse(fs.readFileSync(chatFile));
}

// ===== Signup Route =====
app.get("/", (req, res) => {
  res.redirect("/login.html")
})


app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  if (users[username]) {
    return res.send("Username already exists");
  }

  let avatarName = "";
  if (req.files && req.files.avatar) {
    const avatar = req.files.avatar;
    avatarName = Date.now() + "_" + avatar.name;
    const avatarPath = path.join(__dirname, "public", "avatars", avatarName);
    fs.mkdirSync(path.dirname(avatarPath), { recursive: true });
    avatar.mv(avatarPath);
  }

  users[username] = { password, avatar: "/avatars/" + avatarName };
  fs.writeFileSync(usersFile, JSON.stringify(users));
  res.redirect("/login.html");
});

// ===== Login Route =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!users[username] || users[username].password !== password) {
    return res.send("Invalid username or password.");
  }

  res.redirect(`/chat.html?user=${username}`);
});

// ===== Get User Info =====

app.get("/users.json", (req, res) => {
  res.sendFile(path.join(__dirname, "users.json"));
});


app.get("/user/:username", (req, res) => {
  const user = users[req.params.username];
  if (user) {
    res.json(user);
  } else {
    res.status(404).send("User not found");
  }
});

// ===== Socket.IO Chat Logic =====
io.on("connection", (socket) => {
  socket.on("new-user", (username) => {
    socket.username = username;
    socket.emit("load-messages", chatData);
  });

  socket.on("send-message", (msg) => {
    const message = {
      username: socket.username,
      text: msg,
      time: new Date().toISOString(),
    };
    chatData.push(message);
    fs.writeFileSync(chatFile, JSON.stringify(chatData));
    io.emit("chat-message", message);
  });

  socket.on("clear-chat", () => {
    chatData = [];
    fs.writeFileSync(chatFile, JSON.stringify([]));
    io.emit("clear-messages");
  });

  socket.on("delete-message", (msgTime) => {
    chatData = chatData.filter(
      (msg) => !(msg.time === msgTime && msg.username === socket.username)
    );
    fs.writeFileSync(chatFile, JSON.stringify(chatData));
    io.emit("load-messages", chatData);
  });
});

// ===== Start Server =====
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
