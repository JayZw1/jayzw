const state = {
  token: localStorage.getItem("chat_token"),
  user: null,
  socket: null,
  attachment: null,
  quote: null,
  contextMessage: null,
  longPressTimer: null,
  renderedMessages: new Set(),
  weather: null,
  foodItems: [],
};

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const messagesEl = document.querySelector("#messages");
const messageForm = document.querySelector("#messageForm");
const sendButton = document.querySelector("#sendButton");
const messageInput = document.querySelector("#messageInput");
const fileInput = document.querySelector("#fileInput");
const attachButton = document.querySelector("#attachButton");
const attachmentPreview = document.querySelector("#attachmentPreview");
const replyPreview = document.querySelector("#replyPreview");
const emojiButton = document.querySelector("#emojiButton");
const emojiPanel = document.querySelector("#emojiPanel");
const emojiGrid = document.querySelector("#emojiGrid");
const stickerPane = document.querySelector("#stickerPane");
const stickerPreview = document.querySelector("#stickerPreview");
const refreshStickerButton = document.querySelector("#refreshStickerButton");
const sendStickerButton = document.querySelector("#sendStickerButton");
const stickerSearchForm = document.querySelector("#stickerSearchForm");
const stickerSearchButton = document.querySelector("#stickerSearchButton");
const stickerSearchInput = document.querySelector("#stickerSearchInput");
const contextMenu = document.querySelector("#contextMenu");
const statusText = document.querySelector("#statusText");
const logoutButton = document.querySelector("#logoutButton");
const clearHistoryButton = document.querySelector("#clearHistoryButton");
const importantDaysButton = document.querySelector("#importantDaysButton");
const importantDaysPanel = document.querySelector("#importantDaysPanel");
const importantDaysList = document.querySelector("#importantDaysList");
const closeImportantDaysButton = document.querySelector("#closeImportantDaysButton");
const foodButton = document.querySelector("#foodButton");
const foodPanel = document.querySelector("#foodPanel");
const foodForm = document.querySelector("#foodForm");
const foodDateInput = document.querySelector("#foodDateInput");
const foodNameInput = document.querySelector("#foodNameInput");
const foodList = document.querySelector("#foodList");
const closeFoodButton = document.querySelector("#closeFoodButton");
const todayBadge = document.querySelector("#todayBadge");
const todayWeatherText = document.querySelector("#todayWeatherText");
const todayDateText = document.querySelector("#todayDateText");
const todayFestivalText = document.querySelector("#todayFestivalText");
const weatherPanel = document.querySelector("#weatherPanel");
const weatherList = document.querySelector("#weatherList");
const closeWeatherButton = document.querySelector("#closeWeatherButton");
const audioCallButton = document.querySelector("#audioCallButton");
const videoCallButton = document.querySelector("#videoCallButton");
const callMenuButton = document.querySelector("#callMenuButton");
const callMenu = document.querySelector("#callMenu");
const callPanel = document.querySelector("#callPanel");
const callStatus = document.querySelector("#callStatus");
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const remoteRelayImage = document.querySelector("#remoteRelayImage");
const remoteRelayAudio = document.querySelector("#remoteRelayAudio");
const acceptCallButton = document.querySelector("#acceptCallButton");
const declineCallButton = document.querySelector("#declineCallButton");
const endCallButton = document.querySelector("#endCallButton");
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
let currentSticker = null;
let peerConnection = null;
let localStream = null;
let pendingOffer = null;
let currentCallMode = null;
let callStartedAt = null;
let pendingIceCandidates = [];
let disconnectTimer = null;
let callEnded = false;
let outgoingCallTimer = null;
let callConnected = false;
let relayVideoTimer = null;
let relayAudioRecorder = null;
let remoteAudioQueue = [];
let remoteAudioPlaying = false;
let relayFallbackTimer = null;
const EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😆",
  "😊",
  "😉",
  "😍",
  "😘",
  "😋",
  "😜",
  "🤔",
  "😎",
  "😭",
  "🥹",
  "😤",
  "😡",
  "😳",
  "😴",
  "🤒",
  "😷",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🤝",
  "❤️",
  "💔",
  "🌹",
  "🎉",
  "✨",
  "🔥",
  "🍚",
  "🍜",
  "☕",
  "🎂",
];

function syncViewportHeight() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offsetTop = viewport?.offsetTop || 0;
  const keyboardBottom = Math.max(0, window.innerHeight - height - offsetTop);
  const composerFocused = document.activeElement === messageInput;
  const composerHeight = Math.ceil(messageForm?.getBoundingClientRect().height || 68);

  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--visual-offset-top", `${offsetTop}px`);
  document.documentElement.style.setProperty("--keyboard-bottom", `${keyboardBottom}px`);
  document.documentElement.style.setProperty("--composer-height", `${composerHeight}px`);
  document.body.classList.toggle("keyboard-open", composerFocused);
}

function syncViewportSoon() {
  requestAnimationFrame(syncViewportHeight);
  setTimeout(syncViewportHeight, 280);
}

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

function showLogin() {
  chatPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  state.socket?.disconnect();
  closeContextMenu();
  closeEmojiPanel();
}

