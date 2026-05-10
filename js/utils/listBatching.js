import { createElement } from "./dom.js";

export const FEED_BATCH_SIZE = 5;
export const COMMENT_BATCH_SIZE = 5;
export const REPLY_BATCH_SIZE = 3;
export const SEARCH_BATCH_SIZE = 8;
export const CHAT_BATCH_SIZE = 8;
export const NOTIFICATION_BATCH_SIZE = 8;
export const DISCOVER_USERS_BATCH_SIZE = 8;
export const THREAD_MESSAGE_BATCH_SIZE = 20;

function getDocumentScrollTop() {
  if (typeof window === "undefined") {
    return 0;
  }

  return window.scrollY || window.pageYOffset || 0;
}

export function preservePageScrollPosition(render) {
  if (typeof render !== "function") {
    return;
  }

  if (typeof window === "undefined") {
    return render();
  }

  const previousScrollTop = getDocumentScrollTop();
  const result = render();

  void Promise.resolve(result).finally(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: previousScrollTop,
        behavior: "auto"
      });
    });
  });

  return result;
}

export function preserveElementScrollPosition(element, render) {
  if (typeof render !== "function") {
    return;
  }

  if (!element || typeof window === "undefined") {
    return render();
  }

  const previousScrollTop = element.scrollTop;
  const result = render();

  void Promise.resolve(result).finally(() => {
    window.requestAnimationFrame(() => {
      if (!element.isConnected) {
        return;
      }

      element.scrollTop = Math.max(0, previousScrollTop);
    });
  });

  return result;
}

export function createLoadMoreControl({
  label = "See more",
  onClick,
  className = ""
}) {
  const row = createElement("div", {
    className: `list-load-more-row${className ? ` ${className}` : ""}`
  });
  const button = createElement("button", {
    className: "secondary-btn list-load-more-btn",
    type: "button",
    text: label
  });

  button.addEventListener("click", () => {
    if (typeof onClick === "function") {
      onClick();
    }
  });

  row.appendChild(button);
  return row;
}
