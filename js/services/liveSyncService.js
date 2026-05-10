import { getAccessToken, getApiBaseUrl } from "./apiClient.js";
import { loadConversations } from "./messageService.js";
import { loadNotifications } from "./notificationService.js";
import { loadFeedPosts } from "./postService.js";

const LIVE_SYNC_INTERVAL_MS = 15000;
const REALTIME_RECONNECT_DELAY_MS = 3000;

let activeUserId = "";
let syncTimerId = null;
let syncInFlight = false;
let listenersBound = false;
let realtimeSocket = null;
let realtimeReconnectTimerId = null;
let pendingSyncRequest = null;
const realtimeMessageListeners = new Set();
let liveSyncOptions = {
  includePosts: false
};

function clearSyncTimer() {
  if (syncTimerId) {
    window.clearTimeout(syncTimerId);
    syncTimerId = null;
  }
}

function clearRealtimeReconnectTimer() {
  if (realtimeReconnectTimerId) {
    window.clearTimeout(realtimeReconnectTimerId);
    realtimeReconnectTimerId = null;
  }
}

function shouldSkipSync() {
  if (!activeUserId) {
    return true;
  }

  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  return false;
}

function normalizeSyncRequest(options = {}) {
  return {
    includeConversations: options.includeConversations !== false,
    includeNotifications: options.includeNotifications !== false,
    includePosts:
      options.includePosts === true ||
      (options.includePosts === undefined && liveSyncOptions.includePosts === true)
  };
}

function mergeSyncRequests(baseRequest, nextRequest) {
  if (!baseRequest) {
    return nextRequest;
  }

  return {
    includeConversations:
      baseRequest.includeConversations || nextRequest.includeConversations,
    includeNotifications:
      baseRequest.includeNotifications || nextRequest.includeNotifications,
    includePosts: baseRequest.includePosts || nextRequest.includePosts
  };
}

async function runSync(options = {}) {
  const syncRequest = normalizeSyncRequest(options);

  if (syncInFlight || shouldSkipSync()) {
    pendingSyncRequest = mergeSyncRequests(pendingSyncRequest, syncRequest);
    return;
  }

  syncInFlight = true;

  try {
    const tasks = [];

    if (syncRequest.includeConversations) {
      tasks.push(
        loadConversations({
          currentUserId: activeUserId,
          force: true
        })
      );
    }

    if (syncRequest.includeNotifications) {
      tasks.push(
        loadNotifications({
          currentUserId: activeUserId,
          force: true
        })
      );
    }

    if (syncRequest.includePosts) {
      tasks.push(loadFeedPosts());
    }

    await Promise.all(tasks);
  } catch {
    // Keep polling quietly; views already surface direct load failures when needed.
  } finally {
    syncInFlight = false;

    if (pendingSyncRequest && !shouldSkipSync()) {
      const nextSyncRequest = pendingSyncRequest;
      pendingSyncRequest = null;
      void runSync(nextSyncRequest);
    }
  }
}

function scheduleNextSync() {
  clearSyncTimer();

  if (!activeUserId) {
    return;
  }

  syncTimerId = window.setTimeout(async () => {
    await runSync();
    scheduleNextSync();
  }, LIVE_SYNC_INTERVAL_MS);
}

function createRealtimeSocketUrl() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return "";
  }

  const apiBaseUrl = getApiBaseUrl();

  try {
    const browserOrigin =
      typeof window !== "undefined" &&
      window.location &&
      (window.location.protocol === "http:" || window.location.protocol === "https:")
        ? window.location.origin
        : "http://127.0.0.1";
    const realtimeUrl = new URL(apiBaseUrl, browserOrigin);
    realtimeUrl.protocol = realtimeUrl.protocol === "https:" ? "wss:" : "ws:";
    realtimeUrl.pathname = `${realtimeUrl.pathname.replace(/\/+$/, "")}/realtime`;
    realtimeUrl.search = new URLSearchParams({
      access_token: accessToken
    }).toString();
    return realtimeUrl.toString();
  } catch {
    return "";
  }
}

function closeRealtimeSocket() {
  if (!realtimeSocket) {
    return;
  }

  const socketToClose = realtimeSocket;
  realtimeSocket = null;

  try {
    socketToClose.close();
  } catch {
    // Ignore socket close failures during shutdown or reconnect.
  }
}

