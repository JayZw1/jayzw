const state = {
  token: localStorage.getItem("chat_token"),
  user: null,
  socket: null,
  attachment: null,
  quote: null,
  contextMessage: null,
  longPressTimer: null,
};

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const messagesEl = document.querySelector("#messages");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const fileInput = document.querySelector("#fileInput");
const attachButton = document.querySelector("#attachButton");
const attachmentPreview = document.querySelector("#attachmentPreview");
const replyPreview = document.querySelector("#replyPreview");
const emojiButton = document.querySelector("#emojiButton");
const emojiPanel = document.querySelector("#emojiPanel");
const contextMenu = document.querySelector("#contextMenu");
const statusText = document.querySelector("#statusText");
const logoutButton = document.querySelector("#logoutButton");
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
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
  const isMine = message.senderId === state.user.id;
  const item = document.createElement("article");
  item.className = `message ${isMine ? "mine" : "theirs"} ${message.recalledAt ? "recalled" : ""}`;
  item.dataset.messageId = String(message.id);
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
  emojiPanel.innerHTML = "";
  for (const emoji of EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.addEventListener("click", () => insertEmoji(emoji));
    emojiPanel.append(button);
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

  state.socket.on("presence", ({ online }) => {
    statusText.textContent = online >= 2 ? "你们都在线" : "已连接";
  });

  state.socket.on("message:new", renderMessage);
  state.socket.on("message:recalled", replaceMessage);
  state.socket.on("message:deleted", ({ id }) => removeMessage(id));
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
  await loadMessages();
  connectSocket();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const body = messageInput.value.trim();

  if ((!body && !state.attachment) || !state.socket?.connected) {
    return;
  }

  messageInput.value = "";
  const attachment = state.attachment;
  const quote = state.quote;
  clearAttachment();
  clearQuote();
  closeEmojiPanel();
  state.socket.emit("message:send", { body, attachment, quote }, (result) => {
    if (!result?.ok) {
      messageInput.value = body;
      state.attachment = attachment;
      state.quote = quote;
      updateAttachmentPreview();
      updateReplyPreview();
      statusText.textContent = result?.error || "发送失败。";
    }
  });
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
});

attachButton.addEventListener("click", () => {
  closeEmojiPanel();
  fileInput.click();
});

emojiButton.addEventListener("click", () => {
  closeContextMenu();
  emojiPanel.classList.toggle("hidden");
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
boot();
