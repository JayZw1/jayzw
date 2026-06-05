require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const compression = require("compression");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Lunar, Solar } = require("lunar-javascript");
const { Server } = require("socket.io");
const { createStore } = require("./db");

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_MAX_AGE = "30d";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const CLEAR_HISTORY_PASSWORD = process.env.CLEAR_HISTORY_PASSWORD || "zhangwei020216";
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
const onlineSocketsByUser = new Map();

app.use(compression());
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.open-meteo.com", "ws:", "wss:"],
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

function getOnlineUsers() {
  return users
    .filter((user) => onlineSocketsByUser.get(user.id)?.size)
    .map(publicUser);
}

function emitPresence() {
  const onlineUsers = getOnlineUsers();

  io.emit("presence", {
    online: onlineUsers.length,
    users: onlineUsers,
  });
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

app.get("/api/important-days", requireAuth, async (req, res) => {
  const today = todayInChina();

  res.json({
    today: {
      date: formatYmd(today),
      label: formatChineseDate(today),
      festival: getFestival(today),
      weather: await getShundeWeather(),
    },
    days: [
      buildSolarDay("结婚纪念日", "公历3月2日", 3, 2),
      buildLunarDay("zw's birthday", "农历2月16日", 2, 16),
      buildLunarDay("xht's birthday", "农历12月3日", 12, 3),
    ],
  });
});

app.post("/api/messages", requireAuth, async (req, res) => {
  const body = String(req.body?.body || "").trim();
  let attachment = null;
  const quote = cleanQuote(req.body?.quote);

  try {
    attachment = cleanAttachment(req.body?.attachment);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  if ((!body && !attachment) || body.length > 1000) {
    return res.status(400).json({ error: "消息或附件不能为空，文字最多 1000 字。" });
  }

  try {
    const message = await store.createMessage(req.user, body, attachment, quote);
    io.emit("message:new", message);
    res.json({ message });
  } catch {
    res.status(500).json({ error: "发送失败，请稍后再试。" });
  }
});

app.post("/api/messages/clear", requireAuth, async (req, res) => {
  const password = String(req.body?.password || "");

  if (password !== CLEAR_HISTORY_PASSWORD) {
    return res.status(403).json({ error: "确认密码不正确。" });
  }

  try {
    await store.clearAllMessages();
    io.emit("messages:cleared");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "清空失败，请稍后再试。" });
  }
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

function todayInChina() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function formatYmd(date) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function formatChineseDate(date) {
  return `${date.year}年${date.month}月${date.day}日`;
}

function getFestival(date) {
  const solar = Solar.fromYmd(date.year, date.month, date.day);
  const names = [...solar.getFestivals(), ...solar.getLunar().getFestivals()].filter(Boolean);
  return names.length ? names.join("、") : "";
}

async function getShundeWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=22.8069&longitude=113.2939&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=1";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const weatherCode = data.daily?.weather_code?.[0];
    const min = Math.round(Number(data.daily?.temperature_2m_min?.[0]));
    const max = Math.round(Number(data.daily?.temperature_2m_max?.[0]));

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }

    return {
      location: "顺德",
      summary: weatherCodeLabel(weatherCode),
      min,
      max,
      label: `顺德 ${weatherCodeLabel(weatherCode)} ${min}/${max}℃`,
    };
  } catch {
    return null;
  }
}

function weatherCodeLabel(code) {
  if (code === 0) return "晴";
  if ([1, 2].includes(code)) return "少云";
  if (code === 3) return "多云";
  if ([45, 48].includes(code)) return "雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气";
}

function compareYmd(left, right) {
  return Date.UTC(left.year, left.month - 1, left.day) - Date.UTC(right.year, right.month - 1, right.day);
}

function daysBetween(from, to) {
  return Math.round(compareYmd(to, from) / 86400000);
}

function buildSolarDay(name, calendarLabel, month, day) {
  const today = todayInChina();
  let target = { year: today.year, month, day };

  if (compareYmd(target, today) < 0) {
    target = { year: today.year + 1, month, day };
  }

  return buildImportantDay(name, calendarLabel, target);
}

function buildLunarDay(name, calendarLabel, lunarMonth, lunarDay) {
  const today = todayInChina();
  const currentLunarYear = Solar.fromYmd(today.year, today.month, today.day).getLunar().getYear();
  let target = null;

  for (let year = currentLunarYear - 1; year <= currentLunarYear + 3; year += 1) {
    const solar = Lunar.fromYmd(year, lunarMonth, lunarDay).getSolar();
    const candidate = {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };

    if (compareYmd(candidate, today) >= 0 && (!target || compareYmd(candidate, target) < 0)) {
      target = candidate;
    }
  }

  return buildImportantDay(name, calendarLabel, target);
}

function buildImportantDay(name, calendarLabel, target) {
  const today = todayInChina();

  return {
    name,
    calendarLabel,
    nextDate: formatYmd(target),
    daysLeft: daysBetween(today, target),
  };
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
  const userSockets = onlineSocketsByUser.get(socket.user.id) || new Set();
  userSockets.add(socket.id);
  onlineSocketsByUser.set(socket.user.id, userSockets);
  emitPresence();

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

  socket.on("call:media", (payload) => {
    const kind = payload?.kind === "audio" ? "audio" : "video";
    const data = String(payload?.data || "");

    if (!data || data.length > 350000) {
      return;
    }

    socket.broadcast.emit("call:media", {
      from: publicUser(socket.user),
      kind,
      data,
    });
  });

  socket.on("call:decline", async (payload) => {
    const mode = payload?.mode === "video" ? "video" : "audio";
    const label = mode === "video" ? "视频通话" : "语音通话";
    const body = `${label} 对方已拒绝`;

    socket.broadcast.emit("call:decline", {
      from: publicUser(socket.user),
      mode,
    });

    try {
      const message = await store.createMessage(socket.user, body, null, null);
      io.emit("message:new", message);
    } catch {}
  });

  socket.on("call:end", async (payload) => {
    const mode = payload?.mode === "video" ? "video" : "audio";
    const connected = Boolean(payload?.connected);
    const reason = payload?.reason === "timeout" ? "timeout" : "ended";
    const minutes = Math.max(0, Math.ceil(Number(payload?.seconds || 0) / 60));
    const hoursPart = Math.floor(minutes / 60);
    const minutesPart = minutes % 60;
    const label = mode === "video" ? "视频通话" : "语音通话";
    const body = connected
      ? `${label} ${hoursPart}小时${minutesPart}分钟`
      : `${label} ${reason === "timeout" ? "对方无响应" : "未接通"}`;

    if (reason === "timeout") {
      socket.broadcast.emit("call:timeout", {
        from: publicUser(socket.user),
        mode,
      });
    }

    socket.broadcast.emit("call:end", {
      from: publicUser(socket.user),
      mode,
      seconds: Number(payload?.seconds || 0),
      reason,
      connected,
    });

    try {
      const message = await store.createMessage(socket.user, body, null, null);
      io.emit("message:new", message);
    } catch {}
  });

  socket.on("disconnect", () => {
    const sockets = onlineSocketsByUser.get(socket.user.id);

    if (sockets) {
      sockets.delete(socket.id);

      if (!sockets.size) {
        onlineSocketsByUser.delete(socket.user.id);
      }
    }

    emitPresence();
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
