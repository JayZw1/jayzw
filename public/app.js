const state = {
  token: localStorage.getItem("chat_token"),
  user: null,
  socket: null,
  attachment: null,
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
const statusText = document.querySelector("#statusText");
const logoutButton = document.querySelector("#logoutButton");
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

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
    <div class="actions"></div>
  `;
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
  const actions = item.querySelector(".actions");

  item.classList.toggle("recalled", Boolean(message.recalledAt));
  bubble.innerHTML = "";
  actions.innerHTML = "";

  if (message.recalledAt) {
    bubble.textContent = isMine ? "你撤回了一条消息" : `${message.senderName} 撤回了一条消息`;
    return;
  }

  if (message.body) {
    const body = document.createElement("div");
    body.textContent = message.body;
    bubble.append(body);
  }

  renderAttachment(message, bubble);

  if (isMine) {
    actions.append(createActionButton("撤回", () => recallMessage(message.id)));
  }
  actions.append(createActionButton("删除", () => deleteMessage(message.id)));
}

function createActionButton(text, onClick) {
  const button = document.createElement("button");
  button.className = "action-button";
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
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
  clearAttachment();
  state.socket.emit("message:send", { body, attachment }, (result) => {
    if (!result?.ok) {
      messageInput.value = body;
      state.attachment = attachment;
      updateAttachmentPreview();
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

attachButton.addEventListener("click", () => {
  fileInput.click();
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

boot();
