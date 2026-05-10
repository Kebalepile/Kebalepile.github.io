import { STORAGE_KEYS } from "../config/storageKeys.js";
import { storage } from "../storage/storage.js";
import { apiRequest } from "./apiClient.js";
import {
  DIRECT_MESSAGE_E2E_ALGORITHM,
  DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ALGORITHM,
  DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ITERATIONS,
  DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_VERSION,
  DIRECT_MESSAGE_E2E_VERSION,
  DIRECT_MESSAGE_UNAVAILABLE_TEXT,
  normalizeMessageEncryptionMetadata,
  normalizeUserDirectMessageEncryption
} from "../utils/directMessageEncryption.js";
import {
  getVoiceNoteAudioBase64,
  normalizeVoiceNote,
  serializeVoiceNoteForTransport
} from "../utils/voiceNotes.js";

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMessageText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function getWebCrypto() {
  return globalThis.crypto?.subtle || null;
}

function normalizePublicKeyForStorage(publicKeyJwk) {
  return normalizeUserDirectMessageEncryption({
    keyId: "temporary",
    publicKeyJwk
  })?.publicKeyJwk || null;
}

export function supportsDirectMessageEncryption() {
  return (
    Boolean(getWebCrypto()) &&
    typeof globalThis.TextEncoder !== "undefined" &&
    typeof globalThis.TextDecoder !== "undefined" &&
    typeof globalThis.btoa === "function" &&
    typeof globalThis.atob === "function"
  );
}

function getStoredKeyMap() {
  const rawValue = storage.get(STORAGE_KEYS.DIRECT_MESSAGE_E2E_KEYS, {});
  return rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
    ? rawValue
    : {};
}

function saveStoredKeyMap(keyMap) {
  storage.set(STORAGE_KEYS.DIRECT_MESSAGE_E2E_KEYS, keyMap);
}

function normalizeStoredKeyRecord(keyRecord) {
  if (!keyRecord || typeof keyRecord !== "object" || Array.isArray(keyRecord)) {
    return null;
  }

  const normalizedPublicKey = normalizeUserDirectMessageEncryption({
    keyId: keyRecord.keyId,
    publicKeyJwk: keyRecord.publicKeyJwk
  });
  const privateKeyJwk =
    keyRecord.privateKeyJwk && typeof keyRecord.privateKeyJwk === "object"
      ? keyRecord.privateKeyJwk
      : null;

  if (!normalizedPublicKey || !privateKeyJwk) {
    return null;
  }

  return {
    version: DIRECT_MESSAGE_E2E_VERSION,
    algorithm: DIRECT_MESSAGE_E2E_ALGORITHM,
    keyId: normalizedPublicKey.keyId,
    publicKeyJwk: normalizedPublicKey.publicKeyJwk,
    privateKeyJwk
  };
}

