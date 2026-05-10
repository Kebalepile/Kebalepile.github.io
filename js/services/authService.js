import { apiRequest, clearAccessToken, getAccessToken, setAccessToken } from "./apiClient.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { storage } from "../storage/storage.js";
import {
  clearCurrentUser,
  deleteUserAvatarRemote,
  getCurrentUser,
  resetUserState,
  setCurrentUser,
  syncCurrentUserFromApi,
  uploadUserAvatarRemote,
  updateUserProfileRemote,
  upsertUser
} from "./userService.js";
import {
  buildDirectMessageEncryptionPasswordChangePayload,
  ensureDirectMessageEncryptionSession
} from "./directMessageEncryptionService.js";
import { resetConversationState } from "./messageService.js";
import { resetNotificationState } from "./notificationService.js";
import { resetPostState } from "./postService.js";
import { resetReportState } from "./reportService.js";

function clearClientSessionState() {
  resetPostState();
  resetConversationState();
  resetNotificationState();
  resetReportState();
  resetUserState();
  storage.remove(STORAGE_KEYS.USERS);
  clearAccessToken();
  clearCurrentUser();
}

async function persistAuthenticatedSession({ token, user, password = "" }) {
  clearClientSessionState();
  setAccessToken(token);
  let normalizedUser = upsertUser(user);
  setCurrentUser(normalizedUser);
  normalizedUser = await ensureDirectMessageEncryptionSession({
    user: normalizedUser,
    password,
    onUserUpdated: (updatedUser) => {
      const nextUser = upsertUser(updatedUser);
      setCurrentUser(nextUser);
      return nextUser;
    }
  });
  return normalizedUser;
}

export async function registerUser({
  username,
  phoneNumber = "",
  province = "",
  municipality = "",
  township,
  extension,
  area = "",
  streetName = "",
  password,
  confirmPassword
}) {
  const response = await apiRequest("/auth/register", {
    auth: false,
    method: "POST",
    body: {
      username,
      phoneNumber,
      province,
      municipality,
      township,
      extension,
      area,
      streetName,
      password,
      confirmPassword
    }
  });

  return persistAuthenticatedSession({
    ...response,
    password
  });
}

export async function requestRegistrationOtp({
  username,
  phoneNumber = "",
  province = "",
  municipality = "",
  township,
  extension,
  area = "",
  streetName = "",
  password,
  confirmPassword
}) {
  return apiRequest("/auth/register/request", {
    auth: false,
    method: "POST",
    body: {
      username,
      phoneNumber,
      province,
      municipality,
      township,
      extension,
      area,
      streetName,
      password,
      confirmPassword
    }
  });
}

export async function verifyRegistrationOtp({ phoneNumber, code }) {
  return apiRequest("/auth/register/verify", {
    auth: false,
    method: "POST",
    body: {
      phoneNumber,
      code
    }
  });
}

export async function loginUser({ identifier, password }) {
  const response = await apiRequest("/auth/login", {
    auth: false,
    method: "POST",
    body: {
      identifier,
      password
    }
  });

  return persistAuthenticatedSession({
    ...response,
    password
  });
}

export async function requestPasswordResetOtp({ phoneNumber }) {
  return apiRequest("/auth/password-reset/request", {
    auth: false,
    method: "POST",
    body: {
      phoneNumber
    }
  });
}

export async function resetPasswordWithOtp({
  phoneNumber,
  code,
  newPassword,
  confirmNewPassword
}) {
  return apiRequest("/auth/password-reset/confirm", {
    auth: false,
    method: "POST",
    body: {
      phoneNumber,
      code,
      newPassword,
      confirmNewPassword
    }
  });
}

export async function updateAuthenticatedUserProfile({
  currentUser,
  username,
  phoneNumber,
  province,
  municipality,
  township,
  extension,
  area,
  streetName,
  avatarDataUrl,
  currentPassword,
  newPassword,
  confirmNewPassword
}) {
  if (!currentUser?.id) {
    const authError = new Error("You must be logged in.");
    authError.code = "AUTH_REQUIRED";
    throw authError;
  }

  const wantsPasswordChange =
    String(newPassword ?? "").trim() || String(confirmNewPassword ?? "").trim();
  let directMessageEncryption;

  if (wantsPasswordChange) {
    directMessageEncryption = await buildDirectMessageEncryptionPasswordChangePayload({
      user: currentUser,
      currentPassword,
      nextPassword: newPassword
    });
  }

  return updateUserProfileRemote({
    username,
    phoneNumber,
    province,
    municipality,
    township,
    extension,
    area,
    streetName,
    avatarDataUrl,
    currentPassword,
    newPassword,
    confirmNewPassword,
    directMessageEncryption
  });
}

export async function uploadAuthenticatedUserAvatar({ currentUser, file }) {
  if (!currentUser?.id) {
    const authError = new Error("You must be logged in.");
    authError.code = "AUTH_REQUIRED";
    throw authError;
  }

  return uploadUserAvatarRemote({
    file
  });
}

export async function deleteAuthenticatedUserAvatar({ currentUser }) {
  if (!currentUser?.id) {
    const authError = new Error("You must be logged in.");
    authError.code = "AUTH_REQUIRED";
    throw authError;
  }

  return deleteUserAvatarRemote();
}

export async function requestPhoneVerificationOtp() {
  return apiRequest("/auth/otp/send", {
    method: "POST"
  });
}

export async function verifyAuthenticatedUserPhoneOtp({ code }) {
  await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: {
      code
    }
  });

  return syncCurrentUserFromApi();
}

export function getAuthenticatedUser() {
  return getCurrentUser();
}

export async function resolveAuthenticatedUser() {
  const currentUser = getCurrentUser();
  const accessToken = getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const resolvedUser = await syncCurrentUserFromApi();
    return ensureDirectMessageEncryptionSession({
      user: resolvedUser,
      onUserUpdated: (updatedUser) => {
        const nextUser = upsertUser(updatedUser);
        setCurrentUser(nextUser);
        return nextUser;
      }
    });
  } catch (error) {
    if (error?.code === "API_NETWORK_ERROR" && currentUser?.id) {
      return currentUser;
    }

    clearClientSessionState();
    return null;
  }
}

export function logoutUser() {
  clearClientSessionState();
}
