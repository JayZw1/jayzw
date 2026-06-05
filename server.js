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
const webpush = require("web-push");
const { createStore } = require("./db");
const { createAttachmentStorage } = require("./storage");

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_MAX_AGE = "30d";
const MAX_ATTACHMENT_BYTES = Number.POSITIVE_INFINITY;
const CLEAR_HISTORY_PASSWORD = process.env.CLEAR_HISTORY_PASSWORD || "zhangwei020216";
const DIARY_MIN_DATE = "2025-01-01";
const FESTIVAL_DETAILS = {
  元旦: {
    intro: "新一年的开始，适合一起定下新的小目标。",
    note: "公历节日，每年1月1日。",
  },
  除夕: {
    intro: "农历年的最后一天，寓意辞旧迎新、团圆守岁。",
    note: "传统上会吃年夜饭、贴春联、等待新年到来。",
  },
  春节: {
    intro: "中国最重要的传统节日，象征团圆、祝福和新的开始。",
    note: "农历正月初一，也叫农历新年。",
  },
  元宵节: {
    intro: "春节后的第一个月圆之夜，寓意团圆圆满。",
    note: "常见习俗有吃汤圆、赏灯、猜灯谜。",
  },
  清明节: {
    intro: "慎终追远、踏青赏春的节日。",
    note: "通常在公历4月4日至6日之间。",
  },
  劳动节: {
    intro: "致敬劳动与生活，也适合安排一次轻松的小休息。",
    note: "公历5月1日。",
  },
  端午节: {
    intro: "纪念与祈福并重的传统节日。",
    note: "农历五月初五，常见习俗有吃粽子、赛龙舟、挂艾草。",
  },
  七夕节: {
    intro: "中国传统爱情节日，适合给彼此留一点仪式感。",
    note: "农历七月初七，源自牛郎织女传说。",
  },
  中秋节: {
    intro: "象征团圆与思念的传统节日。",
    note: "农历八月十五，常见习俗有赏月、吃月饼。",
  },
  国庆节: {
    intro: "庆祝中华人民共和国成立的节日。",
    note: "公历10月1日。",
  },
  重阳节: {
    intro: "登高祈福、敬老感恩的传统节日。",
    note: "农历九月初九。",
  },
};
const TRACKED_FESTIVALS = [
  { name: "元旦", type: "solar", month: 1, day: 1 },
  { name: "除夕", type: "lunar", month: 12, day: 30, fallbackDay: 29 },
  { name: "春节", type: "lunar", month: 1, day: 1 },
  { name: "元宵节", type: "lunar", month: 1, day: 15 },
  { name: "清明节", type: "solar", month: 4, day: 4 },
  { name: "劳动节", type: "solar", month: 5, day: 1 },
  { name: "端午节", type: "lunar", month: 5, day: 5 },
  { name: "七夕节", type: "lunar", month: 7, day: 7 },
  { name: "中秋节", type: "lunar", month: 8, day: 15 },
  { name: "国庆节", type: "solar", month: 10, day: 1 },
  { name: "重阳节", type: "lunar", month: 9, day: 9 },
];
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
const attachmentStorage = createAttachmentStorage();
const attachmentPublicOrigin = getOrigin(process.env.R2_PUBLIC_BASE_URL);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const onlineSocketsByUser = new Map();
let vapidPublicKey = "";

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
        imgSrc: ["'self'", "data:", ...(attachmentPublicOrigin ? [attachmentPublicOrigin] : [])],
        mediaSrc: ["'self'", "data:", "blob:", ...(attachmentPublicOrigin ? [attachmentPublicOrigin] : [])],
        connectSrc: ["'self'", "https://api.open-meteo.com", "ws:", "wss:"],
      },
    },
  })
);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "2gb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

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

async function setupPushKeys() {
  let keys = await store.getSetting("vapidKeys");

  if (!keys) {
    keys = JSON.stringify(webpush.generateVAPIDKeys());
    await store.setSetting("vapidKeys", keys);
  }

  const parsed = JSON.parse(keys);
  vapidPublicKey = parsed.publicKey;
  webpush.setVapidDetails("mailto:private-chat@example.com", parsed.publicKey, parsed.privateKey);
}

