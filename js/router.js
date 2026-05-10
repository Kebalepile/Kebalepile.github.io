import {
  getAuthenticatedUser,
  logoutUser,
  resolveAuthenticatedUser
} from "./services/authService.js";
import { renderLogin } from "./views/loginView.js";
import { renderRegister } from "./views/registerView.js";
import { renderPublicInfo } from "./views/publicInfoView.js";
import { renderFeed } from "./views/feedView.js";
import { renderProfile } from "./views/profileView.js";
import { renderCreatePost } from "./views/createPostView.js";
import { renderEditPost } from "./views/editPostView.js";
import { renderSearch } from "./views/searchView.js";
import { renderMessages } from "./views/messagesView.js";
import { renderLiveStreamBroadcaster } from "./views/liveStreamBroadcasterView.js";
import { renderLiveStreamsDiscovery } from "./views/liveStreamsDiscoveryView.js";
import { renderLiveStreamViewer } from "./views/liveStreamViewerView.js";
import { ensureConversationsLoaded } from "./services/messageService.js";
import { loadNotifications } from "./services/notificationService.js";
import { loadReports } from "./services/reportService.js";
import { startLiveSync, stopLiveSync } from "./services/liveSyncService.js";
import { liveStreamManager } from "./services/liveStreamService.js";
import { showLoadingOverlay } from "./components/loadingOverlay.js";
import { storage } from "./storage/storage.js";
import { STORAGE_KEYS } from "./config/storageKeys.js";
import {
  resolvePublicInfoOrigin,
  resolvePublicInfoPageKey
} from "./config/publicInfoPages.js";
import { SHARE_FEED_COMMENT_PARAM, SHARE_FEED_POST_PARAM } from "./utils/share.js";

const ROUTER_HISTORY_APP_ID = "yahneh";
const SHARE_LIVE_STREAM_PARAM = "liveStream";
const ROUTE_TRANSITION_OVERLAY_NAMES = new Set(["public-info"]);
const RESTORABLE_ROUTE_NAMES = new Set([
  "feed",
  "profile",
  "create-post",
  "edit-post",
  "search",
  "messages",
  "livestream-broadcast",
  "livestream-discover",
  "livestream-viewer"
]);
const PERSISTABLE_ROUTE_NAMES = new Set([
  "feed",
  "profile",
  "search",
  "livestream-discover"
]);

let viewCleanupFns = [];
let currentRouteState = null;
let popstateBound = false;

function getAppRoot() {
  return document.getElementById("app");
}

function cleanupCurrentView() {
  const pendingCleanupFns = viewCleanupFns;
  viewCleanupFns = [];

  pendingCleanupFns.forEach((cleanup) => {
    try {
      cleanup();
    } catch {
      // Ignore cleanup errors so route transitions still complete.
    }
  });
}

function clonePayload(payload) {
  if (payload === null || typeof payload === "undefined") {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return null;
  }
}

function sanitizeProfilePayload(payload) {
  const nextPayload = {};

  if (payload?.section === "followers" || payload?.section === "following") {
    nextPayload.section = payload.section;
  }

  if (payload?.editMode === true) {
    nextPayload.editMode = true;
  }

  return Object.keys(nextPayload).length > 0 ? nextPayload : null;
}

function sanitizeSearchPayload(payload) {
  const nextPayload = {};

  if (typeof payload?.query === "string") {
    nextPayload.query = payload.query;
  }

  if (payload?.mode === "users" || payload?.mode === "posts") {
    nextPayload.mode = payload.mode;
  }

  if (typeof payload?.authorUserId === "string" && payload.authorUserId.trim()) {
    nextPayload.authorUserId = payload.authorUserId.trim();
  }

  if (typeof payload?.authorUsername === "string" && payload.authorUsername.trim()) {
    nextPayload.authorUsername = payload.authorUsername.trim();
  }

  return Object.keys(nextPayload).length > 0 ? nextPayload : null;
}

function sanitizeFeedPayload(payload) {
  const safePostId = typeof payload?.postId === "string" ? payload.postId.trim() : "";
  const safeFocusCommentId =
    typeof payload?.focusCommentId === "string" ? payload.focusCommentId.trim() : "";

  if (!safePostId) {
    return null;
  }

  const nextPayload = {
    postId: safePostId
  };

  if (safeFocusCommentId) {
    nextPayload.focusCommentId = safeFocusCommentId;
  }

  return nextPayload;
}

