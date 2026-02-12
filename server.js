require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const setupSockets = require("./sockets");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const messagesRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/view", express.static(path.join(__dirname, "view")));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);

const { rooms } = setupSockets(io);

app.get("/api/rooms", (req, res) => {
  res.json({ ok: true, rooms });
});

app.get("/", (req, res) => {
  res.redirect("/view/login.html");
});

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB(process.env.MONGO_URI);
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
})();
