import { storage } from "../storage/storage.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { apiRequest, resolveApiAssetUrl } from "./apiClient.js";
import { normalizeUserDirectMessageEncryption } from "../utils/directMessageEncryption.js";
import { normalizeLocation } from "../utils/location.js";

let usersCache = null;
let currentUserCache = undefined;
const currentUserListeners = new Set();

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

function normalizeUserRecord(user = {}) {
  const rawAvatarUrl = typeof user.avatarUrl === "string" ? user.avatarUrl.trim() : "";
  const rawAvatarDataUrl =
    typeof user.avatarDataUrl === "string" ? user.avatarDataUrl.trim() : "";
  const preferredAvatarSource = rawAvatarUrl || rawAvatarDataUrl;
  const avatarUrl = resolveApiAssetUrl(preferredAvatarSource);
  const avatarDataUrl = resolveApiAssetUrl(preferredAvatarSource);

  return {
    ...user,
    avatarDataUrl,
    avatarUrl,
    phoneNumber: typeof user.phoneNumber === "string" ? user.phoneNumber : "",
    directMessagesEnabled: user.directMessagesEnabled !== false,
    notificationsEnabled: user.notificationsEnabled !== false,
    directMessageEncryption: normalizeUserDirectMessageEncryption(
      user.directMessageEncryption
    ),
    blockedUserIds: Array.isArray(user.blockedUserIds)
      ? Array.from(
          new Set(
            user.blockedUserIds.filter(
              (blockedUserId) => typeof blockedUserId === "string" && blockedUserId.trim()
            )
          )
        )
      : [],
    followingUserIds: Array.isArray(user.followingUserIds)
      ? Array.from(
          new Set(
            user.followingUserIds.filter(
              (followedUserId) => typeof followedUserId === "string" && followedUserId.trim()
            )
          )
        )
      : [],
    location: normalizeLocation(user.location),
    createdAt:
      typeof user.createdAt === "string" && user.createdAt
        ? user.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof user.updatedAt === "string" && user.updatedAt
        ? user.updatedAt
        : null
  };
}

function serializeUserRecord(user = {}) {
  const normalizedUser = normalizeUserRecord(user);

  if (
    normalizedUser.avatarDataUrl &&
    normalizedUser.avatarUrl &&
    normalizedUser.avatarDataUrl === normalizedUser.avatarUrl
  ) {
    return {
      ...normalizedUser,
      avatarUrl: ""
    };
  }

  return normalizedUser;
}

