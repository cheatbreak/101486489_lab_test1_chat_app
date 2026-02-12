const express = require("express");
const GroupMessage = require("../models/GroupMessage");
const PrivateMessage = require("../models/PrivateMessage");

const router = express.Router();

// Group chat history
router.get("/group/:room", async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 }).limit(200);
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Could not fetch group messages." });
  }
});

// Private chat history
router.get("/private", async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) return res.status(400).json({ ok: false, error: "user1 and user2 required" });

    const messages = await PrivateMessage.find({
      $or: [
        { from_user: user1, to_user: user2 },
        { from_user: user2, to_user: user1 }
      ]
    }).sort({ date_sent: 1 }).limit(200);

    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Could not fetch private messages." });
  }
});

module.exports = router;