async function sendPushToOthers(senderId, payload) {
  const subscriptions = await store.listPushSubscriptionsForOthers(senderId);

  await Promise.all(
    subscriptions.map(async ({ endpoint, subscription }) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await store.deletePushSubscription(endpoint);
        }
      }
    })
  );
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

async function getEffectivePasswordHash(user) {
  return (await store.getUserPasswordHash(user.id)) || user.passwordHash;
}

app.post("/api/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const user = users.find((item) => item.username === username);
  const passwordHash = user ? await getEffectivePasswordHash(user) : "";

  if (!user || !(await bcrypt.compare(password, passwordHash))) {
    return res.status(401).json({ error: "账号或密码不正确。" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post("/api/password/change", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const oldPassword = String(req.body?.oldPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const user = users.find((item) => item.username === username);

  if (!user) {
    return res.status(401).json({ error: "账号或旧密码不正确。" });
  }

  if (newPassword.length < 4 || newPassword.length > 64) {
    return res.status(400).json({ error: "新密码长度需要在 4 到 64 位之间。" });
  }

  const passwordHash = await getEffectivePasswordHash(user);

  if (!(await bcrypt.compare(oldPassword, passwordHash))) {
    return res.status(401).json({ error: "账号或旧密码不正确。" });
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  await store.setUserPasswordHash(user.id, nextHash);
  user.passwordHash = nextHash;
  res.json({ ok: true });
});

app.get("/api/push/public-key", requireAuth, (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  const subscription = req.body?.subscription;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "推送订阅无效。" });
  }

  try {
    await store.savePushSubscription(req.user, subscription);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "推送订阅保存失败。" });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/messages", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const messages = await store.listMessages(req.user.id, limit);
  res.json({ messages });
});

app.get("/api/messages/search", requireAuth, async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  const requestedType = String(req.query.type || "all").trim();
  const type = ["all", "text", "image", "video", "file"].includes(requestedType) ? requestedType : "all";
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

  if (!query && (type === "all" || type === "text")) {
    return res.json({ messages: [] });
  }

  try {
    const messages = await store.searchMessages(req.user.id, query, limit, type);
    res.json({ messages });
  } catch {
    res.status(500).json({ error: "聊天记录查询失败。" });
  }
});

app.get("/api/messages/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const message = await store.getMessage(req.user.id, id);

    if (!message) {
      return res.status(404).json({ error: "没有找到这条消息。" });
    }

    res.json({ message });
  } catch {
    res.status(500).json({ error: "消息加载失败。" });
  }
});

app.get("/api/messages/:id/attachment", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const message = await store.getMessage(req.user.id, id);

    if (!message || !message.attachmentName) {
      return res.status(404).send("附件不存在。");
    }

    const attachment = await loadMessageAttachment(message);

    if (!attachment) {
      return res.status(404).send("附件无法打开。");
    }

    res.setHeader("Content-Type", attachment.type || "application/octet-stream");
    res.setHeader("Content-Disposition", `${isPreviewableAttachment(attachment.type) ? "inline" : "attachment"}; filename="${encodeURIComponent(attachment.name || "attachment")}"`);
    res.send(attachment.data);
  } catch {
    res.status(500).send("附件加载失败。");
  }
});

app.get("/api/storage-usage", requireAuth, async (req, res) => {
  try {
    const stats = await store.getStorageStats();
    const textBytes = Number(stats.textBytes || 0);
    const externalAttachmentBytes = Number(stats.externalAttachmentBytes || 0);
    const databaseAttachmentBytes = Number(stats.databaseAttachmentBytes || 0);
    res.json({
      text: {
        used: textBytes,
        total: 500 * 1024 * 1024,
        label: `${formatBytes(textBytes)} / 500 MB`,
      },
      attachment: {
        used: attachmentStorage.enabled ? externalAttachmentBytes : databaseAttachmentBytes,
        total: attachmentStorage.totalBytes,
        label: `${formatBytes(attachmentStorage.enabled ? externalAttachmentBytes : databaseAttachmentBytes)} / ${formatBytes(
          attachmentStorage.totalBytes
        )}`,
        mode: attachmentStorage.enabled ? "Cloudflare R2" : "数据库附件",
      },
    });
  } catch {
    res.status(500).json({ error: "存储信息加载失败。" });
  }
});

