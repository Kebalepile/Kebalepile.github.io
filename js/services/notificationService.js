import { storage } from "../storage/storage.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { apiRequest } from "./apiClient.js";
import { getHiddenTargetIdsForUser } from "./reportService.js";
import { upsertUsers } from "./userService.js";

const APP_ICON_VERSION = "20260508-3";
const appNotificationIconUrl = new URL(
  `../../assets/logo/yahneh-pwa-circle-192.png?v=${APP_ICON_VERSION}`,
  import.meta.url
).href;

let notificationOpenHandler = null;
const loadedNotificationUserIds = new Set();
const notificationListeners = new Set();
let notificationStateVersion = 0;

function createQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeNotificationRecord(notification = {}) {
  return {
    id: typeof notification.id === "string" && notification.id ? notification.id : crypto.randomUUID(),
    userId: typeof notification.userId === "string" ? notification.userId : "",
    type: typeof notification.type === "string" ? notification.type : "system",
    actorUserId: typeof notification.actorUserId === "string" ? notification.actorUserId : "",
    postId: typeof notification.postId === "string" ? notification.postId : "",
    commentId: typeof notification.commentId === "string" ? notification.commentId : "",
    conversationId:
      typeof notification.conversationId === "string" ? notification.conversationId : "",
    messageId: typeof notification.messageId === "string" ? notification.messageId : "",
    title: typeof notification.title === "string" ? notification.title : "",
    text: typeof notification.text === "string" ? notification.text : "",
    createdAt:
      typeof notification.createdAt === "string" && notification.createdAt
        ? notification.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof notification.updatedAt === "string" && notification.updatedAt
        ? notification.updatedAt
        : null,
    read: notification.read === true
  };
}

function normalizeNotifications(notifications) {
  return Array.isArray(notifications)
    ? notifications.map(normalizeNotificationRecord)
    : [];
}

function emitNotificationChange(notifications) {
  notificationListeners.forEach((listener) => {
    try {
      listener(notifications);
    } catch {
      // Ignore listener errors so storage updates continue.
    }
  });
}

function getCurrentUserId() {
  const currentUser = storage.get(STORAGE_KEYS.CURRENT_USER, null);
  return typeof currentUser?.id === "string" ? currentUser.id : "";
}

function getActiveVisibleConversationId() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return "";
  }

  const routeState = storage.get(STORAGE_KEYS.LAST_ROUTE, null);

  if (routeState?.routeName !== "messages") {
    return "";
  }

  return typeof routeState?.payload?.conversationId === "string"
    ? routeState.payload.conversationId.trim()
    : "";
}

function findNotificationUser(userId) {
  if (!userId) {
    return null;
  }

  const users = storage.get(STORAGE_KEYS.USERS, []);

  if (!Array.isArray(users)) {
    return null;
  }

  return users.find((user) => user?.id === userId) || null;
}

function replaceNotificationsForUser(userId, notifications) {
  const existingNotifications = getNotifications();
  const nextNotifications = [
    ...existingNotifications.filter((notification) => notification.userId !== userId),
    ...normalizeNotifications(notifications)
  ];

  saveNotifications(nextNotifications);
  return nextNotifications;
}

function updateNotificationsInStore(updater) {
  const currentNotifications = getNotifications();
  const nextNotifications = updater(currentNotifications.map(normalizeNotificationRecord));
  saveNotifications(nextNotifications);
  return nextNotifications;
}

function syncNotificationActors(notifications = []) {
  const actorUsers = notifications
    .map((notification) => notification?.actorUser || null)
    .filter(Boolean);

  if (actorUsers.length > 0) {
    upsertUsers(actorUsers);
  }
}

function findActorUsername(actorUserId) {
  if (!actorUserId) {
    return "Someone";
  }

  const actor = findNotificationUser(actorUserId);
  return actor?.username || "Someone";
}