function scheduleRealtimeReconnect() {
  if (!activeUserId) {
    return;
  }

  clearRealtimeReconnectTimer();
  realtimeReconnectTimerId = window.setTimeout(() => {
    connectRealtimeSocket();
  }, REALTIME_RECONNECT_DELAY_MS);
}

function handleRealtimeEvent(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  realtimeMessageListeners.forEach((listener) => {
    try {
      if (listener.matches(payload.type)) {
        listener.callback(payload);
      }
    } catch {
      // Keep one feature listener from breaking realtime sync.
    }
  });

  if (payload.type === "conversations.updated") {
    void runSync({
      includeConversations: true,
      includeNotifications: false,
      includePosts: false
    });
    return;
  }

  if (payload.type === "notifications.updated") {
    void runSync({
      includeConversations: false,
      includeNotifications: true,
      includePosts: false
    });
    return;
  }

  if (payload.type === "posts.updated" && liveSyncOptions.includePosts) {
    void runSync({
      includeConversations: false,
      includeNotifications: false,
      includePosts: true
    });
  }
}

function createMessageMatcher(pattern) {
  const normalizedPattern = typeof pattern === "string" ? pattern.trim() : "";

  if (!normalizedPattern || normalizedPattern === "*") {
    return () => true;
  }

  if (normalizedPattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return (type) => typeof type === "string" && type.startsWith(prefix);
  }

  return (type) => type === normalizedPattern;
}

function connectRealtimeSocket() {
  if (
    !activeUserId ||
    typeof window === "undefined" ||
    typeof window.WebSocket === "undefined"
  ) {
    return;
  }

  if (
    realtimeSocket &&
    (realtimeSocket.readyState === window.WebSocket.OPEN ||
      realtimeSocket.readyState === window.WebSocket.CONNECTING)
  ) {
    return;
  }

  const realtimeUrl = createRealtimeSocketUrl();

  if (!realtimeUrl) {
    return;
  }

  clearRealtimeReconnectTimer();
  const socket = new window.WebSocket(realtimeUrl);
  realtimeSocket = socket;

  socket.addEventListener("open", () => {
    if (realtimeSocket !== socket) {
      return;
    }

    void runSync();
  });

  socket.addEventListener("message", (event) => {
    if (realtimeSocket !== socket || typeof event.data !== "string") {
      return;
    }

    try {
      handleRealtimeEvent(JSON.parse(event.data));
    } catch {
      // Ignore malformed realtime payloads and keep the connection open.
    }
  });

  socket.addEventListener("close", () => {
    if (realtimeSocket === socket) {
      realtimeSocket = null;
    }

    scheduleRealtimeReconnect();
  });

  socket.addEventListener("error", () => {
    if (realtimeSocket === socket) {
      realtimeSocket = null;
    }

    try {
      socket.close();
    } catch {
      // Ignore socket close failures after transport errors.
    }

    scheduleRealtimeReconnect();
  });
}

function handleWake() {
  if (!activeUserId) {
    return;
  }

  connectRealtimeSocket();
  void runSync();
  scheduleNextSync();
}

function bindGlobalListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }

  listenersBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleWake();
      return;
    }

    clearSyncTimer();
  });

  window.addEventListener("focus", handleWake);
  window.addEventListener("online", handleWake);
}

export function startLiveSync(userId) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";

  if (!safeUserId) {
    stopLiveSync();
    return;
  }

  bindGlobalListeners();
  activeUserId = safeUserId;
  pendingSyncRequest = null;
  connectRealtimeSocket();
  scheduleNextSync();
}

export function setLiveSyncOptions(options = {}) {
  liveSyncOptions = {
    ...liveSyncOptions,
    ...(typeof options.includePosts === "boolean"
      ? { includePosts: options.includePosts }
      : {})
  };
}

export function registerMessageListener(pattern, callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  const listener = {
    matches: createMessageMatcher(pattern),
    callback
  };
  realtimeMessageListeners.add(listener);

  return () => {
    realtimeMessageListeners.delete(listener);
  };
}

export function broadcast(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (!realtimeSocket || realtimeSocket.readyState !== window.WebSocket.OPEN) {
    return false;
  }

  try {
    realtimeSocket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function stopLiveSync() {
  activeUserId = "";
  syncInFlight = false;
  pendingSyncRequest = null;
  clearSyncTimer();
  clearRealtimeReconnectTimer();
  closeRealtimeSocket();
  liveSyncOptions = {
    includePosts: false
  };
}
