const TOWNSHIP_REGEX = /^(?=.{2,40}$)[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const EXTENSION_REGEX = /^(?=.{1,12}$)(?:Ext(?:ension)?\.?\s?\d{1,3}|\d{1,3})$/i;
const PHONE_REGEX = /^(?:\+?\d[\d -]{8,18}\d)$/;
export const MAX_AVATAR_FILE_BYTES = 1024 * 1024;
export const MAX_POST_IMAGE_BYTES = 1024 * 1024;
export const MAX_IMAGE_SOURCE_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_POST_CONTENT_LENGTH = 1000;
export const MAX_COMMENT_LENGTH = 300;
export const MAX_REPORT_NOTE_LENGTH = 120;
const ALLOWED_LOCAL_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_INLINE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_REACTION_TYPES = new Set(["like", "dislike"]);

const COMMON_WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "12345",
  "1234",
  "123",
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "qwerty",
  "qwerty123",
  "abc123",
  "111111",
  "000000",
  "iloveyou",
  "monkey",
  "dragon",
  "letmein",
  "welcome",
  "secret"
]);

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function countSpaces(value) {
  return (value.match(/ /g) || []).length;
}

function makeError(code, field, message) {
  const error = new Error(message);
  error.code = code;
  error.field = field;
  return error;
}

