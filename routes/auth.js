const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    if (!username || !firstname || !lastname || !password) {
      return res.status(400).json({ ok: false, error: "All fields are required." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      firstname,
      lastname,
      password: hashed
    });

    return res.json({
      ok: true,
      user: { username: user.username, firstname: user.firstname, lastname: user.lastname }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: "Username already exists." });
    }
    return res.status(500).json({ ok: false, error: "Signup failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password are required." });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials." });

    return res.json({
      ok: true,
      user: { username: user.username, firstname: user.firstname, lastname: user.lastname }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Login failed." });
  }
});

module.exports = router;