function getBrowserNotificationCopy(notification) {
  const actorName = findActorUsername(notification.actorUserId);

  if (notification.type === "dm") {
    return {
      title: "New message",
      body: `${actorName} sent you a message`
    };
  }

  if (notification.type === "follow") {
    return {
      title: "New follower",
      body: `${actorName} followed you`
    };
  }

  if (notification.type === "post_comment") {
    return {
      title: "New comment",
      body: `${actorName} commented on your post`
    };
  }

  if (notification.type === "comment_reply") {
    return {
      title: "New reply",
      body: `${actorName} replied to your comment`
    };
  }

  if (notification.type === "post_reaction") {
    return {
      title: "Post reaction",
      body: `${actorName} reacted to your post`
    };
  }

  if (notification.type === "comment_reaction") {
    return {
      title: "Comment reaction",
      body: `${actorName} reacted to your comment`
    };
  }

  return {
    title: notification.title || "Notification",
    body: notification.text || "Open the app to view more."
  };
}

function getAggregateBrowserNotificationCopy(count) {
  return {
    title: "yahneh",
    body: `You have ${count} new notifications. Open the app to view them.`
  };
}

function isBrowserNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    typeof Notification === "function" &&
    typeof Notification.requestPermission === "function"
  );
}

function showBrowserNotification(notification, options = {}) {
  const permissionStatus = getBrowserNotificationPermissionStatus();

  if (!permissionStatus.supported || permissionStatus.permission !== "granted") {
    return null;
  }

  const currentUserId = getCurrentUserId();

  if (!currentUserId || currentUserId !== notification.userId) {
    return null;
  }

  const { title, body } = options.copy || getBrowserNotificationCopy(notification);
  let browserNotification = null;

  try {
    browserNotification = new Notification(title, {
      body,
      icon: appNotificationIconUrl,
      badge: appNotificationIconUrl,
      tag:
        options.tag ||
        (notification.type === "dm" && notification.conversationId
          ? `dm-${notification.conversationId}`
          : notification.id)
    });
  } catch {
    return null;
  }

  browserNotification.onclick = () => {
    browserNotification.close();

    try {
      window.focus();
    } catch {
      // Ignore focus failures and continue opening in-app flow.
    }

    if (typeof notificationOpenHandler === "function") {
      notificationOpenHandler(options.payload || notification);
    }
  };

  return browserNotification;
}

function maybeShowNewBrowserNotifications({
  currentUserId,
  previousNotifications,
  nextNotifications
}) {
  if (!loadedNotificationUserIds.has(currentUserId)) {
    return;
  }

  const previousUnreadIds = new Set(
    previousNotifications
      .filter((notification) => notification.userId === currentUserId && notification.read !== true)
      .map((notification) => notification.id)
  );

  const nextUnreadNotifications = nextNotifications.filter(
    (notification) =>
      notification.userId === currentUserId &&
      notification.read !== true &&
      !previousUnreadIds.has(notification.id)
  );

  if (nextUnreadNotifications.length <= 0) {
    return;
  }

  if (nextUnreadNotifications.length === 1) {
    showBrowserNotification(nextUnreadNotifications[0]);
    return;
  }

  showBrowserNotification(nextUnreadNotifications[0], {
    copy: getAggregateBrowserNotificationCopy(nextUnreadNotifications.length),
    tag: `notification-batch-${currentUserId}`,
    payload: {
      id: `notification-batch-${currentUserId}`,
      userId: currentUserId,
      type: "notification_batch",
      aggregate: true,
      notificationIds: nextUnreadNotifications.map((notification) => notification.id)
    }
  });
}

function suppressNotificationsForActiveConversation({
  currentUserId,
  notifications = []
}) {
  const activeConversationId = getActiveVisibleConversationId();

  if (!currentUserId || !activeConversationId) {
    return {
      notifications,
      suppressedConversationIds: []
    };
  }

  const suppressedConversationIds = new Set();
  const nextNotifications = notifications.map((notification) => {
    if (
      notification.userId === currentUserId &&
      notification.type === "dm" &&
      notification.conversationId === activeConversationId &&
      notification.read !== true
    ) {
      suppressedConversationIds.add(notification.conversationId);
      return {
        ...notification,
        read: true
      };
    }

    return notification;
  });

  return {
    notifications: nextNotifications,
    suppressedConversationIds: Array.from(suppressedConversationIds)
  };
}