function normalizeStoredKeyRing(value) {
  const legacyKeyRecord = normalizeStoredKeyRecord(value);

  if (legacyKeyRecord) {
    return {
      activeKeyId: legacyKeyRecord.keyId,
      records: [legacyKeyRecord]
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const records = Array.isArray(value.records)
    ? value.records
        .map((entry) => normalizeStoredKeyRecord(entry))
        .filter(Boolean)
        .filter(
          (entry, index, entries) =>
            entries.findIndex((candidate) => candidate.keyId === entry.keyId) === index
        )
    : [];

  if (records.length === 0) {
    return null;
  }

  const activeKeyId = trimString(value.activeKeyId);

  return {
    activeKeyId: records.some((entry) => entry.keyId === activeKeyId)
      ? activeKeyId
      : records[0].keyId,
    records
  };
}

function getKeyRingRecord(keyRing, keyId = "") {
  const normalizedKeyRing = normalizeStoredKeyRing(keyRing);
  const safeKeyId = trimString(keyId);

  if (!normalizedKeyRing) {
    return null;
  }

  if (safeKeyId) {
    return normalizedKeyRing.records.find((entry) => entry.keyId === safeKeyId) || null;
  }

  return (
    normalizedKeyRing.records.find((entry) => entry.keyId === normalizedKeyRing.activeKeyId) ||
    normalizedKeyRing.records[0] ||
    null
  );
}

function getStoredKeyRing(userId) {
  const safeUserId = trimString(userId);

  if (!safeUserId) {
    return null;
  }

  return normalizeStoredKeyRing(getStoredKeyMap()[safeUserId]);
}

function saveStoredKeyRing(userId, keyRing) {
  const safeUserId = trimString(userId);
  const normalizedKeyRing = normalizeStoredKeyRing(keyRing);

  if (!safeUserId) {
    return;
  }

  const nextKeyMap = {
    ...getStoredKeyMap()
  };

  if (!normalizedKeyRing) {
    delete nextKeyMap[safeUserId];
    saveStoredKeyMap(nextKeyMap);
    return;
  }

  nextKeyMap[safeUserId] = {
    activeKeyId: normalizedKeyRing.activeKeyId,
    records: normalizedKeyRing.records.map((entry) => ({
      version: DIRECT_MESSAGE_E2E_VERSION,
      algorithm: DIRECT_MESSAGE_E2E_ALGORITHM,
      keyId: entry.keyId,
      publicKeyJwk: entry.publicKeyJwk,
      privateKeyJwk: entry.privateKeyJwk
    }))
  };

  saveStoredKeyMap(nextKeyMap);
}

function getStoredKeyRecords(userId) {
  return getStoredKeyRing(userId)?.records || [];
}

function getStoredKeyRecord(userId, keyId = "") {
  return getKeyRingRecord(getStoredKeyRing(userId), keyId);
}

function upsertStoredKeyRecord(userId, keyRecord, { makeActive = true } = {}) {
  const safeUserId = trimString(userId);
  const normalizedKeyRecord = normalizeStoredKeyRecord(keyRecord);

  if (!safeUserId || !normalizedKeyRecord) {
    return null;
  }

  const keyRing = getStoredKeyRing(safeUserId) || {
    activeKeyId: normalizedKeyRecord.keyId,
    records: []
  };
  const nextRecords = [
    ...keyRing.records.filter((entry) => entry.keyId !== normalizedKeyRecord.keyId),
    normalizedKeyRecord
  ];
  const nextKeyRing = {
    activeKeyId: makeActive ? normalizedKeyRecord.keyId : keyRing.activeKeyId,
    records: nextRecords
  };

  saveStoredKeyRing(safeUserId, nextKeyRing);
  return getStoredKeyRing(safeUserId);
}

function getRemoteKeyRecords(remoteEncryption) {
  if (!remoteEncryption) {
    return [];
  }

  return [
    remoteEncryption,
    ...(Array.isArray(remoteEncryption.previousKeys) ? remoteEncryption.previousKeys : [])
  ];
}

function serializeKeyRecordSet(records = []) {
  return JSON.stringify(
    [...records]
      .map((entry) => ({
        keyId: entry.keyId,
        publicKeyJwk: entry.publicKeyJwk
      }))
      .sort((first, second) => first.keyId.localeCompare(second.keyId))
  );
}

function keyRecordSetMatchesRemote(remoteEncryption, keyRing) {
  if (!remoteEncryption || !keyRing) {
    return false;
  }

  return (
    remoteEncryption.keyId === keyRing.activeKeyId &&
    serializeKeyRecordSet(getRemoteKeyRecords(remoteEncryption)) ===
      serializeKeyRecordSet(keyRing.records)
  );
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeys(value[key]);
      return result;
    }, {});
}

