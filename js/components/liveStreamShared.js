import { createElement } from "../utils/dom.js";
import { liveStreamCommentService } from "../services/liveStreamCommentService.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import {
  SHARE_FEED_COMMENT_PARAM,
  SHARE_FEED_POST_PARAM
} from "../utils/share.js";

export const LIVE_REACTIONS = [
  { label: "Heart", emoji: "❤️" },
  { label: "Clap", emoji: "👏" },
  { label: "Fire", emoji: "🔥" },
  { label: "Joy", emoji: "😂" },
  { label: "Celebrate", emoji: "🎉" }
];
const SHARE_LIVE_STREAM_PARAM = "liveStream";

function updateLiveVideoAspect(video) {
  const width = video?.videoWidth || 0;
  const height = video?.videoHeight || 0;

  if (!width || !height) {
    return;
  }

  const videoBody = video.closest?.(".live-video-body") || null;
  video.style.setProperty("--live-video-aspect-ratio", `${width} / ${height}`);
  videoBody?.style.setProperty("--live-video-aspect-ratio", `${width} / ${height}`);
  video.classList.toggle("live-video-feed-portrait", height > width);
  videoBody?.classList.toggle("live-video-body-portrait", height > width);
}

function getLiveIconPath(name) {
  const paths = {
    camera: "M4 7h10a2 2 0 0 1 2 2v1.5l4-2.5v8l-4-2.5V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z",
    "camera-off": "M3 3l18 18M9.5 7H14a2 2 0 0 1 2 2v1.5l4-2.5v8l-2.3-1.4M13.5 17H4a2 2 0 0 1-2-2V9c0-.8.5-1.5 1.2-1.8",
    mic: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 10v1a7 7 0 0 0 14 0v-1M12 18v3M9 21h6",
    "mic-off": "M3 3l18 18M9 6.5V11a3 3 0 0 0 4.7 2.5M15 9.5V6a3 3 0 0 0-5.1-2.1M5 10v1a7 7 0 0 0 9.3 6.6M19 10v1a7 7 0 0 1-1 3.6M12 18v3M9 21h6",
    power: "M12 3v8M7 6.8a7 7 0 1 0 10 0",
    monitor: "M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM9 21h6",
    share: "M12 3v11M8 7l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
    stop: "M8 8h8v8H8zM12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    rotate: "M4 4v6h6M20 20v-6h-6M5 14a7 7 0 0 0 12 4M19 10A7 7 0 0 0 7 6"
  };

  return paths[name] || paths.eye;
}

export function createLiveIcon(name, className = "live-inline-icon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add(className);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", getLiveIconPath(name));
  svg.appendChild(path);

  return svg;
}

export function createLiveIconText(iconName, label) {
  const content = createElement("span", { className: "live-icon-text" });
  const text = createElement("span", {
    className: "live-icon-label",
    text: label
  });

  content.append(createLiveIcon(iconName), text);
  return content;
}

export function setLiveIconButton(button, { iconName, label }) {
  button.replaceChildren(createLiveIconText(iconName, label));
  button.setAttribute("aria-label", label);
  button.title = label;
}

export function setLiveIconOnlyButton(button, { iconName, label }) {
  button.replaceChildren(createLiveIcon(iconName));
  button.setAttribute("aria-label", label);
  button.title = label;
}

export function createViewerCountElement({
  count = 0,
  className = "live-viewer-count"
} = {}) {
  const safeCount = Math.max(Number(count) || 0, 0);
  const root = createElement("span", { className });
  const label = createElement("span", {
    className: "live-viewer-count-label",
    text: `${formatCompactCount(safeCount)} watching`
  });

  root.setAttribute("title", `${safeCount} watching`);
  root.setAttribute("aria-label", `${safeCount} watching`);
  root.append(createLiveIcon("eye"), label);
  return root;
}

export function setViewerCount(element, count = 0) {
  const safeCount = Math.max(Number(count) || 0, 0);
  const label = element?.querySelector(".live-viewer-count-label");

  element?.setAttribute("title", `${safeCount} watching`);
  element?.setAttribute("aria-label", `${safeCount} watching`);

  if (label) {
    label.textContent = `${formatCompactCount(safeCount)} watching`;
    return;
  }

  element?.replaceChildren(
    createLiveIcon("eye"),
    createElement("span", {
      className: "live-viewer-count-label",
      text: `${formatCompactCount(safeCount)} watching`
    })
  );
}