function hasOwnProperty(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function isFullUserRecord(user = {}) {
  return [
    "phoneNumber",
    "directMessagesEnabled",
    "notificationsEnabled",
    "blockedUserIds",
    "followingUserIds",
    "phoneVerified",
    "roles",
    "directMessageEncryption"
  ].some((key) => hasOwnProperty(user, key));
}

function directMessageEncryptionRecordsMatch(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  const serializePublicShape = (record) =>
    JSON.stringify({
      keyId: record.keyId,
      publicKeyJwk: record.publicKeyJwk,
      previousKeys: Array.isArray(record.previousKeys)
        ? [...record.previousKeys]
            .sort((first, second) => first.keyId.localeCompare(second.keyId))
            .map((entry) => ({
              keyId: entry.keyId,
              publicKeyJwk: entry.publicKeyJwk
            }))
        : []
    });

  return serializePublicShape(firstRecord) === serializePublicShape(secondRecord);
}

function mergeDirectMessageEncryptionPrivateData(existingRecord, incomingRecord) {
  if (!existingRecord || !incomingRecord) {
    return incomingRecord || existingRecord || null;
  }

  const existingPreviousKeysById = new Map(
    Array.isArray(existingRecord.previousKeys)
      ? existingRecord.previousKeys.map((entry) => [entry.keyId, entry])
      : []
  );

  return {
    ...incomingRecord,
    privateKeyEnvelope:
      incomingRecord.privateKeyEnvelope || existingRecord.privateKeyEnvelope || null,
    previousKeys: Array.isArray(incomingRecord.previousKeys)
      ? incomingRecord.previousKeys.map((entry) => ({
          ...entry,
          privateKeyEnvelope:
            entry.privateKeyEnvelope ||
            existingPreviousKeysById.get(entry.keyId)?.privateKeyEnvelope ||
            null
        }))
      : []
  };
}

function getCurrentUserIdHint() {
  if (typeof currentUserCache?.id === "string" && currentUserCache.id) {
    return currentUserCache.id;
  }

  const storedCurrentUser = storage.get(STORAGE_KEYS.CURRENT_USER, null);
  return typeof storedCurrentUser?.id === "string" ? storedCurrentUser.id : "";
}

function mergeUserRecord(existingUser, incomingUser, rawIncomingUser) {
  if (!existingUser) {
    return incomingUser;
  }

  const mergedUser = {
    ...existingUser,
    ...incomingUser
  };
  if (
    existingUser.location?.streetName &&
    !hasOwnProperty(rawIncomingUser.location || {}, "streetName")
  ) {
    mergedUser.location = {
      ...incomingUser.location,
      streetName: existingUser.location.streetName
    };
  }
  const incomingIsFull = isFullUserRecord(rawIncomingUser);
  const isCurrentUser = getCurrentUserIdHint() === existingUser.id;

  if (isCurrentUser && !incomingIsFull) {
    mergedUser.avatarUrl = existingUser.avatarUrl || incomingUser.avatarUrl || "";
    mergedUser.avatarDataUrl =
      existingUser.avatarDataUrl || existingUser.avatarUrl || incomingUser.avatarDataUrl || "";
  }

  if (!hasOwnProperty(rawIncomingUser, "directMessageEncryption")) {
    mergedUser.directMessageEncryption = existingUser.directMessageEncryption || null;
    return mergedUser;
  }

  if (
    existingUser.directMessageEncryption?.privateKeyEnvelope &&
    incomingUser.directMessageEncryption &&
    !incomingUser.directMessageEncryption.privateKeyEnvelope &&
    directMessageEncryptionRecordsMatch(
      existingUser.directMessageEncryption,
      incomingUser.directMessageEncryption
    )
  ) {
    mergedUser.directMessageEncryption = mergeDirectMessageEncryptionPrivateData(
      existingUser.directMessageEncryption,
      incomingUser.directMessageEncryption
    );
  }

  return mergedUser;
}

export function getUsers() {
  if (Array.isArray(usersCache)) {
    return usersCache.slice();
  }

  const users = storage.get(STORAGE_KEYS.USERS, []);
  usersCache = Array.isArray(users) ? users.map(normalizeUserRecord) : [];
  return usersCache.slice();
}

export function saveUsers(users) {
  usersCache = Array.isArray(users) ? users.map(normalizeUserRecord) : [];
  storage.set(STORAGE_KEYS.USERS, usersCache.map(serializeUserRecord));
}

export function upsertUsers(users = []) {
  const incomingUsers = Array.isArray(users)
    ? users
        .map((user) => ({
          raw: user,
          normalized: normalizeUserRecord(user)
        }))
        .filter(({ normalized }) => typeof normalized.id === "string" && normalized.id.trim())
    : [];

  if (incomingUsers.length === 0) {
    return [];
  }

  const usersById = new Map(getUsers().map((user) => [user.id, user]));

  incomingUsers.forEach(({ raw, normalized }) => {
    usersById.set(
      normalized.id,
      mergeUserRecord(usersById.get(normalized.id) || null, normalized, raw)
    );
  });

  const nextUsers = Array.from(usersById.values());
  saveUsers(nextUsers);
  return incomingUsers.map(({ normalized }) => usersById.get(normalized.id));
}

export function upsertUser(user) {
  if (!user) {
    return null;
  }

  return upsertUsers([user])[0] || null;
}

export function findUserById(userId) {
  const users = getUsers();
  return users.find((user) => user.id === userId) || null;
}

export function setCurrentUser(user) {
  const normalizedUser = user ? normalizeUserRecord(user) : null;
  currentUserCache = normalizedUser;

  if (normalizedUser) {
    upsertUser(normalizedUser);
  }

  storage.set(
    STORAGE_KEYS.CURRENT_USER,
    normalizedUser ? serializeUserRecord(normalizedUser) : null
  );
  emitCurrentUserChange(normalizedUser);
}

export function getCurrentUser() {
  if (currentUserCache !== undefined) {
    return currentUserCache;
  }

  const currentUser = storage.get(STORAGE_KEYS.CURRENT_USER, null);
  currentUserCache = currentUser ? normalizeUserRecord(currentUser) : null;
  return currentUserCache;
}

export function clearCurrentUser() {
  currentUserCache = null;
  storage.remove(STORAGE_KEYS.CURRENT_USER);
  emitCurrentUserChange(null);
}

export function resetUserState() {
  usersCache = null;
  currentUserCache = undefined;
}

export function subscribeCurrentUserChanges(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  currentUserListeners.add(listener);

  return () => {
    currentUserListeners.delete(listener);
  };
}

function emitCurrentUserChange(user) {
  currentUserListeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // Ignore listener errors so user state updates continue.
    }
  });
}

