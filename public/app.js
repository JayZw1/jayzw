const state = {
  token: localStorage.getItem("chat_token"),
  user: null,
  socket: null,
  attachment: null,
  quote: null,
  contextMessage: null,
  longPressTimer: null,
  renderedMessages: new Set(),
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
const todayBadge = document.querySelector("#todayBadge");
const todayDateText = document.querySelector("#todayDateText");
const todayFestivalText = document.querySelector("#todayFestivalText");
const audioCallButton = document.querySelector("#audioCallButton");
const videoCallButton = document.querySelector("#videoCallButton");
const callMenuButton = document.querySelector("#callMenuButton");
const callMenu = document.querySelector("#callMenu");
const callPanel = document.querySelector("#callPanel");
const callStatus = document.querySelector("#callStatus");
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const acceptCallButton = document.querySelector("#acceptCallButton");
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

function renderTodayInfo(today) {
  if (!today || !todayBadge || !todayDateText || !todayFestivalText) {
    return;
  }

  todayDateText.textContent = today.label || today.date || "";
  todayFestivalText.textContent = today.festival || "";
  todayFestivalText.hidden = !today.festival;
  todayBadge.hidden = false;
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
    remoteVideo.muted = false;
    remoteVideo.volume = 1;
    callStatus.textContent = currentCallMode === "video" ? "视频通话中" : "语音通话中";
    remoteVideo.play().catch(() => {
      callStatus.textContent = "已接通，点击画面可开启声音";
    });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
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

    if (["failed", "closed"].includes(pc.connectionState)) {
      endCall(false);
    }
  };

  return pc;
}

async function startCall(mode) {
  if (!state.socket?.connected || peerConnection) {
    statusText.textContent = state.socket?.connected ? "正在通话中" : "实时连接未恢复，暂时不能通话";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    statusText.textContent = "当前浏览器不支持摄像头/麦克风权限，请换 Chrome 或 Edge。";
    return;
  }

  currentCallMode = mode;
  callStartedAt = Date.now();
  callEnded = false;
  pendingIceCandidates = [];
  callPanel.classList.remove("hidden");
  acceptCallButton.classList.add("hidden");
  callStatus.textContent = mode === "video" ? "正在发起视频通话..." : "正在发起语音通话...";

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
  } catch (error) {
    callStatus.textContent = getMediaErrorText(error, mode);
    setTimeout(() => endCall(false), 1400);
    return;
  }
  localVideo.srcObject = localStream;
  peerConnection = createPeerConnection();
  addLocalOrReceiveOnlyTracks(mode);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  state.socket.emit("call:offer", { mode, offer });
}

async function acceptCall() {
  if (!pendingOffer || peerConnection) {
    return;
  }

  const { mode, offer } = pendingOffer;
  currentCallMode = mode;
  callStartedAt = Date.now();
  callEnded = false;
  pendingIceCandidates = [];
  pendingOffer = null;
  acceptCallButton.classList.add("hidden");
  callStatus.textContent = mode === "video" ? "视频通话中" : "语音通话中";

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
  } catch {
    localStream = null;
    callStatus.textContent = "本机无可用麦克风/摄像头，正在只接收对方声音和画面";
  }

  localVideo.srcObject = localStream;
  peerConnection = createPeerConnection();

  await peerConnection.setRemoteDescription(offer);
  addLocalTracks();
  await flushPendingIceCandidates();
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  state.socket.emit("call:answer", { answer });
}

function receiveCall({ from, mode, offer }) {
  if (peerConnection) {
    return;
  }

  pendingOffer = { mode, offer };
  currentCallMode = mode;
  callPanel.classList.remove("hidden");
  acceptCallButton.classList.remove("hidden");
  callStatus.textContent = `${from.displayName} 邀请你${mode === "video" ? "视频通话" : "语音通话"}`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("碎碎念收件箱", {
      body: mode === "video" ? "收到视频通话邀请" : "收到语音通话邀请",
      tag: "private-chat-call",
    });
  }
}

async function applyAnswer({ answer }) {
  if (!peerConnection || callEnded) {
    return;
  }

  await peerConnection.setRemoteDescription(answer);
  await flushPendingIceCandidates();
  callStatus.textContent = currentCallMode === "video" ? "视频通话中" : "语音通话中";
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

function endCall(emit = true) {
  if (callEnded && !peerConnection && !localStream && !pendingOffer) {
    return;
  }

  callEnded = true;
  const seconds = callStartedAt ? Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)) : 0;
  const mode = currentCallMode || "audio";

  clearTimeout(disconnectTimer);
  disconnectTimer = null;
  peerConnection?.close();
  peerConnection = null;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  pendingOffer = null;
  pendingIceCandidates = [];
  callStartedAt = null;
  currentCallMode = null;
  callPanel.classList.add("hidden");

  if (emit) {
    state.socket.emit("call:end", { mode, seconds });
  }
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

  state.socket.on("presence", ({ online }) => {
    statusText.textContent = online >= 2 ? "你们都在线" : "已连接";
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
  state.socket.on("call:offer", receiveCall);
  state.socket.on("call:answer", applyAnswer);
  state.socket.on("call:ice", applyIce);
  state.socket.on("call:end", () => endCall(false));
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
});

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
endCallButton?.addEventListener("click", () => endCall(true));
importantDaysButton?.addEventListener("click", openImportantDaysPanel);
closeImportantDaysButton?.addEventListener("click", closeImportantDaysPanel);

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
boot();