app.post("/api/storage-migrate", requireAuth, async (req, res) => {
  const password = String(req.body?.password || "");

  if (password !== CLEAR_HISTORY_PASSWORD) {
    return res.status(403).json({ error: "确认密码不正确。" });
  }

  if (!attachmentStorage.enabled) {
    return res.status(400).json({ error: "请先配置 Cloudflare R2 环境变量。" });
  }

  try {
    const rows = await store.listDatabaseAttachments(30);
    let migrated = 0;

    for (const row of rows) {
      const attachment = cleanAttachment(row);
      const saved = await prepareAttachmentForStorage(attachment);
      await store.updateAttachmentStorage(row.id, saved);
      migrated += 1;
    }

    res.json({ migrated, remainingHint: rows.length >= 30 ? "还有附件未迁移，可再次执行。" : "迁移完成。" });
  } catch {
    res.status(500).json({ error: "迁移失败，请稍后再试。" });
  }
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
      buildSolarDay("结婚纪念日 👫🌹💍", "公历3月2日", 3, 2),
      buildLunarDay("zw's birthday 👱‍♂️🎂", "农历2月16日", 2, 16),
      buildLunarDay("xht's birthday 👩🎂", "农历12月3日", 12, 3),
    ],
  });
});

app.get("/api/upcoming-festival", requireAuth, (req, res) => {
  res.json({ festival: buildUpcomingFestival() });
});

app.get("/api/food-items", requireAuth, async (req, res) => {
  try {
    res.json({ items: await store.listFoodItems() });
  } catch {
    res.status(500).json({ error: "买菜清单加载失败。" });
  }
});

app.post("/api/food-items", requireAuth, async (req, res) => {
  const plannedDate = cleanFoodDate(req.body?.plannedDate);
  const dishName = String(req.body?.dishName || "").trim().slice(0, 80);

  if (!plannedDate || !dishName) {
    return res.status(400).json({ error: "请选择日期并输入菜名。" });
  }

  try {
    const item = await store.createFoodItem(req.user, plannedDate, dishName);
    io.emit("food:created", item);
    res.json({ item });
  } catch {
    res.status(500).json({ error: "添加失败，请稍后再试。" });
  }
});

app.patch("/api/food-items/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const item = await store.updateFoodItemBought(id, Boolean(req.body?.bought));

    if (!item) {
      return res.status(404).json({ error: "没有找到这道菜。" });
    }

    io.emit("food:updated", item);
    res.json({ item });
  } catch {
    res.status(500).json({ error: "更新失败，请稍后再试。" });
  }
});

app.delete("/api/food-items/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const item = await store.deleteFoodItem(id);

    if (!item) {
      return res.status(404).json({ error: "没有找到这道菜。" });
    }

    io.emit("food:deleted", { id: String(id) });
    res.json({ ok: true, id: String(id) });
  } catch {
    res.status(500).json({ error: "删除失败，请稍后再试。" });
  }
});

app.delete("/api/food-days/:plannedDate", requireAuth, async (req, res) => {
  const plannedDate = cleanFoodDate(req.params.plannedDate);

  if (!plannedDate) {
    return res.status(400).json({ error: "日期不正确。" });
  }

  try {
    const deleted = await store.deleteFoodItemsByDate(plannedDate);

    if (!deleted) {
      return res.status(404).json({ error: "这天没有买菜清单。" });
    }

    io.emit("food:dayDeleted", { plannedDate });
    res.json({ ok: true, plannedDate, deleted });
  } catch {
    res.status(500).json({ error: "删除失败，请稍后再试。" });
  }
});

app.get("/api/schedule-items", requireAuth, async (req, res) => {
  try {
    res.json({ items: await store.listScheduleItems() });
  } catch {
    res.status(500).json({ error: "行程加载失败。" });
  }
});

app.post("/api/schedule-items", requireAuth, async (req, res) => {
  const plannedDate = cleanFoodDate(req.body?.plannedDate);
  const content = String(req.body?.content || "").trim().slice(0, 120);

  if (!plannedDate || !content) {
    return res.status(400).json({ error: "请选择日期并输入行程。" });
  }

  try {
    const item = await store.createScheduleItem(req.user, plannedDate, content);
    io.emit("schedule:created", item);
    res.json({ item });
  } catch {
    res.status(500).json({ error: "添加失败，请稍后再试。" });
  }
});