export function getFollowerCount(userId) {
  return getUsers().filter((user) => user.followingUserIds.includes(userId)).length;
}

export function getFollowerUsers(userId, { limit = Infinity } = {}) {
  return getUsers()
    .filter((user) => user.followingUserIds.includes(userId))
    .slice(0, limit);
}

export function getFollowingUsers(userId, { limit = Infinity } = {}) {
  const users = getUsers();
  const user = users.find((entry) => entry.id === userId);

  if (!user) {
    return [];
  }

  const usersById = new Map(users.map((entry) => [entry.id, entry]));

  return user.followingUserIds
    .map((followedUserId) => usersById.get(followedUserId) || null)
    .filter(Boolean)
    .slice(0, limit);
}

export function isFollowingUser({ currentUserId, targetUserId }) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return false;
  }

  const currentUser = findUserById(currentUserId);
  return Boolean(currentUser?.followingUserIds.includes(targetUserId));
}

export function areNotificationsEnabled(userId) {
  if (!userId) {
    return false;
  }

  const user = findUserById(userId);
  return user?.notificationsEnabled !== false;
}

export function isUserBlocked({ currentUserId, targetUserId }) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return false;
  }

  const currentUser = findUserById(currentUserId);
  return Boolean(currentUser?.blockedUserIds.includes(targetUserId));
}

export function getDirectMessageAvailability({ senderUserId, recipientUserId }) {
  if (!senderUserId || !recipientUserId) {
    return {
      allowed: false,
      code: "DM_INVALID",
      message: "Could not open direct messages."
    };
  }

  const sender = findUserById(senderUserId);
  const recipient = findUserById(recipientUserId);

  if (!sender || !recipient) {
    return {
      allowed: false,
      code: "USER_NOT_FOUND",
      message: "User not found."
    };
  }

  if (sender.directMessagesEnabled === false) {
    return {
      allowed: false,
      code: "SENDER_DM_DISABLED",
      message: "You disabled direct messages. Enable them to send messages."
    };
  }

  if (recipient.directMessagesEnabled === false) {
    return {
      allowed: false,
      code: "RECIPIENT_DM_DISABLED",
      message: `${recipient.username} has disabled direct messages.`
    };
  }

  if (sender.blockedUserIds.includes(recipientUserId)) {
    return {
      allowed: false,
      code: "SENDER_BLOCKED_RECIPIENT",
      message: `You blocked ${recipient.username}. Unblock them to continue chatting.`
    };
  }

  if (recipient.blockedUserIds.includes(senderUserId)) {
    return {
      allowed: false,
      code: "RECIPIENT_BLOCKED_SENDER",
      message: `${recipient.username} blocked you.`
    };
  }

  return {
    allowed: true,
    code: "DM_ALLOWED",
    message: ""
  };
}

