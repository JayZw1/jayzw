const state = {
  token: localStorage.getItem("chat_token"),
  user: null,
  socket: null,
  attachment: null,
  quote: null,
  contextMessage: null,
  lastMenuTapAt: 0,
  lastMenuTapId: null,
  renderedMessages: new Set(),
  weather: null,
  foodItems: [],
  scheduleItems: [],
  diaryEntries: [],
  expressStatus: { date: todayInputValue(), hasExpress: false },
  otherOnline: false,
  diarySelectedDate: todayInputValue(),
  diaryVisibleMonth: todayInputValue().slice(0, 7),
  gomoku: null,
  bottomSettleUntil: 0,
};

const DIARY_MIN_DATE = "2025-01-01";
const DIARY_MIN_MONTH = DIARY_MIN_DATE.slice(0, 7);
const GOMOKU_SIZE = 15;
const GOMOKU_TURN_SECONDS = 20;
const GOMOKU_BANTER = {
  tease: {
    label: "挑衅句",
    lines: [
      "哎呀，不小心又堵了你一条路，我真不是故意的～",
      "你的棋路像我奶奶织的毛衣——全是洞。",
      "哎呀，这条龙好像要连起来了呢",
      "你已经有进步了！上次你输给我用了10步，这次已经撑到15步了👏",
    ],
  },
  cheer: {
    label: "鼓励句",
    lines: [
      "没关系，人生那么长，你总会赢我一次的……大概。",
      "比赛结束无论胜负，亲一下就好 👄",
      "这一步虽然普通，但你思考的样子真的很迷人。",
      "不用急，我永远等你慢慢想",
    ],
  },
};

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const openPasswordChangeButton = document.querySelector("#openPasswordChangeButton");
const passwordChangePanel = document.querySelector("#passwordChangePanel");
const passwordChangeForm = document.querySelector("#passwordChangeForm");
const passwordChangeUsername = document.querySelector("#passwordChangeUsername");
const passwordChangeOld = document.querySelector("#passwordChangeOld");
const passwordChangeNew = document.querySelector("#passwordChangeNew");
const passwordChangeConfirm = document.querySelector("#passwordChangeConfirm");
const passwordChangeStatus = document.querySelector("#passwordChangeStatus");
const closePasswordChangeButton = document.querySelector("#closePasswordChangeButton");
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
const diaryButton = document.querySelector("#diaryButton");
const expressStatusButton = document.querySelector("#expressStatusButton");
const expressStatusText = document.querySelector("#expressStatusText");
const expressStatusPanel = document.querySelector("#expressStatusPanel");
const expressStatusCurrent = document.querySelector("#expressStatusCurrent");
const expressStatusOptions = document.querySelector("#expressStatusOptions");
const closeExpressStatusButton = document.querySelector("#closeExpressStatusButton");
const diaryPanel = document.querySelector("#diaryPanel");
const diaryForm = document.querySelector("#diaryForm");
const diaryInput = document.querySelector("#diaryInput");
const diaryList = document.querySelector("#diaryList");
const closeDiaryButton = document.querySelector("#closeDiaryButton");
const diaryCalendarGrid = document.querySelector("#diaryCalendarGrid");
const diaryYearSelect = document.querySelector("#diaryYearSelect");
const diaryMonthSelect = document.querySelector("#diaryMonthSelect");
const diarySelectedDate = document.querySelector("#diarySelectedDate");
const prevDiaryMonthButton = document.querySelector("#prevDiaryMonthButton");
const nextDiaryMonthButton = document.querySelector("#nextDiaryMonthButton");
const gameButton = document.querySelector("#gameButton");
const gamePanel = document.querySelector("#gamePanel");
const closeGameButton = document.querySelector("#closeGameButton");
const gomokuCloseConfirm = document.querySelector("#gomokuCloseConfirm");
const cancelCloseGameButton = document.querySelector("#cancelCloseGameButton");
const confirmCloseGameButton = document.querySelector("#confirmCloseGameButton");
const inviteGomokuButton = document.querySelector("#inviteGomokuButton");
const acceptGomokuButton = document.querySelector("#acceptGomokuButton");
const declineGomokuButton = document.querySelector("#declineGomokuButton");
const undoGomokuButton = document.querySelector("#undoGomokuButton");
const resetGomokuButton = document.querySelector("#resetGomokuButton");
const gomokuStatus = document.querySelector("#gomokuStatus");
const gomokuBoard = document.querySelector("#gomokuBoard");
const gomokuBanterBubble = document.querySelector("#gomokuBanterBubble");
const gomokuBanterActions = document.querySelector("#gomokuBanterActions");
const messageSearchButton = document.querySelector("#messageSearchButton");
const messageSearchPanel = document.querySelector("#messageSearchPanel");
const messageSearchForm = document.querySelector("#messageSearchForm");
const messageSearchInput = document.querySelector("#messageSearchInput");
const messageSearchType = document.querySelector("#messageSearchType");
const messageSearchSummary = document.querySelector("#messageSearchSummary");
const messageSearchResults = document.querySelector("#messageSearchResults");
const closeMessageSearchButton = document.querySelector("#closeMessageSearchButton");
const storageButton = document.querySelector("#storageButton");
const storagePanel = document.querySelector("#storagePanel");
const storageList = document.querySelector("#storageList");
const closeStorageButton = document.querySelector("#closeStorageButton");
const otherFeatureButton = document.querySelector("#otherFeatureButton");
const otherFeaturePanel = document.querySelector("#otherFeaturePanel");
const otherFeatureList = document.querySelector("#otherFeatureList");
const closeOtherFeatureButton = document.querySelector("#closeOtherFeatureButton");
const upcomingScheduleButton = document.querySelector("#upcomingScheduleButton");
const upcomingSchedulePanel = document.querySelector("#upcomingSchedulePanel");
const upcomingScheduleList = document.querySelector("#upcomingScheduleList");
const upcomingScheduleTicker = document.querySelector("#upcomingScheduleTicker");
const closeUpcomingScheduleButton = document.querySelector("#closeUpcomingScheduleButton");
const upcomingFestivalButton = document.querySelector("#upcomingFestivalButton");
const upcomingFestivalPanel = document.querySelector("#upcomingFestivalPanel");
const upcomingFestivalList = document.querySelector("#upcomingFestivalList");
const upcomingFestivalTicker = document.querySelector("#upcomingFestivalTicker");
const closeUpcomingFestivalButton = document.querySelector("#closeUpcomingFestivalButton");
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
const scheduleButton = document.querySelector("#scheduleButton");
const schedulePanel = document.querySelector("#schedulePanel");
const scheduleForm = document.querySelector("#scheduleForm");
const scheduleDateInput = document.querySelector("#scheduleDateInput");
const scheduleContentInput = document.querySelector("#scheduleContentInput");
const scheduleList = document.querySelector("#scheduleList");
const closeScheduleButton = document.querySelector("#closeScheduleButton");
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
const switchCameraButton = document.querySelector("#switchCameraButton");
const endCallButton = document.querySelector("#endCallButton");
const MAX_ATTACHMENT_BYTES = Number.POSITIVE_INFINITY;
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
let currentCameraFacingMode = "user";
let relayVideoTimer = null;
let relayAudioRecorder = null;
let remoteAudioQueue = [];
let remoteAudioPlaying = false;
let relayFallbackTimer = null;
let baseViewportHeight = window.innerHeight;
let typingEmitTimer = null;
let typingStopTimer = null;
let typingIndicatorTimer = null;
let savedStatusText = "";
let lastResumeRefreshAt = 0;
let gomokuInviteTimer = null;
let gomokuTurnTimer = null;
let gomokuBanterTimer = null;
let gomokuBanterCooldownUntil = 0;
const isIOSLike = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
const OTHER_FEATURES = [
  {
    title: "随机小纸条",
    action: "换一句",
    items: [
      "今天也想认真听你说话。",
      "给对方发一句：我刚刚突然想到你。",
      "今天的抱抱额度不设上限。",
      "把现在最想对对方说的一句话发出去。",
      "今晚留十分钟，只聊开心的事。",
    ],
  },
  {
    title: "默契问题",
    action: "换一题",
    items: [
      "如果明天一起放假，第一件事想做什么？",
      "最近哪一瞬间觉得对方很可爱？",
      "下一次约会想吃什么？",
      "如果给今天打一个恋爱分数，会是多少？",
      "想让对方最近多陪你做哪件小事？",
    ],
  },
  {
    title: "约会灵感",
    action: "换一个",
    items: [
      "一起散步买一杯喝的，路上不看手机。",
      "各自选一道菜，凑成今晚菜单。",
      "找一部老电影，边看边吐槽。",
      "拍一张今天的合照，留给以后翻。",
      "互相给对方点一首歌。",
    ],
  },
];

function syncViewportHeight() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offsetTop = viewport?.offsetTop || 0;
  const activeElement = document.activeElement;
  const loginFocused =
    loginPanel &&
    !loginPanel.classList.contains("hidden") &&
    loginForm?.contains(activeElement);
  const composerFocused = activeElement === messageInput;
  const foodFocused =
    foodPanel &&
    !foodPanel.classList.contains("hidden") &&
    (activeElement === foodDateInput || activeElement === foodNameInput);
  const foodNameFocused = foodFocused && activeElement === foodNameInput;
  const scheduleFocused =
    schedulePanel &&
    !schedulePanel.classList.contains("hidden") &&
    (activeElement === scheduleDateInput || activeElement === scheduleContentInput);
  const scheduleContentFocused = scheduleFocused && activeElement === scheduleContentInput;
  const messageSearchFocused =
    messageSearchPanel &&
    !messageSearchPanel.classList.contains("hidden") &&
    activeElement === messageSearchInput;
  const diaryFocused =
    diaryPanel &&
    !diaryPanel.classList.contains("hidden") &&
    activeElement === diaryInput;
  const anyKeyboardFocused =
    loginFocused || composerFocused || foodFocused || scheduleFocused || messageSearchFocused || diaryFocused;
  if (!anyKeyboardFocused || height > baseViewportHeight) {
    baseViewportHeight = Math.max(baseViewportHeight, height, window.innerHeight);
  }
  const keyboardBottom = anyKeyboardFocused
    ? Math.max(0, baseViewportHeight - height - offsetTop)
    : 0;
  const composerHeight = Math.ceil(messageForm?.getBoundingClientRect().height || 68);

  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--visual-offset-top", `${offsetTop}px`);
  document.documentElement.style.setProperty("--keyboard-bottom", `${keyboardBottom}px`);
  document.documentElement.style.setProperty("--composer-height", `${composerHeight}px`);
  document.body.classList.toggle("keyboard-open", anyKeyboardFocused);
  document.body.classList.toggle("login-keyboard-open", loginFocused);
  document.body.classList.toggle("composer-keyboard-open", composerFocused);
  document.body.classList.toggle("ios-composer-keyboard-open", composerFocused && isIOSLike);
  document.body.classList.toggle("food-keyboard-open", foodFocused);
  document.body.classList.toggle("food-name-keyboard-open", foodNameFocused);
  document.body.classList.toggle("schedule-keyboard-open", scheduleFocused);
  document.body.classList.toggle("schedule-content-keyboard-open", scheduleContentFocused);
  document.body.classList.toggle("message-search-keyboard-open", messageSearchFocused);
  document.body.classList.toggle("diary-keyboard-open", diaryFocused);
  syncSparseMessagesClass();
}

