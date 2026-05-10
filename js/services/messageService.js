import { storage } from "../storage/storage.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { apiRequest } from "./apiClient.js";
import { getCurrentUser, setCurrentUser, upsertUser, upsertUsers } from "./userService.js";
import {
  decryptConversationMessages,
  encryptDirectMessageText,
  encryptDirectMessageVoiceNote,
  ensureDirectMessageEncryptionSession
} from "./directMessageEncryptionService.js";
import { normalizeMessageEncryptionMetadata } from "../utils/directMessageEncryption.js";
import { normalizeVoiceNote, serializeVoiceNoteForTransport } from "../utils/voiceNotes.js";

export const MESSAGE_EDIT_WINDOW_MS = 60 * 1000;

let loadedConversationUserId = "";
let conversationsLoadPromise = null;
let conversationStateVersion = 0;
const conversationListeners = new Set();
let conversationsCache = null;

function makeError(code, field, message) {
  const error = new Error(message);
  error.code = code;
  error.field = field;
  return error;
}

function normalizeMessageRecord(message = {}, conversationId = "") {
  return {
    id: typeof message.id === "string" && message.id ? message.id : crypto.randomUUID(),
    conversationId:
      typeof message.conversationId === "string" && message.conversationId
        ? message.conversationId
        : conversationId,
    senderId: typeof message.senderId === "string" ? message.senderId : "",
    replyToMessageId:
      typeof message.replyToMessageId === "string" ? message.replyToMessageId : "",
    isForwarded: message.isForwarded === true,
    text: typeof message.text === "string" ? message.text.trim() : "",
    encryptedText:
      typeof message.encryptedText === "string" ? message.encryptedText.trim() : "",
    encryption: normalizeMessageEncryptionMetadata(message.encryption),
    isEndToEndEncrypted: message.isEndToEndEncrypted === true,
    voiceNote: normalizeVoiceNote(message.voiceNote),
    createdAt:
      typeof message.createdAt === "string" && message.createdAt
        ? message.createdAt
        : new Date().toISOString(),
    editedAt:
      typeof message.editedAt === "string" && message.editedAt ? message.editedAt : "",
    deletedAt:
      typeof message.deletedAt === "string" && message.deletedAt ? message.deletedAt : "",
    deletedForEveryone: message.deletedForEveryone === true,
    readBy: Array.isArray(message.readBy)
      ? Array.from(
          new Set(message.readBy.filter((userId) => typeof userId === "string" && userId.trim()))
        )
      : []
  };
}

function normalizeConversationRecord(conversation = {}) {
  const id = typeof conversation.id === "string" && conversation.id ? conversation.id : crypto.randomUUID();
  const participantIds = Array.isArray(conversation.participantIds)
    ? Array.from(
        new Set(
          conversation.participantIds.filter((userId) => typeof userId === "string" && userId.trim())
        )
      )
    : [];
  const participants = Array.isArray(conversation.participants)
    ? upsertUsers(conversation.participants)
    : [];
  const hiddenByUserIds = Array.isArray(conversation.hiddenByUserIds)
    ? Array.from(
        new Set(
          conversation.hiddenByUserIds.filter((userId) => typeof userId === "string" && userId.trim())
        )
      )
    : [];
  const messages = Array.isArray(conversation.messages)
      ? conversation.messages
        .map((message) => normalizeMessageRecord(message, id))
        .filter(
          (message) =>
            message.senderId &&
            (
              message.text ||
              message.encryptedText ||
              message.voiceNote ||
              message.deletedForEveryone
            )
        )
        .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
    : [];
  const fallbackTimestamp = new Date().toISOString();

  return {
    id,
    participantIds,
    participants,
    createdAt:
      typeof conversation.createdAt === "string" && conversation.createdAt
        ? conversation.createdAt
        : fallbackTimestamp,
    updatedAt:
      typeof conversation.updatedAt === "string" && conversation.updatedAt
        ? conversation.updatedAt
        : messages[messages.length - 1]?.createdAt || fallbackTimestamp,
    hiddenByUserIds,
    messages
  };
}

