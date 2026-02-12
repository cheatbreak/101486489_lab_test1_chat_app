const GroupMessage = require("../models/GroupMessage");
const PrivateMessage = require("../models/PrivateMessage");

const rooms = ["devops", "cloud computing", "covid19", "sports", "nodeJS"];

function setupSockets(io) {
  const userSockets = new Map(); // username
  const socketUser = new Map();  // socketId, username
  const socketRoom = new Map();  // socketId, room

  function addUserSocket(username, socketId) {
    if (!userSockets.has(username)) userSockets.set(username, new Set());
    userSockets.get(username).add(socketId);
    socketUser.set(socketId, username);
  }

  function removeUserSocket(socketId) {
    const username = socketUser.get(socketId);
    if (!username) return;

    const set = userSockets.get(username);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) userSockets.delete(username);
    }
    socketUser.delete(socketId);
  }

  io.on("connection", (socket) => {
    socket.on("register", ({ username }) => {
      if (!username) return;
      addUserSocket(username, socket.id);
    });

    socket.on("joinRoom", async ({ username, room }) => {
      if (!username || !room) return;
      if (!rooms.includes(room)) return;

      const prev = socketRoom.get(socket.id);
      if (prev) socket.leave(prev);

      socket.join(room);
      socketRoom.set(socket.id, room);

      socket.to(room).emit("system", { room, message: `${username} joined ${room}` });
      socket.emit("joinedRoom", { room });
    });

    socket.on("leaveRoom", ({ username }) => {
      const room = socketRoom.get(socket.id);
      if (!room) return;

      socket.leave(room);
      socketRoom.delete(socket.id);

      if (username) socket.to(room).emit("system", { room, message: `${username} left ${room}` });
      socket.emit("leftRoom", { room });
    });

    socket.on("groupMessage", async ({ from_user, room, message }) => {
      if (!from_user || !room || !message) return;

      const saved = await GroupMessage.create({ from_user, room, message });
      io.to(room).emit("groupMessage", {
        from_user: saved.from_user,
        room: saved.room,
        message: saved.message,
        date_sent: saved.date_sent
      });
    });

    socket.on("privateMessage", async ({ from_user, to_user, message }) => {
      if (!from_user || !to_user || !message) return;

      const saved = await PrivateMessage.create({ from_user, to_user, message });

      const payload = {
        from_user: saved.from_user,
        to_user: saved.to_user,
        message: saved.message,
        date_sent: saved.date_sent
      };

      const rec = userSockets.get(to_user);
      if (rec) {
        for (const sid of rec) io.to(sid).emit("privateMessage", payload);
      }

      const snd = userSockets.get(from_user);
      if (snd) {
        for (const sid of snd) io.to(sid).emit("privateMessage", payload);
      }
    });

    // Typing indicator
    socket.on("typingPrivate", ({ from_user, to_user }) => {
      if (!from_user || !to_user) return;
      const rec = userSockets.get(to_user);
      if (!rec) return;
      for (const sid of rec) io.to(sid).emit("typingPrivate", { from_user });
    });

    socket.on("stopTypingPrivate", ({ from_user, to_user }) => {
      if (!from_user || !to_user) return;
      const rec = userSockets.get(to_user);
      if (!rec) return;
      for (const sid of rec) io.to(sid).emit("stopTypingPrivate", { from_user });
    });

    socket.on("disconnect", () => {
      const room = socketRoom.get(socket.id);
      const username = socketUser.get(socket.id);

      if (room && username) socket.to(room).emit("system", { room, message: `${username} disconnected` });

      socketRoom.delete(socket.id);
      removeUserSocket(socket.id);
    });
  });

  return { rooms };
}

module.exports = setupSockets;