function syncViewportSoon() {
  requestAnimationFrame(() => {
    syncViewportHeight();
    if (document.activeElement === messageInput) {
      scrollMessagesToBottom();
    }
  });
  setTimeout(() => {
    syncViewportHeight();
    if (document.activeElement === messageInput) {
      scrollMessagesToBottom();
    }
  }, 280);
  setTimeout(() => {
    if (document.activeElement === messageInput) {
      syncViewportHeight();
      scrollMessagesToBottom();
    }
  }, 620);
  setTimeout(() => {
    if (document.activeElement === messageInput) {
      syncViewportHeight();
      scrollMessagesToBottom();
    }
  }, 920);
}

function scrollMessagesToBottom() {
  if (!shouldStickToLatestMessage()) {
    messagesEl.scrollTop = 0;
    syncSparseMessagesClass();
    return;
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
  messagesEl.lastElementChild?.scrollIntoView({ block: "end" });
}

function settleMessagesAtBottom() {
  if (!shouldStickToLatestMessage()) {
    messagesEl.scrollTop = 0;
    return;
  }

  state.bottomSettleUntil = Date.now() + 2600;
  jumpToLatestMessage();
  requestAnimationFrame(jumpToLatestMessage);
}

function settleMessagesAfterKeyboardClose() {
  syncViewportHeight();
  settleMessagesAtBottom();
  setTimeout(() => {
    syncViewportHeight();
    settleMessagesAtBottom();
  }, 180);
  setTimeout(() => {
    syncViewportHeight();
    settleMessagesAtBottom();
  }, 420);
  setTimeout(() => {
    syncViewportHeight();
    settleMessagesAtBottom();
  }, 760);
}

function settleMessagesAtBottomIfActive() {
  if (Date.now() <= state.bottomSettleUntil) {
    jumpToLatestMessage();
  }
}

function jumpToLatestMessage() {
  if (!shouldStickToLatestMessage()) {
    messagesEl.scrollTop = 0;
    return;
  }

  const latest = messagesEl.lastElementChild;

  if (!latest) {
    return;
  }

  latest.scrollIntoView({ block: "end", inline: "nearest", behavior: "auto" });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function shouldStickToLatestMessage() {
  return messagesEl.scrollHeight > messagesEl.clientHeight + 4;
}

function syncSparseMessagesClass() {
  const count = getRenderedMessageCount();
  document.body.classList.toggle("sparse-messages", count < 3);
  document.body.classList.toggle("empty-messages", count === 0);
}

function getRenderedMessageCount() {
  return messagesEl.querySelectorAll(".message[data-message-id]").length;
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

function openPasswordChangePanel() {
  passwordChangeStatus.textContent = "";
  passwordChangeUsername.value = document.querySelector("#username")?.value || "";
  passwordChangeOld.value = "";
  passwordChangeNew.value = "";
  passwordChangeConfirm.value = "";
  passwordChangePanel?.classList.remove("hidden");
  passwordChangeUsername?.focus();
}

function closePasswordChangePanel() {
  passwordChangePanel?.classList.add("hidden");
}

async function changePassword(event) {
  event.preventDefault();
  passwordChangeStatus.textContent = "正在保存...";

  try {
    if (passwordChangeNew.value !== passwordChangeConfirm.value) {
      throw new Error("两次输入的新密码不一致。");
    }

    const response = await api("/api/password/change", {
      method: "POST",
      body: JSON.stringify({
        username: passwordChangeUsername.value.trim(),
        oldPassword: passwordChangeOld.value,
        newPassword: passwordChangeNew.value,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "更改失败。");
    }

    passwordChangeStatus.textContent = "密码已更新，可以用新密码登录。";
    passwordChangeOld.value = "";
    passwordChangeNew.value = "";
    passwordChangeConfirm.value = "";
  } catch (error) {
    passwordChangeStatus.textContent = error.message;
  }
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

function renderMessage(message, options = {}) {
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
  insertMessageElement(item, messageId);
  syncSparseMessagesClass();
  if (options.scroll !== false) {
    scrollMessagesToBottom();
  }
}

function insertMessageElement(item, messageId) {
  const currentId = Number(messageId);

  for (const child of messagesEl.querySelectorAll(".message[data-message-id]")) {
    if (Number(child.dataset.messageId) > currentId) {
      messagesEl.insertBefore(item, child);
      return;
    }
  }

  messagesEl.append(item);
}

function renderAttachment(message, bubble) {
  if (!message.attachmentData && !message.attachmentStorageKey && !message.attachmentName) {
    return;
  }

  const isImage = message.attachmentType?.startsWith("image/");
  const isVideo = message.attachmentType?.startsWith("video/");
  const attachmentUrl = getAttachmentUrl(message);
  const attachment = document.createElement(isImage || isVideo ? "button" : "a");
  attachment.className = "attachment";

  if (isImage || isVideo) {
    attachment.type = "button";
    attachment.addEventListener("click", () => openAttachmentViewer(message, attachmentUrl));
  } else {
    attachment.href = attachmentUrl;
    attachment.download = message.attachmentName || "attachment";
    attachment.target = "_blank";
    attachment.rel = "noopener";
  }

  if (isImage) {
    const image = document.createElement("img");
    image.alt = message.attachmentName || "附件";
    image.src = attachmentUrl;
    image.loading = "lazy";
    image.addEventListener("load", settleMessagesAtBottomIfActive, { once: true });
    attachment.append(image);
  } else if (isVideo) {
    const video = document.createElement("video");
    video.src = attachmentUrl;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.addEventListener("loadedmetadata", settleMessagesAtBottomIfActive, { once: true });
    video.addEventListener("click", (event) => {
      event.stopPropagation();
      openAttachmentViewer(message, attachmentUrl);
    });
    const openLabel = document.createElement("span");
    openLabel.className = "attachment-open-label";
    openLabel.textContent = "点开视频预览";
    attachment.append(video, openLabel);
  } else {
    const label = document.createElement("span");
    label.className = "attachment-file";
    label.textContent = `附件：${message.attachmentName || "下载文件"}`;
    attachment.append(label);
  }

  bubble.append(attachment);
}

function getAttachmentUrl(message) {
  const tokenQuery = state.token ? `?token=${encodeURIComponent(state.token)}` : "";
  return `/api/messages/${encodeURIComponent(message.id)}/attachment${tokenQuery}`;
}

function openAttachmentViewer(message, url) {
  const isImage = message.attachmentType?.startsWith("image/");
  const isVideo = message.attachmentType?.startsWith("video/");

  if (!isImage && !isVideo) {
    window.open(url, "_blank", "noopener");
    return;
  }

  let panel = document.querySelector("#attachmentViewerPanel");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "attachmentViewerPanel";
    panel.className = "attachment-viewer-panel hidden";
    panel.innerHTML = `
      <div class="attachment-viewer-card">
        <div class="attachment-viewer-actions">
          <button class="attachment-viewer-save" type="button">保存</button>
          <button class="attachment-viewer-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="attachment-viewer-body"></div>
      </div>
    `;
    document.body.append(panel);
    panel.addEventListener("click", (event) => {
      if (event.target === panel || event.target.closest(".attachment-viewer-close")) {
        panel.classList.add("hidden");
        panel.querySelector(".attachment-viewer-body").innerHTML = "";
      }
    });
  }

  const body = panel.querySelector(".attachment-viewer-body");
  const saveButton = panel.querySelector(".attachment-viewer-save");
  body.innerHTML = "";
  saveButton.textContent = "保存";
  saveButton.disabled = false;
  saveButton.onclick = () => saveAttachmentToAlbum(message, url, saveButton);

  if (isImage) {
    const image = document.createElement("img");
    image.alt = message.attachmentName || "图片";
    image.src = url;
    body.append(image);
  } else {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    body.append(video);
  }

  panel.classList.remove("hidden");
}

async function saveAttachmentToAlbum(message, url, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "准备中";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("文件加载失败");
    }

    const blob = await response.blob();
    const name = message.attachmentName || `attachment-${message.id}${getAttachmentExtension(blob.type)}`;
    const file = new File([blob], name, { type: blob.type || message.attachmentType || "application/octet-stream" });

    if (navigator.canShare?.({ files: [file] })) {
      button.textContent = "选择保存";
      await navigator.share({ files: [file], title: name });
    } else {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = name;
      link.target = "_blank";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    }

    button.textContent = originalText;
  } catch (error) {
    button.textContent = "重新保存";
    statusText.textContent = error.message || "保存失败，请稍后再试";
  } finally {
    button.disabled = false;
  }
}

function getAttachmentExtension(type) {
  if (type === "image/png") return ".png";
  if (type === "image/gif") return ".gif";
  if (type === "image/webp") return ".webp";
  if (type?.startsWith("image/")) return ".jpg";
  if (type === "video/quicktime") return ".mov";
  if (type?.startsWith("video/")) return ".mp4";
  return "";
}

function truncateQuoteBody(body, maxLength = 50) {
  const text = String(body || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
    quote.textContent = `${message.quoteSenderName}：${truncateQuoteBody(message.quoteBody)}`;
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
  item.addEventListener("dblclick", (event) => {
    event.preventDefault();
    openContextMenu(message, event.clientX, event.clientY);
  });

  item.addEventListener("click", (event) => {
    const now = Date.now();
    const isDoubleTap = state.lastMenuTapId === message.id && now - state.lastMenuTapAt < 360;
    state.lastMenuTapAt = now;
    state.lastMenuTapId = message.id;

    if (isDoubleTap) {
      event.preventDefault();
      openContextMenu(message, event.clientX, event.clientY);
      state.lastMenuTapAt = 0;
      state.lastMenuTapId = null;
    }
  });

  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openContextMenu(message, event.clientX, event.clientY);
  });
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
  text.textContent = `回复 ${state.quote.senderName}：${truncateQuoteBody(state.quote.body)}`;
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
  resizeMessageInput();
  const attachment = state.attachment;
  const quote = state.quote;
  clearAttachment();
  clearQuote();
  closeEmojiPanel();
  closeCallMenu();
  const payload = { body, attachment, quote };
  const restoreDraft = (error) => {
    messageInput.value = body;
    resizeMessageInput();
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

function resizeMessageInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = messageInput.value ? `${messageInput.scrollHeight}px` : "";
  syncViewportSoon();
}

function requestNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") {
    subscribePushNotifications().catch(() => {});
    return;
  }

  Notification.requestPermission()
    .then(() => subscribePushNotifications())
    .catch(() => {});
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function subscribePushNotifications() {
  if (
    !state.token ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("PushManager" in window)
  ) {
    return;
  }

  const registration = await getServiceWorkerRegistration();

  if (!registration) {
    return;
  }

  const keyResponse = await api("/api/push/public-key");
  const keyData = await keyResponse.json();

  if (!keyResponse.ok || !keyData.publicKey) {
    return;
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    }));

  await api("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
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

function emitTyping(active) {
  if (!state.socket?.connected) {
    return;
  }

  state.socket.emit(active ? "typing:start" : "typing:stop");
}

function handleLocalTyping() {
  clearTimeout(typingEmitTimer);
  clearTimeout(typingStopTimer);

  typingEmitTimer = setTimeout(() => emitTyping(Boolean(messageInput.value.trim())), 120);
  typingStopTimer = setTimeout(() => emitTyping(false), 1400);
}

function stopLocalTyping() {
  clearTimeout(typingEmitTimer);
  clearTimeout(typingStopTimer);
  emitTyping(false);
}

function showTypingIndicator(user) {
  clearTimeout(typingIndicatorTimer);

  if (!savedStatusText || statusText.textContent !== "对方正在输入...") {
    savedStatusText = statusText.textContent;
  }

  statusText.textContent = `${user?.displayName || "对方"}正在输入...`;
  typingIndicatorTimer = setTimeout(hideTypingIndicator, 2400);
}

function hideTypingIndicator() {
  clearTimeout(typingIndicatorTimer);

  if (statusText.textContent.includes("正在输入")) {
    statusText.textContent = savedStatusText || "已连接";
  }

  savedStatusText = "";
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

function closeMessageSearchPanel() {
  messageSearchPanel?.classList.add("hidden");
}

function closeStoragePanel() {
  storagePanel?.classList.add("hidden");
}

function closeOtherFeaturePanel() {
  otherFeaturePanel?.classList.add("hidden");
}

function closeUpcomingSchedulePanel() {
  upcomingSchedulePanel?.classList.add("hidden");
}

function closeUpcomingFestivalPanel() {
  upcomingFestivalPanel?.classList.add("hidden");
}

function openExpressStatusPanel() {
  ensureExpressStatusCurrentDate();
  renderExpressStatus();
  expressStatusPanel?.classList.remove("hidden");
}

function closeExpressStatusPanel() {
  expressStatusPanel?.classList.add("hidden");
}

function closeWeatherPanel() {
  weatherPanel?.classList.add("hidden");
}

function closeFoodPanel() {
  foodPanel?.classList.add("hidden");
}

function closeSchedulePanel() {
  schedulePanel?.classList.add("hidden");
}

function closeDiaryPanel() {
  diaryPanel?.classList.add("hidden");
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadExpressStatus() {
  const today = todayInputValue();

  try {
    const stored = JSON.parse(localStorage.getItem("express_status") || "null");
    state.expressStatus =
      stored && stored.date === today
        ? { date: today, hasExpress: Boolean(stored.hasExpress) }
        : { date: today, hasExpress: false };
  } catch {
    state.expressStatus = { date: today, hasExpress: false };
  }

  saveExpressStatus();
  renderExpressStatus();
}

function saveExpressStatus() {
  localStorage.setItem("express_status", JSON.stringify(state.expressStatus));
}

function renderExpressStatus() {
  ensureExpressStatusCurrentDate();
  const hasExpress = Boolean(state.expressStatus?.hasExpress);
  expressStatusButton?.setAttribute("aria-pressed", String(hasExpress));
  if (expressStatusText) {
    expressStatusText.textContent = hasExpress ? "有" : "没有";
    expressStatusText.classList.toggle("has-express", hasExpress);
  }
  if (expressStatusCurrent) {
    expressStatusCurrent.textContent = hasExpress ? "今天：有" : "今天：没有";
  }
  expressStatusOptions?.querySelectorAll("[data-express-status]").forEach((button) => {
    button.classList.toggle("active", button.dataset.expressStatus === (hasExpress ? "yes" : "no"));
  });
}

function ensureExpressStatusCurrentDate() {
  const today = todayInputValue();
  if (state.expressStatus?.date !== today) {
    state.expressStatus = { date: today, hasExpress: false };
    saveExpressStatus();
  }
}

function setExpressStatus(hasExpress) {
  ensureExpressStatusCurrentDate();
  state.expressStatus.hasExpress = Boolean(hasExpress);
  saveExpressStatus();
  renderExpressStatus();
  closeExpressStatusPanel();
}

function parseYmd(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function formatDiaryDate(value) {
  const date = parseYmd(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function shiftMonth(ym, offset) {
  const [year, month] = ym.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function compareYmd(left, right) {
  return String(left || "").localeCompare(String(right || ""));
}

function clampDiaryMonth(ym) {
  const today = todayInputValue();
  const currentMonth = today.slice(0, 7);
  const targetMonth = String(ym || currentMonth);
  if (targetMonth > currentMonth) {
    return currentMonth;
  }
  if (targetMonth < DIARY_MIN_MONTH) {
    return DIARY_MIN_MONTH;
  }
  return targetMonth;
}

function getDiaryYearRange() {
  const currentYear = new Date().getFullYear();
  const years = state.diaryEntries
    .map((entry) => Number(String(entry.entryDate || "").slice(0, 4)))
    .filter(Boolean);
  years.push(2025, currentYear - 1, currentYear);
  return {
    start: Math.max(Math.min(...years), 2025),
    end: Math.min(Math.max(...years), currentYear),
  };
}

function syncDiarySelectedDateToMonth() {
  state.diaryVisibleMonth = clampDiaryMonth(state.diaryVisibleMonth);
  const today = todayInputValue();
  const [year, month] = state.diaryVisibleMonth.split("-").map((part) => Number(part));
  const currentDay = parseYmd(state.diarySelectedDate).getDate() || 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = String(Math.min(currentDay, daysInMonth)).padStart(2, "0");
  state.diarySelectedDate = `${year}-${String(month).padStart(2, "0")}-${day}`;
  if (compareYmd(state.diarySelectedDate, DIARY_MIN_DATE) < 0) {
    state.diarySelectedDate = DIARY_MIN_DATE;
    state.diaryVisibleMonth = DIARY_MIN_MONTH;
  }
  if (compareYmd(state.diarySelectedDate, today) > 0) {
    state.diarySelectedDate = today;
    state.diaryVisibleMonth = today.slice(0, 7);
  }
}

function setDiaryVisibleMonth(year, month) {
  state.diaryVisibleMonth = clampDiaryMonth(`${year}-${String(month).padStart(2, "0")}`);
  syncDiarySelectedDateToMonth();
  renderDiaryEntries();
}

async function openFoodPanel() {
  foodPanel?.classList.remove("hidden");
  foodDateInput.value = todayInputValue();
  await loadFoodItems();
}

async function openSchedulePanel() {
  schedulePanel?.classList.remove("hidden");
  scheduleDateInput.value = todayInputValue();
  await loadScheduleItems();
}

async function openDiaryPanel() {
  state.diarySelectedDate ||= todayInputValue();
  if (compareYmd(state.diarySelectedDate, todayInputValue()) > 0) {
    state.diarySelectedDate = todayInputValue();
  }
  if (compareYmd(state.diarySelectedDate, DIARY_MIN_DATE) < 0) {
    state.diarySelectedDate = DIARY_MIN_DATE;
  }
  state.diaryVisibleMonth = clampDiaryMonth(state.diarySelectedDate.slice(0, 7));
  diaryPanel?.classList.remove("hidden");
  await loadDiaryEntries();
}

async function loadDiaryEntries() {
  if (!diaryList) {
    return;
  }

  diaryList.textContent = "正在加载...";

  try {
    const response = await api("/api/diary-entries?limit=5000");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "日记加载失败。");
    }

    state.diaryEntries = data.entries || [];
    renderDiaryEntries();
  } catch (error) {
    diaryList.textContent = error.message;
  }
}

function renderDiaryEntries() {
  if (!diaryList) {
    return;
  }

  renderDiaryCalendar();
  diaryList.innerHTML = "";
  diarySelectedDate.textContent = `${formatDiaryDate(state.diarySelectedDate)} 的日记`;

  const entries = state.diaryEntries.filter((entry) => entry.entryDate === state.diarySelectedDate);

  if (!entries.length) {
    diaryList.textContent = "这一天还没有写日记。";
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("article");
    item.className = "diary-item";
    item.dataset.diaryId = entry.id;
    item.innerHTML = `
      <div class="diary-item-head">
        <strong></strong>
        <button class="ghost diary-delete-button" type="button">删除</button>
      </div>
      <p></p>
    `;
    item.querySelector("strong").textContent = entry.userName;
    item.querySelector("p").textContent = entry.content;
    item.querySelector("button").addEventListener("click", () => deleteDiaryEntry(entry.id));
    diaryList.append(item);
  }
}

function renderDiaryMonthPicker(year, month) {
  if (!diaryYearSelect || !diaryMonthSelect) {
    return;
  }

  const { start, end } = getDiaryYearRange();
  const today = parseYmd(todayInputValue());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const minYear = Number(DIARY_MIN_DATE.slice(0, 4));
  const minMonth = Number(DIARY_MIN_DATE.slice(5, 7));
  const yearsMarkup = [];
  for (let targetYear = start; targetYear <= end; targetYear += 1) {
    yearsMarkup.push(`<option value="${targetYear}">${targetYear}年</option>`);
  }
  diaryYearSelect.innerHTML = yearsMarkup.join("");
  diaryYearSelect.value = String(year);

  const startMonth = year === minYear ? minMonth : 1;
  const maxMonth = year === currentYear ? currentMonth : 12;
  diaryMonthSelect.innerHTML = Array.from({ length: maxMonth - startMonth + 1 }, (_, index) => {
    const targetMonth = startMonth + index;
    return `<option value="${targetMonth}">${targetMonth}月</option>`;
  }).join("");
  diaryMonthSelect.value = String(month);
}

function renderDiaryCalendar() {
  if (!diaryCalendarGrid) {
    return;
  }

  state.diaryVisibleMonth = clampDiaryMonth(state.diaryVisibleMonth);
  const [year, month] = state.diaryVisibleMonth.split("-").map((part) => Number(part));
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const diaryDates = new Set(state.diaryEntries.map((entry) => entry.entryDate));
  const today = todayInputValue();

  renderDiaryMonthPicker(year, month);
  prevDiaryMonthButton.disabled = state.diaryVisibleMonth <= DIARY_MIN_MONTH;
  nextDiaryMonthButton.disabled = state.diaryVisibleMonth >= today.slice(0, 7);
  diaryCalendarGrid.innerHTML = "";

  for (let i = 0; i < leadingEmptyDays; i += 1) {
    const empty = document.createElement("span");
    empty.className = "diary-calendar-empty";
    diaryCalendarGrid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isFutureDate = compareYmd(date, today) > 0;
    const isBeforeMinDate = compareYmd(date, DIARY_MIN_DATE) < 0;
    const button = document.createElement("button");
    button.className = "diary-date-button";
    button.type = "button";
    button.disabled = isFutureDate || isBeforeMinDate;
    button.classList.toggle("selected", date === state.diarySelectedDate);
    button.classList.toggle("disabled", isFutureDate || isBeforeMinDate);
    button.innerHTML = `<span>${day}</span>${diaryDates.has(date) ? "<small>日记</small>" : ""}`;
    button.addEventListener("click", () => {
      if (isFutureDate || isBeforeMinDate) {
        return;
      }
      state.diarySelectedDate = date;
      state.diaryVisibleMonth = date.slice(0, 7);
      renderDiaryEntries();
    });
    diaryCalendarGrid.append(button);
  }
}

async function saveDiaryEntry(event) {
  event.preventDefault();
  const content = diaryInput.value.trim();

  if (!content) {
    return;
  }

  try {
    const response = await api("/api/diary-entries", {
      method: "POST",
      body: JSON.stringify({ content, entryDate: state.diarySelectedDate }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "保存失败。");
    }

    diaryInput.value = "";
    upsertDiaryEntry(data.entry);
  } catch (error) {
    statusText.textContent = error.message;
  }
}

function upsertDiaryEntry(entry) {
  const index = state.diaryEntries.findIndex((current) => String(current.id) === String(entry.id));

  if (index >= 0) {
    state.diaryEntries[index] = entry;
  } else {
    state.diaryEntries.unshift(entry);
  }

  state.diaryEntries.sort((left, right) =>
    left.entryDate === right.entryDate
      ? left.userId.localeCompare(right.userId)
      : right.entryDate.localeCompare(left.entryDate)
  );
  renderDiaryEntries();
}

async function deleteDiaryEntry(id) {
  if (!window.confirm("确定删除这条日记吗？")) {
    return;
  }

  try {
    const response = await api(`/api/diary-entries/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "删除失败。");
    }

    removeDiaryEntry(data.id);
  } catch (error) {
    statusText.textContent = error.message;
  }
}

function removeDiaryEntry(id) {
  state.diaryEntries = state.diaryEntries.filter((entry) => String(entry.id) !== String(id));
  renderDiaryEntries();
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function renderOtherFeatures() {
  if (!otherFeatureList) {
    return;
  }

  otherFeatureList.innerHTML = "";

  for (const feature of OTHER_FEATURES) {
    const item = document.createElement("article");
    item.className = "other-feature-item";
    const title = document.createElement("h3");
    title.textContent = feature.title;
    const text = document.createElement("p");
    text.textContent = pickRandom(feature.items);
    const button = document.createElement("button");
    button.className = "ghost";
    button.type = "button";
    button.textContent = feature.action;
    button.addEventListener("click", () => {
      text.textContent = pickRandom(feature.items);
    });
    item.append(title, text, button);
    otherFeatureList.append(item);
  }
}

function openOtherFeaturePanel() {
  otherFeaturePanel?.classList.remove("hidden");
  renderOtherFeatures();
}

function openMessageSearchPanel() {
  messageSearchPanel?.classList.remove("hidden");
  messageSearchInput?.focus();
}

async function openStoragePanel() {
  storagePanel?.classList.remove("hidden");
  if (storageList) {
    storageList.textContent = "正在计算...";
  }

  try {
    const response = await api("/api/storage-usage");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "存储信息加载失败。");
    }

    renderStorageUsage(data);
  } catch (error) {
    if (storageList) {
      storageList.textContent = error.message;
    }
  }
}

function renderStorageUsage(data) {
  if (!storageList) {
    return;
  }

  storageList.innerHTML = "";
  storageList.append(
    renderStorageRow("文字", data.text?.label || "0 B / 500 MB", data.text),
    renderStorageRow("附件", data.attachment?.label || "0 B / 10 GB", data.attachment, data.attachment?.mode)
  );
}

function renderStorageRow(title, label, values, meta = "") {
  const row = document.createElement("article");
  row.className = "storage-item";
  const used = Number(values?.used || 0);
  const total = Number(values?.total || 1);
  const percent = Math.max(0, Math.min(100, (used / total) * 100));
  row.innerHTML = `
    <div class="storage-item-head">
      <strong></strong>
      <span></span>
    </div>
    <div class="storage-bar"><i></i></div>
    <small></small>
  `;
  row.querySelector("strong").textContent = title;
  row.querySelector("span").textContent = label;
  row.querySelector("i").style.width = `${percent}%`;
  row.querySelector("small").textContent = meta || `${percent.toFixed(1)}%`;
  return row;
}

function getSearchPreview(message) {
  if (message.body) {
    return message.body;
  }

  if (message.attachmentName) {
    if (message.attachmentType?.startsWith("image/")) {
      return `图片：${message.attachmentName}`;
    }

    if (message.attachmentType?.startsWith("video/")) {
      return `视频：${message.attachmentName}`;
    }

    return `附件：${message.attachmentName}`;
  }

  if (message.quoteBody) {
    return `引用：${message.quoteBody}`;
  }

  return "这条消息没有文字内容";
}

function getSearchTypeLabel(type) {
  return {
    all: "全部",
    text: "文字",
    image: "图片",
    video: "视频",
    file: "附件",
  }[type] || "全部";
}

function renderMessageSearchResults(messages, query, type) {
  if (!messageSearchResults || !messageSearchSummary) {
    return;
  }

  messageSearchResults.innerHTML = "";
  const label = getSearchTypeLabel(type);
  const scope = query ? `${label} · “${query}”` : label;
  messageSearchSummary.textContent = messages.length
    ? `找到 ${messages.length} 条${scope}记录`
    : `没有找到${scope}记录`;

  for (const message of messages) {
    const item = document.createElement("button");
    item.className = "message-search-result";
    item.type = "button";
    item.innerHTML = `
      <span class="message-search-meta"></span>
      <strong></strong>
      <span class="message-search-preview"></span>
    `;
    item.querySelector(".message-search-meta").textContent = `${message.senderName} · ${formatTime(message.createdAt)}`;
    item.querySelector("strong").textContent = message.senderName;
    item.querySelector(".message-search-preview").textContent = getSearchPreview(message);
    item.addEventListener("click", () => jumpToSearchMessage(message));
    messageSearchResults.append(item);
  }
}

async function searchMessages(event) {
  event.preventDefault();
  const query = messageSearchInput.value.trim();
  const type = messageSearchType?.value || "all";

  if (!query && (type === "all" || type === "text")) {
    messageSearchSummary.textContent = "输入关键词查询聊天记录，或选择图片、视频、附件。";
    messageSearchResults.innerHTML = "";
    return;
  }

  messageSearchSummary.textContent = "正在查询...";
  messageSearchResults.innerHTML = "";

  try {
    const response = await api(`/api/messages/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "查询失败。");
    }

    renderMessageSearchResults(data.messages || [], query, type);
  } catch (error) {
    messageSearchSummary.textContent = error.message;
  }
}

async function jumpToSearchMessage(message) {
  closeMessageSearchPanel();
  let targetMessage = message;

  if (!state.renderedMessages.has(String(message.id))) {
    try {
      const response = await api(`/api/messages/${message.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "消息加载失败。");
      }

      targetMessage = data.message;
    } catch (error) {
      statusText.textContent = error.message;
    }

    renderMessage(targetMessage, { scroll: false });
  }

  scrollToMessage(message.id);
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
    const header = document.createElement("div");
    header.className = "food-day-header";
    const title = document.createElement("h3");
    title.textContent = `${formatFoodDate(date)}买菜清单`;
    const deleteDayButton = document.createElement("button");
    deleteDayButton.className = "ghost danger-control";
    deleteDayButton.type = "button";
    deleteDayButton.textContent = "删除当天";
    deleteDayButton.addEventListener("click", () => deleteFoodDay(date));
    header.append(title, deleteDayButton);
    const list = document.createElement("div");
    list.className = "food-day-list";

    for (const item of items) {
      list.append(renderFoodItem(item));
    }

    section.append(header, list);
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
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return value;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(year, month - 1, day);
  const dayDiff = Math.round((targetStart - todayStart) / 86400000);
  const labels = ["今天", "明天", "后天", "大后天"];

  if (dayDiff >= 0 && dayDiff < labels.length) {
    return labels[dayDiff];
  }

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

async function deleteFoodDay(plannedDate) {
  const label = formatFoodDate(plannedDate);

  if (!window.confirm(`确定删除${label}的整份买菜清单吗？`)) {
    return;
  }

  try {
    const response = await api(`/api/food-days/${plannedDate}`, {
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

function removeFoodDay({ plannedDate }) {
  state.foodItems = state.foodItems.filter((item) => item.plannedDate !== plannedDate);
  renderFoodItems();
}

async function loadScheduleItems() {
  if (!scheduleList) {
    return;
  }

  scheduleList.textContent = "正在加载...";

  try {
    const response = await api("/api/schedule-items");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "行程加载失败。");
    }

    state.scheduleItems = data.items || [];
    renderScheduleItems();
  } catch (error) {
    scheduleList.textContent = error.message;
  }
}

async function openUpcomingSchedulePanel() {
  upcomingSchedulePanel?.classList.remove("hidden");
  if (upcomingScheduleList) {
    upcomingScheduleList.textContent = "正在查找...";
  }
  try {
    const response = await api("/api/schedule-items");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "行程加载失败。");
    }

    state.scheduleItems = data.items || [];
    renderUpcomingScheduleTicker();
    renderUpcomingSchedule();
  } catch (error) {
    if (upcomingScheduleList) {
      upcomingScheduleList.textContent = error.message;
    }
  }
}

async function loadUpcomingSummaries() {
  await Promise.allSettled([loadUpcomingScheduleTicker(), loadUpcomingFestivalTicker()]);
}

async function loadUpcomingScheduleTicker() {
  if (!upcomingScheduleTicker) {
    return;
  }

  try {
    const response = await api("/api/schedule-items");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "行程加载失败。");
    }

    state.scheduleItems = data.items || [];
    renderUpcomingScheduleTicker();
  } catch {
    upcomingScheduleTicker.textContent = "暂无行程";
  }
}

function renderUpcomingScheduleTicker() {
  if (!upcomingScheduleTicker) {
    return;
  }

  const today = todayInputValue();
  const nearestDate = [...new Set(state.scheduleItems.map((item) => item.plannedDate))]
    .filter((date) => date >= today)
    .sort((left, right) => left.localeCompare(right))[0];
  const items = state.scheduleItems.filter((item) => item.plannedDate === nearestDate);
  upcomingScheduleTicker.textContent = items.length ? items.map((item) => item.content).join(" · ") : "暂无行程";
}

async function loadUpcomingFestivalTicker() {
  if (!upcomingFestivalTicker) {
    return;
  }

  try {
    const response = await api("/api/upcoming-festival");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "节日加载失败。");
    }

    const names = data.festival?.festivals?.map((festival) => festival.name).filter(Boolean) || [];
    upcomingFestivalTicker.textContent = names.length ? names.join(" · ") : "暂无节日";
  } catch {
    upcomingFestivalTicker.textContent = "暂无节日";
  }
}

function renderUpcomingSchedule() {
  if (!upcomingScheduleList) {
    return;
  }

  upcomingScheduleList.innerHTML = "";
  const today = todayInputValue();
  const upcomingDates = [...new Set(state.scheduleItems.map((item) => item.plannedDate))]
    .filter((date) => date >= today)
    .sort((left, right) => left.localeCompare(right));
  const nearestDate = upcomingDates[0];

  if (!nearestDate) {
    upcomingScheduleList.textContent = "暂无即将到来的行程。";
    return;
  }

  const title = document.createElement("h3");
  title.textContent = formatFoodDate(nearestDate);
  const list = document.createElement("div");
  list.className = "upcoming-schedule-items";
  const items = state.scheduleItems.filter((item) => item.plannedDate === nearestDate);

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "upcoming-schedule-item";
    const content = document.createElement("strong");
    content.textContent = item.content;
    const meta = document.createElement("span");
    meta.textContent = item.userName || "";
    row.append(content, meta);
    list.append(row);
  }

  upcomingScheduleList.append(title, list);
}

async function openUpcomingFestivalPanel() {
  upcomingFestivalPanel?.classList.remove("hidden");
  if (upcomingFestivalList) {
    upcomingFestivalList.textContent = "正在查找...";
  }

  try {
    const response = await api("/api/upcoming-festival");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "节日加载失败。");
    }

    renderUpcomingFestival(data.festival);
  } catch (error) {
    if (upcomingFestivalList) {
      upcomingFestivalList.textContent = error.message;
    }
  }
}

function renderUpcomingFestival(festival) {
  if (!upcomingFestivalList) {
    return;
  }

  upcomingFestivalList.innerHTML = "";

  if (!festival) {
    upcomingFestivalList.textContent = "暂无即将到来的节日。";
    return;
  }

  const title = document.createElement("h3");
  title.textContent =
    festival.daysLeft === 0
      ? `${festival.label} · 今天`
      : `${festival.label} · 还有 ${festival.daysLeft} 天`;
  upcomingFestivalList.append(title);

  for (const day of festival.importantDays || []) {
    const item = document.createElement("article");
    item.className = "upcoming-festival-item important";
    item.innerHTML = `
      <strong></strong>
      <span></span>
      <p></p>
    `;
    item.querySelector("strong").textContent = day.name;
    item.querySelector("span").textContent = day.calendarLabel;
    item.querySelector("p").textContent = "这一天对你们更重要，所以优先显示在节日前面。";
    upcomingFestivalList.append(item);
  }

  for (const itemData of festival.festivals || []) {
    const item = document.createElement("article");
    item.className = "upcoming-festival-item";
    item.innerHTML = `
      <strong></strong>
      <span></span>
      <p></p>
      <small></small>
    `;
    item.querySelector("strong").textContent = itemData.name;
    item.querySelector("span").textContent = itemData.calendarLabel;
    item.querySelector("p").textContent = itemData.intro;
    item.querySelector("small").textContent = itemData.note;
    upcomingFestivalList.append(item);
  }
}

function renderScheduleItems() {
  if (!scheduleList) {
    return;
  }

  scheduleList.innerHTML = "";

  if (!state.scheduleItems.length) {
    scheduleList.textContent = "还没有记录行程。";
    return;
  }

  const groups = new Map();
  for (const item of state.scheduleItems) {
    const group = groups.get(item.plannedDate) || [];
    group.push(item);
    groups.set(item.plannedDate, group);
  }

  for (const [date, items] of groups) {
    const section = document.createElement("section");
    section.className = "schedule-day";
    const title = document.createElement("h3");
    title.textContent = formatFoodDate(date);
    const list = document.createElement("div");
    list.className = "schedule-day-list";

    for (const item of items) {
      list.append(renderScheduleItem(item));
    }

    section.append(title, list);
    scheduleList.append(section);
  }
}

function renderScheduleItem(item) {
  const row = document.createElement("article");
  row.className = "schedule-item";
  row.dataset.scheduleId = item.id;
  row.innerHTML = `
    <div>
      <strong></strong>
      <span></span>
    </div>
    <button class="ghost danger-control" type="button">删除</button>
  `;
  row.querySelector("strong").textContent = item.content;
  row.querySelector("span").textContent = `${item.createdByName || "我们"} 添加`;
  row.querySelector("button").addEventListener("click", () => deleteScheduleItem(item));
  return row;
}

async function addScheduleItem(event) {
  event.preventDefault();
  const plannedDate = scheduleDateInput.value || todayInputValue();
  const content = scheduleContentInput.value.trim();

  if (!content) {
    return;
  }

  scheduleContentInput.value = "";

  try {
    const response = await api("/api/schedule-items", {
      method: "POST",
      body: JSON.stringify({ plannedDate, content }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "添加失败。");
    }
  } catch (error) {
    scheduleContentInput.value = content;
    statusText.textContent = error.message;
  }
}

async function deleteScheduleItem(item) {
  try {
    const response = await api(`/api/schedule-items/${item.id}`, {
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

function upsertScheduleItem(item) {
  const index = state.scheduleItems.findIndex((current) => String(current.id) === String(item.id));

  if (index >= 0) {
    state.scheduleItems[index] = item;
  } else {
    state.scheduleItems.push(item);
  }

  state.scheduleItems.sort((left, right) =>
    left.plannedDate === right.plannedDate
      ? Number(left.id) - Number(right.id)
      : left.plannedDate.localeCompare(right.plannedDate)
  );
  renderScheduleItems();
  renderUpcomingScheduleTicker();
}

function removeScheduleItem({ id }) {
  state.scheduleItems = state.scheduleItems.filter((item) => String(item.id) !== String(id));
  renderScheduleItems();
  renderUpcomingScheduleTicker();
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
    remoteVideo.volume = getRemotePlaybackVolume();
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
  if (isAndroidWebView()) {
    return getSimpleMediaConstraints(mode);
  }

  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: mode === "video" ? getPreferredVideoConstraints(currentCameraFacingMode) : false,
  };
}

function getSimpleMediaConstraints(mode) {
  return {
    audio: getPreferredAudioConstraints(),
    video: mode === "video" ? { facingMode: { ideal: currentCameraFacingMode } } : false,
  };
}

function isAndroidWebView() {
  return /Android/i.test(navigator.userAgent);
}

function getBasicMediaConstraints(mode) {
  return {
    audio: true,
    video: mode === "video" ? true : false,
  };
}

function getPreferredAudioConstraints() {
  return {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: !isAndroidWebView() },
  };
}

function getRemotePlaybackVolume() {
  return isAndroidWebView() ? 0.38 : 1;
}

function setNativeCallAudioActive(active) {
  try {
    window.PrivateChatNative?.setCallAudioActive?.(Boolean(active));
  } catch {}
}

function getPreferredVideoConstraints(facingMode = currentCameraFacingMode, exact = false) {
  const facingValue = exact ? { exact: facingMode } : { ideal: facingMode };
  const constraints = { facingMode: facingValue };

  if (!isAndroidWebView()) {
    constraints.width = { ideal: 640, max: 960 };
    constraints.height = { ideal: 360, max: 540 };
    constraints.frameRate = { ideal: 24, max: 30 };
  }

  return constraints;
}

async function acquireLocalStream(mode) {
  const constraints = getMediaConstraints(mode);

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    if (isAndroidWebView()) {
      return acquireAndroidLocalStream(mode, error);
    }
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireAndroidLocalStream(mode, initialError) {
  const candidates = [getSimpleMediaConstraints(mode), getBasicMediaConstraints(mode)];
  let lastError = initialError;

  for (let round = 0; round < 3; round += 1) {
    if (round > 0) {
      await delay(450);
    }

    for (const constraints of candidates) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError;
}

async function acquireCameraStream(facingMode) {
  const candidates = [
    { audio: false, video: getPreferredVideoConstraints(facingMode, true) },
    { audio: false, video: getPreferredVideoConstraints(facingMode) },
    { audio: false, video: true },
  ];
  let lastError = null;

  for (const constraints of candidates) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function updateSwitchCameraButtonVisibility() {
  const shouldShow = currentCallMode === "video" && !callEnded && Boolean(localStream?.getVideoTracks().length);
  switchCameraButton?.classList.toggle("hidden", !shouldShow);
}

function setLocalPreviewStream() {
  localVideo.muted = true;
  localVideo.volume = 0;

  const videoTracks = localStream?.getVideoTracks() || [];
  localVideo.srcObject = videoTracks.length ? new MediaStream(videoTracks) : null;
}

async function switchCamera() {
  if (currentCallMode !== "video" || callEnded || !localStream?.getVideoTracks().length) {
    return;
  }

  const nextFacingMode = currentCameraFacingMode === "user" ? "environment" : "user";
  switchCameraButton.disabled = true;

  try {
    const nextStream = await acquireCameraStream(nextFacingMode);
    const [nextTrack] = nextStream.getVideoTracks();

    if (!nextTrack) {
      throw new Error("No video track");
    }

    const oldVideoTracks = localStream.getVideoTracks();
    const sender = peerConnection?.getSenders().find((item) => item.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(nextTrack);
    } else if (peerConnection) {
      peerConnection.addTrack(nextTrack, localStream);
    }

    oldVideoTracks.forEach((track) => {
      localStream.removeTrack?.(track);
      track.stop();
    });
    localStream.addTrack(nextTrack);
    setLocalPreviewStream();
    currentCameraFacingMode = nextFacingMode;
    callStatus.textContent = "已切换镜头";
    setTimeout(() => {
      if (!callEnded && currentCallMode === "video") {
        callStatus.textContent = "视频通话中";
      }
    }, 900);
  } catch {
    callStatus.textContent = "当前设备没有可切换的后置镜头";
    setTimeout(() => {
      if (!callEnded && currentCallMode === "video") {
        callStatus.textContent = "视频通话中";
      }
    }, 1400);
  } finally {
    switchCameraButton.disabled = false;
    updateSwitchCameraButtonVisibility();
  }
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
  currentCameraFacingMode = "user";
  callStartedAt = null;
  callConnected = false;
  callEnded = false;
  pendingIceCandidates = [];
  callPanel.classList.remove("hidden");
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  setNativeCallAudioActive(true);
  updateSwitchCameraButtonVisibility();
  callStatus.textContent = mode === "video" ? "正在发起视频通话..." : "正在发起语音通话...";

  try {
    localStream = await acquireLocalStream(mode);
  } catch (error) {
    callStatus.textContent = getMediaErrorText(error, mode);
    setTimeout(() => endCall(false), 1400);
    return;
  }
  setLocalPreviewStream();
  updateSwitchCameraButtonVisibility();
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
  currentCameraFacingMode = "user";
  callStartedAt = null;
  callConnected = false;
  callEnded = false;
  pendingIceCandidates = [];
  pendingOffer = null;
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  setNativeCallAudioActive(true);
  updateSwitchCameraButtonVisibility();
  callStatus.textContent = mode === "video" ? "视频通话中" : "语音通话中";

  try {
    localStream = await acquireLocalStream(mode);
  } catch {
    localStream = null;
    callStatus.textContent = "本机无可用麦克风/摄像头，正在只接收对方声音和画面";
  }

  setLocalPreviewStream();
  updateSwitchCameraButtonVisibility();

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
  updateSwitchCameraButtonVisibility();
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
  stopRelayAudio();
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
    return;
  }
}

function stopRelayMedia() {
  clearInterval(relayVideoTimer);
  relayVideoTimer = null;
  stopRelayAudio();
}

function stopRelayAudio() {
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
  setNativeCallAudioActive(false);
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
  currentCameraFacingMode = "user";
  callConnected = false;
  acceptCallButton.classList.add("hidden");
  declineCallButton.classList.add("hidden");
  updateSwitchCameraButtonVisibility();
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

function createGomokuState(overrides = {}) {
  return {
    size: GOMOKU_SIZE,
    board: Array.from({ length: GOMOKU_SIZE }, () => Array(GOMOKU_SIZE).fill(null)),
    gameId: null,
    active: false,
    pendingIncoming: null,
    pendingOutgoing: false,
    pendingResetIncoming: null,
    pendingResetOutgoing: false,
    pendingUndoIncoming: null,
    pendingUndoOutgoing: false,
    myColor: null,
    current: "black",
    winner: null,
    draw: false,
    moves: [],
    opponentName: "对方",
    opponentInPanel: false,
    turnEndsAt: null,
    closeConfirmVisible: false,
    ...overrides,
  };
}

function ensureGomokuState() {
  if (!state.gomoku) {
    state.gomoku = createGomokuState();
  }

  return state.gomoku;
}

function openGamePanel() {
  const game = ensureGomokuState();
  game.closeConfirmVisible = false;
  gamePanel?.classList.remove("hidden");
  state.socket?.emit("game:panel-open", { gameId: game.gameId || "", game: "gomoku" });
  renderGomoku();
}

function closeGamePanel() {
  const game = ensureGomokuState();
  game.closeConfirmVisible = true;
  renderGomoku();
}

function cancelCloseGamePanel() {
  const game = ensureGomokuState();
  game.closeConfirmVisible = false;
  renderGomoku();
}

function confirmCloseGamePanel() {
  const game = ensureGomokuState();
  game.closeConfirmVisible = false;
  state.socket?.emit("game:panel-close", { gameId: game.gameId || "", game: "gomoku" });
  gamePanel?.classList.add("hidden");
}

function clearGomokuInviteTimer() {
  clearTimeout(gomokuInviteTimer);
  gomokuInviteTimer = null;
}

function clearGomokuTurnTimer() {
  clearInterval(gomokuTurnTimer);
  gomokuTurnTimer = null;
}

function setGomokuTurnDeadline(game = ensureGomokuState()) {
  clearGomokuTurnTimer();

  if (!game.active || game.winner || game.draw) {
    game.turnEndsAt = null;
    return;
  }

  game.turnEndsAt = Date.now() + GOMOKU_TURN_SECONDS * 1000;
  gomokuTurnTimer = setInterval(tickGomokuTurnTimer, 250);
}

function getGomokuTimeLeft(game) {
  if (!game.turnEndsAt) {
    return GOMOKU_TURN_SECONDS;
  }

  return Math.max(0, Math.ceil((game.turnEndsAt - Date.now()) / 1000));
}

function tickGomokuTurnTimer() {
  const game = ensureGomokuState();

  if (!game.active || game.winner || game.draw || !game.turnEndsAt) {
    clearGomokuTurnTimer();
    renderGomoku();
    return;
  }

  if (Date.now() < game.turnEndsAt) {
    updateGomokuStatus(getGomokuStatusText(game));
    return;
  }

  const loser = game.current;
  const winner = loser === "black" ? "white" : "black";
  game.winner = winner;
  game.turnEndsAt = null;
  clearGomokuTurnTimer();
  renderGomoku();

  state.socket?.emit("game:timeout", {
    gameId: game.gameId,
    loser,
    winner,
    game: "gomoku",
  });
}

function startGomokuInviteTimer(gameId) {
  clearGomokuInviteTimer();
  gomokuInviteTimer = setTimeout(() => {
    const game = ensureGomokuState();

    if (game.gameId !== gameId || !game.pendingOutgoing) {
      return;
    }

    state.gomoku = createGomokuState();
    renderGomoku();
    updateGomokuStatus("对方 5 秒内未应战，邀请已自动取消");
  }, 5000);
}

function gomokuColorName(color) {
  return color === "black" ? "黑棋" : "白棋";
}

function updateGomokuStatus(text) {
  if (gomokuStatus) {
    gomokuStatus.textContent = text;
  }
}

function renderGomokuBanter() {
  if (!gomokuBanterActions) {
    return;
  }

  const cooling = Date.now() < gomokuBanterCooldownUntil;
  gomokuBanterActions.innerHTML = "";
  for (const [type, group] of Object.entries(GOMOKU_BANTER)) {
    const section = document.createElement("div");
    section.className = "gomoku-banter-group";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ghost gomoku-banter-trigger";
    trigger.textContent = cooling ? "冷却中" : group.label;
    trigger.disabled = cooling;
    section.append(trigger);

    const menu = document.createElement("div");
    menu.className = "gomoku-banter-menu hidden";

    group.lines.forEach((line, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost";
      button.textContent = line;
      button.disabled = cooling;
      button.addEventListener("click", () => {
        menu.classList.add("hidden");
        sendGomokuBanter(type, line);
      });
      menu.append(button);
    });

    trigger.addEventListener("click", () => {
      if (cooling) {
        return;
      }

      gomokuBanterActions.querySelectorAll(".gomoku-banter-menu").forEach((currentMenu) => {
        if (currentMenu !== menu) {
          currentMenu.classList.add("hidden");
        }
      });
      menu.classList.toggle("hidden");
    });

    section.append(menu);
    gomokuBanterActions.append(section);
  }
}

function showGomokuBanterBubble({ from, text }) {
  const cleanText = String(text || "").trim();

  if (!cleanText || !gomokuBanterBubble) {
    return;
  }

  clearTimeout(gomokuBanterTimer);
  gomokuBanterBubble.className = `gomoku-banter-float ${from?.id === state.user?.id ? "mine" : "theirs"}`;
  gomokuBanterBubble.textContent = cleanText;
  gomokuBanterBubble.classList.remove("hidden");
  gomokuBanterTimer = setTimeout(() => {
    gomokuBanterBubble.classList.add("hidden");
  }, 4000);
}

function setGomokuBanterCooldown() {
  gomokuBanterCooldownUntil = Date.now() + 4000;
  renderGomokuBanter();
  setTimeout(renderGomokuBanter, 4100);
}

function sendGomokuBanter(type, text) {
  const game = ensureGomokuState();
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return;
  }

  if (Date.now() < gomokuBanterCooldownUntil) {
    showGomokuBanterBubble({ from: state.user, text: "等一下，话语冷却中" });
    return;
  }

  setGomokuBanterCooldown();
  showGomokuBanterBubble({ from: state.user, text: cleanText });
  state.socket?.emit("game:banter", {
    game: "gomoku",
    gameId: game.gameId || "",
    type,
    text: cleanText,
  });
}

function renderGomokuInviteControls(game) {
  if (
    !inviteGomokuButton ||
    !acceptGomokuButton ||
    !declineGomokuButton ||
    !resetGomokuButton ||
    !undoGomokuButton
  ) {
    return;
  }

  const hasChoice = Boolean(game.pendingIncoming || game.pendingResetIncoming || game.pendingUndoIncoming);
  inviteGomokuButton.classList.toggle("hidden", hasChoice || game.pendingOutgoing || game.active);
  acceptGomokuButton.classList.toggle("hidden", !hasChoice);
  declineGomokuButton.classList.toggle("hidden", !hasChoice);
  acceptGomokuButton.textContent = game.pendingResetIncoming ? "同意重开" : game.pendingUndoIncoming ? "同意悔棋" : "接受";
  declineGomokuButton.textContent = game.pendingResetIncoming ? "拒绝重开" : game.pendingUndoIncoming ? "拒绝悔棋" : "拒绝";
  resetGomokuButton.disabled =
    !game.active ||
    game.pendingResetOutgoing ||
    game.pendingResetIncoming ||
    game.pendingUndoOutgoing ||
    game.pendingUndoIncoming;
  undoGomokuButton.disabled =
    !game.active ||
    !canRequestGomokuUndo(game) ||
    game.winner ||
    game.draw ||
    game.pendingUndoOutgoing ||
    game.pendingUndoIncoming ||
    game.pendingResetOutgoing ||
    game.pendingResetIncoming;

  if (gomokuCloseConfirm) {
    gomokuCloseConfirm.classList.toggle("hidden", !game.closeConfirmVisible);
  }
}

function getLastGomokuMove(game) {
  return game.moves[game.moves.length - 1] || null;
}

function canRequestGomokuUndo(game) {
  const lastMove = getLastGomokuMove(game);
  return Boolean(lastMove && lastMove.color === game.myColor);
}

function getGomokuStatusText(game) {
  if (game.pendingIncoming) {
    return `${game.pendingIncoming.from.displayName || "对方"} 邀请你五子棋`;
  }

  if (game.pendingResetIncoming) {
    return `${game.pendingResetIncoming.from.displayName || "对方"} 请求重开，是否同意？`;
  }

  if (game.pendingUndoIncoming) {
    return `${game.pendingUndoIncoming.from.displayName || "对方"} 请求悔棋，是否同意？`;
  }

  if (game.pendingOutgoing) {
    return "已发送邀请，等待对方接受";
  }

  if (game.pendingResetOutgoing) {
    return "已发送重开申请，等待对方同意";
  }

  if (game.pendingUndoOutgoing) {
    return "已发送悔棋申请，等待对方同意";
  }

  if (!game.active) {
    return game.opponentInPanel ? "对方已在棋盘，点击邀请对战" : "点击邀请对方开始五子棋";
  }

  if (game.winner) {
    return `${gomokuColorName(game.winner)}赢了`;
  }

  if (game.draw) {
    return "平局";
  }

  const panelLabel = game.opponentInPanel ? "对方在棋盘" : "对方不在棋盘";
  const timeLabel = `剩余 ${getGomokuTimeLeft(game)} 秒`;
  return game.current === game.myColor
    ? `轮到你（${gomokuColorName(game.current)}） · ${timeLabel} · ${panelLabel}`
    : `轮到${game.opponentName}（${gomokuColorName(game.current)}） · ${timeLabel} · ${panelLabel}`;
}

function renderGomoku() {
  const game = ensureGomokuState();
  renderGomokuInviteControls(game);
  updateGomokuStatus(getGomokuStatusText(game));
  renderGomokuBanter();

  if (!gomokuBoard) {
    return;
  }

  gomokuBoard.innerHTML = "";

  for (let row = 0; row < game.size; row += 1) {
    for (let col = 0; col < game.size; col += 1) {
      const color = game.board[row][col];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `gomoku-cell ${color || ""}`;
      cell.setAttribute("aria-label", `${row + 1}行${col + 1}列${color ? gomokuColorName(color) : "空位"}`);
      cell.disabled = !canPlaceGomokuStone(game, row, col);
      cell.addEventListener("click", () => placeGomokuStone(row, col));
      if (color) {
        cell.append(document.createElement("span"));
      } else if (isGomokuStarPoint(row, col)) {
        const star = document.createElement("span");
        star.className = "gomoku-star";
        cell.append(star);
      }
      gomokuBoard.append(cell);
    }
  }
}

function isGomokuStarPoint(row, col) {
  return (
    (row === 3 && col === 3) ||
    (row === 3 && col === 11) ||
    (row === 7 && col === 7) ||
    (row === 11 && col === 3) ||
    (row === 11 && col === 11)
  );
}

function canPlaceGomokuStone(game, row, col) {
  return (
    game.active &&
    !game.winner &&
    !game.draw &&
    game.myColor === game.current &&
    !game.board[row]?.[col]
  );
}

function countGomokuLine(board, row, col, color, rowStep, colStep) {
  let count = 0;
  let nextRow = row + rowStep;
  let nextCol = col + colStep;

  while (board[nextRow]?.[nextCol] === color) {
    count += 1;
    nextRow += rowStep;
    nextCol += colStep;
  }

  return count;
}

function hasGomokuWinner(board, row, col, color) {
  return [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ].some(([rowStep, colStep]) => {
    const total =
      1 +
      countGomokuLine(board, row, col, color, rowStep, colStep) +
      countGomokuLine(board, row, col, color, -rowStep, -colStep);
    return total >= 5;
  });
}

function isGomokuBoardFull(board) {
  return board.every((row) => row.every(Boolean));
}

function applyGomokuMove({ row, col, color }) {
  const game = ensureGomokuState();

  if (!game.active || game.winner || game.draw || !["black", "white"].includes(color)) {
    return false;
  }

  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= game.size || col >= game.size) {
    return false;
  }

  if (game.board[row][col] || game.current !== color) {
    return false;
  }

  game.board[row][col] = color;
  game.moves.push({ row, col, color });
  if (hasGomokuWinner(game.board, row, col, color)) {
    game.winner = color;
    game.turnEndsAt = null;
    clearGomokuTurnTimer();
  } else if (isGomokuBoardFull(game.board)) {
    game.draw = true;
    game.turnEndsAt = null;
    clearGomokuTurnTimer();
  } else {
    game.current = color === "black" ? "white" : "black";
    setGomokuTurnDeadline(game);
  }

  renderGomoku();
  return true;
}

function placeGomokuStone(row, col) {
  const game = ensureGomokuState();

  if (!canPlaceGomokuStone(game, row, col)) {
    return;
  }

  const color = game.myColor;
  if (!applyGomokuMove({ row, col, color })) {
    return;
  }

  state.socket?.emit("game:move", {
    gameId: game.gameId,
    row,
    col,
    color,
  });
}

function inviteGomokuGame() {
  if (!state.socket?.connected) {
    updateGomokuStatus("实时连接未恢复，暂时不能邀请");
    return;
  }

  const gameId = `${Date.now()}-${state.user?.id || "gomoku"}`;
  state.gomoku = createGomokuState({
    gameId,
    pendingOutgoing: true,
    myColor: "black",
    opponentName: "对方",
  });
  gamePanel?.classList.remove("hidden");
  renderGomoku();
  state.socket.emit("game:invite", { gameId, game: "gomoku" });
  startGomokuInviteTimer(gameId);
}

function receiveGomokuInvite({ from, gameId }) {
  if (!gameId || from?.id === state.user?.id) {
    return;
  }

  clearGomokuInviteTimer();
  state.gomoku = createGomokuState({
    gameId,
    pendingIncoming: { from },
    myColor: "white",
    opponentName: from?.displayName || "对方",
  });
  gamePanel?.classList.remove("hidden");
  renderGomoku();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("碎碎念收件箱", {
      body: "收到五子棋对战邀请",
      tag: "private-chat-game",
    });
  }
}

function acceptGomokuInvite() {
  const game = ensureGomokuState();

  if (game.pendingResetIncoming) {
    acceptGomokuReset();
    return;
  }

  if (game.pendingUndoIncoming) {
    acceptGomokuUndo();
    return;
  }

  if (!game.pendingIncoming || !state.socket?.connected) {
    return;
  }

  game.active = true;
  clearGomokuInviteTimer();
  game.pendingIncoming = null;
  game.pendingOutgoing = false;
  game.current = "black";
  game.winner = null;
  game.draw = false;
  setGomokuTurnDeadline(game);
  state.socket.emit("game:accept", { gameId: game.gameId, game: "gomoku" });
  renderGomoku();
}

function declineGomokuInvite() {
  const game = ensureGomokuState();
  const gameId = game.gameId;

  if (game.pendingResetIncoming) {
    declineGomokuReset();
    return;
  }

  if (game.pendingUndoIncoming) {
    declineGomokuUndo();
    return;
  }

  clearGomokuInviteTimer();
  if (game.pendingIncoming && state.socket?.connected) {
    state.socket.emit("game:decline", { gameId, game: "gomoku" });
  }

  state.gomoku = createGomokuState();
  renderGomoku();
}

function receiveGomokuAccepted({ from, gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.pendingOutgoing) {
    return;
  }

  clearGomokuInviteTimer();
  game.active = true;
  game.pendingOutgoing = false;
  game.opponentName = from?.displayName || "对方";
  game.current = "black";
  game.winner = null;
  game.draw = false;
  setGomokuTurnDeadline(game);
  renderGomoku();
}

function receiveGomokuDeclined({ gameId }) {
  const game = ensureGomokuState();

  if (game.gameId !== gameId) {
    return;
  }

  clearGomokuInviteTimer();
  state.gomoku = createGomokuState();
  renderGomoku();
  updateGomokuStatus("对方已拒绝五子棋邀请");
}

function receiveGomokuMove(payload) {
  const game = ensureGomokuState();

  if (!payload?.gameId || payload.gameId !== game.gameId || payload.color === game.myColor) {
    return;
  }

  applyGomokuMove(payload);
}

function receiveGomokuPanelOpen({ from, gameId }) {
  if (from?.id === state.user?.id) {
    return;
  }

  const game = ensureGomokuState();
  if (gameId && game.gameId && gameId !== game.gameId) {
    return;
  }

  game.opponentInPanel = true;
  game.opponentName = from?.displayName || game.opponentName || "对方";
  renderGomoku();
}

function receiveGomokuPanelClose({ from, gameId }) {
  if (from?.id === state.user?.id) {
    return;
  }

  const game = ensureGomokuState();
  if (gameId && game.gameId && gameId !== game.gameId) {
    return;
  }

  game.opponentInPanel = false;
  renderGomoku();
}

function receiveGomokuTimeout({ gameId, loser, winner }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || game.winner || game.draw) {
    return;
  }

  if (!["black", "white"].includes(loser) || !["black", "white"].includes(winner)) {
    return;
  }

  game.winner = winner;
  game.turnEndsAt = null;
  clearGomokuTurnTimer();
  renderGomoku();
}

function receiveGomokuBanter({ from, gameId, text }) {
  const game = ensureGomokuState();

  if (gameId && game.gameId && gameId !== game.gameId) {
    return;
  }

  showGomokuBanterBubble({ from, text });
}

function requestGomokuReset() {
  const game = ensureGomokuState();

  if (!game.active || game.pendingUndoOutgoing || game.pendingUndoIncoming || game.pendingResetOutgoing || game.pendingResetIncoming) {
    return;
  }

  if (!state.socket?.connected) {
    updateGomokuStatus("实时连接未恢复，暂时不能申请重开");
    return;
  }

  game.pendingResetOutgoing = true;
  renderGomoku();
  state.socket.emit("game:reset-request", { gameId: game.gameId, game: "gomoku" });
}

function requestGomokuUndo() {
  const game = ensureGomokuState();

  if (
    !game.active ||
    !canRequestGomokuUndo(game) ||
    game.winner ||
    game.draw ||
    game.pendingUndoOutgoing ||
    game.pendingUndoIncoming ||
    game.pendingResetOutgoing ||
    game.pendingResetIncoming
  ) {
    return;
  }

  if (!state.socket?.connected) {
    updateGomokuStatus("实时连接未恢复，暂时不能申请悔棋");
    return;
  }

  game.pendingUndoOutgoing = true;
  renderGomoku();
  state.socket.emit("game:undo-request", { gameId: game.gameId, game: "gomoku" });
}

function undoLastGomokuMove() {
  const game = ensureGomokuState();
  const lastMove = game.moves.pop();

  if (!lastMove) {
    return;
  }

  game.board[lastMove.row][lastMove.col] = null;
  game.current = lastMove.color;
  game.winner = null;
  game.draw = false;
  game.pendingUndoIncoming = null;
  game.pendingUndoOutgoing = false;
  setGomokuTurnDeadline(game);
  renderGomoku();
}

function resetGomokuGame(myColor = null) {
  const current = ensureGomokuState();

  if (!current.active) {
    return;
  }

  state.gomoku = createGomokuState({
    gameId: current.gameId,
    active: true,
    myColor: myColor || current.myColor,
    opponentName: current.opponentName,
    opponentInPanel: current.opponentInPanel,
    current: "black",
  });

  setGomokuTurnDeadline(state.gomoku);
  renderGomoku();
}

function receiveGomokuResetRequest({ from, gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.active || from?.id === state.user?.id) {
    return;
  }

  game.pendingResetIncoming = { from };
  renderGomoku();
}

function receiveGomokuUndoRequest({ from, gameId }) {
  const game = ensureGomokuState();
  const lastMove = getLastGomokuMove(game);

  if (
    !gameId ||
    game.gameId !== gameId ||
    !game.active ||
    !lastMove ||
    lastMove.color !== (game.myColor === "black" ? "white" : "black") ||
    from?.id === state.user?.id
  ) {
    return;
  }

  game.pendingUndoIncoming = { from };
  renderGomoku();
}

function acceptGomokuReset() {
  const game = ensureGomokuState();

  if (!game.pendingResetIncoming || !state.socket?.connected) {
    return;
  }

  const gameId = game.gameId;
  game.pendingResetIncoming = null;
  state.socket.emit("game:reset-accept", { gameId, game: "gomoku" });
  resetGomokuGame("white");
}

function acceptGomokuUndo() {
  const game = ensureGomokuState();

  if (!game.pendingUndoIncoming || !state.socket?.connected) {
    return;
  }

  const gameId = game.gameId;
  game.pendingUndoIncoming = null;
  state.socket.emit("game:undo-accept", { gameId, game: "gomoku" });
  undoLastGomokuMove();
}

function declineGomokuReset() {
  const game = ensureGomokuState();

  if (game.pendingResetIncoming && state.socket?.connected) {
    state.socket.emit("game:reset-decline", { gameId: game.gameId, game: "gomoku" });
  }

  game.pendingResetIncoming = null;
  renderGomoku();
}

function declineGomokuUndo() {
  const game = ensureGomokuState();

  if (game.pendingUndoIncoming && state.socket?.connected) {
    state.socket.emit("game:undo-decline", { gameId: game.gameId, game: "gomoku" });
  }

  game.pendingUndoIncoming = null;
  renderGomoku();
}

function receiveGomokuResetAccepted({ gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.pendingResetOutgoing) {
    return;
  }

  resetGomokuGame("black");
}

function receiveGomokuUndoAccepted({ gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.pendingUndoOutgoing) {
    return;
  }

  undoLastGomokuMove();
}

function receiveGomokuResetDeclined({ gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.pendingResetOutgoing) {
    return;
  }

  game.pendingResetOutgoing = false;
  renderGomoku();
  updateGomokuStatus("对方拒绝重开，继续当前棋局");
}

function receiveGomokuUndoDeclined({ gameId }) {
  const game = ensureGomokuState();

  if (!gameId || game.gameId !== gameId || !game.pendingUndoOutgoing) {
    return;
  }

  game.pendingUndoOutgoing = false;
  renderGomoku();
  updateGomokuStatus("对方拒绝悔棋，继续当前棋局");
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
  syncSparseMessagesClass();
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

async function loadMessages(options = {}) {
  const { reset = true, scroll = true } = options;
  const response = await api("/api/messages");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "消息加载失败。");
  }

  if (reset) {
    messagesEl.innerHTML = "";
    state.renderedMessages.clear();
  }

  data.messages.forEach((message) => renderMessage(message, { scroll: reset ? scroll : false }));
  syncSparseMessagesClass();

  if (scroll) {
    settleMessagesAtBottom();
  }
}

async function refreshMessagesAfterResume(force = false) {
  if (!state.token || chatPanel.classList.contains("hidden")) {
    return;
  }

  const now = Date.now();
  if (!force && now - lastResumeRefreshAt < 1200) {
    return;
  }

  lastResumeRefreshAt = now;

  try {
    await loadMessages({ reset: false, scroll: true });
    statusText.textContent = state.socket?.connected ? "已同步最新消息" : "已同步最新消息，实时连接正在恢复";
    if (!state.socket?.connected) {
      connectSocket();
    }
  } catch {
    statusText.textContent = "消息同步失败，请稍后再试";
  }
}

function connectSocket() {
  state.socket?.disconnect();
  state.socket = io({ auth: { token: state.token } });

  state.socket.on("connect", () => {
    statusText.textContent = "已连接";
    refreshMessagesAfterResume();
  });

  state.socket.on("disconnect", () => {
    statusText.textContent = "连接已断开，正在重连...";
  });

  state.socket.on("connect_error", () => {
    statusText.textContent = "实时连接失败，文字消息仍可发送";
  });

  state.socket.on("presence", ({ online, users = [] }) => {
    const otherOnline = users.some((user) => user.id && user.id !== state.user?.id);
    state.otherOnline = otherOnline || online >= 2;
    statusText.textContent = otherOnline || online >= 2 ? "你们都在线" : "已连接，对方未在线";
    if (state.gomoku) {
      renderGomoku();
    }
  });

  state.socket.on("message:new", (message) => {
    renderMessage(message);
    notifyIncomingMessage(message);
  });
  state.socket.on("typing:start", ({ user }) => showTypingIndicator(user));
  state.socket.on("typing:stop", hideTypingIndicator);
  state.socket.on("message:recalled", replaceMessage);
  state.socket.on("message:deleted", ({ id }) => removeMessage(id));
  state.socket.on("messages:cleared", () => {
    messagesEl.innerHTML = "";
    state.renderedMessages.clear();
    syncSparseMessagesClass();
    statusText.textContent = "聊天记录已清空";
  });
  state.socket.on("food:created", upsertFoodItem);
  state.socket.on("food:updated", upsertFoodItem);
  state.socket.on("food:deleted", removeFoodItem);
  state.socket.on("food:dayDeleted", removeFoodDay);
  state.socket.on("schedule:created", upsertScheduleItem);
  state.socket.on("schedule:deleted", removeScheduleItem);
  state.socket.on("diary:saved", upsertDiaryEntry);
  state.socket.on("diary:deleted", ({ id }) => removeDiaryEntry(id));
  state.socket.on("game:invite", receiveGomokuInvite);
  state.socket.on("game:accept", receiveGomokuAccepted);
  state.socket.on("game:decline", receiveGomokuDeclined);
  state.socket.on("game:panel-open", receiveGomokuPanelOpen);
  state.socket.on("game:panel-close", receiveGomokuPanelClose);
  state.socket.on("game:move", receiveGomokuMove);
  state.socket.on("game:timeout", receiveGomokuTimeout);
  state.socket.on("game:banter", receiveGomokuBanter);
  state.socket.on("game:reset-request", receiveGomokuResetRequest);
  state.socket.on("game:reset-accept", receiveGomokuResetAccepted);
  state.socket.on("game:reset-decline", receiveGomokuResetDeclined);
  state.socket.on("game:undo-request", receiveGomokuUndoRequest);
  state.socket.on("game:undo-accept", receiveGomokuUndoAccepted);
  state.socket.on("game:undo-decline", receiveGomokuUndoDeclined);
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

function loadHeaderInfoInBackground() {
  Promise.allSettled([loadTodayInfo(), loadUpcomingSummaries()]).catch(() => {});
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
    statusText.textContent = "正在加载消息...";
    await loadMessages();
    lastResumeRefreshAt = Date.now();
    connectSocket();
    loadHeaderInfoInBackground();
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
  statusText.textContent = "正在加载消息...";
  await loadMessages();
  lastResumeRefreshAt = Date.now();
  connectSocket();
  loadHeaderInfoInBackground();
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
  resizeMessageInput();
  handleLocalTyping();
});

messageInput.addEventListener("focus", syncViewportSoon);
messageInput.addEventListener("blur", () => {
  stopLocalTyping();
  syncViewportSoon();
  settleMessagesAfterKeyboardClose();
});
foodDateInput?.addEventListener("focus", syncViewportSoon);
foodDateInput?.addEventListener("blur", syncViewportSoon);
foodNameInput?.addEventListener("focus", syncViewportSoon);
foodNameInput?.addEventListener("blur", syncViewportSoon);
scheduleDateInput?.addEventListener("focus", syncViewportSoon);
scheduleDateInput?.addEventListener("blur", syncViewportSoon);
scheduleContentInput?.addEventListener("focus", syncViewportSoon);
scheduleContentInput?.addEventListener("blur", syncViewportSoon);
messageSearchInput?.addEventListener("focus", syncViewportSoon);
messageSearchInput?.addEventListener("blur", syncViewportSoon);
diaryInput?.addEventListener("focus", syncViewportSoon);
diaryInput?.addEventListener("blur", syncViewportSoon);

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
  if (
    otherFeaturePanel &&
    !otherFeaturePanel.classList.contains("hidden") &&
    event.target === otherFeaturePanel
  ) {
    closeOtherFeaturePanel();
  }
  if (
    messageSearchPanel &&
    !messageSearchPanel.classList.contains("hidden") &&
    event.target === messageSearchPanel
  ) {
    closeMessageSearchPanel();
  }
  if (storagePanel && !storagePanel.classList.contains("hidden") && event.target === storagePanel) {
    closeStoragePanel();
  }
  if (
    passwordChangePanel &&
    !passwordChangePanel.classList.contains("hidden") &&
    event.target === passwordChangePanel
  ) {
    closePasswordChangePanel();
  }
  if (
    upcomingSchedulePanel &&
    !upcomingSchedulePanel.classList.contains("hidden") &&
    event.target === upcomingSchedulePanel
  ) {
    closeUpcomingSchedulePanel();
  }
  if (
    upcomingFestivalPanel &&
    !upcomingFestivalPanel.classList.contains("hidden") &&
    event.target === upcomingFestivalPanel
  ) {
    closeUpcomingFestivalPanel();
  }
  if (expressStatusPanel && !expressStatusPanel.classList.contains("hidden") && event.target === expressStatusPanel) {
    closeExpressStatusPanel();
  }
  if (weatherPanel && !weatherPanel.classList.contains("hidden") && event.target === weatherPanel) {
    closeWeatherPanel();
  }
  if (foodPanel && !foodPanel.classList.contains("hidden") && event.target === foodPanel) {
    closeFoodPanel();
  }
  if (schedulePanel && !schedulePanel.classList.contains("hidden") && event.target === schedulePanel) {
    closeSchedulePanel();
  }
  if (diaryPanel && !diaryPanel.classList.contains("hidden") && event.target === diaryPanel) {
    closeDiaryPanel();
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
switchCameraButton?.addEventListener("click", switchCamera);
endCallButton?.addEventListener("click", () => endCall(true));
messageSearchButton?.addEventListener("click", openMessageSearchPanel);
messageSearchForm?.addEventListener("submit", searchMessages);
closeMessageSearchButton?.addEventListener("click", closeMessageSearchPanel);
storageButton?.addEventListener("click", openStoragePanel);
closeStorageButton?.addEventListener("click", closeStoragePanel);
otherFeatureButton?.addEventListener("click", openOtherFeaturePanel);
closeOtherFeatureButton?.addEventListener("click", closeOtherFeaturePanel);
upcomingScheduleButton?.addEventListener("click", openUpcomingSchedulePanel);
closeUpcomingScheduleButton?.addEventListener("click", closeUpcomingSchedulePanel);
upcomingFestivalButton?.addEventListener("click", openUpcomingFestivalPanel);
closeUpcomingFestivalButton?.addEventListener("click", closeUpcomingFestivalPanel);
expressStatusButton?.addEventListener("click", openExpressStatusPanel);
closeExpressStatusButton?.addEventListener("click", closeExpressStatusPanel);
expressStatusOptions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-express-status]");
  if (!button) {
    return;
  }
  setExpressStatus(button.dataset.expressStatus === "yes");
});
importantDaysButton?.addEventListener("click", openImportantDaysPanel);
closeImportantDaysButton?.addEventListener("click", closeImportantDaysPanel);
foodButton?.addEventListener("click", () => {
  if (foodDateInput) {
    foodDateInput.value = todayInputValue();
  }
  openFoodPanel();
});
foodForm?.addEventListener("submit", addFoodItem);
closeFoodButton?.addEventListener("click", closeFoodPanel);
scheduleButton?.addEventListener("click", () => {
  if (scheduleDateInput) {
    scheduleDateInput.value = todayInputValue();
  }
  openSchedulePanel();
});
scheduleForm?.addEventListener("submit", addScheduleItem);
closeScheduleButton?.addEventListener("click", closeSchedulePanel);
todayBadge?.addEventListener("click", openWeatherPanel);
closeWeatherButton?.addEventListener("click", closeWeatherPanel);
diaryButton?.addEventListener("click", openDiaryPanel);
diaryForm?.addEventListener("submit", saveDiaryEntry);
closeDiaryButton?.addEventListener("click", closeDiaryPanel);
gameButton?.addEventListener("click", openGamePanel);
closeGameButton?.addEventListener("click", closeGamePanel);
cancelCloseGameButton?.addEventListener("click", cancelCloseGamePanel);
confirmCloseGameButton?.addEventListener("click", confirmCloseGamePanel);
inviteGomokuButton?.addEventListener("click", inviteGomokuGame);
acceptGomokuButton?.addEventListener("click", acceptGomokuInvite);
declineGomokuButton?.addEventListener("click", declineGomokuInvite);
undoGomokuButton?.addEventListener("click", requestGomokuUndo);
resetGomokuButton?.addEventListener("click", requestGomokuReset);
prevDiaryMonthButton?.addEventListener("click", () => {
  state.diaryVisibleMonth = shiftMonth(state.diaryVisibleMonth, -1);
  syncDiarySelectedDateToMonth();
  renderDiaryEntries();
});
nextDiaryMonthButton?.addEventListener("click", () => {
  state.diaryVisibleMonth = shiftMonth(state.diaryVisibleMonth, 1);
  syncDiarySelectedDateToMonth();
  renderDiaryEntries();
});
diaryYearSelect?.addEventListener("change", () => {
  setDiaryVisibleMonth(Number(diaryYearSelect.value), Number(diaryMonthSelect?.value || 1));
});
diaryMonthSelect?.addEventListener("change", () => {
  const [year] = state.diaryVisibleMonth.split("-").map((part) => Number(part));
  setDiaryVisibleMonth(Number(diaryYearSelect?.value || year), Number(diaryMonthSelect.value));
});
openPasswordChangeButton?.addEventListener("click", openPasswordChangePanel);
passwordChangeForm?.addEventListener("submit", changePassword);
closePasswordChangeButton?.addEventListener("click", closePasswordChangePanel);

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
    syncSparseMessagesClass();
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

  if (Number.isFinite(MAX_ATTACHMENT_BYTES) && file.size > MAX_ATTACHMENT_BYTES) {
    statusText.textContent = "附件太大了。";
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
loadExpressStatus();
setEmojiTab("emoji");
syncViewportHeight();
window.addEventListener("resize", syncViewportSoon);
document.addEventListener("focusin", syncViewportSoon);
document.addEventListener("focusout", syncViewportSoon);
document.addEventListener("gesturestart", (event) => event.preventDefault());
window.addEventListener("focus", () => refreshMessagesAfterResume());
window.addEventListener("pageshow", () => refreshMessagesAfterResume(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshMessagesAfterResume(true);
  }
});
window.visualViewport?.addEventListener("resize", syncViewportSoon);
window.visualViewport?.addEventListener("scroll", syncViewportSoon);
boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
