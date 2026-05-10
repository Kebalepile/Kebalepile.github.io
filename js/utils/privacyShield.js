const SENSITIVE_ROUTE_CLASS = "app-sensitive-route-messages";
const OBSCURED_CLASS = "app-privacy-obscured";
const SHORTCUT_OBSCURE_DURATION_MS = 1800;

function isScreenshotShortcutEvent(event) {
  const key = typeof event?.key === "string" ? event.key.toLowerCase() : "";
  const code = typeof event?.code === "string" ? event.code : "";

  if (key === "printscreen" || code === "PrintScreen") {
    return true;
  }

  if (event?.metaKey && event?.shiftKey && key === "s") {
    return true;
  }

  if (event?.metaKey && event?.shiftKey && (key === "3" || key === "4")) {
    return true;
  }

  return false;
}

export function enableSensitiveMessagesShield() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  const body = document.body;

  if (!body) {
    return () => {};
  }

  let blurred = document.hasFocus?.() === false;
  let printing = false;
  let shortcutObscured = false;
  let shortcutTimeoutId = 0;

  const clearShortcutTimeout = () => {
    if (!shortcutTimeoutId) {
      return;
    }

    window.clearTimeout(shortcutTimeoutId);
    shortcutTimeoutId = 0;
  };

  const obscureForShortcut = () => {
    shortcutObscured = true;
    sync();
    clearShortcutTimeout();
    shortcutTimeoutId = window.setTimeout(() => {
      shortcutObscured = false;
      shortcutTimeoutId = 0;
      sync();
    }, SHORTCUT_OBSCURE_DURATION_MS);
  };

  const sync = () => {
    const shouldObscure =
      document.visibilityState === "hidden" || blurred || printing || shortcutObscured;
    body.classList.add(SENSITIVE_ROUTE_CLASS);
    body.classList.toggle(OBSCURED_CLASS, shouldObscure);
  };

  const handleBlur = () => {
    blurred = true;
    sync();
  };

  const handleFocus = () => {
    blurred = false;
    sync();
  };

  const handleVisibilityChange = () => {
    sync();
  };

  const handlePageHide = () => {
    blurred = true;
    sync();
  };

  const handlePageShow = () => {
    blurred = document.hasFocus?.() === false;
    sync();
  };
  const handleBeforePrint = () => {
    printing = true;
    sync();
  };
  const handleAfterPrint = () => {
    printing = false;
    sync();
  };
  const handleKeyDown = (event) => {
    if (isScreenshotShortcutEvent(event)) {
      obscureForShortcut();
    }
  };

  sync();

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("beforeprint", handleBeforePrint);
  window.addEventListener("afterprint", handleAfterPrint);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    clearShortcutTimeout();
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("beforeprint", handleBeforePrint);
    window.removeEventListener("afterprint", handleAfterPrint);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    body.classList.remove(SENSITIVE_ROUTE_CLASS, OBSCURED_CLASS);
  };
}