function normalizeConversationRecords(conversations = []) {
  return Array.isArray(conversations)
    ? conversations.map((conversation) => normalizeConversationRecord(conversation))
    : [];
}

function sanitizeVoiceNoteForStorage(voiceNote) {
  const normalizedVoiceNote = normalizeVoiceNote(voiceNote);

  if (!normalizedVoiceNote) {
    return null;
  }

  const remoteUrl = typeof normalizedVoiceNote.url === "string" ? normalizedVoiceNote.url : "";

  return {
    ...normalizedVoiceNote,
    dataUrl: "",
    audioBase64: "",
    encryptedAudioBase64:
      typeof normalizedVoiceNote.encryptedAudioBase64 === "string"
        ? normalizedVoiceNote.encryptedAudioBase64
        : "",
    source: /^https?:\/\//i.test(remoteUrl) ? remoteUrl : "",
    pendingSync: !/^https?:\/\//i.test(remoteUrl)
  };
}

function sanitizeMessageRecordForStorage(message = {}) {
  return {
    ...message,
    text: message.encryptedText ? "" : message.text,
    voiceNote: sanitizeVoiceNoteForStorage(message.voiceNote)
  };
}

function sanitizeConversationRecordForStorage(conversation = {}) {
  return {
    ...conversation,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.map((message) => sanitizeMessageRecordForStorage(message))
      : []
  };
}

function sanitizeConversationsForStorage(conversations = []) {
  return Array.isArray(conversations)
    ? conversations.map((conversation) => sanitizeConversationRecordForStorage(conversation))
    : [];
}

function sortConversations(conversations = []) {
  return [...conversations].sort(
    (first, second) => new Date(second.updatedAt) - new Date(first.updatedAt)
  );
}

function getCachedConversations() {
  if (!Array.isArray(conversationsCache)) {
    conversationsCache = sortConversations(
      normalizeConversationRecords(storage.get(STORAGE_KEYS.CONVERSATIONS, []))
    );
  }

  return conversationsCache;
}

function emitConversationChange(conversations) {
  conversationListeners.forEach((listener) => {
    try {
      listener(conversations);
    } catch {
      // Ignore listener errors so storage updates continue.
    }
  });
}

function saveConversationsInternal(conversations) {
  const nextConversations = sortConversations(normalizeConversationRecords(conversations));
  const previousConversations = sortConversations(
    normalizeConversationRecords(getCachedConversations())
  );

  if (JSON.stringify(previousConversations) === JSON.stringify(nextConversations)) {
    return nextConversations;
  }

  conversationsCache = nextConversations;
  storage.set(
    STORAGE_KEYS.CONVERSATIONS,
    sanitizeConversationsForStorage(nextConversations)
  );
  emitConversationChange(nextConversations);
  return nextConversations;
}

function syncConversations(conversations, { replace = false } = {}) {
  const normalizedConversations = normalizeConversationRecords(conversations);

  if (replace) {
    return saveConversationsInternal(normalizedConversations);
  }

  const conversationsById = new Map(getConversations().map((conversation) => [conversation.id, conversation]));

  normalizedConversations.forEach((conversation) => {
    conversationsById.set(conversation.id, {
      ...(conversationsById.get(conversation.id) || {}),
      ...conversation
    });
  });

  return saveConversationsInternal(Array.from(conversationsById.values()));
}

function syncConversation(conversation) {
  if (!conversation) {
    return null;
  }

  return syncConversations([conversation])[0] || null;
}

async function ensureCurrentUserEncryptionSession() {
  const currentUser = getCurrentUser();

  if (!currentUser?.id) {
    return null;
  }

  return ensureDirectMessageEncryptionSession({
    user: currentUser,
    onUserUpdated: (updatedUser) => {
      const nextUser = upsertUser(updatedUser);
      setCurrentUser(nextUser);
      return nextUser;
    }
  });
}