async function digestText(value) {
  const subtle = getWebCrypto();
  const encoder = new TextEncoder();
  const digestBuffer = await subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createKeyId(publicKeyJwk) {
  return `dmk_${(await digestText(JSON.stringify(sortObjectKeys(publicKeyJwk)))).slice(0, 24)}`;
}

async function importPasswordKey(password) {
  return getWebCrypto().importKey(
    "raw",
    new TextEncoder().encode(trimString(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
}

async function derivePrivateKeyWrappingKey({
  password,
  salt,
  iterations = DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ITERATIONS,
  usages
}) {
  const passwordKey = await importPasswordKey(password);

  return getWebCrypto().deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    usages
  );
}

async function generateDirectMessageKeyRecord() {
  const subtle = getWebCrypto();
  const keyPair = await subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey"]
  );
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    subtle.exportKey("jwk", keyPair.publicKey),
    subtle.exportKey("jwk", keyPair.privateKey)
  ]);
  const normalizedPublicKey = normalizePublicKeyForStorage(publicKeyJwk);

  if (!normalizedPublicKey) {
    throw new Error("Could not prepare the direct-message encryption key.");
  }

  const keyId = await createKeyId(normalizedPublicKey);

  return {
    version: DIRECT_MESSAGE_E2E_VERSION,
    algorithm: DIRECT_MESSAGE_E2E_ALGORITHM,
    keyId,
    publicKeyJwk: normalizedPublicKey,
    privateKeyJwk
  };
}

async function importPublicKey(publicKeyJwk) {
  return getWebCrypto().importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );
}

async function importPrivateKey(privateKeyJwk) {
  return getWebCrypto().importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveKey"]
  );
}

async function deriveSharedKey({ privateKeyJwk, publicKeyJwk, usages }) {
  const [privateKey, publicKey] = await Promise.all([
    importPrivateKey(privateKeyJwk),
    importPublicKey(publicKeyJwk)
  ]);

  return getWebCrypto().deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    usages
  );
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return globalThis.btoa(binary);
}

function base64ToUint8Array(value) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function wrapPrivateKeyForAccount({ privateKeyJwk, password }) {
  const safePassword = trimString(password);

  if (!privateKeyJwk || !safePassword) {
    throw new Error("Could not protect the direct-message key for this account.");
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await derivePrivateKeyWrappingKey({
    password: safePassword,
    salt,
    iterations: DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ITERATIONS,
    usages: ["encrypt"]
  });
  const encodedPrivateKey = new TextEncoder().encode(
    JSON.stringify(sortObjectKeys(privateKeyJwk))
  );
  const encryptedBuffer = await getWebCrypto().encrypt(
    {
      name: "AES-GCM",
      iv
    },
    wrappingKey,
    encodedPrivateKey
  );

  return {
    version: DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_VERSION,
    algorithm: DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ALGORITHM,
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    iterations: DIRECT_MESSAGE_E2E_PRIVATE_KEY_WRAP_ITERATIONS
  };
}

async function unwrapPrivateKeyForAccount({ privateKeyEnvelope, password }) {
  const safePassword = trimString(password);
  const ciphertext = trimString(privateKeyEnvelope?.ciphertext);
  const iv = trimString(privateKeyEnvelope?.iv);
  const salt = trimString(privateKeyEnvelope?.salt);
  const iterations = Number.parseInt(privateKeyEnvelope?.iterations, 10);

  if (
    !safePassword ||
    !ciphertext ||
    !iv ||
    !salt ||
    !Number.isInteger(iterations) ||
    iterations <= 0
  ) {
    throw new Error("Could not unlock the direct-message key for this account.");
  }

  const wrappingKey = await derivePrivateKeyWrappingKey({
    password: safePassword,
    salt: base64ToUint8Array(salt),
    iterations,
    usages: ["decrypt"]
  });
  const decryptedBuffer = await getWebCrypto().decrypt(
    {
      name: "AES-GCM",
      iv: base64ToUint8Array(iv)
    },
    wrappingKey,
    base64ToUint8Array(ciphertext)
  );
  const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedBuffer));

  if (!privateKeyJwk || typeof privateKeyJwk !== "object" || Array.isArray(privateKeyJwk)) {
    throw new Error("Could not unlock the direct-message key for this account.");
  }

  return privateKeyJwk;
}

function resolveConversationPartner(conversation, currentUserId) {
  if (!conversation || !currentUserId) {
    return null;
  }

  return Array.isArray(conversation.participants)
    ? conversation.participants.find((participant) => participant.id !== currentUserId) || null
    : null;
}

