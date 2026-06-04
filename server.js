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
const STICKER_API_URL =
  process.env.STICKER_API_URL ||
  "https://cn.apihz.cn/api/img/apihzbqb.php?id=88888888&key=88888888&type=2&words={query}&limit=8";

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

app.get("/api/sticker", requireAuth, async (req, res) => {
  try {
    const query = encodeURIComponent(String(req.query.q || "开心").trim() || "开心");
    const response = await fetch(STICKER_API_URL.replace("{query}", query));
    const contentType = response.headers.get("content-type") || "";
    let imageResponse = response;

    if (contentType.includes("application/json")) {
      const data = await response.json();
      const imageUrl = Array.isArray(data.res)
        ? data.res[Math.floor(Math.random() * data.res.length)]
        : data.url || data.img || data.image || data.pic || data.data;

      if (!imageUrl || data.code === 400) {
        return res.status(502).json({ error: data.msg || "表情包接口暂时不可用。" });
      }

      imageResponse = await fetch(imageUrl);
    }

    if (!imageResponse.ok) {
      return res.status(502).json({ error: "表情包接口暂时不可用。" });
    }

    const imageType = imageResponse.headers.get("content-type") || "image/jpeg";
    if (!imageType.startsWith("image/")) {
      return res.status(502).json({ error: "表情包接口没有返回图片。" });
    }

    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      return res.status(502).json({ error: "表情包图片超过 5MB。" });
    }

    const extension = imageType.split("/")[1]?.split(";")[0] || "jpg";
    res.json({
      name: `sticker-${Date.now()}.${extension}`,
      type: imageType,
      data: `data:${imageType};base64,${bytes.toString("base64")}`,
    });
  } catch {
    res.status(502).json({ error: "表情包接口暂时不可用。" });
  }
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

  socket.on("call:offer", (payload) => {
    socket.broadcast.emit("call:offer", {
      from: publicUser(socket.user),
      mode: payload?.mode === "video" ? "video" : "audio",
      offer: payload?.offer,
    });
  });

  socket.on("call:answer", (payload) => {
    socket.broadcast.emit("call:answer", {
      from: publicUser(socket.user),
      answer: payload?.answer,
    });
  });

  socket.on("call:ice", (payload) => {
    socket.broadcast.emit("call:ice", {
      from: publicUser(socket.user),
      candidate: payload?.candidate,
    });
  });

  socket.on("call:end", async (payload) => {
    const mode = payload?.mode === "video" ? "video" : "audio";
    const minutes = Math.max(0, Math.ceil(Number(payload?.seconds || 0) / 60));
    const hoursPart = Math.floor(minutes / 60);
    const minutesPart = minutes % 60;
    const label = mode === "video" ? "视频通话" : "语音通话";
    const body = `${label} ${hoursPart}小时${minutesPart}分钟`;

    socket.broadcast.emit("call:end", {
      from: publicUser(socket.user),
      mode,
      seconds: Number(payload?.seconds || 0),
    });

    try {
      const message = await store.createMessage(socket.user, body, null, null);
      io.emit("message:new", message);
    } catch {}
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
