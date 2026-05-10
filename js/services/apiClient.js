import { STORAGE_KEYS } from "../config/storageKeys.js";
import { storage } from "../storage/storage.js";

const API_CONFIGURATION_ERROR_CODE = "API_CONFIGURATION_ERROR";
const RUNTIME_CONFIG_KEY = "BOITEKONG_PULSE_CONFIG";
const LEGACY_API_BASE_URL_KEY = "BOITEKONG_PULSE_API_BASE_URL";

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function getBrowserLocation() {
  return typeof window !== "undefined" && window.location ? window.location : null;
}

function isPrivateIpv4Host(hostname = "") {
  const normalizedHost = String(hostname || "").trim();

  if (!normalizedHost) {
    return false;
  }

  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalizedHost)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalizedHost)) {
    return true;
  }

  const match = normalizedHost.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);

  if (!match) {
    return false;
  }

  const secondOctet = Number.parseInt(match[1], 10);
  return secondOctet >= 16 && secondOctet <= 31;
}

function isLocalDevelopmentHost(hostname = "") {
  const normalizedHost = String(hostname || "").trim().toLowerCase();

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "::1" ||
    normalizedHost === "[::1]" ||
    normalizedHost === "0.0.0.0" ||
    normalizedHost.endsWith(".local") ||
    normalizedHost === "host.docker.internal" ||
    isPrivateIpv4Host(normalizedHost)
  );
}

function getRuntimeConfig() {
  if (typeof window === "undefined") {
    return {};
  }

  const runtimeConfig = window[RUNTIME_CONFIG_KEY];
  return typeof runtimeConfig === "object" && runtimeConfig !== null ? runtimeConfig : {};
}

function readConfiguredApiBaseUrl() {
  const runtimeConfig = getRuntimeConfig();
  const runtimeConfigBaseUrl =
    typeof runtimeConfig.API_BASE_URL === "string" ? runtimeConfig.API_BASE_URL : "";
  const legacyConfiguredBaseUrl =
    typeof window !== "undefined" && typeof window[LEGACY_API_BASE_URL_KEY] === "string"
      ? window[LEGACY_API_BASE_URL_KEY]
      : "";

  return trimTrailingSlash(runtimeConfigBaseUrl || legacyConfiguredBaseUrl);
}

function createApiConfigurationError() {
  const error = new Error(
    "Missing API base URL for this deployment. Set BOITEKONG_PULSE_CONFIG.API_BASE_URL in runtime-config.js, for example https://your-api.onrender.com/api."
  );
  error.code = API_CONFIGURATION_ERROR_CODE;
  return error;
}

function getBrowserOriginFallback() {
  const browserLocation = getBrowserLocation();

  if (
    browserLocation &&
    (browserLocation.protocol === "http:" || browserLocation.protocol === "https:")
  ) {
    return browserLocation.origin;
  }

  return "http://127.0.0.1";
}

function buildLocalApiBaseUrl(browserLocation) {
  const normalizedHost = String(browserLocation?.hostname || "").trim();

  if (
    !normalizedHost ||
    normalizedHost === "::1" ||
    normalizedHost === "[::1]" ||
    normalizedHost === "0.0.0.0"
  ) {
    return "http://127.0.0.1:4000/api";
  }

  return `http://${normalizedHost}:4000/api`;
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = readConfiguredApiBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const browserLocation = getBrowserLocation();

  if (browserLocation) {
    const { hostname, protocol } = browserLocation;

    if (protocol === "file:") {
      return "http://127.0.0.1:4000/api";
    }

    if (isLocalDevelopmentHost(hostname)) {
      return buildLocalApiBaseUrl(browserLocation);
    }
  }

  if (typeof window !== "undefined") {
    throw createApiConfigurationError();
  }

  return "http://127.0.0.1:4000/api";
}

function makeErrorFromResponse(body, fallbackMessage) {
  const error = new Error(body?.error?.message || fallbackMessage);
  error.code = body?.error?.code || "API_REQUEST_FAILED";
  error.field = body?.error?.field || null;
  error.details = body?.error?.details || null;
  return error;
}

export function getAccessToken() {
  return storage.get(STORAGE_KEYS.ACCESS_TOKEN, "");
}

export function setAccessToken(token) {
  if (typeof token === "string" && token.trim()) {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, token.trim());
    return token.trim();
  }

  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
  return "";
}

export function clearAccessToken() {
  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
}

export function ensureApiRuntimeConfiguration() {
  return resolveApiBaseUrl();
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function resolveApiAssetUrl(value = "") {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue || /^(?:https?:|data:|blob:)/i.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const apiBaseUrl = new URL(getApiBaseUrl(), getBrowserOriginFallback());
    return new URL(trimmedValue, `${apiBaseUrl.origin}/`).toString();
  } catch {
    return trimmedValue;
  }
}

export async function apiRequest(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${normalizedPath}`;
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  const method = String(options.method || "GET").toUpperCase();

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = options.body;
  const isBlobBody = typeof Blob !== "undefined" && body instanceof Blob;
  const isArrayBufferBody = body instanceof ArrayBuffer || ArrayBuffer.isView(body);

  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !isBlobBody &&
    !isArrayBufferBody
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      mode: "cors",
      cache: "no-store"
    });
  } catch (error) {
    const networkError = new Error(
      "Could not Login please try again later"
    );
    networkError.code = "API_NETWORK_ERROR";
    networkError.cause = error;
    throw networkError;
  }

  const contentType = response.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) {
      clearAccessToken();
    }

    throw makeErrorFromResponse(responseBody, "Request failed.");
  }

  return responseBody ?? {};
}