export function getNotifications() {
  const notifications = storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
  return normalizeNotifications(notifications);
}

export function saveNotifications(notifications) {
  const nextNotifications = normalizeNotifications(notifications);
  const previousNotifications = normalizeNotifications(
    storage.get(STORAGE_KEYS.NOTIFICATIONS, [])
  );

  if (JSON.stringify(previousNotifications) === JSON.stringify(nextNotifications)) {
    return nextNotifications;
  }

  storage.set(STORAGE_KEYS.NOTIFICATIONS, nextNotifications);
  emitNotificationChange(nextNotifications);
  return nextNotifications;
}

export function subscribeToNotificationChanges(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  notificationListeners.add(listener);

  return () => {
    notificationListeners.delete(listener);
  };
}

export function resetNotificationState() {
  notificationStateVersion += 1;
  notificationOpenHandler = null;
  loadedNotificationUserIds.clear();
  storage.remove(STORAGE_KEYS.NOTIFICATIONS);
}

export async function loadNotifications({
  currentUserId = getCurrentUserId(),
  force = false,
  limit
} = {}) {
  if (!currentUserId) {
    return [];
  }

  if (!force && loadedNotificationUserIds.has(currentUserId)) {
    return getNotificationsForUser(currentUserId);
  }

  const requestStateVersion = notificationStateVersion;
  const requestUserId = currentUserId;
  const previousNotifications = getNotifications();
  const response = await apiRequest(
    `/notifications${createQueryString({
      limit
    })}`
  );

  if (requestStateVersion !== notificationStateVersion) {
    return getNotificationsForUser(requestUserId);
  }

  const notifications = normalizeNotifications(response.notifications || []);
  const {
    notifications: notificationsToStore,
    suppressedConversationIds
  } = suppressNotificationsForActiveConversation({
    currentUserId: requestUserId,
    notifications
  });

  syncNotificationActors(response.notifications || []);
  replaceNotificationsForUser(requestUserId, notificationsToStore);
  maybeShowNewBrowserNotifications({
    currentUserId: requestUserId,
    previousNotifications,
    nextNotifications: notificationsToStore
  });
  loadedNotificationUserIds.add(requestUserId);

  suppressedConversationIds.forEach((conversationId) => {
    void clearConversationNotifications({
      userId: requestUserId,
      conversationId
    });
  });

  return getNotificationsForUser(requestUserId);
}

export async function ensureNotificationsLoaded(currentUserId) {
  return loadNotifications({
    currentUserId,
    force: false
  });
}

export function getNotificationsForUser(userId) {
  return getNotifications()
    .filter(
      (notification) =>
        notification.userId === userId &&
        !isNotificationHiddenForUser(notification, userId)
    )
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
}

export function getUnreadNotificationCount(userId) {
  return getNotificationsForUser(userId).filter((notification) => notification.read !== true)
    .length;
}

export async function markNotificationRead(notificationId) {
  const safeNotificationId =
    typeof notificationId === "string" ? notificationId.trim() : "";

  if (!safeNotificationId) {
    return null;
  }

  let cachedNotification = null;

  updateNotificationsInStore((notifications) =>
    notifications.map((notification) => {
      if (notification.id !== safeNotificationId) {
        return notification;
      }

      cachedNotification = {
        ...notification,
        read: true
      };

      return cachedNotification;
    })
  );

  try {
    const response = await apiRequest(
      `/notifications/${encodeURIComponent(safeNotificationId)}/read`,
      {
        method: "PATCH"
      }
    );

    if (response.notification) {
      syncNotificationActors([response.notification]);
      updateNotificationsInStore((notifications) =>
        notifications.map((notification) =>
          notification.id === safeNotificationId
            ? normalizeNotificationRecord(response.notification)
            : notification
        )
      );
      return normalizeNotificationRecord(response.notification);
    }
  } catch {
    // Keep the optimistic read state locally even if the request fails.
  }

  return cachedNotification;
}

