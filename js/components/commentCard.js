import { createElement } from "../utils/dom.js";
import {
  formatVoiceNoteDuration,
  configureVoiceNoteAudio,
  getVoiceNoteSource,
  getVoiceNotePendingSyncMessage,
  getNextVoiceNotePlaybackRate,
  formatVoiceNotePlaybackRate,
  isVoiceNotePendingSync
} from "../utils/voiceNotes.js";
import { setVoiceNoteControlIcon } from "../utils/voiceNoteIcons.js";
import {
  createVoiceNoteVisualizer,
  attachVoiceNoteScrubber
} from "../utils/voiceNoteVisualizer.js";
import { createAvatarElement } from "../utils/avatar.js";
import { formatCompactCount } from "../utils/numberFormat.js";

export function createCommentCard(comment, author, options = {}) {
  const {
    isReply = false,
    isPostAuthor = false,
    replyingTo = "",
    repliesCount = 0,
    repliesExpanded = false,
    reactionBar = null,
    onReply = null,
    onToggleReplies = null,
    onOpenMenu = null,
    onOpenProfile = null
  } = options;

  const card = createElement("div", {
    className: `comment-card${isReply ? " comment-card-reply" : ""}`
  });

  const main = createElement("div", { className: "comment-card-main" });
  const authorAvatarElement = createAvatarElement(author, {
    size: "sm",
    className: "comment-avatar",
    decorative: true
  });
  const body = createElement("div", { className: "comment-card-body" });
  const metaRow = createElement("div", { className: "comment-meta-row" });
  const authorText = createElement("div", { className: "comment-author-text" });
  const authorName = createElement("span", {
    className: "comment-author",
    text: `@${author?.username || "Unknown User"}`
  });
  const authorBadge = isPostAuthor
    ? createElement("span", {
        className: "comment-author-badge",
        text: "Author"
      })
    : null;
  const meta = createElement("span", {
    className: "comment-meta",
    text: formatCommentMeta(comment)
  });

  const authorAvatar =
    typeof onOpenProfile === "function"
      ? createProfileTriggerButton({
          className: "user-preview-trigger user-preview-trigger-avatar",
          label: `Open ${author?.username || "user"} profile`,
          onClick: onOpenProfile,
          child: authorAvatarElement
        })
      : authorAvatarElement;
  const authorNameNode =
    typeof onOpenProfile === "function"
      ? createProfileTriggerButton({
          className: "user-preview-trigger user-preview-trigger-text",
          label: `Open ${author?.username || "user"} profile`,
          onClick: onOpenProfile,
          child: authorName
        })
      : authorName;

  authorText.append(authorNameNode);

  if (authorBadge) {
    authorText.appendChild(authorBadge);
  }

  authorText.appendChild(meta);
  metaRow.appendChild(authorText);

  if (typeof onOpenMenu === "function") {
    const menuBtn = createIconActionButton({
      className: "comment-menu-btn",
      iconName: "more",
      label: "Comment options"
    });

    menuBtn.addEventListener("click", onOpenMenu);
    main.appendChild(menuBtn);
  }

  body.appendChild(metaRow);

  if (isReply && replyingTo) {
    body.appendChild(
      createElement("p", {
        className: "comment-reply-context",
        text: `Replying to @${replyingTo}`
      })
    );
  }

  if (comment.content) {
    const content = createElement("p", {
      className: "comment-content",
      text: comment.content
    });

    body.appendChild(content);
  }

  let engagementRow = null;

  if (reactionBar || typeof onReply === "function") {
    engagementRow = createElement("div", {
      className: "comment-engagement-row"
    });
  }

  if (reactionBar) {
    const reactionScroller = createElement("div", {
      className: "comment-reaction-scroller"
    });
    reactionScroller.appendChild(reactionBar);
    engagementRow?.appendChild(reactionScroller);
  }

  if (typeof onReply === "function") {
    const replyBtn = createElement("button", {
      className: "comment-reply-text-btn",
      type: "button",
      text: "Reply",
      attributes: {
        "aria-label": "Reply to comment",
        title: "Reply to comment"
      }
    });

    replyBtn.addEventListener("click", onReply);
    engagementRow?.appendChild(replyBtn);
  }

  if (engagementRow) {
    body.appendChild(engagementRow);
  }

  if (repliesCount > 0 && typeof onToggleReplies === "function") {
    const actions = createElement("div", { className: "comment-card-actions" });
    const repliesBtn = createElement("button", {
      className: "comment-replies-toggle-link",
      type: "button"
    });
    let isExpanded = repliesExpanded;
    const repliesText = createElement("span", {
      className: "comment-replies-toggle-text",
      text: getRepliesToggleLabel(repliesCount)
    });
    const repliesIcon = createCommentActionIcon("chevron");
    repliesIcon.classList.add("comment-replies-toggle-icon");

    repliesBtn.append(repliesText, repliesIcon);
    repliesBtn.classList.toggle("comment-replies-toggle-link-expanded", repliesExpanded);

    repliesBtn.addEventListener("click", () => {
      onToggleReplies();
      isExpanded = !isExpanded;
      repliesBtn.classList.toggle("comment-replies-toggle-link-expanded", isExpanded);
    });

    actions.appendChild(repliesBtn);
    body.appendChild(actions);
  }

  if (getVoiceNoteSource(comment.voiceNote)) {
    body.appendChild(createVoiceNotePlayer(comment.voiceNote));
  } else if (isVoiceNotePendingSync(comment.voiceNote)) {
    body.appendChild(createVoiceNotePendingNotice());
  }

  main.prepend(authorAvatar, body);
  card.appendChild(main);

  return card;
}