export async function syncCurrentUserFromApi() {
  const response = await apiRequest("/auth/me");
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function fetchUserProfile(userId) {
  const response = await apiRequest(`/users/${encodeURIComponent(userId)}`);
  const user = upsertUser(response.user);

  return {
    user,
    stats: response.stats || {
      followerCount: getFollowerCount(userId),
      followingCount: Array.isArray(user?.followingUserIds) ? user.followingUserIds.length : 0,
      isCurrentUser: getCurrentUser()?.id === userId,
      isFollowing: isFollowingUser({
        currentUserId: getCurrentUser()?.id || "",
        targetUserId: userId
      })
    }
  };
}

export async function searchUsersRemote(query, { limit } = {}) {
  const normalizedQuery = String(query ?? "").trim();

  const response = await apiRequest(
    `/users/search${createQueryString({
      query: normalizedQuery,
      limit
    })}`
  );

  return upsertUsers(response.users || []);
}

export async function loadUserDirectory({ limit } = {}) {
  return searchUsersRemote("", { limit });
}

export async function fetchFollowerUsers(userId, { limit } = {}) {
  const response = await apiRequest(
    `/users/${encodeURIComponent(userId)}/followers${createQueryString({ limit })}`
  );

  return upsertUsers(response.users || []);
}

export async function fetchFollowingUsers(userId, { limit } = {}) {
  const response = await apiRequest(
    `/users/${encodeURIComponent(userId)}/following${createQueryString({ limit })}`
  );

  return upsertUsers(response.users || []);
}

export async function updateUserProfileRemote({
  username,
  phoneNumber,
  township,
  extension,
  province,
  municipality,
  area,
  streetName,
  avatarDataUrl,
  avatarUrl,
  currentPassword,
  newPassword,
  confirmNewPassword,
  directMessageEncryption
}) {
  const body = {
    username,
    phoneNumber,
    province,
    municipality,
    township,
    extension,
    area,
    streetName,
    currentPassword,
    newPassword,
    confirmNewPassword
  };

  if (directMessageEncryption !== undefined) {
    body.directMessageEncryption = directMessageEncryption;
  }

  if (avatarDataUrl !== undefined || avatarUrl !== undefined) {
    body.avatarUrl = avatarDataUrl ?? avatarUrl ?? "";
  }

  const response = await apiRequest("/users/me/profile", {
    method: "PATCH",
    body
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function uploadUserAvatarRemote({ file }) {
  const response = await apiRequest("/users/me/avatar", {
    method: "PUT",
    headers: {
      "Content-Type": file?.type || "application/octet-stream"
    },
    body: file
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function deleteUserAvatarRemote() {
  const response = await apiRequest("/users/me/avatar", {
    method: "DELETE"
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function followUserRemote({ targetUserId }) {
  const response = await apiRequest(`/users/${encodeURIComponent(targetUserId)}/follow`, {
    method: "POST"
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function unfollowUserRemote({ targetUserId }) {
  const response = await apiRequest(`/users/${encodeURIComponent(targetUserId)}/follow`, {
    method: "DELETE"
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function blockUserRemote({ targetUserId }) {
  const response = await apiRequest(`/users/${encodeURIComponent(targetUserId)}/block`, {
    method: "POST"
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function unblockUserRemote({ targetUserId }) {
  const response = await apiRequest(`/users/${encodeURIComponent(targetUserId)}/block`, {
    method: "DELETE"
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function setDirectMessagesEnabledRemote({ enabled }) {
  const response = await apiRequest("/users/me/settings/direct-messages", {
    method: "PATCH",
    body: {
      enabled
    }
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function setNotificationsEnabledRemote({ enabled }) {
  const response = await apiRequest("/users/me/settings/notifications", {
    method: "PATCH",
    body: {
      enabled
    }
  });
  const user = upsertUser(response.user);
  setCurrentUser(user);
  return user;
}

export async function getDirectMessageAvailabilityRemote({ recipientUserId }) {
  const response = await apiRequest(
    `/users/${encodeURIComponent(recipientUserId)}/dm-availability`
  );

  return response.availability || getDirectMessageAvailability({
    senderUserId: getCurrentUser()?.id || "",
    recipientUserId
  });
}