function resolveUserPublicKeyByKeyId(userEncryption, keyId = "") {
  const safeKeyId = trimString(keyId);

  if (!userEncryption || !safeKeyId) {
    return null;
  }

  if (userEncryption.keyId === safeKeyId) {
    return userEncryption.publicKeyJwk;
  }

  return (
    (Array.isArray(userEncryption.previousKeys)
      ? userEncryption.previousKeys.find((entry) => entry.keyId === safeKeyId) || null
      : null)?.publicKeyJwk || null
  );
}

function hasRemotePrivateKeyEnvelopes(remoteEncryption) {
  return getRemoteKeyRecords(remoteEncryption).every((entry) => entry.privateKeyEnvelope);
}

async function buildDirectMessageEncryptionUploadPayload({
  keyRing,
  activeKeyId,
  password
}) {
  const normalizedKeyRing = normalizeStoredKeyRing(keyRing);
  const activeKeyRecord = getKeyRingRecord(normalizedKeyRing, activeKeyId);
  const safePassword = trimString(password);

  if (!normalizedKeyRing || !activeKeyRecord || !safePassword) {
    return null;
  }

  const previousKeyRecords = normalizedKeyRing.records.filter(
    (entry) => entry.keyId !== activeKeyRecord.keyId
  );

  return {
    keyId: activeKeyRecord.keyId,
    publicKeyJwk: activeKeyRecord.publicKeyJwk,
    privateKeyEnvelope: await wrapPrivateKeyForAccount({
      privateKeyJwk: activeKeyRecord.privateKeyJwk,
      password: safePassword
    }),
    previousKeys: await Promise.all(
      previousKeyRecords.map(async (entry) => ({
        keyId: entry.keyId,
        publicKeyJwk: entry.publicKeyJwk,
        privateKeyEnvelope: await wrapPrivateKeyForAccount({
          privateKeyJwk: entry.privateKeyJwk,
          password: safePassword
        })
      }))
    )
  };
}

async function uploadDirectMessageKeyRecord({ keyRing, activeKeyId, password }) {
  const payload = await buildDirectMessageEncryptionUploadPayload({
    keyRing,
    activeKeyId,
    password
  });

  if (!payload) {
    return null;
  }

  const response = await apiRequest("/users/me/direct-message-key", {
    method: "PUT",
    body: payload
  });

  return response.user || null;
}

async function resolveLocalAccountKeyRing({
  user,
  remoteEncryption,
  password = "",
  allowGeneration = false,
  strictUnwrap = false
} = {}) {
  const safeUserId = trimString(user?.id);
  const safePassword = trimString(password);
  let keyRing = getStoredKeyRing(safeUserId);

  if (!safeUserId) {
    return null;
  }

  for (const remoteKeyRecord of getRemoteKeyRecords(remoteEncryption)) {
    if (getStoredKeyRecord(safeUserId, remoteKeyRecord.keyId)) {
      continue;
    }

    if (!remoteKeyRecord.privateKeyEnvelope || !safePassword) {
      continue;
    }

    try {
      keyRing = upsertStoredKeyRecord(
        safeUserId,
        {
          version: DIRECT_MESSAGE_E2E_VERSION,
          algorithm: DIRECT_MESSAGE_E2E_ALGORITHM,
          keyId: remoteKeyRecord.keyId,
          publicKeyJwk: remoteKeyRecord.publicKeyJwk,
          privateKeyJwk: await unwrapPrivateKeyForAccount({
            privateKeyEnvelope: remoteKeyRecord.privateKeyEnvelope,
            password: safePassword
          })
        },
        {
          makeActive: remoteEncryption?.keyId === remoteKeyRecord.keyId
        }
      );
    } catch (error) {
      if (strictUnwrap) {
        throw error;
      }
    }
  }

  if (!keyRing && allowGeneration && safePassword && !remoteEncryption) {
    keyRing = upsertStoredKeyRecord(safeUserId, await generateDirectMessageKeyRecord(), {
      makeActive: true
    });
  }

  if (
    remoteEncryption?.keyId &&
    keyRing?.activeKeyId !== remoteEncryption.keyId &&
    getKeyRingRecord(keyRing, remoteEncryption.keyId)
  ) {
    saveStoredKeyRing(safeUserId, {
      ...keyRing,
      activeKeyId: remoteEncryption.keyId
    });
    keyRing = getStoredKeyRing(safeUserId);
  }

  return keyRing;
}