export function buildLiveStreamShareUrl(streamId) {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_FEED_POST_PARAM);
  url.searchParams.delete(SHARE_FEED_COMMENT_PARAM);
  url.searchParams.set(SHARE_LIVE_STREAM_PARAM, streamId);
  return url.toString();
}

export function formatLiveDuration(startTime) {
  const startedAt = new Date(startTime).getTime();

  if (!Number.isFinite(startedAt)) {
    return "0m";
  }

  const totalSeconds = Math.max(Math.floor((Date.now() - startedAt) / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function createLiveVideo({ id, muted = false } = {}) {
  const video = createElement("video", {
    className: "live-video-feed",
    id,
    attributes: {
      autoplay: "",
      playsinline: "",
      controls: ""
    }
  });

  video.autoplay = true;
  video.playsInline = true;
  video.muted = muted;
  video.controls = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.display = "block";
  video.addEventListener("loadedmetadata", () => updateLiveVideoAspect(video));
  video.addEventListener("resize", () => updateLiveVideoAspect(video));
  return video;
}

export function createLiveChatPanel({
  streamId,
  onSend = () => {},
  canModerateMessage = () => false,
  onModerationAction = () => {}
} = {}) {
  const panel = createElement("aside", {
    className: "live-chat-panel",
    attributes: {
      "aria-label": "Live chat"
    }
  });
  const header = createElement("div", { className: "live-chat-header" });
  const title = createElement("strong", {
    className: "live-chat-title",
    text: "Live chat"
  });
  const messages = createElement("div", {
    className: "live-chat-messages",
    attributes: {
      "aria-live": "polite"
    }
  });
  const form = createElement("form", { className: "live-chat-form" });
  const input = createElement("input", {
    className: "live-chat-input",
    type: "text",
    placeholder: "Say something",
    autocomplete: "off",
    attributes: {
      maxlength: "500",
      "aria-label": "Live chat message"
    }
  });
  const sendButton = createElement("button", {
    className: "primary-btn live-chat-send-btn",
    type: "submit",
    text: "Send"
  });
  const reactions = createElement("div", {
    className: "live-reaction-row",
    attributes: {
      "aria-label": "Live reactions"
    }
  });

  LIVE_REACTIONS.forEach((reaction) => {
    const button = createElement("button", {
      className: "secondary-btn live-reaction-btn",
      type: "button",
      text: reaction.emoji,
      attributes: {
        "aria-label": reaction.label,
        title: reaction.label
      }
    });

    button.addEventListener("click", () => {
      liveStreamCommentService.sendReaction(streamId, reaction.emoji);
      onSend();
    });
    reactions.appendChild(button);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();

    if (!text) {
      return;
    }

    liveStreamCommentService.sendComment(streamId, text);
    input.value = "";
    onSend();
  });

  header.appendChild(title);
  form.append(input, sendButton);
  panel.append(header, messages, reactions, form);

  return {
    root: panel,
    messages,
    addMessage(message) {
      const row = createElement("div", { className: "live-chat-message" });
      const meta = createElement("div", { className: "live-chat-message-meta" });
      const author = createElement("strong", {
        className: "live-chat-author",
        text: message.username || "Neighbor"
      });
      const text = createElement("span", {
        className: "live-chat-text",
        text: message.text || ""
      });

      meta.appendChild(author);

      if (canModerateMessage(message)) {
        const actions = createElement("div", { className: "live-chat-message-actions" });
        const menuButton = createElement("button", {
          className: "live-chat-message-menu-btn",
          type: "button",
          text: "...",
          attributes: {
            "aria-label": `Moderate ${message.username || "viewer"}`,
            "aria-expanded": "false"
          }
        });
        const menu = createElement("div", {
          className: "live-chat-message-menu",
          attributes: {
            hidden: ""
          }
        });
        const makeActionButton = ({ action, label, danger = false }) => {
          const button = createElement("button", {
            className: danger
              ? "live-chat-message-menu-item live-chat-message-menu-item-danger"
              : "live-chat-message-menu-item",
            type: "button",
            text: label
          });

          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            menu.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
            onModerationAction(action, message, row);
          });
          return button;
        };

        menu.append(
          makeActionButton({ action: "like", label: "👍🏾" }),
          makeActionButton({ action: "heart", label: "❤️" }),
          makeActionButton({ action: "mute", label: "🤫" }),
          makeActionButton({ action: "kick", label: "Kick out", danger: true })
        );
        menuButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          menu.hidden = !menu.hidden;
          menuButton.setAttribute("aria-expanded", String(!menu.hidden));
        });
        actions.append(menuButton, menu);
        meta.appendChild(actions);
      }

      row.append(meta, text);
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
    }
  };
}