function sanitizeMessagesPayload(payload) {
  const nextPayload = {};

  if (typeof payload?.conversationId === "string" && payload.conversationId.trim()) {
    nextPayload.conversationId = payload.conversationId.trim();
  }

  if (typeof payload?.userId === "string" && payload.userId.trim()) {
    nextPayload.userId = payload.userId.trim();
  }

  if (typeof payload?.editingMessageId === "string" && payload.editingMessageId.trim()) {
    nextPayload.editingMessageId = payload.editingMessageId.trim();
  }

  return Object.keys(nextPayload).length > 0 ? nextPayload : null;
}

function sanitizeEditPostPayload(payload) {
  if (typeof payload?.postId === "string" && payload.postId.trim()) {
    return {
      postId: payload.postId.trim()
    };
  }

  return null;
}

function sanitizeLiveStreamViewerPayload(payload) {
  if (typeof payload?.streamId === "string" && payload.streamId.trim()) {
    return {
      streamId: payload.streamId.trim()
    };
  }

  return null;
}

function sanitizePublicInfoPayload(payload) {
  return {
    page: resolvePublicInfoPageKey(payload?.page),
    origin: resolvePublicInfoOrigin(payload?.origin)
  };
}

function normalizeRouteState(routeName, payload = null) {
  switch (routeName) {
    case "login":
    case "register":
    case "create-post":
    case "livestream-broadcast":
    case "livestream-discover":
      return {
        routeName,
        payload: null
      };
    case "livestream-viewer":
      return {
        routeName,
        payload: sanitizeLiveStreamViewerPayload(payload)
      };
    case "feed":
      return {
        routeName,
        payload: sanitizeFeedPayload(payload)
      };
    case "profile":
      return {
        routeName,
        payload: sanitizeProfilePayload(payload)
      };
    case "search":
      return {
        routeName,
        payload: sanitizeSearchPayload(payload)
      };
    case "messages":
      return {
        routeName,
        payload: sanitizeMessagesPayload(payload)
      };
    case "edit-post":
      return {
        routeName,
        payload: sanitizeEditPostPayload(payload)
      };
    case "public-info":
      return {
        routeName,
        payload: sanitizePublicInfoPayload(payload)
      };
    default:
      return null;
  }
}

function routeStatesEqual(firstState, secondState) {
  if (!firstState || !secondState) {
    return false;
  }

  return JSON.stringify(firstState) === JSON.stringify(secondState);
}

function readPersistedRouteState() {
  const storedState = storage.get(STORAGE_KEYS.LAST_ROUTE, null);

  if (!storedState || typeof storedState !== "object") {
    return null;
  }

  const routeState = normalizeRouteState(storedState.routeName, storedState.payload);

  return routeState && PERSISTABLE_ROUTE_NAMES.has(routeState.routeName) ? routeState : null;
}

function persistRouteState(routeState) {
  if (routeState && PERSISTABLE_ROUTE_NAMES.has(routeState.routeName)) {
    storage.set(STORAGE_KEYS.LAST_ROUTE, routeState);
    return;
  }

  storage.remove(STORAGE_KEYS.LAST_ROUTE);
}

function readHistoryRouteState() {
  if (typeof window === "undefined") {
    return null;
  }

  const state = window.history?.state;

  if (!state || state.app !== ROUTER_HISTORY_APP_ID) {
    return null;
  }

  return normalizeRouteState(state.routeName, state.payload);
}

function normalizeAuthenticatedRouteState(routeState, { allowTemporary = false } = {}) {
  if (!routeState || !RESTORABLE_ROUTE_NAMES.has(routeState.routeName)) {
    return null;
  }

  if (!allowTemporary && !PERSISTABLE_ROUTE_NAMES.has(routeState.routeName)) {
    return null;
  }

  return routeState;
}

function readUrlRouteState() {
  if (typeof window === "undefined" || !window.location) {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const postId = typeof url.searchParams.get(SHARE_FEED_POST_PARAM) === "string"
      ? url.searchParams.get(SHARE_FEED_POST_PARAM).trim()
      : "";
    const focusCommentId =
      typeof url.searchParams.get(SHARE_FEED_COMMENT_PARAM) === "string"
        ? url.searchParams.get(SHARE_FEED_COMMENT_PARAM).trim()
        : "";
    const liveStreamId =
      typeof url.searchParams.get(SHARE_LIVE_STREAM_PARAM) === "string"
        ? url.searchParams.get(SHARE_LIVE_STREAM_PARAM).trim()
        : "";

    if (liveStreamId) {
      return normalizeRouteState("livestream-viewer", {
        streamId: liveStreamId
      });
    }

    if (!postId) {
      return null;
    }

    return normalizeRouteState("feed", {
      postId,
      focusCommentId
    });
  } catch {
    return null;
  }
}