export async function ensureDirectMessageEncryptionSession({
  user,
  onUserUpdated,
  password = ""
} = {}) {
  if (!supportsDirectMessageEncryption() || !user?.id) {
    return user || null;
  }

  const remoteEncryption = normalizeUserDirectMessageEncryption(
    user.directMessageEncryption
  );
  const safePassword = trimString(password);
  const keyRing = await resolveLocalAccountKeyRing({
    user,
    remoteEncryption,
    password: safePassword,
    allowGeneration: true
  });
  const activeKeyId = remoteEncryption?.keyId || keyRing?.activeKeyId || "";
  const activeKeyRecord = getKeyRingRecord(keyRing, activeKeyId);

  if (!activeKeyRecord) {
    return user;
  }

  const remoteNeedsSync =
    !remoteEncryption ||
    !keyRecordSetMatchesRemote(remoteEncryption, {
      ...keyRing,
      activeKeyId: activeKeyRecord.keyId
    }) ||
    !hasRemotePrivateKeyEnvelopes(remoteEncryption);

  if (!remoteNeedsSync || !safePassword) {
    return user;
  }
  const updatedUser = await uploadDirectMessageKeyRecord({
    keyRing,
    activeKeyId: activeKeyRecord.keyId,
    password: safePassword
  });

  if (!updatedUser) {
    return user;
  }

  if (typeof onUserUpdated === "function") {
    return onUserUpdated(updatedUser);
  }

  return updatedUser;
}

export async function buildDirectMessageEncryptionPasswordChangePayload({
  user,
  currentPassword = "",
  nextPassword = ""
} = {}) {
  if (!supportsDirectMessageEncryption() || !user?.id) {
    return null;
  }

  if (!trimString(nextPassword)) {
    return null;
  }

  const remoteEncryption = normalizeUserDirectMessageEncryption(
    user.directMessageEncryption
  );

  if (!remoteEncryption && getStoredKeyRecords(user.id).length === 0) {
    return null;
  }

  let keyRing = null;

  try {
    keyRing = await resolveLocalAccountKeyRing({
      user,
      remoteEncryption,
      password: currentPassword,
      allowGeneration: false,
      strictUnwrap: true
    });
  } catch {
    return null;
  }

  if (!keyRing) {
    return null;
  }

  const activeKeyId = remoteEncryption?.keyId || keyRing.activeKeyId || "";

  if (!getKeyRingRecord(keyRing, activeKeyId)) {
    return null;
  }

  return buildDirectMessageEncryptionUploadPayload({
    keyRing,
    activeKeyId,
    password: nextPassword
  });
}

function resolveDirectMessageEncryptionContext({ conversation, currentUser } = {}) {
  if (!conversation || !currentUser?.id) {
    return null;
  }

  const recipient = resolveConversationPartner(conversation, currentUser.id);
  const recipientEncryption = normalizeUserDirectMessageEncryption(
    recipient?.directMessageEncryption
  );
  const currentUserEncryption = normalizeUserDirectMessageEncryption(
    currentUser.directMessageEncryption
  );
  const senderKeyRecord = getStoredKeyRecord(
    currentUser.id,
    currentUserEncryption?.keyId || ""
  );

  if (!recipientEncryption || !senderKeyRecord) {
    return null;
  }

  return {
    recipientEncryption,
    senderKeyRecord
  };
}

