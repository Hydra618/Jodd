const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

if (!username) {
  window.location.href = "login.html";
}

let users = {};
let userAvatar = "";

// Fetch all user data (including avatars)
fetch("/users.json")
  .then(res => res.json())
  .then(data => {
    users = data;
    if (users[username]) {
      userAvatar = users[username].avatar;
    }
    socket.emit("new-user", username);
  });

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const msgInput = document.getElementById("msgInput");
const clearBtn = document.getElementById("clearBtn");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = msgInput.value.trim();
  if (msg) {
    socket.emit("send-message", msg);
    msgInput.value = "";
  }
});

clearBtn.addEventListener("click", () => {
  if (username === "admin") {
    socket.emit("clear-chat");
  } else {
    alert("Only admin can clear the chat.");
  }
});

socket.on("chat-message", (msg) => {
  appendMessage(msg);
});

socket.on("load-messages", (messages) => {
  chatBox.innerHTML = "";
  messages.forEach(msg => appendMessage(msg));
});

socket.on("clear-messages", () => {
  chatBox.innerHTML = "";
});


function appendMessage(msg) {
  const isMine = msg.username === username;
  const msgDiv = document.createElement("div");
  msgDiv.className = isMine ? "message mine" : "message";

  const avatarUrl = users[msg.username]?.avatar || "default.png";

  msgDiv.innerHTML = `
    ${!isMine ? `
      <div class="avatar-container">
        <img src="${avatarUrl}" class="avatar" onerror="this.src='default.png'" />
        <div class="user">${msg.username}</div>
      </div>
    ` : ""}

    <div class="bubble">
      <span class="text">${parseEmoji(msg.text)}</span>
      <span class="time">${new Date(msg.time).toLocaleTimeString()}</span>
      ${isMine ? `<button onclick="deleteMsg('${msg.time}')">🗑</button>` : ""}
    </div>

    ${isMine ? `
      <div class="avatar-container">
        <img src="${avatarUrl}" class="avatar" onerror="this.src='default.png'" />
        <div class="user">${msg.username}</div>
      </div>
    ` : ""}
  `;

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}




function parseEmoji(text) {
  return text
    .replace(/:\)/g, "😊")
    .replace(/:D/g, "😄")
    .replace(/:\(/g, "😞")
    .replace(/<3/g, "❤️")
    .replace(/:o/g, "😮")
    .replace(/:P/g, "😛")
    .replace(/:fire:/g, "🔥")
    .replace(/:thumbsup:/g, "👍");
}


function deleteMsg(msgTime) {
  socket.emit("delete-message", msgTime);
}