function showChat() {
  loginPanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  requestNotificationPermission();
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value.endsWith?.("Z") ? value : `${value}Z`);

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderMessage(message) {
  const messageId = String(message.id);

  if (state.renderedMessages.has(messageId)) {
    return;
  }

  state.renderedMessages.add(messageId);
  const isMine = message.senderId === state.user.id;
  const item = document.createElement("article");
  item.className = `message ${isMine ? "mine" : "theirs"} ${message.recalledAt ? "recalled" : ""}`;
  item.dataset.messageId = messageId;
  item.innerHTML = `
    <div class="meta">${message.senderName} · ${formatTime(message.createdAt)}</div>
    <div class="bubble"></div>
  `;
  bindMessageMenu(item, message);
  updateMessageElement(item, message);
  messagesEl.append(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderAttachment(message, bubble) {
  if (!message.attachmentData) {
    return;
  }

  const link = document.createElement("a");
  link.className = "attachment";
  link.href = message.attachmentData;
  link.download = message.attachmentName || "attachment";
  link.target = "_blank";
  link.rel = "noopener";

  if (message.attachmentType?.startsWith("image/")) {
    const image = document.createElement("img");
    image.alt = message.attachmentName || "附件";
    image.src = message.attachmentData;
    link.append(image);
  } else {
    const label = document.createElement("span");
    label.className = "attachment-file";
    label.textContent = `附件：${message.attachmentName || "下载文件"}`;
    link.append(label);
  }

  bubble.append(link);
}

function updateMessageElement(item, message) {
  const isMine = message.senderId === state.user.id;
  const bubble = item.querySelector(".bubble");

  item.classList.toggle("recalled", Boolean(message.recalledAt));
  bubble.innerHTML = "";

  if (message.recalledAt) {
    bubble.textContent = isMine ? "你撤回了一条消息" : `${message.senderName} 撤回了一条消息`;
    return;
  }

  if (message.quoteBody) {
    const quote = document.createElement("button");
    quote.className = "quote-card";
    quote.type = "button";
    quote.textContent = `${message.quoteSenderName}：${message.quoteBody}`;
    quote.addEventListener("click", () => scrollToMessage(message.quoteMessageId));
    bubble.append(quote);
  }

  if (message.body) {
    const body = document.createElement("div");
    body.textContent = message.body;
    bubble.append(body);
  }

  renderAttachment(message, bubble);
}

function bindMessageMenu(item, message) {
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openContextMenu(message, event.clientX, event.clientY);
  });

  item.addEventListener("touchstart", (event) => {
    clearTimeout(state.longPressTimer);
    const touch = event.touches[0];
    state.longPressTimer = setTimeout(() => {
      openContextMenu(message, touch.clientX, touch.clientY);
    }, 520);
  });

  item.addEventListener("touchmove", () => clearTimeout(state.longPressTimer));
  item.addEventListener("touchend", () => clearTimeout(state.longPressTimer));
  item.addEventListener("touchcancel", () => clearTimeout(state.longPressTimer));
}

function openContextMenu(message, x, y) {
  if (message.recalledAt) {
    return;
  }

  state.contextMessage = message;
  const recall = contextMenu.querySelector('[data-action="recall"]');
  recall.hidden = message.senderId !== state.user.id;
  closeEmojiPanel();
  contextMenu.classList.remove("hidden");

  const rect = contextMenu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - 12);
  const top = Math.min(y, window.innerHeight - rect.height - 12);
  contextMenu.style.left = `${Math.max(12, left)}px`;
  contextMenu.style.top = `${Math.max(12, top)}px`;
}

function closeContextMenu() {
  contextMenu.classList.add("hidden");
  state.contextMessage = null;
}

function quoteMessage(message) {
  state.quote = {
    messageId: String(message.id),
    senderName: message.senderName,
    body: message.body || (message.attachmentName ? `附件：${message.attachmentName}` : "消息"),
  };
  updateReplyPreview();
  messageInput.focus();
}

function updateReplyPreview() {
  replyPreview.innerHTML = "";

  if (!state.quote) {
    replyPreview.classList.add("hidden");
    return;
  }

  const text = document.createElement("span");
  text.textContent = `回复 ${state.quote.senderName}：${state.quote.body}`;
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "取消";
  clear.addEventListener("click", clearQuote);
  replyPreview.append(text, clear);
  replyPreview.classList.remove("hidden");
}

function clearQuote() {
  state.quote = null;
  updateReplyPreview();
}

function renderEmojiPanel() {
  emojiGrid.innerHTML = "";
  for (const emoji of EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.addEventListener("click", () => insertEmoji(emoji));
    emojiGrid.append(button);
  }
}

function insertEmoji(emoji) {
  const start = messageInput.selectionStart ?? messageInput.value.length;
  const end = messageInput.selectionEnd ?? messageInput.value.length;
  messageInput.value = `${messageInput.value.slice(0, start)}${emoji}${messageInput.value.slice(end)}`;
  const cursor = start + emoji.length;
  messageInput.setSelectionRange(cursor, cursor);
  messageInput.focus();
}

function closeEmojiPanel() {
  emojiPanel.classList.add("hidden");
}

function closeCallMenu() {
  callMenu?.classList.add("hidden");
}

function setEmojiTab(tabName) {
  for (const button of emojiPanel.querySelectorAll("[data-emoji-tab]")) {
    button.classList.toggle("active", button.dataset.emojiTab === tabName);
  }
  emojiGrid.classList.toggle("hidden", tabName !== "emoji");
  stickerPane.classList.toggle("hidden", tabName !== "sticker");
}