function buildDirectMessageEncryptionMetadata({
  iv,
  senderKeyRecord,
  recipientEncryption
}) {
  return {
    version: DIRECT_MESSAGE_E2E_VERSION,
    algorithm: DIRECT_MESSAGE_E2E_ALGORITHM,
    iv: arrayBufferToBase64(iv),
    senderKeyId: senderKeyRecord.keyId,
    recipientKeyId: recipientEncryption.keyId,
    senderPublicKeyJwk: senderKeyRecord.publicKeyJwk,
    recipientPublicKeyJwk: recipientEncryption.publicKeyJwk
  };
}

async function encryptDirectMessagePayloadBytes({
  conversation,
  currentUser,
  payloadBytes
} = {}) {
  if (!payloadBytes?.length || !currentUser?.id || !conversation) {
    return {
      encryptedPayload: "",
      encryption: null
    };
  }

  const encryptionContext = resolveDirectMessageEncryptionContext({
    conversation,
    currentUser
  });

  if (!encryptionContext) {
    return {
      encryptedPayload: "",
      encryption: null
    };
  }

  const { recipientEncryption, senderKeyRecord } = encryptionContext;
  const sharedKey = await deriveSharedKey({
    privateKeyJwk: senderKeyRecord.privateKeyJwk,
    publicKeyJwk: recipientEncryption.publicKeyJwk,
    usages: ["encrypt"]
  });
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await getWebCrypto().encrypt(
    {
      name: "AES-GCM",
      iv
    },
    sharedKey,
    payloadBytes
  );

  return {
    encryptedPayload: arrayBufferToBase64(encryptedBuffer),
    encryption: buildDirectMessageEncryptionMetadata({
      iv,
      senderKeyRecord,
      recipientEncryption
    })
  };
}

async function decryptDirectMessagePayloadBytes({
  conversation,
  currentUserId,
  message,
  encryptedPayload
}) {
  const encryption = normalizeMessageEncryptionMetadata(message?.encryption);
  const safeEncryptedPayload = trimString(encryptedPayload);
  const localKeyId =
    message?.senderId === currentUserId ? encryption?.senderKeyId : encryption?.recipientKeyId;
  const keyRecord = getStoredKeyRecord(currentUserId, localKeyId);

  if (!encryption || !safeEncryptedPayload || !keyRecord) {
    return null;
  }

  const conversationPartner = resolveConversationPartner(conversation, currentUserId);
  const partnerEncryption = normalizeUserDirectMessageEncryption(
    conversationPartner?.directMessageEncryption
  );
  const publicKeyJwk =
    message.senderId === currentUserId
      ? encryption.recipientPublicKeyJwk ||
        resolveUserPublicKeyByKeyId(partnerEncryption, encryption.recipientKeyId)
      : encryption.senderPublicKeyJwk;

  if (!publicKeyJwk) {
    return null;
  }

  try {
    const sharedKey = await deriveSharedKey({
      privateKeyJwk: keyRecord.privateKeyJwk,
      publicKeyJwk,
      usages: ["decrypt"]
    });
    const decryptedBuffer = await getWebCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: base64ToUint8Array(encryption.iv)
      },
      sharedKey,
      base64ToUint8Array(safeEncryptedPayload)
    );

    return new Uint8Array(decryptedBuffer);
  } catch {
    return null;
  }
}

export async function encryptDirectMessageText({
  conversation,
  currentUser,
  text
} = {}) {
  const normalizedText = normalizeMessageText(text);

  if (!normalizedText) {
    return {
      text: normalizedText,
      encryptedText: "",
      encryption: null
    };
  }

  const encryptedPayload = await encryptDirectMessagePayloadBytes({
    conversation,
    currentUser,
    payloadBytes: new TextEncoder().encode(normalizedText)
  });

  if (!encryptedPayload.encryption || !encryptedPayload.encryptedPayload) {
    return {
      text: normalizedText,
      encryptedText: "",
      encryption: null
    };
  }

  return {
    text: "",
    encryptedText: encryptedPayload.encryptedPayload,
    encryption: encryptedPayload.encryption
  };
}