function hasVoiceNoteContent(voiceNote) {
  return Boolean(
    (typeof voiceNote?.audioBase64 === "string" && voiceNote.audioBase64.trim()) ||
      (typeof voiceNote?.url === "string" && /^https?:\/\//i.test(voiceNote.url.trim()))
  );
}

export function normalizeUsername(value) {
  return collapseWhitespace(value).normalize("NFKC");
}

export function normalizeTownship(value) {
  return collapseWhitespace(value);
}

export function normalizeExtension(value) {
  const cleaned = collapseWhitespace(value);

  if (/^\d{1,3}$/i.test(cleaned)) {
    return `Ext ${cleaned}`;
  }

  return cleaned
    .replace(/^extension/i, "Ext")
    .replace(/^ext\.?/i, "Ext")
    .replace(/\s+/g, " ");
}

export function normalizePhoneNumber(value) {
  return collapseWhitespace(value).replace(/\s*-\s*/g, "-");
}

export function normalizePassword(value) {
  return value.trim();
}

export function normalizePostContent(value) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function validateUsername(value) {
  const normalized = normalizeUsername(value);

  if (normalized.length < 3 || normalized.length > 30) {
    throw makeError(
      "USERNAME_LENGTH_INVALID",
      "username",
      "Username must be between 3 and 30 characters."
    );
  }

  if (!normalized.trim()) {
    throw makeError("USERNAME_BLANK", "username", "Username cannot be blank.");
  }

  if (countSpaces(normalized) > 3) {
    throw makeError(
      "USERNAME_TOO_MANY_SPACES",
      "username",
      "Username can contain a maximum of 3 spaces."
    );
  }

  if (/[<>]/.test(normalized)) {
    throw makeError(
      "USERNAME_INVALID_CHARACTERS",
      "username",
      "Username contains invalid characters."
    );
  }

  return normalized;
}

export function validateTownship(value) {
  const normalized = normalizeTownship(value);

  if (!TOWNSHIP_REGEX.test(normalized)) {
    throw makeError(
      "TOWNSHIP_INVALID",
      "township",
      "Township must be 2-40 letters and may include spaces, apostrophes, or hyphens."
    );
  }

  return normalized;
}

export function validateExtension(value) {
  const normalized = normalizeExtension(value);

  if (!EXTENSION_REGEX.test(normalized)) {
    throw makeError(
      "EXTENSION_INVALID",
      "extension",
      'Extension must look like "Ext 2" or "2".'
    );
  }

  return normalized;
}

function hasUppercase(value) {
  return /[A-Z]/.test(value);
}

function hasLowercase(value) {
  return /[a-z]/.test(value);
}

function hasNumber(value) {
  return /\d/.test(value);
}

function hasSpecialCharacter(value) {
  return /[^A-Za-z0-9]/.test(value);
}

function hasLongRepeat(value) {
  return /(.)\1{3,}/.test(value);
}

function hasSequentialPattern(value) {
  const lower = value.toLowerCase();
  const sequences = [
    "0123456789",
    "1234567890",
    "abcdefghijklmnopqrstuvwxyz",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];

  return sequences.some((sequence) => {
    for (let i = 0; i <= sequence.length - 4; i += 1) {
      const slice = sequence.slice(i, i + 4);
      if (lower.includes(slice)) return true;
    }
    return false;
  });
}

export function validatePassword(value) {
  const normalized = normalizePassword(value);

  if (normalized.length < 12 || normalized.length > 64) {
    throw makeError(
      "PASSWORD_LENGTH_INVALID",
      "password",
      "Password must be between 12 and 64 characters."
    );
  }

  if (!hasUppercase(normalized)) {
    throw makeError(
      "PASSWORD_NO_UPPERCASE",
      "password",
      "Password must include at least one uppercase letter."
    );
  }

  if (!hasLowercase(normalized)) {
    throw makeError(
      "PASSWORD_NO_LOWERCASE",
      "password",
      "Password must include at least one lowercase letter."
    );
  }

  if (!hasNumber(normalized)) {
    throw makeError(
      "PASSWORD_NO_NUMBER",
      "password",
      "Password must include at least one number."
    );
  }

  if (!hasSpecialCharacter(normalized)) {
    throw makeError(
      "PASSWORD_NO_SPECIAL",
      "password",
      "Password must include at least one special character."
    );
  }

  if (COMMON_WEAK_PASSWORDS.has(normalized.toLowerCase())) {
    throw makeError(
      "PASSWORD_TOO_COMMON",
      "password",
      "Password is too common. Choose a stronger password."
    );
  }

  if (hasLongRepeat(normalized)) {
    throw makeError(
      "PASSWORD_TOO_REPETITIVE",
      "password",
      "Password has too many repeated characters."
    );
  }

  if (hasSequentialPattern(normalized)) {
    throw makeError(
      "PASSWORD_TOO_PREDICTABLE",
      "password",
      "Password is too predictable. Avoid obvious sequences."
    );
  }

  return normalized;
}

export function validatePasswordConfirmation(password, confirmPassword) {
  const safePassword = validatePassword(password);
  const safeConfirmPassword = normalizePassword(confirmPassword);

  if (!safeConfirmPassword) {
    throw makeError(
      "PASSWORD_CONFIRM_REQUIRED",
      "confirmPassword",
      "Please confirm your password."
    );
  }

  if (safePassword !== safeConfirmPassword) {
    throw makeError(
      "PASSWORD_CONFIRM_MISMATCH",
      "confirmPassword",
      "Passwords do not match."
    );
  }

  return safePassword;
}

export function validateCurrentPassword(value) {
  const normalized = normalizePassword(value);

  if (!normalized) {
    throw makeError(
      "CURRENT_PASSWORD_REQUIRED",
      "currentPassword",
      "Current password is required to change password."
    );
  }

  return normalized;
}

export function validatePostContent(value) {
  const normalized = normalizePostContent(value);

  if (!normalized) {
    throw makeError("POST_CONTENT_REQUIRED", "content", "Post content is required.");
  }

  if (normalized.length > MAX_POST_CONTENT_LENGTH) {
    throw makeError(
      "POST_CONTENT_TOO_LONG",
      "content",
      `Post content must be ${MAX_POST_CONTENT_LENGTH} characters or fewer.`
    );
  }

  return normalized;
}

export function validateCommentContent(value) {
  const normalized = normalizePostContent(value);

  if (!normalized) {
    throw makeError("COMMENT_CONTENT_REQUIRED", "content", "Comment text is required.");
  }

  if (normalized.length > MAX_COMMENT_LENGTH) {
    throw makeError(
      "COMMENT_CONTENT_TOO_LONG",
      "content",
      `Comment text must be ${MAX_COMMENT_LENGTH} characters or fewer.`
    );
  }

  return normalized;
}

export function validatePhoneNumber(value) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return "";
  }

  if (!PHONE_REGEX.test(normalized)) {
    throw makeError(
      "PHONE_NUMBER_INVALID",
      "phoneNumber",
      "Phone number must use digits and may include spaces, +, or hyphens."
    );
  }

  return normalized;
}

export function validateRequiredPhoneNumber(value) {
  const normalized = validatePhoneNumber(value);

  if (!normalized) {
    throw makeError(
      "PHONE_NUMBER_REQUIRED",
      "phoneNumber",
      "Phone number is required."
    );
  }

  return normalized;
}