app.delete("/api/schedule-items/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const item = await store.deleteScheduleItem(id);

    if (!item) {
      return res.status(404).json({ error: "没有找到这个行程。" });
    }

    io.emit("schedule:deleted", { id: String(id) });
    res.json({ ok: true, id: String(id) });
  } catch {
    res.status(500).json({ error: "删除失败，请稍后再试。" });
  }
});

app.get("/api/diary-entries", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 2000, 1), 5000);

  try {
    res.json({ entries: await store.listDiaryEntries(limit) });
  } catch {
    res.status(500).json({ error: "日记加载失败。" });
  }
});

app.post("/api/diary-entries", requireAuth, async (req, res) => {
  const content = String(req.body?.content || "").trim().slice(0, 120);
  const today = formatYmd(todayInChina());
  const entryDate = cleanFoodDate(req.body?.entryDate) || today;

  if (!content) {
    return res.status(400).json({ error: "请写下一句话。" });
  }

  if (entryDate > today) {
    return res.status(400).json({ error: "日记只能记录今天和过去的事情。" });
  }

  if (entryDate < DIARY_MIN_DATE) {
    return res.status(400).json({ error: "日记最早只能记录到 2025年1月1日。" });
  }

  try {
    const entry = await store.saveDiaryEntry(req.user, entryDate, content);
    io.emit("diary:saved", entry);
    res.json({ entry });
  } catch {
    res.status(500).json({ error: "保存失败，请稍后再试。" });
  }
});

app.delete("/api/diary-entries/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "").trim();

  if (!id) {
    return res.status(400).json({ error: "日记不存在。" });
  }

  try {
    const result = await store.deleteDiaryEntry(id);

    if (!result) {
      return res.status(404).json({ error: "日记不存在。" });
    }

    io.emit("diary:deleted", result);
    res.json(result);
  } catch {
    res.status(500).json({ error: "删除失败，请稍后再试。" });
  }
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
    attachment = await prepareAttachmentForStorage(attachment);
    const message = await store.createMessage(req.user, body, attachment, quote);
    io.emit("message:new", message);
    sendPushToOthers(req.user.id, {
      title: "碎碎念收件箱",
      body: "收到一条新消息",
      tag: "private-chat-message",
    }).catch(() => {});
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
    if (Number.isFinite(MAX_ATTACHMENT_BYTES) && bytes.length > MAX_ATTACHMENT_BYTES) {
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
  if (Number.isFinite(MAX_ATTACHMENT_BYTES) && size > MAX_ATTACHMENT_BYTES) {
    throw new Error("附件太大了。");
  }

  return { name, type, data, buffer: Buffer.from(match[2], "base64"), size };
}

async function prepareAttachmentForStorage(attachment) {
  if (!attachment) {
    return null;
  }

  return attachmentStorage.saveAttachment(attachment);
}

async function loadMessageAttachment(message) {
  const attachment = {
    name: message.attachmentName,
    type: message.attachmentType,
    data: message.attachmentData,
    storageKey: message.attachmentStorageKey,
  };

  if (attachment.storageKey) {
    const storedAttachment = await attachmentStorage.getAttachment(attachment);
    if (storedAttachment) {
      return storedAttachment;
    }
  }

  const dataUrl = String(attachment.data || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      data: Buffer.from(match[2], "base64"),
      type: attachment.type || match[1],
      name: attachment.name,
    };
  }

  if (/^https?:\/\//i.test(dataUrl)) {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      return null;
    }

    return {
      data: Buffer.from(await response.arrayBuffer()),
      type: attachment.type || response.headers.get("content-type") || "application/octet-stream",
      name: attachment.name,
    };
  }

  return null;
}