export async function encryptDirectMessageVoiceNote({
  conversation,
  currentUser,
  voiceNote
} = {}) {
  const normalizedVoiceNote = normalizeVoiceNote(voiceNote);

  if (!normalizedVoiceNote) {
    return {
      voiceNote: null,
      encryption: null
    };
  }

  const audioBase64 = getVoiceNoteAudioBase64(normalizedVoiceNote);

  if (!audioBase64) {
    return {
      voiceNote: serializeVoiceNoteForTransport(normalizedVoiceNote),
      encryption: null
    };
  }

  const encryptedPayload = await encryptDirectMessagePayloadBytes({
    conversation,
    currentUser,
    payloadBytes: base64ToUint8Array(audioBase64)
  });

  if (!encryptedPayload.encryption || !encryptedPayload.encryptedPayload) {
    return {
      voiceNote: serializeVoiceNoteForTransport(normalizedVoiceNote),
      encryption: null
    };
  }

  return {
    voiceNote: serializeVoiceNoteForTransport({
      ...normalizedVoiceNote,
      audioBase64: "",
      encryptedAudioBase64: encryptedPayload.encryptedPayload,
      url: "",
      storageKey: "",
      dataUrl: "",
      source: ""
    }),
    encryption: encryptedPayload.encryption
  };
}

async function decryptDirectMessageText({
  conversation,
  currentUserId,
  message
}) {
  const decryptedBytes = await decryptDirectMessagePayloadBytes({
    conversation,
    currentUserId,
    message,
    encryptedPayload: message?.encryptedText
  });

  if (!decryptedBytes) {
    return DIRECT_MESSAGE_UNAVAILABLE_TEXT;
  }

  try {
    return new TextDecoder().decode(decryptedBytes);
  } catch {
    return DIRECT_MESSAGE_UNAVAILABLE_TEXT;
  }
}

async function decryptDirectMessageVoiceNote({
  conversation,
  currentUserId,
  message
}) {
  const encryptedAudioBase64 = trimString(message?.voiceNote?.encryptedAudioBase64);

  if (!encryptedAudioBase64) {
    return null;
  }

  const decryptedBytes = await decryptDirectMessagePayloadBytes({
    conversation,
    currentUserId,
    message,
    encryptedPayload: encryptedAudioBase64
  });

  if (!decryptedBytes) {
    return null;
  }

  return normalizeVoiceNote({
    ...message.voiceNote,
    audioBase64: arrayBufferToBase64(decryptedBytes),
    encryptedAudioBase64,
    dataUrl: "",
    source: "",
    pendingSync: false
  });
}

export async function decryptConversationMessages(conversation, currentUserId) {
  if (
    !supportsDirectMessageEncryption() ||
    !conversation ||
    !Array.isArray(conversation.messages) ||
    !currentUserId
  ) {
    return conversation;
  }

  const decryptedMessages = await Promise.all(
    conversation.messages.map(async (message) => {
      const hasEncryptedText = Boolean(trimString(message?.encryptedText) && message?.encryption);
      const hasEncryptedVoiceNote = Boolean(
        trimString(message?.voiceNote?.encryptedAudioBase64) && message?.encryption
      );

      if (!hasEncryptedText && !hasEncryptedVoiceNote) {
        return {
          ...message,
          isEndToEndEncrypted: false
        };
      }

      if (hasEncryptedVoiceNote) {
        const decryptedVoiceNote = await decryptDirectMessageVoiceNote({
          conversation,
          currentUserId,
          message
        });

        return decryptedVoiceNote
          ? {
              ...message,
              text: "",
              voiceNote: decryptedVoiceNote,
              isEndToEndEncrypted: true
            }
          : {
              ...message,
              text: DIRECT_MESSAGE_UNAVAILABLE_TEXT,
              voiceNote: null,
              isEndToEndEncrypted: true
            };
      }

      return {
        ...message,
        text: await decryptDirectMessageText({
          conversation,
          currentUserId,
          message
        }),
        isEndToEndEncrypted: true
      };
    })
  );

  return {
    ...conversation,
    messages: decryptedMessages
  };
}
