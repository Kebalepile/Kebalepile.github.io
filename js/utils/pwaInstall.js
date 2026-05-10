let deferredInstallPrompt = null;
let installPromptBound = false;
const installPromptListeners = new Set();

function emitInstallPromptChange() {
  installPromptListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors so prompt state updates continue.
    }
  });
}

function getUserAgent() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.navigator?.userAgent || "";
}

function isIosSafari() {
  const userAgent = getUserAgent();

  return (
    /iPad|iPhone|iPod/i.test(userAgent) &&
    /Safari/i.test(userAgent) &&
    !/CriOS|EdgiOS|FxiOS/i.test(userAgent)
  );
}

function isAndroidBrowser() {
  return /Android/i.test(getUserAgent());
}

export function isStandaloneApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator?.standalone === true
  );
}

export function bindInstallPrompt() {
  if (typeof window === "undefined" || installPromptBound) {
    return;
  }

  installPromptBound = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emitInstallPromptChange();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    emitInstallPromptChange();
  });
}

export function isInstallPromptReady() {
  bindInstallPrompt();
  return !isStandaloneApp() && Boolean(deferredInstallPrompt);
}

export function canInstallApp() {
  bindInstallPrompt();
  return !isStandaloneApp();
}

export function getInstallGuidance() {
  bindInstallPrompt();

  if (typeof window === "undefined") {
    return "Install is only available in the browser.";
  }

  if (isStandaloneApp()) {
    return "This app already looks installed on this device.";
  }

  if (!window.isSecureContext) {
    return "Open the app from http://localhost or HTTPS to install it. Browser install is blocked on local file URLs.";
  }

  if (Boolean(deferredInstallPrompt)) {
    return "Your browser is ready to show the install prompt.";
  }

  if (isIosSafari()) {
    return "On iPhone Safari, tap Share and choose Add to Home Screen.";
  }

  if (isAndroidBrowser()) {
    return "On Android, open the browser menu and choose Install app or Add to Home screen.";
  }

  return "Use your browser menu to install or add this app to your home screen.";
}

export async function promptInstallApp() {
  bindInstallPrompt();

  if (!deferredInstallPrompt) {
    return false;
  }

  const installPrompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  emitInstallPromptChange();

  try {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    return choice?.outcome === "accepted";
  } catch {
    return false;
  }
}

export function subscribeToInstallPromptChange(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  installPromptListeners.add(listener);

  return () => {
    installPromptListeners.delete(listener);
  };
}