function isPreviewableAttachment(type) {
  return String(type || "").startsWith("image/") || String(type || "").startsWith("video/");
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${value} B`;
}

function getOrigin(value) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
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

function cleanFoodDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
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
    "https://api.open-meteo.com/v1/forecast?latitude=22.8069&longitude=113.2939&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Asia%2FShanghai&forecast_days=1&forecast_hours=12";

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
      hourly: buildHourlyWeather(data.hourly),
    };
  } catch {
    return null;
  }
}

function buildHourlyWeather(hourly) {
  const times = hourly?.time || [];

  return times.slice(0, 12).map((time, index) => ({
    time,
    summary: weatherCodeLabel(hourly.weather_code?.[index]),
    temperature: roundWeatherValue(hourly.temperature_2m?.[index]),
    apparentTemperature: roundWeatherValue(hourly.apparent_temperature?.[index]),
    humidity: roundWeatherValue(hourly.relative_humidity_2m?.[index]),
    precipitationProbability: roundWeatherValue(hourly.precipitation_probability?.[index]),
    precipitation: roundWeatherValue(hourly.precipitation?.[index], 1),
    windSpeed: roundWeatherValue(hourly.wind_speed_10m?.[index]),
  }));
}

function roundWeatherValue(value, digits = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
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

function buildUpcomingFestival() {
  const today = todayInChina();
  const festivals = TRACKED_FESTIVALS.map((festival) => buildFestivalDay(festival))
    .filter(Boolean)
    .sort((left, right) => left.daysLeft - right.daysLeft);
  const nearestDate = festivals[0]?.date;

  if (!nearestDate) {
    return null;
  }

  const importantDays = [
    buildSolarDay("结婚纪念日 👫🌹💍", "公历3月2日", 3, 2),
    buildLunarDay("zw's birthday 👱‍♂️🎂", "农历2月16日", 2, 16),
    buildLunarDay("xht's birthday 👩🎂", "农历12月3日", 12, 3),
  ].filter((day) => day.nextDate === nearestDate);

  return {
    date: nearestDate,
    label: formatChineseDate(parseYmdObject(nearestDate)),
    daysLeft: daysBetween(today, parseYmdObject(nearestDate)),
    importantDays,
    festivals: festivals.filter((festival) => festival.date === nearestDate),
  };
}

function buildFestivalDay(festival) {
  const today = todayInChina();
  let target = null;
  let calendarLabel = "";

  if (festival.type === "solar") {
    target = { year: today.year, month: festival.month, day: festival.day };
    if (compareYmd(target, today) < 0) {
      target.year += 1;
    }
    calendarLabel = `公历${festival.month}月${festival.day}日`;
  } else {
    const currentLunarYear = Solar.fromYmd(today.year, today.month, today.day).getLunar().getYear();
    for (let year = currentLunarYear - 1; year <= currentLunarYear + 3; year += 1) {
      const candidate = buildLunarFestivalTarget(year, festival);
      if (candidate && compareYmd(candidate, today) >= 0 && (!target || compareYmd(candidate, target) < 0)) {
        target = candidate;
      }
    }
    calendarLabel = `农历${festival.month}月${festival.day}日`;
  }

  if (!target) {
    return null;
  }

  const details = FESTIVAL_DETAILS[festival.name] || {};

  return {
    name: festival.name,
    date: formatYmd(target),
    calendarLabel,
    daysLeft: daysBetween(today, target),
    intro: details.intro || "一个值得记住的节日。",
    note: details.note || "",
  };
}

function buildLunarFestivalTarget(year, festival) {
  try {
    const solar = Lunar.fromYmd(year, festival.month, festival.day).getSolar();
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
  } catch {
    if (!festival.fallbackDay) {
      return null;
    }
    const solar = Lunar.fromYmd(year, festival.month, festival.fallbackDay).getSolar();
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
  }
}

function parseYmdObject(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));
  return { year, month, day };
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
      attachment = await prepareAttachmentForStorage(attachment);
      const message = await store.createMessage(socket.user, body, attachment, quote);
      io.emit("message:new", message);
      sendPushToOthers(socket.user.id, {
        title: "碎碎念收件箱",
        body: "收到一条新消息",
        tag: "private-chat-message",
      }).catch(() => {});
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

  socket.on("typing:start", () => {
    socket.broadcast.emit("typing:start", { user: publicUser(socket.user) });
  });

  socket.on("typing:stop", () => {
    socket.broadcast.emit("typing:stop", { user: publicUser(socket.user) });
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
      sendPushToOthers(socket.user.id, {
        title: "碎碎念收件箱",
        body: "收到一条新消息",
        tag: "private-chat-message",
      }).catch(() => {});
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
      sendPushToOthers(socket.user.id, {
        title: "碎碎念收件箱",
        body: "收到一条新消息",
        tag: "private-chat-message",
      }).catch(() => {});
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
  .then(setupPushKeys)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Private chat is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