export async function markAllNotificationsRead(userId = getCurrentUserId()) {
  if (!userId) {
    return getNotifications();
  }

  const nextNotifications = updateNotificationsInStore((notifications) =>
    notifications.map((notification) =>
      notification.userId === userId
        ? {
            ...notification,
            read: true
          }
        : notification
    )
  );

  try {
    await apiRequest("/notifications/read-all", {
      method: "PATCH"
    });
  } catch {
    // Keep the optimistic read state locally even if the request fails.
  }

  return nextNotifications;
}

export async function deleteNotification(notificationId) {
  const safeNotificationId =
    typeof notificationId === "string" ? notificationId.trim() : "";

  if (!safeNotificationId) {
    return getNotifications();
  }

  const nextNotifications = updateNotificationsInStore((notifications) =>
    notifications.filter((notification) => notification.id !== safeNotificationId)
  );

  try {
    await apiRequest(`/notifications/${encodeURIComponent(safeNotificationId)}`, {
      method: "DELETE"
    });
  } catch {
    // Keep the optimistic deleted state locally even if the request fails.
  }

  return nextNotifications;
}

export async function deleteAllNotifications(userId = getCurrentUserId()) {
  if (!userId) {
    return getNotifications();
  }

  const nextNotifications = updateNotificationsInStore((notifications) =>
    notifications.filter((notification) => notification.userId !== userId)
  );

  try {
    await apiRequest("/notifications", {
      method: "DELETE"
    });
  } catch {
    // Keep the optimistic deleted state locally even if the request fails.
  }

  return nextNotifications;
}

export async function clearConversationNotifications({
  userId = getCurrentUserId(),
  conversationId
}) {
  const safeConversationId =
    typeof conversationId === "string" ? conversationId.trim() : "";

  if (!userId || !safeConversationId) {
    return getNotifications();
  }

  const nextNotifications = updateNotificationsInStore((notifications) =>
    notifications.map((notification) =>
      notification.userId === userId && notification.conversationId === safeConversationId
        ? {
            ...notification,
            read: true
          }
        : notification
    )
  );

  try {
    await apiRequest(
      `/notifications/conversations/${encodeURIComponent(safeConversationId)}/read`,
      {
        method: "PATCH"
      }
    );
  } catch {
    // Keep the optimistic read state locally even if the request fails.
  }

  return nextNotifications;
}

export function clearNotificationsForReportedTarget({ userId, targetType, targetId }) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";
  const safeTargetId = typeof targetId === "string" ? targetId.trim() : "";
  const safeTargetType = targetType === "comment" ? "comment" : "post";

  if (!safeUserId || !safeTargetId) {
    return getNotifications();
  }

  return updateNotificationsInStore((notifications) =>
    notifications.filter((notification) => {
      if (notification.userId !== safeUserId) {
        return true;
      }

      if (safeTargetType === "post") {
        return notification.postId !== safeTargetId;
      }

      return notification.commentId !== safeTargetId;
    })
  );
}

export async function ensureBrowserNotificationPermission() {
  const status = getBrowserNotificationPermissionStatus();

  if (!status.supported || status.permission === "granted" || status.permission === "denied") {
    return status;
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      supported: true,
      permission
    };
  } catch {
    return {
      supported: false,
      permission: "unsupported"
    };
  }
}

export function registerNotificationOpenHandler(handler) {
  notificationOpenHandler = typeof handler === "function" ? handler : null;
}

export function getBrowserNotificationPermissionStatus() {
  if (!isBrowserNotificationSupported()) {
    return {
      supported: false,
      permission: "unsupported"
    };
  }

  try {
    return {
      supported: true,
      permission: Notification.permission
    };
  } catch {
    return {
      supported: false,
      permission: "unsupported"
    };
  }
}

function isNotificationHiddenForUser(notification, userId) {
  const hiddenPostIds = getHiddenTargetIdsForUser({
    userId,
    targetType: "post"
  });
  const hiddenCommentIds = getHiddenTargetIdsForUser({
    userId,
    targetType: "comment"
  });

  if (notification.postId && hiddenPostIds.has(notification.postId)) {
    return true;
  }

  if (notification.commentId && hiddenCommentIds.has(notification.commentId)) {
    return true;
  }

  return false;
}