function buildRouteHref(routeState) {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(SHARE_FEED_POST_PARAM);
    url.searchParams.delete(SHARE_FEED_COMMENT_PARAM);
    url.searchParams.delete(SHARE_LIVE_STREAM_PARAM);

    if (routeState?.routeName === "feed" && routeState.payload?.postId) {
      url.searchParams.set(SHARE_FEED_POST_PARAM, routeState.payload.postId);

      if (routeState.payload.focusCommentId) {
        url.searchParams.set(SHARE_FEED_COMMENT_PARAM, routeState.payload.focusCommentId);
      }
    }

    if (routeState?.routeName === "livestream-viewer" && routeState.payload?.streamId) {
      url.searchParams.set(SHARE_LIVE_STREAM_PARAM, routeState.payload.streamId);
    }

    return url.toString();
  } catch {
    return window.location.href;
  }
}

function getRouteTransitionLabel(routeName) {
  switch (routeName) {
    case "public-info":
      return "Opening page...";
    default:
      return "Loading...";
  }
}

export function getPreferredAuthenticatedRouteState() {
  return (
    normalizeAuthenticatedRouteState(readUrlRouteState(), { allowTemporary: true }) ||
    normalizeAuthenticatedRouteState(readPersistedRouteState()) ||
    normalizeAuthenticatedRouteState(readHistoryRouteState()) ||
    normalizeRouteState("feed", null)
  );
}

export async function navigateAfterAuthentication(options = {}) {
  storage.remove(STORAGE_KEYS.LAST_ROUTE);
  const safeRouteState = normalizeRouteState("feed", null);

  return navigate(safeRouteState.routeName, safeRouteState.payload, options);
}

function syncHistoryState(routeState, mode = "push") {
  if (typeof window === "undefined" || !window.history || !routeState) {
    return;
  }

  const historyState = {
    app: ROUTER_HISTORY_APP_ID,
    routeName: routeState.routeName,
    payload: clonePayload(routeState.payload)
  };
  const href = buildRouteHref(routeState) || window.location.href;

  if (mode === "replace") {
    window.history.replaceState(historyState, "", href);
    return;
  }

  if (mode === "push") {
    window.history.pushState(historyState, "", href);
  }
}

function bindPopstateHandler() {
  if (popstateBound || typeof window === "undefined") {
    return;
  }

  window.addEventListener("popstate", (event) => {
    const nextRouteState =
      event.state?.app === ROUTER_HISTORY_APP_ID
        ? normalizeRouteState(event.state.routeName, event.state.payload)
        : null;

    if (!nextRouteState) {
      return;
    }

    void navigate(nextRouteState.routeName, nextRouteState.payload, {
      historyMode: "replace"
    });
  });

  popstateBound = true;
}

export function registerViewCleanup(cleanup) {
  if (typeof cleanup !== "function") {
    return () => {};
  }

  let active = true;
  const wrappedCleanup = () => {
    if (!active) {
      return;
    }

    active = false;

    try {
      cleanup();
    } catch {
      // Ignore cleanup errors triggered manually.
    }
  };

  viewCleanupFns.push(wrappedCleanup);

  return () => {
    viewCleanupFns = viewCleanupFns.filter((entry) => entry !== wrappedCleanup);
    wrappedCleanup();
  };
}

async function requireAuth(app, renderFn, payload) {
  const currentUser = await resolveAuthenticatedUser();

  if (!currentUser) {
    stopLiveSync();
    renderLogin(app);
    return false;
  }

  startLiveSync(currentUser.id);

  try {
    await Promise.all([
      ensureConversationsLoaded(currentUser.id),
      loadReports({
        currentUserId: currentUser.id,
        force: true
      }),
      loadNotifications({
        currentUserId: currentUser.id,
        force: true
      })
    ]);
  } catch {
    // Keep rendering the current screen even if preload fails.
  }

  const renderResult = await renderFn(app, currentUser, payload);
  return renderResult ?? true;
}