async function loadSticker() {
  stickerPreview.textContent = "正在获取表情包...";
  currentSticker = null;

  try {
    const query = encodeURIComponent(stickerSearchInput.value.trim() || "开心");
    const response = await api(`/api/sticker?q=${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "表情包接口暂时不可用。");
    }

    currentSticker = data;
    stickerPreview.innerHTML = "";
    const image = document.createElement("img");
    image.alt = data.name || "表情包";
    image.src = data.data;
    stickerPreview.append(image);
  } catch (error) {
    stickerPreview.textContent = error.message;
  }
}

function sendSticker() {
  if (!currentSticker) {
    return;
  }

  const attachment = currentSticker;
  currentSticker = null;
  stickerPreview.textContent = "点击“换一张”获取表情包";
  closeEmojiPanel();
  sendMessageByHttp({ body: "", attachment, quote: null }).catch((error) => {
    statusText.textContent = error.message || "表情包发送失败。";
    currentSticker = attachment;
  });
}

async function sendCurrentMessage() {
  const body = messageInput.value.trim();

  if (!body && !state.attachment) {
    return;
  }

  messageInput.value = "";
  const attachment = state.attachment;
  const quote = state.quote;
  clearAttachment();
  clearQuote();
  closeEmojiPanel();
  closeCallMenu();
  const payload = { body, attachment, quote };
  const restoreDraft = (error) => {
    messageInput.value = body;
    state.attachment = attachment;
    state.quote = quote;
    updateAttachmentPreview();
    updateReplyPreview();
    statusText.textContent = error || "发送失败。";
  };

  try {
    await sendMessageByHttp(payload);
  } catch (error) {
    restoreDraft(error.message);
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") {
    return;
  }

  Notification.requestPermission().catch(() => {});
}

function notifyIncomingMessage(message) {
  if (
    message.senderId === state.user?.id ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  new Notification("碎碎念收件箱", {
    body: "收到一条新消息",
    tag: "private-chat-message",
  });
}

async function sendMessageByHttp(payload) {
  const response = await api("/api/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "发送失败。");
  }

  renderMessage(data.message);
  statusText.textContent = state.socket?.connected ? "已发送" : "已发送，实时连接恢复后会自动同步";
  return data.message;
}

function closeImportantDaysPanel() {
  importantDaysPanel?.classList.add("hidden");
}

function closeWeatherPanel() {
  weatherPanel?.classList.add("hidden");
}

function closeFoodPanel() {
  foodPanel?.classList.add("hidden");
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function openFoodPanel() {
  foodPanel?.classList.remove("hidden");
  foodDateInput.value ||= todayInputValue();
  await loadFoodItems();
}

async function loadFoodItems() {
  if (!foodList) {
    return;
  }

  foodList.textContent = "正在加载...";

  try {
    const response = await api("/api/food-items");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "买菜清单加载失败。");
    }

    state.foodItems = data.items || [];
    renderFoodItems();
  } catch (error) {
    foodList.textContent = error.message;
  }
}

function renderFoodItems() {
  if (!foodList) {
    return;
  }

  foodList.innerHTML = "";

  if (!state.foodItems.length) {
    foodList.textContent = "还没有记录要买的菜。";
    return;
  }

  const groups = new Map();
  for (const item of state.foodItems) {
    const group = groups.get(item.plannedDate) || [];
    group.push(item);
    groups.set(item.plannedDate, group);
  }

  for (const [date, items] of groups) {
    const section = document.createElement("section");
    section.className = "food-day";
    const title = document.createElement("h3");
    title.textContent = formatFoodDate(date);
    const list = document.createElement("div");
    list.className = "food-day-list";

    for (const item of items) {
      list.append(renderFoodItem(item));
    }

    section.append(title, list);
    foodList.append(section);
  }
}

function renderFoodItem(item) {
  const row = document.createElement("article");
  row.className = `food-item ${item.boughtAt ? "bought" : ""}`;
  row.dataset.foodId = item.id;
  row.innerHTML = `
    <div>
      <strong></strong>
      <span></span>
    </div>
    <div class="food-actions">
      <button class="ghost" type="button" data-food-action="bought"></button>
      <button class="ghost danger-control" type="button" data-food-action="delete">删除</button>
    </div>
  `;
  row.querySelector("strong").textContent = item.dishName;
  row.querySelector("span").textContent = `${item.createdByName || "我们"} 添加`;
  const button = row.querySelector('[data-food-action="bought"]');
  button.textContent = item.boughtAt ? "取消已买" : "已买";
  button.addEventListener("click", () => toggleFoodBought(item));
  row.querySelector('[data-food-action="delete"]').addEventListener("click", () => deleteFoodItem(item));
  return row;
}

function formatFoodDate(value) {
  const today = todayInputValue();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

  if (value === today) return "今天";
  if (value === tomorrow) return "明天";
  return value;
}

async function addFoodItem(event) {
  event.preventDefault();
  const plannedDate = foodDateInput.value || todayInputValue();
  const dishName = foodNameInput.value.trim();

  if (!dishName) {
    return;
  }

  foodNameInput.value = "";

  try {
    const response = await api("/api/food-items", {
      method: "POST",
      body: JSON.stringify({ plannedDate, dishName }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "添加失败。");
    }
  } catch (error) {
    foodNameInput.value = dishName;
    statusText.textContent = error.message;
  }
}

async function toggleFoodBought(item) {
  try {
    const response = await api(`/api/food-items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ bought: !item.boughtAt }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "更新失败。");
    }
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function deleteFoodItem(item) {
  try {
    const response = await api(`/api/food-items/${item.id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "删除失败。");
    }
  } catch (error) {
    statusText.textContent = error.message;
  }
}

function upsertFoodItem(item) {
  const index = state.foodItems.findIndex((current) => String(current.id) === String(item.id));

  if (index >= 0) {
    state.foodItems[index] = item;
  } else {
    state.foodItems.push(item);
  }

  state.foodItems.sort((left, right) =>
    left.plannedDate === right.plannedDate
      ? Number(left.id) - Number(right.id)
      : left.plannedDate.localeCompare(right.plannedDate)
  );
  renderFoodItems();
}

function removeFoodItem({ id }) {
  state.foodItems = state.foodItems.filter((item) => String(item.id) !== String(id));
  renderFoodItems();
}

function renderTodayInfo(today) {
  if (!today || !todayBadge || !todayWeatherText || !todayDateText || !todayFestivalText) {
    return;
  }

  state.weather = today.weather || state.weather;
  todayWeatherText.textContent = today.weather?.label || "";
  todayWeatherText.hidden = !today.weather?.label;
  todayDateText.textContent = today.label || today.date || "";
  todayFestivalText.textContent = today.festival || "";
  todayFestivalText.hidden = !today.festival;
  todayBadge.hidden = false;

  if (!today.weather?.label) {
    loadBrowserWeather();
  }
}

async function loadBrowserWeather() {
  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=22.8069&longitude=113.2939&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Asia%2FShanghai&forecast_days=1&forecast_hours=12"
    );
    const data = await response.json();
    const code = data.daily?.weather_code?.[0];
    const min = Math.round(Number(data.daily?.temperature_2m_min?.[0]));
    const max = Math.round(Number(data.daily?.temperature_2m_max?.[0]));

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return;
    }

    state.weather = {
      location: "顺德",
      summary: weatherCodeLabel(code),
      min,
      max,
      label: `顺德 ${weatherCodeLabel(code)} ${min}/${max}℃`,
      hourly: buildBrowserHourlyWeather(data.hourly),
    };
    todayWeatherText.textContent = state.weather.label;
    todayWeatherText.hidden = false;
  } catch {}
}

function buildBrowserHourlyWeather(hourly) {
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

async function openWeatherPanel() {
  weatherPanel?.classList.remove("hidden");
  weatherList.textContent = "正在获取...";

  if (!state.weather?.hourly?.length) {
    await loadBrowserWeather();
  }

  renderWeatherPanel();
}

function renderWeatherPanel() {
  if (!weatherList) {
    return;
  }

  const hours = state.weather?.hourly || [];

  if (!hours.length) {
    weatherList.textContent = "暂时没有拿到未来天气。";
    return;
  }

  weatherList.innerHTML = "";
  const table = document.createElement("div");
  table.className = "weather-scroll";
  const grid = document.createElement("div");
  grid.className = "weather-grid";
  grid.style.setProperty("--weather-hours", String(hours.length));

  const rows = [
    ["时间", (hour) => formatWeatherTime(hour.time), "strong"],
    ["天气", (hour) => hour.summary || "--", "strong"],
    ["温度", (hour) => formatWeatherValue(hour.temperature, "℃")],
    ["体感", (hour) => formatWeatherValue(hour.apparentTemperature, "℃")],
    ["降雨", (hour) => formatWeatherValue(hour.precipitationProbability, "%")],
    ["雨量", (hour) => formatWeatherValue(hour.precipitation, "mm")],
    ["湿度", (hour) => formatWeatherValue(hour.humidity, "%")],
    ["风速", (hour) => formatWeatherValue(hour.windSpeed, "km/h")],
  ];

  for (const [label, getValue, weight] of rows) {
    const labelCell = document.createElement("div");
    labelCell.className = "weather-cell weather-label";
    labelCell.textContent = label;
    grid.append(labelCell);

    for (const hour of hours) {
      const cell = document.createElement("div");
      cell.className = `weather-cell ${weight === "strong" ? "weather-main" : ""}`;
      cell.textContent = getValue(hour);
      grid.append(cell);
    }
  }

  table.append(grid);
  weatherList.append(table);
}

function formatWeatherTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || "").slice(11, 16);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatWeatherValue(value, unit) {
  return value === null || value === undefined ? `--${unit}` : `${value}${unit}`;
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

async function openImportantDaysPanel() {
  importantDaysPanel?.classList.remove("hidden");
  importantDaysList.textContent = "正在计算...";

  try {
    const response = await api("/api/important-days");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "重要日子加载失败。");
    }

    renderTodayInfo(data.today);
    importantDaysList.innerHTML = "";
    for (const item of data.days) {
      const row = document.createElement("article");
      row.className = "important-day";
      row.innerHTML = `
        <div>
          <strong></strong>
          <span></span>
        </div>
        <div class="countdown"></div>
      `;
      row.querySelector("strong").textContent = item.name;
      row.querySelector("span").textContent = `${item.calendarLabel} · 下次是 ${item.nextDate}`;
      row.querySelector(".countdown").textContent =
        item.daysLeft === 0 ? "就是今天" : `还剩 ${item.daysLeft} 天`;
      importantDaysList.append(row);
    }
  } catch (error) {
    importantDaysList.textContent = error.message;
  }
}

async function loadTodayInfo() {
  try {
    const response = await api("/api/important-days");
    const data = await response.json();

    if (response.ok) {
      renderTodayInfo(data.today);
    }
  } catch {}
}

function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      state.socket.emit("call:ice", { candidate: event.candidate });
    }
  };
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    remoteVideo.srcObject = stream;
    remoteRelayImage.classList.add("hidden");
    remoteVideo.classList.remove("hidden");
    remoteVideo.muted = false;
    remoteVideo.volume = 1;
    callConnected = true;
    if (!callStartedAt) {
      callStartedAt = Date.now();
    }
    callStatus.textContent = currentCallMode === "video" ? "视频通话中" : "语音通话中";
    remoteVideo.play().catch(() => {
      callStatus.textContent = "已接通，点击画面可开启声音";
    });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      callConnected = true;
      if (!callStartedAt) {
        callStartedAt = Date.now();
      }
      clearTimeout(relayFallbackTimer);
      relayFallbackTimer = null;
      stopRelayMedia();
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
      callStatus.textContent = currentCallMode === "video" ? "视频通话中" : "语音通话中";
      return;
    }

    if (pc.connectionState === "disconnected") {
      callStatus.textContent = "网络波动中，正在尝试恢复通话...";
      clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        if (peerConnection?.connectionState === "disconnected") {
          endCall(false);
        }
      }, 60000);
      return;
    }

    if (pc.connectionState === "failed") {
      startRelayFallback("实时连接失败，正在切换保底通话...");
    }
  };

  return pc;
}

function getMediaConstraints(mode) {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      mode === "video"
        ? {
            width: { ideal: 640, max: 960 },
            height: { ideal: 360, max: 540 },
            frameRate: { ideal: 24, max: 30 },
          }
        : false,
  };
}

async function startCall(mode) {
  if (!state.socket?.connected || (currentCallMode && !callEnded)) {
    statusText.textContent = state.socket?.connected ? "正在通话中" : "实时连接未恢复，暂时不能通话";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    statusText.textContent = "当前浏览器不支持摄像头/麦克风权限，请换 Chrome 或 Edge。";
    return;
  }

  currentCallMode = mode;
  callStartedAt = null;
  callConnected = false;
  callEnded = false;
  pendingIceCandidates = [];
  callPanel.classList.remove("hidden");
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  callStatus.textContent = mode === "video" ? "正在发起视频通话..." : "正在发起语音通话...";

  try {
    localStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(mode));
  } catch (error) {
    callStatus.textContent = getMediaErrorText(error, mode);
    setTimeout(() => endCall(false), 1400);
    return;
  }
  localVideo.srcObject = localStream;
  peerConnection = createPeerConnection();
  addLocalOrReceiveOnlyTracks(mode);

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    state.socket.emit("call:offer", { mode, offer });
  } catch {
    state.socket.emit("call:offer", { mode, relay: true });
    scheduleRelayFallback(0);
  }

  outgoingCallTimer = setTimeout(() => {
    if (!callConnected && currentCallMode) {
      endCall(true, "timeout");
    }
  }, 20000);
}

async function acceptCall() {
  if (!pendingOffer || (currentCallMode && callConnected)) {
    return;
  }

  const { mode, offer } = pendingOffer;
  currentCallMode = mode;
  callStartedAt = null;
  callConnected = false;
  callEnded = false;
  pendingIceCandidates = [];
  pendingOffer = null;
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  callStatus.textContent = mode === "video" ? "视频通话中" : "语音通话中";

  try {
    localStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(mode));
  } catch {
    localStream = null;
    callStatus.textContent = "本机无可用麦克风/摄像头，正在只接收对方声音和画面";
  }

  localVideo.srcObject = localStream;

  if (!offer) {
    state.socket.emit("call:answer", { relay: true });
    startRelayMedia();
    return;
  }

  try {
    peerConnection = createPeerConnection();
    addLocalOrReceiveOnlyTracks(mode);
    await peerConnection.setRemoteDescription(offer);
    await flushPendingIceCandidates();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    state.socket.emit("call:answer", { answer });
    scheduleRelayFallback(8000);
  } catch {
    state.socket.emit("call:answer", { relay: true });
    startRelayMedia();
  }
}

function receiveCall({ from, mode, offer }) {
  if (peerConnection || (currentCallMode && !callEnded)) {
    return;
  }

  pendingOffer = { mode, offer };
  currentCallMode = mode;
  callPanel.classList.remove("hidden");
  acceptCallButton.classList.remove("hidden");
  declineCallButton.classList.remove("hidden");
  callStatus.textContent = `${from.displayName} 邀请你${mode === "video" ? "视频通话" : "语音通话"}`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("碎碎念收件箱", {
      body: mode === "video" ? "收到视频通话邀请" : "收到语音通话邀请",
      tag: "private-chat-call",
    });
  }
}

async function applyAnswer({ answer }) {
  if (callEnded || !currentCallMode) {
    return;
  }

  clearTimeout(outgoingCallTimer);
  outgoingCallTimer = null;

  if (!answer || !peerConnection) {
    startRelayMedia();
    return;
  }

  try {
    await peerConnection.setRemoteDescription(answer);
    await flushPendingIceCandidates();
    callStatus.textContent = "正在建立实时通话...";
    scheduleRelayFallback(8000);
  } catch {
    startRelayMedia();
  }
}

async function applyIce({ candidate }) {
  if (!candidate || callEnded) {
    return;
  }

  if (!peerConnection || !peerConnection.remoteDescription) {
    pendingIceCandidates.push(candidate);
    return;
  }

  try {
    await peerConnection.addIceCandidate(candidate);
  } catch {}
}

async function flushPendingIceCandidates() {
  if (!peerConnection?.remoteDescription || !pendingIceCandidates.length) {
    return;
  }

  const candidates = pendingIceCandidates;
  pendingIceCandidates = [];
  for (const candidate of candidates) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch {}
  }
}

function addLocalOrReceiveOnlyTracks(mode) {
  const audioTracks = localStream?.getAudioTracks() || [];
  const videoTracks = localStream?.getVideoTracks() || [];

  audioTracks.forEach((track) => peerConnection.addTrack(track, localStream));
  videoTracks.forEach((track) => peerConnection.addTrack(track, localStream));

  if (!audioTracks.length) {
    peerConnection.addTransceiver("audio", { direction: "recvonly" });
  }

  if (mode === "video" && !videoTracks.length) {
    peerConnection.addTransceiver("video", { direction: "recvonly" });
  }
}

function addLocalTracks() {
  if (!localStream) {
    return;
  }

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
}

function startRelayMedia() {
  if (callEnded || !currentCallMode) {
    return;
  }

  callConnected = true;
  if (!callStartedAt) {
    callStartedAt = Date.now();
  }

  startRelayAudio();
  startRelayVideo();
}

function scheduleRelayFallback(delay) {
  clearTimeout(relayFallbackTimer);
  relayFallbackTimer = setTimeout(() => {
    if (!callConnected && currentCallMode && !callEnded) {
      startRelayFallback("实时通话连不上，已切换保底通话");
    }
  }, delay);
}

function startRelayFallback(message) {
  if (callEnded || !currentCallMode) {
    return;
  }

  callStatus.textContent = message;
  startRelayMedia();
}

function startRelayVideo() {
  if (currentCallMode !== "video" || !localStream?.getVideoTracks().length) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const context = canvas.getContext("2d");

  clearInterval(relayVideoTimer);
  relayVideoTimer = setInterval(() => {
    if (!localVideo.videoWidth || !localVideo.videoHeight || callEnded) {
      return;
    }

    context.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
    state.socket.emit("call:media", {
      kind: "video",
      data: canvas.toDataURL("image/jpeg", 0.45),
    });
  }, 180);
}

function startRelayAudio() {
  if (!localStream?.getAudioTracks().length || !window.MediaRecorder) {
    return;
  }

  try {
    relayAudioRecorder = new MediaRecorder(localStream, { mimeType: "audio/webm;codecs=opus" });
  } catch {
    try {
      relayAudioRecorder = new MediaRecorder(localStream);
    } catch {
      return;
    }
  }

  relayAudioRecorder.addEventListener("dataavailable", (event) => {
    if (!event.data.size || callEnded) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.socket.emit("call:media", {
        kind: "audio",
        data: reader.result,
      });
    });
    reader.readAsDataURL(event.data);
  });
  relayAudioRecorder.start(350);
}

function receiveRelayMedia({ kind, data }) {
  if (callEnded || !data) {
    return;
  }

  if (peerConnection?.connectionState === "connected") {
    return;
  }

  callConnected = true;
  if (!callStartedAt) {
    callStartedAt = Date.now();
  }

  if (kind === "video") {
    remoteRelayImage.src = data;
    remoteRelayImage.classList.remove("hidden");
    remoteVideo.classList.add("hidden");
    callStatus.textContent = "视频通话中";
  }

  if (kind === "audio") {
    remoteAudioQueue.push(data);
    playNextRemoteAudio();
  }
}

function stopRelayMedia() {
  clearInterval(relayVideoTimer);
  relayVideoTimer = null;
  if (relayAudioRecorder?.state !== "inactive") {
    relayAudioRecorder?.stop();
  }
  relayAudioRecorder = null;
  remoteAudioQueue = [];
  remoteAudioPlaying = false;
  remoteRelayAudio.src = "";
}

function playNextRemoteAudio() {
  if (remoteAudioPlaying || !remoteAudioQueue.length) {
    return;
  }

  remoteAudioPlaying = true;
  remoteRelayAudio.src = remoteAudioQueue.shift();
  remoteRelayAudio
    .play()
    .catch(() => {
      callStatus.textContent = "已接通，点击通话窗口可开启声音";
    })
    .finally(() => {
      setTimeout(() => {
        remoteAudioPlaying = false;
        playNextRemoteAudio();
      }, 850);
    });
}

function declineCall() {
  if (!pendingOffer) {
    return;
  }

  const mode = currentCallMode || pendingOffer.mode || "audio";
  state.socket.emit("call:decline", { mode });
  cleanupCall();
}

function endCall(emit = true, reason = "ended") {
  if (callEnded && !peerConnection && !localStream && !pendingOffer) {
    return;
  }

  const wasConnected = callConnected;
  const seconds = wasConnected && callStartedAt ? Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)) : 0;
  const mode = currentCallMode || "audio";

  cleanupCall();

  if (emit) {
    state.socket.emit("call:end", { mode, seconds, reason, connected: wasConnected });
  }
}

function cleanupCall() {
  callEnded = true;
  stopRelayMedia();
  clearTimeout(outgoingCallTimer);
  outgoingCallTimer = null;
  clearTimeout(disconnectTimer);
  disconnectTimer = null;
  clearTimeout(relayFallbackTimer);
  relayFallbackTimer = null;
  peerConnection?.close();
  peerConnection = null;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  remoteRelayImage.src = "";
  remoteRelayImage.classList.add("hidden");
  remoteVideo.classList.remove("hidden");
  remoteRelayAudio.src = "";
  pendingOffer = null;
  pendingIceCandidates = [];
  callStartedAt = null;
  currentCallMode = null;
  callConnected = false;
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  callPanel.classList.add("hidden");
}

function getMediaErrorText(error, mode) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return mode === "video"
      ? "请在浏览器地址栏允许摄像头和麦克风权限"
      : "请在浏览器地址栏允许麦克风权限";
  }

  if (error?.name === "NotFoundError") {
    return mode === "video" ? "没有找到摄像头或麦克风" : "没有找到麦克风";
  }

  return "权限弹窗没有打开时，请刷新页面后再点一次通话";
}

function scrollToMessage(messageId) {
  const item = messagesEl.querySelector(`[data-message-id="${messageId}"]`);
  if (!item) {
    statusText.textContent = "引用的消息不在当前列表里。";
    return;
  }

  item.scrollIntoView({ behavior: "smooth", block: "center" });
  item.classList.add("highlight");
  setTimeout(() => item.classList.remove("highlight"), 1200);
}

function replaceMessage(message) {
  const item = messagesEl.querySelector(`[data-message-id="${message.id}"]`);
  if (item) {
    updateMessageElement(item, message);
  }
}

function removeMessage(messageId) {
  messagesEl.querySelector(`[data-message-id="${messageId}"]`)?.remove();
}

function recallMessage(id) {
  state.socket.emit("message:recall", { id }, (result) => {
    if (!result?.ok) {
      statusText.textContent = result?.error || "撤回失败。";
    }
  });
}

function deleteMessage(id) {
  state.socket.emit("message:delete", { id }, (result) => {
    if (!result?.ok) {
      statusText.textContent = result?.error || "删除失败。";
    }
  });
}

async function loadMessages() {
  const response = await api("/api/messages");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "消息加载失败。");
  }

  messagesEl.innerHTML = "";
  state.renderedMessages.clear();
  data.messages.forEach(renderMessage);
}

function connectSocket() {
  state.socket?.disconnect();
  state.socket = io({ auth: { token: state.token } });

  state.socket.on("connect", () => {
    statusText.textContent = "已连接";
  });

  state.socket.on("disconnect", () => {
    statusText.textContent = "连接已断开，正在重连...";
  });

  state.socket.on("connect_error", () => {
    statusText.textContent = "实时连接失败，文字消息仍可发送";
  });

  state.socket.on("presence", ({ online, users = [] }) => {
    const otherOnline = users.some((user) => user.id && user.id !== state.user?.id);
    statusText.textContent = otherOnline || online >= 2 ? "你们都在线" : "已连接，对方未在线";
  });

  state.socket.on("message:new", (message) => {
    renderMessage(message);
    notifyIncomingMessage(message);
  });
  state.socket.on("message:recalled", replaceMessage);
  state.socket.on("message:deleted", ({ id }) => removeMessage(id));
  state.socket.on("messages:cleared", () => {
    messagesEl.innerHTML = "";
    state.renderedMessages.clear();
    statusText.textContent = "聊天记录已清空";
  });
  state.socket.on("food:created", upsertFoodItem);
  state.socket.on("food:updated", upsertFoodItem);
  state.socket.on("food:deleted", removeFoodItem);
  state.socket.on("call:offer", receiveCall);
  state.socket.on("call:answer", applyAnswer);
  state.socket.on("call:ice", applyIce);
  state.socket.on("call:media", receiveRelayMedia);
  state.socket.on("call:decline", () => {
    statusText.textContent = "对方已拒绝通话";
    endCall(false);
  });
  state.socket.on("call:timeout", () => {
    statusText.textContent = "对方无响应";
    cleanupCall();
  });
  state.socket.on("call:end", () => cleanupCall());
}

async function boot() {
  if (!state.token) {
    showLogin();
    return;
  }

  try {
    const response = await api("/api/me");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "登录已过期。");
    }

    state.user = data.user;
    showChat();
    await loadTodayInfo();
    await loadMessages();
    connectSocket();
  } catch {
    localStorage.removeItem("chat_token");
    state.token = null;
    showLogin();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const form = new FormData(loginForm);
  const response = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({
      username: form.get("username"),
      password: form.get("password"),
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    loginError.textContent = data.error || "登录失败。";
    return;
  }

  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("chat_token", data.token);
  loginForm.reset();
  showChat();
  await loadTodayInfo();
  await loadMessages();
  connectSocket();
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendCurrentMessage();
});

sendButton?.addEventListener("click", async (event) => {
  event.preventDefault();
  await sendCurrentMessage();
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  syncViewportSoon();
});

messageInput.addEventListener("focus", syncViewportSoon);
messageInput.addEventListener("blur", syncViewportSoon);

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("chat_token");
  state.token = null;
  state.user = null;
  showLogin();
});

contextMenu.addEventListener("click", (event) => {
  const action = event.target.closest("button")?.dataset.action;
  const message = state.contextMessage;

  if (!action || !message) {
    return;
  }

  if (action === "quote") {
    quoteMessage(message);
  }
  if (action === "recall") {
    recallMessage(message.id);
  }
  if (action === "delete") {
    deleteMessage(message.id);
  }
  closeContextMenu();
});

document.addEventListener("click", (event) => {
  if (!contextMenu.classList.contains("hidden") && !contextMenu.contains(event.target)) {
    closeContextMenu();
  }
  if (
    !emojiPanel.classList.contains("hidden") &&
    !emojiPanel.contains(event.target) &&
    event.target !== emojiButton
  ) {
    closeEmojiPanel();
  }
  if (
    callMenu &&
    !callMenu.classList.contains("hidden") &&
    !callMenu.contains(event.target) &&
    event.target !== callMenuButton
  ) {
    closeCallMenu();
  }
  if (
    importantDaysPanel &&
    !importantDaysPanel.classList.contains("hidden") &&
    event.target === importantDaysPanel
  ) {
    closeImportantDaysPanel();
  }
  if (weatherPanel && !weatherPanel.classList.contains("hidden") && event.target === weatherPanel) {
    closeWeatherPanel();
  }
  if (foodPanel && !foodPanel.classList.contains("hidden") && event.target === foodPanel) {
    closeFoodPanel();
  }
});

attachButton.addEventListener("click", () => {
  closeEmojiPanel();
  closeCallMenu();
  fileInput.click();
});

emojiButton.addEventListener("click", () => {
  closeContextMenu();
  closeCallMenu();
  emojiPanel.classList.toggle("hidden");
});

emojiPanel.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-emoji-tab]");
  if (!tabButton) {
    return;
  }

  setEmojiTab(tabButton.dataset.emojiTab);
});

refreshStickerButton?.addEventListener("click", loadSticker);
sendStickerButton?.addEventListener("click", sendSticker);
stickerSearchButton?.addEventListener("click", loadSticker);
stickerSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadSticker();
  }
});
callMenuButton?.addEventListener("click", () => {
  closeContextMenu();
  closeEmojiPanel();
  callMenu.classList.toggle("hidden");
});
audioCallButton?.addEventListener("click", () => {
  closeCallMenu();
  startCall("audio");
});
videoCallButton?.addEventListener("click", () => {
  closeCallMenu();
  startCall("video");
});
acceptCallButton?.addEventListener("click", acceptCall);
declineCallButton?.addEventListener("click", declineCall);
endCallButton?.addEventListener("click", () => endCall(true));
importantDaysButton?.addEventListener("click", openImportantDaysPanel);
closeImportantDaysButton?.addEventListener("click", closeImportantDaysPanel);
foodButton?.addEventListener("click", openFoodPanel);
foodForm?.addEventListener("submit", addFoodItem);
closeFoodButton?.addEventListener("click", closeFoodPanel);
todayBadge?.addEventListener("click", openWeatherPanel);
closeWeatherButton?.addEventListener("click", closeWeatherPanel);

clearHistoryButton?.addEventListener("click", async () => {
  const password = window.prompt("请输入确认密码，清空后不可恢复。");

  if (!password) {
    return;
  }

  try {
    const response = await api("/api/messages/clear", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "清空失败。");
    }

    messagesEl.innerHTML = "";
    state.renderedMessages.clear();
    statusText.textContent = "聊天记录已清空";
  } catch (error) {
    statusText.textContent = error.message;
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];

  if (!file) {
    clearAttachment();
    return;
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    statusText.textContent = "附件不能超过 5MB。";
    fileInput.value = "";
    return;
  }

  state.attachment = {
    name: file.name,
    type: file.type || "application/octet-stream",
    data: await readFileAsDataUrl(file),
  };
  updateAttachmentPreview();
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function updateAttachmentPreview() {
  attachmentPreview.innerHTML = "";

  if (!state.attachment) {
    attachmentPreview.classList.add("hidden");
    return;
  }

  const name = document.createElement("span");
  name.textContent = `已选择：${state.attachment.name}`;

  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "移除";
  clear.addEventListener("click", clearAttachment);

  attachmentPreview.append(name, clear);
  attachmentPreview.classList.remove("hidden");
}

function clearAttachment() {
  state.attachment = null;
  fileInput.value = "";
  updateAttachmentPreview();
}

renderEmojiPanel();
setEmojiTab("emoji");
syncViewportHeight();
window.addEventListener("resize", syncViewportSoon);
window.visualViewport?.addEventListener("resize", syncViewportSoon);
window.visualViewport?.addEventListener("scroll", syncViewportSoon);
boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
