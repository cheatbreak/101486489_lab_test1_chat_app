const userRaw = localStorage.getItem("chat_user");
if (!userRaw) window.location.href = "/view/login.html";

const me = JSON.parse(userRaw);
$("#whoami").text(`${me.username} (${me.firstname} ${me.lastname})`);

const socket = io();
socket.emit("register", { username: me.username });

let currentRoom = null;
let mode = "group"; // "group" or "private"
let privateWith = null;

function setMode(newMode) {
  mode = newMode;
  if (mode === "group") {
    privateWith = null;
    $("#chatMode").text("Mode: Group");
  } else {
    $("#chatMode").text(`Mode: Private with ${privateWith}`);
  }
  $("#typing").text("");
}

function addMsg(html) {
  $("#messages").append(html);
  $("#messages").scrollTop($("#messages")[0].scrollHeight);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

async function loadRooms() {
  const res = await fetch("/api/rooms");
  const data = await res.json();
  $("#rooms").empty();

  data.rooms.forEach((r) => {
    const btn = $(`<button class="list-group-item list-group-item-action">${r}</button>`);
    btn.on("click", () => joinRoom(r));
    $("#rooms").append(btn);
  });
}

async function loadUsers() {
  const res = await fetch("/api/users");
  const data = await res.json();

  const sel = $("#privateUser");
  sel.empty();

  const others = (data.users || []).filter(u => u.username !== me.username);
  if (others.length === 0) {
    sel.append(`<option value="">No other users yet</option>`);
    return;
  }

  others.forEach(u => {
    sel.append(`<option value="${u.username}">${u.username} (${u.firstname} ${u.lastname})</option>`);
  });
}

async function loadGroupHistory(room) {
  const res = await fetch(`/api/messages/group/${encodeURIComponent(room)}`);
  const data = await res.json();

  $("#messages").empty();
  (data.messages || []).forEach(m => {
    addMsg(`<div class="msg"><span class="who">${escapeHtml(m.from_user)}</span>: ${escapeHtml(m.message)}</div>`);
  });
}

async function loadPrivateHistory(withUser) {
  const res = await fetch(`/api/messages/private?user1=${encodeURIComponent(me.username)}&user2=${encodeURIComponent(withUser)}`);
  const data = await res.json();

  $("#messages").empty();
  (data.messages || []).forEach(m => {
    const who = m.from_user === me.username ? "You" : m.from_user;
    addMsg(`<div class="msg"><span class="who">${escapeHtml(who)}</span>: ${escapeHtml(m.message)}</div>`);
  });
}

function joinRoom(room) {
  currentRoom = room;
  setMode("group");
  $("#chatTitle").text(`Room: ${room}`);
  $("#hint").text("You are chatting in a room. Select a different room anytime.");
  socket.emit("joinRoom", { username: me.username, room });
  loadGroupHistory(room);
}

$("#leaveRoomBtn").on("click", () => {
  if (!currentRoom) return;
  socket.emit("leaveRoom", { username: me.username });
  currentRoom = null;
  $("#chatTitle").text("Not in a room");
  $("#messages").empty();
  $("#hint").text("Join a room to chat.");
});

$("#openPrivateBtn").on("click", async () => {
  const u = $("#privateUser").val();
  if (!u) return;

  privateWith = u;
  setMode("private");
  $("#chatTitle").text(`Private: ${me.username} ↔ ${privateWith}`);
  $("#hint").text("Private chat. Room chat is separate.");
  await loadPrivateHistory(privateWith);
});

let typingTimer = null;
let typingActive = false;

function startTyping() {
  if (mode !== "private" || !privateWith) return;
  if (!typingActive) {
    typingActive = true;
    socket.emit("typingPrivate", { from_user: me.username, to_user: privateWith });
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 700);
}

function stopTyping() {
  if (mode !== "private" || !privateWith) return;
  if (typingActive) {
    typingActive = false;
    socket.emit("stopTypingPrivate", { from_user: me.username, to_user: privateWith });
  }
}

$("#msgInput").on("input", startTyping);

$("#msgForm").on("submit", function (e) {
  e.preventDefault();
  const msg = $("#msgInput").val().trim();
  if (!msg) return;

  $("#msgInput").val("");
  stopTyping();

  if (mode === "private") {
    if (!privateWith) return;
    socket.emit("privateMessage", { from_user: me.username, to_user: privateWith, message: msg });
    return;
  }

  // groups
  if (!currentRoom) return;
  socket.emit("groupMessage", { from_user: me.username, room: currentRoom, message: msg });
});

socket.on("system", ({ message }) => {
  addMsg(`<div class="sys">${escapeHtml(message)}</div>`);
});

socket.on("groupMessage", (m) => {
  if (mode !== "group") return;
  if (!currentRoom || m.room !== currentRoom) return;
  addMsg(`<div class="msg"><span class="who">${escapeHtml(m.from_user)}</span>: ${escapeHtml(m.message)}</div>`);
});

socket.on("privateMessage", (m) => {
  const involved = (m.from_user === me.username && m.to_user === privateWith) ||
                   (m.to_user === me.username && m.from_user === privateWith);

  if (mode !== "private" || !privateWith || !involved) return;

  const who = m.from_user === me.username ? "You" : m.from_user;
  addMsg(`<div class="msg"><span class="who">${escapeHtml(who)}</span>: ${escapeHtml(m.message)}</div>`);
});

socket.on("typingPrivate", ({ from_user }) => {
  if (mode !== "private" || !privateWith) return;
  if (from_user !== privateWith) return;
  $("#typing").text(`${from_user} is typing...`);
});

socket.on("stopTypingPrivate", ({ from_user }) => {
  if (mode !== "private" || !privateWith) return;
  if (from_user !== privateWith) return;
  $("#typing").text("");
});

$("#logoutBtn").on("click", () => {
  localStorage.removeItem("chat_user");
  window.location.href = "/view/login.html";
});

(async function init() {
  await loadRooms();
  await loadUsers();
  $("#hint").text("Join a room to chat, or open a private chat.");
})();