export async function navigate(routeName, payload = null, options = {}) {
  const app = getAppRoot();

  if (!app) {
    return;
  }

  bindPopstateHandler();

  const normalizedRouteState =
    normalizeRouteState(routeName, payload) || normalizeRouteState("feed", null);
  const {
    historyMode = "push",
    skipTransition = false,
    transitionLabel = ""
  } = options;
  const isSameRouteName = currentRouteState?.routeName === normalizedRouteState.routeName;
  const shouldShowTransition =
    skipTransition !== true &&
    normalizedRouteState.routeName !== "login" &&
    normalizedRouteState.routeName !== "register" &&
    !isSameRouteName &&
    ROUTE_TRANSITION_OVERLAY_NAMES.has(normalizedRouteState.routeName);
  const overlay = shouldShowTransition
    ? showLoadingOverlay({
        label: transitionLabel || getRouteTransitionLabel(normalizedRouteState.routeName)
      })
    : null;

  cleanupCurrentView();

  let routeHandled = true;

  try {
    switch (normalizedRouteState.routeName) {
      case "login":
        stopLiveSync();
        renderLogin(app);
        break;
      case "register":
        stopLiveSync();
        renderRegister(app);
        break;
      case "public-info":
        stopLiveSync();
        renderPublicInfo(app, normalizedRouteState.payload);
        break;
      case "feed":
        routeHandled = await requireAuth(app, renderFeed, normalizedRouteState.payload);
        break;
      case "profile":
        routeHandled = await requireAuth(app, renderProfile, normalizedRouteState.payload);
        break;
      case "create-post":
        routeHandled = await requireAuth(app, renderCreatePost, normalizedRouteState.payload);
        break;
      case "edit-post":
        routeHandled = await requireAuth(app, renderEditPost, normalizedRouteState.payload);
        break;
      case "search":
        routeHandled = await requireAuth(app, renderSearch, normalizedRouteState.payload);
        break;
      case "messages":
        routeHandled = await requireAuth(app, renderMessages, normalizedRouteState.payload);
        break;
      case "livestream-broadcast":
        routeHandled = await requireAuth(app, renderLiveStreamBroadcaster, normalizedRouteState.payload);
        break;
      case "livestream-discover":
        routeHandled = await requireAuth(app, renderLiveStreamsDiscovery, normalizedRouteState.payload);
        break;
      case "livestream-viewer":
        routeHandled = await requireAuth(app, renderLiveStreamViewer, normalizedRouteState.payload);
        break;
      default:
        stopLiveSync();
        renderLogin(app);
        routeHandled = false;
    }

    const redirectedRouteState =
      routeHandled && typeof routeHandled === "object"
        ? normalizeRouteState(routeHandled.routeName, routeHandled.payload)
        : null;
    const nextRouteState =
      redirectedRouteState ||
      (routeHandled === false && normalizedRouteState.routeName !== "login"
        ? normalizeRouteState("login", null)
        : normalizedRouteState);
    const previousRouteState = currentRouteState;

    currentRouteState = nextRouteState;
    persistRouteState(nextRouteState);

    if (historyMode !== "none" && nextRouteState) {
      const nextHistoryMode =
        historyMode === "push" && routeStatesEqual(previousRouteState, nextRouteState)
          ? "replace"
          : historyMode;
      syncHistoryState(nextRouteState, nextHistoryMode);
    }
  } finally {
    overlay?.close();
  }
}

export async function initRouter() {
  bindPopstateHandler();
  const urlRouteState = readUrlRouteState();

  const currentUser = getAuthenticatedUser() || (await resolveAuthenticatedUser());

  if (currentUser) {
    const restoredRouteState = getPreferredAuthenticatedRouteState();

    try {
      await navigate(restoredRouteState.routeName, restoredRouteState.payload, {
        historyMode: "replace"
      });
    } catch {
      await navigate("feed", null, {
        historyMode: "replace"
      });
    }

    return;
  }

  if (urlRouteState) {
    persistRouteState(urlRouteState);
  } else {
    storage.remove(STORAGE_KEYS.LAST_ROUTE);
  }
  await navigate("login", null, {
    historyMode: "replace",
    skipTransition: true
  });
}

async function endActiveLiveStreamBeforeLogout() {
  try {
    if (liveStreamManager.isBroadcaster && liveStreamManager.streamId) {
      await liveStreamManager.endBroadcast();
      return;
    }

    const activeStream = await liveStreamManager.getMyActiveStream();

    if (activeStream?.id) {
      await liveStreamManager.endStream(activeStream.id);
    }
  } catch {
    // Logout should still clear the local session if ending the stream fails.
  } finally {
    liveStreamManager.cleanup();
  }
}

export async function handleLogout() {
  await endActiveLiveStreamBeforeLogout();
  logoutUser();
  storage.remove(STORAGE_KEYS.LAST_ROUTE);
  void navigate("login", null, {
    historyMode: "replace",
    skipTransition: true
  });
}