export function validatePostSubmission({ content = "", voiceNote = null }) {
  const hasVoiceNote = hasVoiceNoteContent(voiceNote);
  const normalizedContent = normalizePostContent(content || "");
  const hasText = Boolean(normalizedContent);

  if (!hasText && !hasVoiceNote) {
    throw makeError(
      "POST_BODY_REQUIRED",
      "content",
      "Add text or record a voice note."
    );
  }

  return {
    content: hasText ? validatePostContent(content) : "",
    voiceNote: hasVoiceNote ? voiceNote : null
  };
}

export function validateCommentSubmission({ content = "", voiceNote = null, mode = null }) {
  const hasVoiceNote = hasVoiceNoteContent(voiceNote);
  const normalizedContent = normalizePostContent(content || "");
  const hasText = Boolean(normalizedContent);

  if (mode === "voice") {
    if (!hasVoiceNote) {
      throw makeError(
        "COMMENT_VOICE_REQUIRED",
        "content",
        "Record a voice note before posting."
      );
    }

    return {
      content: "",
      voiceNote
    };
  }

  if (mode === "text") {
    return {
      content: validateCommentContent(content),
      voiceNote: null
    };
  }

  if (hasText && hasVoiceNote) {
    throw makeError(
      "COMMENT_MODE_CONFLICT",
      "content",
      "Choose text or voice note, not both."
    );
  }

  if (!hasText && !hasVoiceNote) {
    throw makeError(
      "COMMENT_BODY_REQUIRED",
      "content",
      "Add text or record a voice note."
    );
  }

  return hasText
    ? {
        content: validateCommentContent(content),
        voiceNote: null
      }
    : {
        content: "",
        voiceNote
      };
}

export function validateReactionType(value) {
  const reactionType = typeof value === "string" ? value.trim() : "";

  if (!ALLOWED_REACTION_TYPES.has(reactionType)) {
    throw makeError("REACTION_INVALID", "reactionType", "Invalid reaction type.");
  }

  return reactionType;
}

export function validateImageUrl(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) return "";

  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    return validateInlineImageDataUrl(trimmed, {
      field: "image",
      maxBytes: MAX_POST_IMAGE_BYTES
    });
  }

  try {
    const url = new URL(trimmed, window.location.origin);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw makeError(
        "IMAGE_URL_INVALID_PROTOCOL",
        "image",
        "Only http and https image URLs are allowed."
      );
    }

    return url.toString();
  } catch (error) {
    if (error.code) throw error;
    throw makeError("IMAGE_URL_INVALID", "image", "Image URL is invalid.");
  }
}

export function validateAvatarFile(file) {
  return validateLocalImageFile(file, {
    field: "avatar",
    label: "Profile photo"
  });
}

export function validatePostImageFile(file) {
  return validateLocalImageFile(file, {
    field: "image",
    label: "Post image"
  });
}

function validateLocalImageFile(file, { field = "image", label = "Image" } = {}) {
  if (!file) {
    return null;
  }

  if (!ALLOWED_LOCAL_IMAGE_TYPES.has(file.type)) {
    throw makeError(
      `${field.toUpperCase()}_TYPE_INVALID`,
      field,
      `${label} must be a PNG, JPG, or WEBP image.`
    );
  }

  if (file.size > MAX_IMAGE_SOURCE_FILE_BYTES) {
    throw makeError(
      `${field.toUpperCase()}_SOURCE_TOO_LARGE`,
      field,
      `${label} must be smaller than ${Math.round(MAX_IMAGE_SOURCE_FILE_BYTES / 1024 / 1024)} MB before compression.`
    );
  }

  return file;
}

function validateInlineImageDataUrl(
  value,
  { field = "image", maxBytes = MAX_POST_IMAGE_BYTES } = {}
) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);

  if (!match) {
    throw makeError("IMAGE_URL_INVALID", field, "Image data is invalid.");
  }

  const mimeType = match[1].toLowerCase();

  if (!ALLOWED_INLINE_IMAGE_TYPES.has(mimeType)) {
    throw makeError(
      "IMAGE_DATA_TYPE_INVALID",
      field,
      "Only PNG, JPG, and WEBP images are supported."
    );
  }

  const base64Payload = match[2];
  const paddingLength = (base64Payload.match(/=+$/)?.[0].length || 0);
  const sizeBytes = Math.floor((base64Payload.length * 3) / 4) - paddingLength;

  if (sizeBytes > maxBytes) {
    throw makeError(
      "IMAGE_DATA_TOO_LARGE",
      field,
      `Image must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller after compression.`
    );
  }

  return normalized;
}
