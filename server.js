require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const compression = require("compression");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { createStore } = require("./db");

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_MAX_AGE = "30d";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const users = [
  {
    id: "user-1",
    username: process.env.CHAT_USER_1_NAME || "me",
    displayName: process.env.CHAT_USER_1_DISPLAY_NAME || "我",
    password: process.env.CHAT_USER_1_PASSWORD || "change-me",
  },
  {
    id: "user-2",
    username: process.env.CHAT_USER_2_NAME || "wife",
    displayName: process.env.CHAT_USER_2_DISPLAY_NAME || "老婆",
    password: process.env.CHAT_USER_2_PASSWORD || "change-wife",
  },
].map((user) => ({
  ...user,
  passwordHash: bcrypt.hashSync(user.password, 10),
}));

const store = createStore();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
);
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}

function signToken(user) {
  return jwt.sign(publicUser(user), JWT_SECRET, { expiresIn: TOKEN_MAX_AGE });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return users.find((user) => user.id === payload.id) || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return res.status(401).json({ error: "请先登录。" });
  }

  req.user = user;
  next();
}

app.post("/api/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const user = users.find((item) => item.username === username);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "账号或密码不正确。" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/messages", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const messages = await store.listMessages(req.user.id, limit);
  res.json({ messages });
});

function cleanAttachment(rawAttachment) {
  if (!rawAttachment) {
    return null;
  }

  const name = String(rawAttachment.name || "").trim().slice(0, 160);
  const type = String(rawAttachment.type || "application/octet-stream").trim().slice(0, 120);
  const data = String(rawAttachment.data || "");
  const match = data.match(/^data:([^;]+);base64,(.+)$/);

  if (!name || !match) {
    throw new Error("附件格式不正确。");
  }

  const size = Buffer.byteLength(match[2], "base64");
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new Error("附件不能超过 5MB。");
  }

  return { name, type, data };
}

function cleanQuote(rawQuote) {
  if (!rawQuote) {
    return null;
  }

  const messageId = String(rawQuote.messageId || "").trim();
  const senderName = String(rawQuote.senderName || "").trim().slice(0, 80);
  const body = String(rawQuote.body || "").trim().slice(0, 180);

  if (!messageId || !senderName || !body) {
    return null;
  }

  return { messageId, senderName, body };
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return next(new Error("unauthorized"));
  }

  socket.user = user;
  next();
});

io.on("connection", (socket) => {
  socket.emit("presence", { online: io.engine.clientsCount });
  socket.broadcast.emit("presence", { online: io.engine.clientsCount });

  socket.on("message:send", async (payload, ack) => {
    const body = String(payload?.body || "").trim();
    let attachment = null;
    const quote = cleanQuote(payload?.quote);

    try {
      attachment = cleanAttachment(payload?.attachment);
    } catch (error) {
      ack?.({ ok: false, error: error.message });
      return;
    }

    if ((!body && !attachment) || body.length > 1000) {
      ack?.({ ok: false, error: "消息或附件不能为空，文字最多 1000 字。" });
      return;
    }

    try {
      const message = await store.createMessage(socket.user, body, attachment, quote);
      io.emit("message:new", message);
      ack?.({ ok: true, message });
    } catch {
      ack?.({ ok: false, error: "发送失败，请稍后再试。" });
    }
  });

  socket.on("message:recall", async (payload, ack) => {
    try {
      const messageId = String(payload?.id || "").trim();
      const message = await store.recallMessage(socket.user, messageId);

      if (!message) {
        ack?.({ ok: false, error: "只能撤回自己发送的消息。" });
        return;
      }

      io.emit("message:recalled", message);
      ack?.({ ok: true, message });
    } catch {
      ack?.({ ok: false, error: "撤回失败，请稍后再试。" });
    }
  });

  socket.on("message:delete", async (payload, ack) => {
    try {
      const messageId = String(payload?.id || "").trim();
      const result = await store.deleteMessage(socket.user, messageId);
      socket.emit("message:deleted", result);
      ack?.({ ok: true, ...result });
    } catch {
      ack?.({ ok: false, error: "删除失败，请稍后再试。" });
    }
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("presence", { online: io.engine.clientsCount });
  });
});

store
  .init()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Private chat is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