async function hydrateConversation(conversation) {
  if (!conversation) {
    return null;
  }

  const currentUser = await ensureCurrentUserEncryptionSession();

  if (!currentUser?.id) {
    return conversation;
  }

  return decryptConversationMessages(conversation, currentUser.id);
}

async function hydrateConversations(conversations = []) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return [];
  }

  const currentUser = await ensureCurrentUserEncryptionSession();

  if (!currentUser?.id) {
    return conversations;
  }

  return Promise.all(
    conversations.map((conversation) =>
      decryptConversationMessages(conversation, currentUser.id)
    )
  );
}

export function getConversations() {
  return sortConversations(normalizeConversationRecords(getCachedConversations()));
}

export function saveConversations(conversations) {
  return saveConversationsInternal(conversations);
}

export function subscribeToConversationChanges(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  conversationListeners.add(listener);

  return () => {
    conversationListeners.delete(listener);
  };
}

export function resetConversationState() {
  conversationStateVersion += 1;
  loadedConversationUserId = "";
  conversationsLoadPromise = null;
  conversationsCache = null;
  storage.remove(STORAGE_KEYS.CONVERSATIONS);
}

export function getConversationById(conversationId) {
  if (!conversationId) {
    return null;
  }

  return getConversations().find((conversation) => conversation.id === conversationId) || null;
}

export function getConversationsForUser(userId) {
  return getConversations()
    .filter(
      (conversation) =>
        conversation.participantIds.includes(userId) &&
        !conversation.hiddenByUserIds.includes(userId)
    )
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));
}

export function getConversationWithUser({ currentUserId, targetUserId }) {
  if (!currentUserId || !targetUserId) {
    return null;
  }

  return (
    getConversations().find((conversation) => {
      if (conversation.participantIds.length !== 2) {
        return false;
      }

      return (
        conversation.participantIds.includes(currentUserId) &&
        conversation.participantIds.includes(targetUserId)
      );
    }) || null
  );
}

export async function loadConversations({ currentUserId, force = false } = {}) {
  if (!currentUserId) {
    return getConversations();
  }

  if (!force && loadedConversationUserId === currentUserId && !conversationsLoadPromise) {
    return getConversationsForUser(currentUserId);
  }

  if (!force && conversationsLoadPromise) {
    return conversationsLoadPromise;
  }

  const requestStateVersion = conversationStateVersion;
  const requestUserId = currentUserId;
  const loadPromise = apiRequest("/conversations")
    .then(async (response) => {
      if (requestStateVersion !== conversationStateVersion) {
        return getConversationsForUser(requestUserId);
      }

      loadedConversationUserId = requestUserId;
      return syncConversations(await hydrateConversations(response.conversations || []), {
        replace: true
      });
    })
    .finally(() => {
      if (conversationsLoadPromise === loadPromise) {
        conversationsLoadPromise = null;
      }
    });

  conversationsLoadPromise = loadPromise;
  return conversationsLoadPromise;
}

export async function ensureConversationsLoaded(currentUserId) {
  return loadConversations({ currentUserId, force: false });
}

export async function getOrCreateConversation({ currentUserId, targetUserId }) {
  if (!currentUserId || !targetUserId) {
    throw makeError("CONVERSATION_INVALID", null, "Could not open that conversation.");
  }

  if (currentUserId === targetUserId) {
    throw makeError("CONVERSATION_SELF", null, "You cannot message yourself.");
  }

  const response = await apiRequest(`/conversations/direct/${encodeURIComponent(targetUserId)}`, {
    method: "POST"
  });

  return syncConversation(await hydrateConversation(response.conversation));
}

