export const SHARE_FEED_POST_PARAM = "yahneh-post";
export const SHARE_FEED_COMMENT_PARAM = "yahneh-comment";

const SHARE_BRAND_ICON_VERSION = "20260425-2";
const shareBrandIconUrl = new URL(
  `../../assets/logo/yahneh-icon.png?v=${SHARE_BRAND_ICON_VERSION}`,
  import.meta.url
).href;

let shareBrandFilePromise = null;

export function getShareableAppUrl() {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  const { protocol, hostname, origin } = window.location;

  if (!origin || protocol === "file:") {
    return "";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "";
  }

  try {
    return new URL(window.location.pathname || "/", origin).toString();
  } catch {
    return origin;
  }
}

export function buildShareableFeedUrl({ postId = "", focusCommentId = "" } = {}) {
  const appUrl = getShareableAppUrl();
  const safePostId = typeof postId === "string" ? postId.trim() : "";
  const safeFocusCommentId =
    typeof focusCommentId === "string" ? focusCommentId.trim() : "";

  if (!appUrl || !safePostId) {
    return "";
  }

  const url = new URL(appUrl);
  url.searchParams.set(SHARE_FEED_POST_PARAM, safePostId);

  if (safeFocusCommentId) {
    url.searchParams.set(SHARE_FEED_COMMENT_PARAM, safeFocusCommentId);
  }

  return url.toString();
}

export function buildShareClipboardText(text = "", url = "") {
  const safeText = typeof text === "string" ? text.trim() : "";
  const safeUrl = typeof url === "string" ? url.trim() : "";

  return [safeText, safeUrl].filter(Boolean).join("\n");
}

async function loadShareBrandFile() {
  if (shareBrandFilePromise) {
    return shareBrandFilePromise;
  }

  shareBrandFilePromise = (async () => {
    if (typeof fetch !== "function" || typeof File !== "function") {
      return null;
    }

    try {
      const response = await fetch(shareBrandIconUrl, {
        cache: "force-cache"
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return new File([blob], "yahneh-logo.png", {
        type: blob.type || "image/png"
      });
    } catch {
      return null;
    }
  })();

  return shareBrandFilePromise;
}

function canShareBrandFile(file) {
  if (!file || typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }

  try {
    return navigator.canShare({
      files: [file]
    });
  } catch {
    return false;
  }
}

export async function buildBrandedShareData({
  title = "",
  text = "",
  url = ""
} = {}) {
  const shareData = {};
  const safeTitle = typeof title === "string" ? title.trim() : "";
  const safeText = typeof text === "string" ? text.trim() : "";
  const safeUrl = typeof url === "string" ? url.trim() : "";

  if (safeTitle) {
    shareData.title = safeTitle;
  }

  if (safeText) {
    shareData.text = safeText;
  }

  if (safeUrl) {
    shareData.url = safeUrl;
  }

  const brandFile = await loadShareBrandFile();

  if (canShareBrandFile(brandFile)) {
    shareData.files = [brandFile];
  }

  return shareData;
}