function getRepliesToggleLabel(repliesCount) {
  return `${formatCompactCount(repliesCount)} ${repliesCount === 1 ? "reply" : "replies"}`;
}

function createProfileTriggerButton({ className, label, onClick, child }) {
  const button = createElement("button", {
    className,
    type: "button",
    attributes: {
      "aria-label": label,
      title: label
    }
  });

  button.appendChild(child);
  button.addEventListener("click", onClick);
  return button;
}

function createIconActionButton({ className, iconName, label }) {
  const button = createElement("button", {
    className,
    type: "button",
    attributes: {
      "aria-label": label,
      title: label
    }
  });

  button.appendChild(createCommentActionIcon(iconName));
  return button;
}

function createCommentActionIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("comment-ui-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", getCommentActionIconPath(name));
  svg.appendChild(path);

  return svg;
}

function getCommentActionIconPath(name) {
  const iconPaths = {
    reply:
      "M20 4H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3v4l5.2-4H20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 11h-8.5L9 16.9V15H4V6h16v9Z",
    chevron:
      "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z",
    more:
      "M12 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 7Zm0 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 14Zm0 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 21Z"
  };

  return iconPaths[name] || iconPaths.more;
}

export function createVoiceNotePlayer(voiceNote) {
  const block = createElement("div", {
    className: "comment-voice-note voice-note-player"
  });
  const shell = createElement("div", { className: "voice-note-shell" });
  const bubble = createElement("div", {
    className: "voice-note-bubble voice-note-bubble-posted voice-note-meter voice-note-meter-seekable"
  });
  const playBtn = createElement("button", {
    className: "voice-note-btn voice-note-icon-btn voice-note-main-btn",
    type: "button",
    text: "\u25B6",
    attributes: {
      "aria-label": "Play voice note",
      title: "Play voice note"
    }
  });
  const waveform = createElement("div", { className: "voice-note-waveform" });
  const progressLine = createElement("span", { className: "voice-note-progress-line" });
  const meta = createElement("div", { className: "voice-note-meta" });
  const timer = createElement("p", {
    className: "voice-note-timer",
    text: formatVoiceNoteDuration(voiceNote.durationMs)
  });
  const speedBtn = createElement("button", {
    className: "voice-note-speed-btn",
    type: "button",
    text: formatVoiceNotePlaybackRate(1),
    attributes: {
      "aria-label": "Change voice note playback speed",
      title: "Change voice note playback speed"
    }
  });

  waveform.appendChild(progressLine);
  meta.append(timer, speedBtn);
  bubble.append(playBtn, waveform, meta);
  shell.appendChild(bubble);

  const audio = document.createElement("audio");
  audio.className = "comment-voice-audio";
  configureVoiceNoteAudio(audio, getVoiceNoteSource(voiceNote));

  const visualizer = createVoiceNoteVisualizer({
    waveformElement: waveform,
    progressLineElement: progressLine
  });
  const totalDurationSeconds = Math.max(voiceNote.durationMs / 1000, 0);
  let resumeAfterSeek = false;
  let playbackRate = 1;
  let progressAnimationFrameId = null;

  const syncPlayer = () => {
    const isPlaying = !audio.paused && !audio.ended;
    const progressRatio = audio.ended
      ? 1
      : totalDurationSeconds > 0
        ? audio.currentTime / totalDurationSeconds
        : 0;

    bubble.classList.toggle("voice-note-bubble-playing", isPlaying);
    setVoiceNoteControlIcon(playBtn, isPlaying ? "pause" : "play");
    playBtn.setAttribute("aria-label", isPlaying ? "Pause voice note" : "Play voice note");
    playBtn.title = isPlaying ? "Pause voice note" : "Play voice note";

    visualizer.renderStoredWaveform({
      waveform: voiceNote.waveform,
      progressRatio
    });

    timer.textContent =
      audio.currentTime > 0
        ? `${formatVoiceNoteDuration(audio.currentTime * 1000)} / ${formatVoiceNoteDuration(voiceNote.durationMs)}`
        : formatVoiceNoteDuration(voiceNote.durationMs);
  };

  const applyPlaybackRate = () => {
    audio.playbackRate = playbackRate;
    speedBtn.textContent = formatVoiceNotePlaybackRate(playbackRate);
  };

  const stopProgressAnimation = () => {
    if (progressAnimationFrameId) {
      window.cancelAnimationFrame(progressAnimationFrameId);
      progressAnimationFrameId = null;
    }
  };

  const startProgressAnimation = () => {
    if (progressAnimationFrameId) {
      return;
    }

    const tick = () => {
      syncPlayer();

      if (!audio.paused && !audio.ended) {
        progressAnimationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      progressAnimationFrameId = null;
    };

    progressAnimationFrameId = window.requestAnimationFrame(tick);
  };

  playBtn.addEventListener("click", async () => {
    try {
      if (audio.paused || audio.ended) {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        await audio.play();
      } else {
        audio.pause();
      }

      syncPlayer();
    } catch {
      timer.textContent = formatVoiceNoteDuration(voiceNote.durationMs);
    }
  });

  speedBtn.addEventListener("click", () => {
    playbackRate = getNextVoiceNotePlaybackRate(playbackRate);
    applyPlaybackRate();
  });

  audio.addEventListener("play", () => {
    startProgressAnimation();
    syncPlayer();
  });

  ["pause", "ended"].forEach((eventName) => {
    audio.addEventListener(eventName, () => {
      stopProgressAnimation();
      syncPlayer();
    });
  });

  ["timeupdate", "loadedmetadata"].forEach((eventName) => {
    audio.addEventListener(eventName, syncPlayer);
  });

  attachVoiceNoteScrubber({
    scrubElement: bubble,
    isEnabled: () => Boolean(voiceNote.durationMs),
    getDurationMs: () => voiceNote.durationMs,
    onSeekStart: () => {
      resumeAfterSeek = !audio.paused && !audio.ended;
      audio.pause();
    },
    onSeek: ({ timeMs }) => {
      audio.currentTime = timeMs / 1000;
      syncPlayer();
    },
    onSeekEnd: async () => {
      if (resumeAfterSeek) {
        try {
          await audio.play();
        } catch {
          timer.textContent = formatVoiceNoteDuration(voiceNote.durationMs);
        }
      }

      resumeAfterSeek = false;
      syncPlayer();
    }
  });

  applyPlaybackRate();
  setVoiceNoteControlIcon(playBtn, "play");
  syncPlayer();
  block.append(shell, audio);

  return block;
}

export function createVoiceNotePendingNotice({ className = "" } = {}) {
  const normalizedClassName = className ? ` ${className}` : "";

  return createElement("p", {
    className: `voice-note-pending-note${normalizedClassName}`,
    text: getVoiceNotePendingSyncMessage()
  });
}

function formatCommentMeta(comment) {
  const baseText = formatRelativeTimestamp(comment.createdAt);
  return comment.updatedAt ? `${baseText} (edited)` : baseText;
}

function formatRelativeTimestamp(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);
  const diffHours = Math.max(Math.floor(diffMs / 3600000), 0);
  const diffDays = Math.max(Math.floor(diffMs / 86400000), 0);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium"
  }).format(date);
}