export async function sendMessage({
  conversationId,
  text,
  voiceNote = null,
  clientRequestId = "",
  replyToMessageId = "",
  isForwarded = false
}) {
  const currentUser = await ensureCurrentUserEncryptionSession();
  const conversation = getConversationById(conversationId);
  const encryptedTextPayload =
    !voiceNote
      ? await encryptDirectMessageText({
          conversation,
          currentUser,
          text
        })
      : null;
  const encryptedVoiceNotePayload = voiceNote
    ? await encryptDirectMessageVoiceNote({
        conversation,
        currentUser,
        voiceNote
      })
    : null;
  const response = await apiRequest(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: {
      clientRequestId,
      replyToMessageId,
      isForwarded: isForwarded === true,
      text: encryptedTextPayload?.text ?? text,
      encryptedText: encryptedTextPayload?.encryptedText || "",
      encryption:
        encryptedVoiceNotePayload?.encryption || encryptedTextPayload?.encryption || null,
      voiceNote:
        encryptedVoiceNotePayload?.voiceNote || serializeVoiceNoteForTransport(voiceNote)
    }
  });

  return syncConversation(await hydrateConversation(response.conversation));
}

export async function markConversationRead({ conversationId, userId }) {
  if (!conversationId || !userId) {
    return null;
  }

  const response = await apiRequest(`/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST"
  });

  return syncConversation(await hydrateConversation(response.conversation));
}

export function canEditMessage({ message, userId, now = Date.now() }) {
  if (!message || !userId || message.senderId !== userId || message.deletedForEveryone) {
    return false;
  }

  const createdAtMs = new Date(message.createdAt).getTime();

  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return now - createdAtMs <= MESSAGE_EDIT_WINDOW_MS;
}

export async function updateMessage({ conversationId, messageId, text }) {
  const currentUser = await ensureCurrentUserEncryptionSession();
  const conversation = getConversationById(conversationId);
  const encryptedPayload =
    currentUser?.id && conversation
      ? await encryptDirectMessageText({
          conversation,
          currentUser,
          text
        })
      : {
          text,
          encryptedText: "",
          encryption: null
        };
  const response = await apiRequest(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: {
        text: encryptedPayload.text,
        encryptedText: encryptedPayload.encryptedText,
        encryption: encryptedPayload.encryption
      }
    }
  );

  return syncConversation(await hydrateConversation(response.conversation));
}

export async function deleteMessageForEveryone({ conversationId, messageId }) {
  const response = await apiRequest(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE"
    }
  );

  return syncConversation(await hydrateConversation(response.conversation));
}

export async function archiveConversationForUser({ conversationId, userId }) {
  if (!conversationId || !userId) {
    return getConversations();
  }

  return archiveSelectedConversationsForUser({
    conversationIds: [conversationId],
    userId
  });
}

export async function archiveSelectedConversationsForUser({ conversationIds, userId }) {
  const response = await apiRequest("/conversations/archive", {
    method: "POST",
    body: {
      conversationIds
    }
  });

  loadedConversationUserId = userId || loadedConversationUserId;
  return syncConversations(await hydrateConversations(response.conversations || []), {
    replace: true
  });
}

export async function archiveAllConversationsForUser(userId) {
  const response = await apiRequest("/conversations/archive-all", {
    method: "POST"
  });

  loadedConversationUserId = userId || loadedConversationUserId;
  return syncConversations(await hydrateConversations(response.conversations || []), {
    replace: true
  });
}

export function getUnreadConversationCount(userId) {
  return getConversationsForUser(userId).filter((conversation) =>
    conversation.messages.some(
      (message) => message.senderId !== userId && !message.readBy.includes(userId)
    )
  ).length;
}

export function getUnreadMessageCountForConversation({ conversationId, userId }) {
  const conversation = getConversationById(conversationId);

  if (!conversation) {
    return 0;
  }

  return conversation.messages.filter(
    (message) => message.senderId !== userId && !message.readBy.includes(userId)
  ).length;
}
