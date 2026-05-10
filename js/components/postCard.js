import { createElement, setFieldError, clearFormErrors, createFieldError } from "../utils/dom.js";
import {
  setPostReaction,
  getUserReaction,
  setCommentReaction,
  getCommentUserReaction,
  deletePost,
  addCommentToPost,
  getPostById,
  getCommentsForPost,
  getVisibleCommentsForPost,
  updateCommentInPost,
  deleteCommentFromPost
} from "../services/postService.js";
import { navigate } from "../router.js";
import { showToast } from "./toast.js";
import { showConfirmDialog } from "./confirmDialog.js";
import { showActionSheet } from "./actionSheet.js";
import { showReportSheet } from "./reportSheet.js";
import { showUserPreviewSheet } from "./userPreviewSheet.js";
import { resolveApiAssetUrl } from "../services/apiClient.js";
import { protectImageElement, protectMediaShell } from "../utils/protectedMedia.js";
import {
  createCommentCard,
  createVoiceNotePendingNotice,
  createVoiceNotePlayer
} from "./commentCard.js";
import { findUserById } from "../services/userService.js";
import { buildCommentTree } from "../utils/commentTree.js";
import { MAX_COMMENT_LENGTH, validateCommentSubmission } from "../utils/validators.js";
import {
  getVoiceNoteFeatureStatus,
  startVoiceNoteRecording,
  formatVoiceNoteDuration,
  MAX_VOICE_NOTE_DURATION_MS,
  configureVoiceNoteAudio,
  getVoiceNoteSource,
  isVoiceNotePendingSync,
  getNextVoiceNotePlaybackRate,
  formatVoiceNotePlaybackRate
} from "../utils/voiceNotes.js";
import {
  getVoiceNoteDailyLimitMessage,
  isVoiceNoteDailyLimitError
} from "../utils/voiceNoteLimit.js";
import {
  createVoiceNoteVisualizer,
  attachVoiceNoteScrubber
} from "../utils/voiceNoteVisualizer.js";
import { setVoiceNoteControlIcon } from "../utils/voiceNoteIcons.js";
import { createAvatarElement } from "../utils/avatar.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import {
  COMMENT_BATCH_SIZE,
  REPLY_BATCH_SIZE,
  createLoadMoreControl
} from "../utils/listBatching.js";
import {
  buildBrandedShareData,
  buildShareClipboardText,
  buildShareableFeedUrl
} from "../utils/share.js";
import { formatLocation } from "../utils/location.js";

const POST_PREVIEW_LENGTH = 300;
const POST_IMAGE_VIEWER_ROOT_ID = "post-image-viewer-root";
const POST_IMAGE_VIEWER_ZOOM_MIN = 0.1;
const POST_IMAGE_VIEWER_ZOOM_MAX = 4;
const POST_IMAGE_VIEWER_ZOOM_STEP = 0.1;
const voiceNoteFeatureStatus = getVoiceNoteFeatureStatus();
const voiceNoteChoiceText = voiceNoteFeatureStatus.supported ? "" : voiceNoteFeatureStatus.message;

const commentUiState = {
  openCommentForms: new Set(),
  openReplyForms: new Set(),
  openReplyLists: new Set(),
  openEditForms: new Set(),
  sortOrders: new Map(),
  visibleCommentCounts: new Map(),
  visibleReplyCounts: new Map(),
  activeSheetPostId: null
};

export function createPostCard(post, author, currentUserId, onReactionChange) {
  let card = createElement("article", { className: "post-card" });
  card.dataset.postId = post.id;

  const refreshCurrentPostCard = ({ focusCommentId = null } = {}) => {
    const latestPost = getPostById(post.id);

    if (!latestPost) {
      if (typeof onReactionChange === "function") {
        onReactionChange();
      }
      return;
    }

    const latestAuthor = latestPost.author || findUserById(latestPost.userId) || author;
    const nextCard = createPostCard(latestPost, latestAuthor, currentUserId, onReactionChange);

    card.replaceWith(nextCard);
    card = nextCard;

    if (focusCommentId) {
      window.requestAnimationFrame(() => {
        focusCommentById(latestPost.id, focusCommentId);
      });
    }
  };

  const header = createElement("div", { className: "post-card-header" });
  const authorInfo = createElement("div", { className: "post-author-row" });
  const authorAvatarElement = createAvatarElement(author, {
    size: "md",
    className: "post-author-avatar",
    decorative: true
  });
  const authorBlock = createElement("div", { className: "post-author-block" });
  const authorNameElement = createElement("span", {
    className: "post-author",
    text: author?.username || "Unknown User"
  });

  const meta = createElement("p", {
    className: "post-meta",
    text: formatPostMeta(post)
  });

  const openAuthorProfile =
    author?.id
      ? () => {
          showUserPreviewSheet({
            userId: author.id,
            currentUserId
          });
        }
      : null;
  const authorAvatar =
    typeof openAuthorProfile === "function"
      ? createProfileTriggerButton({
          className: "user-preview-trigger user-preview-trigger-avatar",
          label: `Open ${author?.username || "user"} profile`,
          onClick: openAuthorProfile,
          child: authorAvatarElement
        })
      : authorAvatarElement;
  const authorName =
    typeof openAuthorProfile === "function"
      ? createProfileTriggerButton({
          className: "user-preview-trigger user-preview-trigger-text post-author-btn",
          label: `Open ${author?.username || "user"} profile`,
          onClick: openAuthorProfile,
          child: authorNameElement
        })
      : authorNameElement;

  authorBlock.append(authorName, meta);
  authorInfo.append(authorAvatar, authorBlock);
  header.appendChild(authorInfo);

  header.appendChild(createPostMenuButton(post, author, currentUserId, onReactionChange));

  const content = createPostContent(post);

  card.append(header);
  card.appendChild(content);

  if (post.image) {
    const postImage = createPostImage(post.image, {
      authorName: author?.username || "Unknown User"
    });

    if (postImage) {
      card.appendChild(postImage);
    }
  }

  const footer = createElement("div", { className: "post-card-footer" });
  const footerText = createElement("span", {
    className: "post-footer-text",
    text: `Posted by ${author?.username || "Unknown User"}`
  });

  footer.appendChild(footerText);

  let postReactionBar = null;

  const handlePostReaction = async (reactionType) => {
    try {
      const updatedPost = await setPostReaction({
        postId: post.id,
        reactionType
      });

      post.reactions = updatedPost.reactions;

      const nextReactionBar = buildPostReactionBar();
      postReactionBar.replaceWith(nextReactionBar);
      postReactionBar = nextReactionBar;
    } catch (error) {
      showToast(error.message || "Could not update the reaction.", "error");
    }
  };

  function buildPostReactionBar() {
    return createReactionBar({
      reactions: post.reactions,
      activeReaction: getUserReaction(post, currentUserId),
      iconOnlyReactions: ["like", "dislike"],
      onReact: handlePostReaction
    });
  }

  postReactionBar = buildPostReactionBar();

  card.append(
    footer,
    postReactionBar,
    createCommentsSection(post, currentUserId, refreshCurrentPostCard)
  );

  return card;
}

export function openCommentsSheetForPost({
  postId,
  currentUserId,
  onPostChange,
  focusCommentId = null
}) {
  openCommentsSheet({
    postId,
    currentUserId,
    onPostChange,
    focusCommentId
  });
}

function createPostMenuButton(post, author, currentUserId, onReactionChange) {
  const isOwner = post.userId === currentUserId;
  const hasVoiceNote =
    Boolean(getVoiceNoteSource(post.voiceNote)) || isVoiceNotePendingSync(post.voiceNote);
  const canEditPost = isOwner && !hasVoiceNote;
  const menuBtn = createElement("button", {
    className: "post-menu-btn",
    type: "button",
    attributes: {
      "aria-label": "Post options",
      title: "Post options"
    }
  });

  menuBtn.appendChild(createMoreIcon());
  menuBtn.addEventListener("click", () => {
    showActionSheet({
      title: "Post",
      actions: [
        {
          label: "Share",
          onSelect: () => sharePostEntry(post, author)
        },
        {
          label: "Report",
          onSelect: () => {
            showReportSheet({
              reporterUserId: currentUserId,
              targetType: "post",
              targetId: post.id,
              onSubmitted: ({ hideForReporter = false }) => {
                if (hideForReporter && typeof onReactionChange === "function") {
                  onReactionChange();
                }
              }
            });
          }
        },
        ...(canEditPost
          ? [
              {
                label: "Edit",
                onSelect: () => {
                  navigate("edit-post", { postId: post.id });
                }
              }
            ]
          : []),
        ...(isOwner
          ? [
              {
                label: "Delete",
                danger: true,
                onSelect: () => {
                  showConfirmDialog({
                    title: "Delete post?",
                    message: "This post will be permanently removed.",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    danger: true,
                    onConfirm: async () => {
                      try {
                        await deletePost({
                          postId: post.id
                        });

                        showToast("Post deleted.", "success");

                        if (typeof onReactionChange === "function") {
                          onReactionChange();
                        }
                      } catch (error) {
                        showToast(error.message || "Failed to delete post.", "error");
                      }
                    }
                  });
                }
              }
            ]
          : [])
      ]
    });
  });

  return menuBtn;
}

function createMoreIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("post-menu-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    "M12 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 7Zm0 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 14Zm0 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 21Z"
  );
  svg.appendChild(path);

  return svg;
}

async function sharePostEntry(post, author) {
  const authorName = author?.username || "Unknown User";
  const shareUrl = buildShareableFeedUrl({
    postId: post?.id || ""
  });
  const shareText = post.content
    ? `${authorName}: ${post.content}`
    : `${authorName} shared a voice note on yahneh.`;
  const shareMessage = buildShareClipboardText(
    shareText,
    shareUrl ? `Open this post in yahneh: ${shareUrl}` : ""
  );

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const shareData = await buildBrandedShareData({
        title: `Post from ${authorName}`,
        text: shareMessage,
        url: shareUrl
      });
      await navigator.share(shareData);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareMessage);
      showToast("Post copied to clipboard.", "success");
      return;
    }

    throw new Error("Sharing is not available on this device.");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    showToast(error.message || "Could not share post.", "error");
  }
}

function createPostImage(imageUrl, { authorName = "" } = {}) {
  const normalizedImageUrl = resolveApiAssetUrl(imageUrl);

  if (!normalizedImageUrl) {
    return null;
  }

  const imageWrapper = createElement("div", { className: "post-image-wrapper" });
  protectMediaShell(imageWrapper);
  const imageFrame = createElement("button", {
    className: "post-image-frame",
    type: "button",
    attributes: {
      "aria-label": "Open full post image",
      title: "Open full post image"
    }
  });
  const image = document.createElement("img");
  const actions = createElement("div", {
    className: "post-image-actions"
  });
  const viewBtn = createElement("button", {
    className: "secondary-btn post-image-view-btn",
    type: "button",
    attributes: {
      "aria-label": "View full image",
      title: "View full image"
    }
  });
  const viewLabel = createElement("span", {
    className: "post-image-view-label",
    text: "View full"
  });

  const openViewer = () => {
    showPostImageViewer({
      imageUrl: normalizedImageUrl,
      authorName
    });
  };

  image.className = "post-image";
  image.alt = "Post image";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  protectImageElement(image);

  image.addEventListener("error", () => {
    imageWrapper.remove();
  });

  image.src = normalizedImageUrl;
  imageFrame.addEventListener("click", openViewer);
  viewBtn.addEventListener("click", openViewer);
  viewBtn.append(createPostImageViewerIcon("eye"), viewLabel);
  imageFrame.appendChild(image);
  actions.appendChild(viewBtn);
  imageWrapper.append(imageFrame, actions);
  return imageWrapper;
}

function showPostImageViewer({ imageUrl = "", authorName = "" } = {}) {
  const normalizedImageUrl = resolveApiAssetUrl(imageUrl);

  if (!normalizedImageUrl) {
    return () => {};
  }

  document.body.classList.remove("post-image-viewer-open");
  document.getElementById(POST_IMAGE_VIEWER_ROOT_ID)?.remove();
  document.body.classList.add("post-image-viewer-open");

  const root = createElement("div", {
    className: "post-image-viewer-root",
    attributes: {
      id: POST_IMAGE_VIEWER_ROOT_ID
    }
  });
  const overlay = createElement("button", {
    className: "post-image-viewer-overlay",
    type: "button",
    attributes: {
      "aria-label": "Close image viewer"
    }
  });
  const container = createElement("div", {
    className: "post-image-viewer-container"
  });
  const card = createElement("section", {
    className: "post-image-viewer-card",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": authorName ? `Post image from ${authorName}` : "Post image"
    }
  });
  const header = createElement("div", {
    className: "post-image-viewer-header"
  });
  const controls = createElement("div", {
    className: "post-image-viewer-controls"
  });
  const zoomOutBtn = createElement("button", {
    className: "secondary-btn post-image-viewer-zoom-btn",
    type: "button",
    text: "-",
    attributes: {
      "aria-label": "Zoom out",
      title: "Zoom out"
    }
  });
  const zoomResetBtn = createElement("button", {
    className: "secondary-btn post-image-viewer-zoom-readout",
    type: "button",
    text: "100%",
    attributes: {
      "aria-label": "Fit image to viewport",
      title: "Fit image to viewport"
    }
  });
  const zoomInBtn = createElement("button", {
    className: "secondary-btn post-image-viewer-zoom-btn",
    type: "button",
    text: "+",
    attributes: {
      "aria-label": "Zoom in",
      title: "Zoom in"
    }
  });
  const closeBtn = createElement("button", {
    className: "post-image-viewer-close-btn",
    type: "button",
    attributes: {
      "aria-label": "Close image viewer",
      title: "Close image viewer"
    }
  });
  const frame = createElement("div", {
    className: "post-image-viewer-frame"
  });
  protectMediaShell(frame);
  const canvas = createElement("div", {
    className: "post-image-viewer-canvas"
  });
  const image = document.createElement("img");
  let naturalWidth = 0;
  let naturalHeight = 0;
  let zoomLevel = 1;
  let fitZoomLevel = 1;

  image.className = "post-image-viewer-image";
  image.alt = authorName ? `Post image from ${authorName}` : "Post image";
  image.decoding = "async";
  image.loading = "eager";
  image.referrerPolicy = "no-referrer";
  protectImageElement(image);

  const clampZoom = (nextZoom) =>
    Math.min(POST_IMAGE_VIEWER_ZOOM_MAX, Math.max(POST_IMAGE_VIEWER_ZOOM_MIN, nextZoom));

  const getFrameInnerWidth = () => {
    const styles = window.getComputedStyle(frame);
    const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight || "0") || 0;
    return Math.max(1, frame.clientWidth - paddingLeft - paddingRight);
  };

  const calculateFitZoomLevel = () => {
    if (naturalWidth <= 0) {
      return 1;
    }

    return clampZoom(getFrameInnerWidth() / naturalWidth);
  };

  const syncZoomControls = () => {
    zoomResetBtn.textContent = `${Math.round(zoomLevel * 100)}%`;
    zoomOutBtn.disabled = zoomLevel <= POST_IMAGE_VIEWER_ZOOM_MIN;
    zoomInBtn.disabled = zoomLevel >= POST_IMAGE_VIEWER_ZOOM_MAX;
  };

  const applyZoom = (nextZoom, { preserveViewport = true } = {}) => {
    const clampedZoom = clampZoom(nextZoom);
    const previousZoom = zoomLevel;

    zoomLevel = clampedZoom;

    if (naturalWidth > 0 && naturalHeight > 0) {
      const viewportCenter = preserveViewport
        ? {
            x: frame.scrollLeft + frame.clientWidth / 2,
            y: frame.scrollTop + frame.clientHeight / 2
          }
        : null;
      const scaleRatio = previousZoom > 0 ? zoomLevel / previousZoom : 1;

      canvas.style.width = `${Math.max(1, Math.round(naturalWidth * zoomLevel))}px`;
      canvas.style.height = `${Math.max(1, Math.round(naturalHeight * zoomLevel))}px`;

      if (viewportCenter && scaleRatio > 0) {
        window.requestAnimationFrame(() => {
          frame.scrollLeft = Math.max(
            0,
            viewportCenter.x * scaleRatio - frame.clientWidth / 2
          );
          frame.scrollTop = Math.max(
            0,
            viewportCenter.y * scaleRatio - frame.clientHeight / 2
          );
        });
      }
    }

    syncZoomControls();
  };

  image.addEventListener("load", () => {
    naturalWidth = image.naturalWidth || 0;
    naturalHeight = image.naturalHeight || 0;
    fitZoomLevel = calculateFitZoomLevel();
    applyZoom(fitZoomLevel, {
      preserveViewport: false
    });
  });

  closeBtn.appendChild(createPostImageViewerIcon("close"));
  controls.append(zoomOutBtn, zoomResetBtn, zoomInBtn);
  header.append(controls, closeBtn);
  canvas.appendChild(image);
  frame.appendChild(canvas);
  card.append(header, frame);
  container.appendChild(card);
  root.append(overlay, container);

  let closed = false;

  const closeViewer = () => {
    if (closed) {
      return;
    }

    closed = true;
    document.body.classList.remove("post-image-viewer-open");
    document.removeEventListener("keydown", handleKeyDown);
    root.remove();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeViewer();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      applyZoom(zoomLevel + POST_IMAGE_VIEWER_ZOOM_STEP);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      applyZoom(zoomLevel - POST_IMAGE_VIEWER_ZOOM_STEP);
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      applyZoom(fitZoomLevel);
    }
  };

  image.addEventListener("error", () => {
    showToast("Could not open the full image.", "error");
    closeViewer();
  });

  document.body.appendChild(root);
  zoomOutBtn.addEventListener("click", () => {
    applyZoom(zoomLevel - POST_IMAGE_VIEWER_ZOOM_STEP);
  });
  zoomResetBtn.addEventListener("click", () => {
    applyZoom(fitZoomLevel);
  });
  zoomInBtn.addEventListener("click", () => {
    applyZoom(zoomLevel + POST_IMAGE_VIEWER_ZOOM_STEP);
  });
  frame.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      applyZoom(
        zoomLevel + (event.deltaY < 0 ? POST_IMAGE_VIEWER_ZOOM_STEP : -POST_IMAGE_VIEWER_ZOOM_STEP)
      );
    },
    { passive: false }
  );
  overlay.addEventListener("click", closeViewer);
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeViewer();
    }
  });
  closeBtn.addEventListener("click", closeViewer);

  syncZoomControls();
  document.addEventListener("keydown", handleKeyDown);
  image.src = normalizedImageUrl;

  return closeViewer;
}

function createPostImageViewerIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("post-image-viewer-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute(
    "d",
    name === "close"
      ? "M6 6l12 12M18 6 6 18"
      : "M2.5 12s3.7-6 9.5-6 9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6Zm9.5 3.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
  );
  svg.appendChild(path);

  return svg;
}

function createReactionBar({
  reactions,
  activeReaction,
  onReact,
  compact = false,
  iconOnly = false,
  iconOnlyReactions = [],
  allowedReactions = ["like", "dislike"]
}) {
  const wrapper = createElement("div", {
    className: `reaction-bar${compact ? " reaction-bar-compact" : ""}`
  });
  const buttons = [
    { type: "like", emoji: "\u{1F44D}", label: "Like", count: reactions?.like?.length || 0 },
    { type: "dislike", emoji: "\u{1F44E}", label: "Dislike", count: reactions?.dislike?.length || 0 }
  ].filter(({ type }) => allowedReactions.includes(type));

  buttons.forEach(({ type, emoji, label, count }) => {
    const useIconOnly = iconOnly || iconOnlyReactions.includes(type);
    const button = createElement("button", {
      className: `reaction-btn reaction-btn-${type}${activeReaction === type ? " reaction-btn-active" : ""}${useIconOnly ? " reaction-btn-icon-only" : ""}`,
      type: "button",
      attributes: {
        "aria-label": label,
        title: label
      }
    });

    if (useIconOnly) {
      button.appendChild(createReactionIcon(type));

      if (count > 0) {
        button.appendChild(
          createElement("span", {
            className: "reaction-btn-count",
            text: formatCompactCount(count)
          })
        );
      }
    } else {
      button.textContent = `${emoji} ${label} (${count})`;
    }

    button.addEventListener("click", () => {
      if (typeof onReact === "function") {
        onReact(type);
      }
    });

    wrapper.appendChild(button);
  });

  return wrapper;
}

function createReactionIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("reaction-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add("reaction-icon-path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", getReactionIconPath(name));
  svg.appendChild(path);

  return svg;
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

function getReactionIconPath(name) {
  const iconPaths = {
    like:
      "M2 21h4V9H2v12Zm20-11.9c0-1.16-.95-2.1-2.12-2.1h-6.7l1.01-4.86.03-.32a1.7 1.7 0 0 0-.5-1.2L12.6 0 5.98 6.58A2 2 0 0 0 5.4 8v11c0 1.1.9 2 2 2h9.55c.82 0 1.56-.5 1.87-1.26l3.03-7.05c.1-.24.15-.49.15-.75V9.1Z",
    dislike:
      "M22 3h-4v12h4V3ZM2 14.9C2 16.06 2.95 17 4.12 17h6.7l-1.01 4.86-.03.32c0 .45.18.88.5 1.2L11.4 24l6.62-6.58c.38-.37.58-.88.58-1.42V5c0-1.1-.9-2-2-2H7.05c-.82 0-1.56.5-1.87 1.26L2.15 11.3c-.1.24-.15.49-.15.75v2.85Z"
  };

  return iconPaths[name] || iconPaths.like;
}

function createCommentsSortIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("comments-sort-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute(
    "d",
    "M4 7h6m4 0h6M10 7a2 2 0 1 0 0 .001M4 12h12m4 0h0M16 12a2 2 0 1 0 0 .001M4 17h3m5 0h8M9 17a2 2 0 1 0 0 .001"
  );
  svg.appendChild(path);

  return svg;
}

function createCommentsSection(post, currentUserId, onPostChange) {
  const section = createElement("section", {
    className: "comments-section comments-section-launcher"
  });
  const comments = getVisibleCommentsForPost(post.id, currentUserId);
  const toggleBtn = createElement("button", {
    className: "comment-toggle-btn",
    type: "button",
    text: getCommentsToggleLabel(comments.length)
  });

  toggleBtn.addEventListener("click", () => {
    openCommentsSheet({
      postId: post.id,
      currentUserId,
      onPostChange
    });
  });

  section.appendChild(toggleBtn);
  return section;
}

function createCommentsSheetContent(
  post,
  currentUserId,
  onPostChange,
  focusCommentId = null
) {
  const section = createElement("section", {
    className: "comments-section comments-section-sheet"
  });
  const comments = getVisibleCommentsForPost(post.id, currentUserId);
  const currentUser = findUserById(currentUserId);
  const sortOrder = commentUiState.sortOrders.get(post.id) || "newest";
  const commentTree = buildCommentTree(comments, sortOrder);
  ensureCommentVisibility({
    postId: post.id,
    commentTree,
    focusCommentId
  });
  const commentFormIsOpen = commentUiState.openCommentForms.has(post.id);
  const header = createElement("div", { className: "comments-header" });
  const title = createElement("h3", {
    className: "comments-sheet-title",
    text: getCommentsToggleLabel(comments.length)
  });
  const controls = createElement("div", { className: "comments-header-controls" });
  const handleCommentsChange = (options = {}) => {
    if (typeof onPostChange === "function") {
      onPostChange(options);
    }

    rerenderCommentsSheet(options);
  };
  const rerenderCommentsSheet = (options = {}) => {
    if (commentUiState.activeSheetPostId !== post.id) {
      return;
    }

    window.requestAnimationFrame(() => {
      openCommentsSheet({
        postId: post.id,
        currentUserId,
        onPostChange,
        focusCommentId: options?.focusCommentId || null
      });
    });
  };
  const sortLabel =
    comments.length > 0
      ? createCommentsSortControl({
          postId: post.id,
          sortOrder,
          onSortChange: (nextSortOrder) => {
            commentUiState.sortOrders.set(post.id, nextSortOrder);
            rerenderCommentsSheet();
          }
        })
      : null;

  if (sortLabel) {
    controls.appendChild(sortLabel);
  }

  const panel = createElement("div", {
    className: "comments-panel",
    attributes: {
      tabindex: "-1",
      "aria-label": "Comments panel"
    }
  });
  panel.classList.toggle("comments-panel-empty", commentTree.length === 0);

  const composerActions = createElement("div", { className: "comments-composer-actions" });
  const composerAvatar = createAvatarElement(currentUser, {
    size: "sm",
    className: "comments-composer-avatar",
    decorative: true
  });
  const composerToggleBtn = createElement("button", {
    className: "comments-composer-btn",
    type: "button",
    text: "Add a comment..."
  });

  let topLevelForm;
  topLevelForm = createCommentForm({
    inputId: `comment-input-${post.id}`,
    placeholder: "Write a comment...",
    helperText: "Join the conversation on this post.",
    noteText: voiceNoteChoiceText,
    submitText: "Post comment",
    allowVoiceNote: true,
    cancelText: "Cancel",
    onCancel: () => {
      commentUiState.openCommentForms.delete(post.id);
      resetCommentForm(topLevelForm);
      setToggleDisplay(topLevelForm, false);
    },
    onSubmit: ({ content, voiceNote }) =>
      addCommentToPost({
        postId: post.id,
        userId: currentUserId,
        parentId: null,
        content,
        voiceNote
      }),
    onSuccess: () => {
      commentUiState.openCommentForms.delete(post.id);
      handleCommentsChange();
    }
  });
  setToggleDisplay(topLevelForm, commentFormIsOpen);
  composerActions.append(composerAvatar, composerToggleBtn);

  const commentsList = createElement("div", { className: "comments-list" });
  const visibleCommentCount =
    commentUiState.visibleCommentCounts.get(post.id) || COMMENT_BATCH_SIZE;

  if (commentTree.length === 0) {
    commentsList.appendChild(
      createElement("p", {
        className: "comments-empty",
        text: "No comments yet. Start the conversation."
      })
    );
  } else {
    const visibleCommentNodes = commentTree.slice(0, visibleCommentCount);

    visibleCommentNodes.forEach((commentNode) => {
      commentsList.appendChild(
        createCommentNode({
          postId: post.id,
          postOwnerId: post.userId,
          node: commentNode,
          currentUserId,
          onCommentChange: handleCommentsChange,
          onCommentRerender: rerenderCommentsSheet,
          depth: 0
        })
      );
    });

    if (commentTree.length > visibleCommentNodes.length) {
      commentsList.appendChild(
        createLoadMoreControl({
          label: "See more comments",
          className: "comments-load-more-row",
          onClick: () => {
            commentUiState.visibleCommentCounts.set(
              post.id,
              visibleCommentCount + COMMENT_BATCH_SIZE
            );
            rerenderCommentsSheet();
          }
        })
      );
    }
  }

  composerToggleBtn.addEventListener("click", () => {
    if (topLevelForm.style.display === "none") {
      setToggleDisplay(topLevelForm, true);
      commentUiState.openCommentForms.add(post.id);
      focusCommentForm(topLevelForm);
      return;
    }

    focusCommentForm(topLevelForm);
  });

  header.append(title, controls);
  panel.append(composerActions, topLevelForm, commentsList);
  section.append(header, panel);

  return section;
}

function createCommentsSortControl({ postId, sortOrder, onSortChange }) {
  const sortLabel = createElement("div", {
    className: "comments-sort-label"
  });
  const sortTrigger = createElement("button", {
    className: "comments-sort-trigger",
    type: "button",
    attributes: {
      "aria-label": `Sort comments for post ${postId}`,
      title: "Sort comments",
      "aria-haspopup": "menu",
      "aria-expanded": "false"
    }
  });
  sortTrigger.appendChild(createCommentsSortIcon());

  const sortMenu = createElement("div", {
    className: "comments-sort-menu",
    attributes: {
      role: "menu",
      "aria-label": `Sort options for post ${postId}`
    }
  });
  setToggleDisplay(sortMenu, false);

  let sortMenuIsOpen = false;
  let removeSortMenuListeners = () => {};

  [
    { value: "newest", label: "Newest comments" },
    { value: "oldest", label: "Oldest comments" }
  ].forEach(({ value, label }) => {
    const optionBtn = createElement("button", {
      className: `comments-sort-option${sortOrder === value ? " comments-sort-option-active" : ""}`,
      type: "button",
      text: label,
      attributes: {
        role: "menuitemradio",
        "aria-checked": sortOrder === value ? "true" : "false"
      }
    });

    optionBtn.addEventListener("click", () => {
      closeSortMenu();

      if (typeof onSortChange === "function") {
        onSortChange(value);
      }
    });

    sortMenu.appendChild(optionBtn);
  });

  function closeSortMenu() {
    if (!sortMenuIsOpen) {
      return;
    }

    sortMenuIsOpen = false;
    setToggleDisplay(sortMenu, false);
    sortTrigger.setAttribute("aria-expanded", "false");
    removeSortMenuListeners();
    removeSortMenuListeners = () => {};
  }

  function openSortMenu() {
    if (sortMenuIsOpen) {
      return;
    }

    sortMenuIsOpen = true;
    setToggleDisplay(sortMenu, true);
    sortTrigger.setAttribute("aria-expanded", "true");

    const handleGlobalPointerDown = (event) => {
      if (!sortLabel.contains(event.target)) {
        closeSortMenu();
      }
    };

    const handleGlobalKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSortMenu();
        sortTrigger.focus({ preventScroll: true });
      }
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("keydown", handleGlobalKeyDown);

    removeSortMenuListeners = () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }

  sortTrigger.addEventListener("click", (event) => {
    event.stopPropagation();

    if (sortMenuIsOpen) {
      closeSortMenu();
      return;
    }

    openSortMenu();
  });

  sortLabel.append(sortTrigger, sortMenu);
  return sortLabel;
}

function openCommentsSheet({ postId, currentUserId, onPostChange, focusCommentId = null }) {
  const post = getPostById(postId);

  if (!post) {
    closeCommentsSheet();
    return;
  }

  let root = document.getElementById("comments-sheet-root");
  let body = root?.querySelector(".comments-sheet-body") || null;
  let previousScrollTop = 0;

  if (body) {
    previousScrollTop = body.querySelector(".comments-panel")?.scrollTop || 0;
  }

  if (!root || !body) {
    root = createElement("div", {
      id: "comments-sheet-root",
      className: "comments-sheet-root"
    });
    const overlay = createElement("div", {
      className: "comments-sheet-overlay"
    });
    const container = createElement("div", {
      className: "comments-sheet-container"
    });
    const card = createElement("div", {
      className: "comments-sheet-card",
      attributes: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Comments"
      }
    });
    const chrome = createElement("div", {
      className: "comments-sheet-chrome"
    });
    const handle = createElement("span", {
      className: "comments-sheet-handle",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const closeBtn = createElement("button", {
      className: "comments-sheet-close-btn",
      type: "button",
      attributes: {
        "aria-label": "Close comments",
        title: "Close comments"
      }
    });
    body = createElement("div", {
      className: "comments-sheet-body"
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeCommentsSheet();
      }
    };

    root._commentsSheetKeyDown = handleKeyDown;
    document.addEventListener("keydown", handleKeyDown);

    overlay.addEventListener("click", closeCommentsSheet);
    container.addEventListener("click", (event) => {
      if (event.target === container) {
        closeCommentsSheet();
      }
    });
    card.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    closeBtn.addEventListener("click", closeCommentsSheet);
    closeBtn.appendChild(createCommentsCloseIcon());
    chrome.append(handle, closeBtn);
    card.append(chrome, body);
    container.appendChild(card);
    root.append(overlay, container);
    document.body.appendChild(root);
  }

  document.body.classList.add("comments-sheet-open");
  commentUiState.activeSheetPostId = postId;

  body.replaceChildren(
    createCommentsSheetContent(post, currentUserId, onPostChange, focusCommentId)
  );

  const nextPanel = body.querySelector(".comments-panel");

  if (nextPanel) {
    if (focusCommentId) {
      window.requestAnimationFrame(() => {
        focusCommentInSheet(focusCommentId);
      });
    } else {
      nextPanel.scrollTop = previousScrollTop;
    }
  }
}

function closeCommentsSheet() {
  const root = document.getElementById("comments-sheet-root");

  document.body.classList.remove("comments-sheet-open");

  if (!root) {
    commentUiState.activeSheetPostId = null;
    return;
  }

  if (typeof root._commentsSheetKeyDown === "function") {
    document.removeEventListener("keydown", root._commentsSheetKeyDown);
  }

  root.remove();
  commentUiState.activeSheetPostId = null;
}

function createCommentsCloseIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("comments-sheet-close-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", "M6 6 18 18M18 6 6 18");
  svg.appendChild(path);

  return svg;
}

function createCommentNode({
  postId,
  postOwnerId,
  node,
  currentUserId,
  onCommentChange,
  onCommentRerender = null,
  depth,
  parentAuthorName = ""
}) {
  const threadLevelClass =
    depth === 0
      ? " comment-thread-root"
      : depth === 1
        ? " comment-thread-reply-lane"
        : " comment-thread-flat-reply";
  const thread = createElement("div", {
    className: `comment-thread${threadLevelClass}`
  });
  thread.style.setProperty("--comment-depth", String(depth > 0 ? 1 : 0));
  thread.dataset.commentId = node.id;

  const author = node.author || findUserById(node.userId);
  const isOwner = node.userId === currentUserId;
  const isVoiceNoteOnly =
    Boolean(getVoiceNoteSource(node.voiceNote)) || isVoiceNotePendingSync(node.voiceNote);
  const canEditComment = isOwner && !isVoiceNoteOnly;
  const replyFormIsOpen = commentUiState.openReplyForms.has(node.id);
  const repliesListIsOpen = commentUiState.openReplyLists.has(node.id);
  const editFormIsOpen = commentUiState.openEditForms.has(node.id);

  let replyForm;
  replyForm = createCommentForm({
    inputId: `reply-input-${node.id}`,
    placeholder: `Reply to ${author?.username || "this comment"}...`,
    helperText: "Your reply will be saved under this comment.",
    noteText: voiceNoteChoiceText,
    submitText: "Post reply",
    compact: true,
    allowVoiceNote: true,
    cancelText: "Cancel",
    onCancel: () => {
      commentUiState.openReplyForms.delete(node.id);
      resetCommentForm(replyForm);
      setToggleDisplay(replyForm, false);
    },
    onSubmit: ({ content, voiceNote }) =>
      addCommentToPost({
        postId,
        userId: currentUserId,
        parentId: node.id,
        content,
        voiceNote
      }),
    onSuccess: () => {
      commentUiState.openReplyForms.delete(node.id);
      commentUiState.openReplyLists.add(node.id);

      if (typeof onCommentChange === "function") {
        const latestComments = getCommentsForPost(postId);
        const latestReply = findLatestReplyForParent(latestComments, node.id, currentUserId);
        onCommentChange({
          focusCommentId: latestReply?.id || null
        });
      }
    }
  });
  setToggleDisplay(replyForm, replyFormIsOpen);

  let editForm = null;

  if (canEditComment) {
    editForm = createCommentForm({
      inputId: `edit-comment-input-${node.id}`,
      placeholder: "Update your comment...",
      helperText: "Save when you are happy with your wording.",
      submitText: "Save",
      compact: true,
      initialValue: node.content,
      cancelText: "Cancel",
      onCancel: () => {
        commentUiState.openEditForms.delete(node.id);
        setToggleDisplay(editForm, false);
      },
      onSubmit: ({ content }) =>
        updateCommentInPost({
          postId,
          commentId: node.id,
          userId: currentUserId,
          content
        }),
      onSuccess: () => {
        commentUiState.openEditForms.delete(node.id);

        if (typeof onCommentChange === "function") {
          onCommentChange();
        }
      }
    });
    setToggleDisplay(editForm, editFormIsOpen);
  }

  const repliesList = createElement("div", { className: "comment-children" });
  setToggleDisplay(repliesList, repliesListIsOpen);

  if (node.children.length > 0) {
    const visibleReplyCount =
      commentUiState.visibleReplyCounts.get(node.id) || REPLY_BATCH_SIZE;
    const visibleReplies = node.children.slice(0, visibleReplyCount);

    visibleReplies.forEach((childNode) => {
      repliesList.appendChild(
        createCommentNode({
          postId,
          postOwnerId,
          node: childNode,
          currentUserId,
          onCommentChange,
          onCommentRerender,
          depth: depth + 1,
          parentAuthorName: author?.username || ""
        })
      );
    });

    if (node.children.length > visibleReplies.length) {
      repliesList.appendChild(
        createLoadMoreControl({
          label: "See more replies",
          className: "comment-load-more-row",
          onClick: () => {
            commentUiState.visibleReplyCounts.set(
              node.id,
              visibleReplyCount + REPLY_BATCH_SIZE
            );
            commentUiState.openReplyLists.add(node.id);
            if (typeof onCommentRerender === "function") {
              onCommentRerender();
            }
          }
        })
      );
    }
  }

  let reactionBar = null;

  const handleCommentReaction = async (reactionType) => {
    try {
      const updatedComment = await setCommentReaction({
        postId,
        commentId: node.id,
        reactionType
      });

      node.reactions = updatedComment.reactions;

      const nextReactionBar = buildCommentReactionBar();
      reactionBar.replaceWith(nextReactionBar);
      reactionBar = nextReactionBar;
    } catch (error) {
      showToast(error.message || "Could not update the reaction.", "error");
    }
  };

  function buildCommentReactionBar() {
    return createReactionBar({
      reactions: node.reactions,
      activeReaction: getCommentUserReaction(node, currentUserId),
      compact: true,
      iconOnly: true,
      allowedReactions: ["like", "dislike"],
      onReact: handleCommentReaction
    });
  }

  reactionBar = buildCommentReactionBar();

  const commentCard = createCommentCard(node, author, {
    isReply: depth > 0,
    isPostAuthor: node.userId === postOwnerId,
    replyingTo: depth > 0 ? parentAuthorName : "",
    repliesCount: node.children.length,
    repliesExpanded: repliesListIsOpen,
    reactionBar,
    onOpenProfile:
      author?.id
        ? () => {
            showUserPreviewSheet({
              userId: author.id,
              currentUserId
            });
          }
        : null,
    onReply: () => {
      commentUiState.openEditForms.delete(node.id);
      if (editForm) {
        setToggleDisplay(editForm, false);
      }

      const nextOpen = replyForm.style.display === "none";
      setToggleDisplay(replyForm, nextOpen);

      if (nextOpen) {
        commentUiState.openReplyForms.add(node.id);
        focusCommentForm(replyForm);
      } else {
        commentUiState.openReplyForms.delete(node.id);
        resetCommentForm(replyForm);
      }
    },
    onToggleReplies:
      node.children.length > 0
        ? () => {
            const nextOpen = repliesList.style.display === "none";
            setToggleDisplay(repliesList, nextOpen);

            if (nextOpen) {
              commentUiState.openReplyLists.add(node.id);
            } else {
              commentUiState.openReplyLists.delete(node.id);
            }
          }
        : null,
    onOpenMenu: () =>
      openCommentActionSheet({
        comment: node,
        author,
        currentUserId,
        isOwner,
        canEditComment,
        onEdit:
          canEditComment && editForm
            ? () => {
                commentUiState.openReplyForms.delete(node.id);
                setToggleDisplay(replyForm, false);

                const nextOpen = editForm.style.display === "none";
                setToggleDisplay(editForm, nextOpen);

                if (nextOpen) {
                  commentUiState.openEditForms.add(node.id);
                } else {
                  commentUiState.openEditForms.delete(node.id);
                }
              }
            : null,
        onDelete: isOwner
          ? () => {
              const descendantCount = countDescendants(node);

              showConfirmDialog({
                title: "Delete comment?",
                message:
                  descendantCount > 0
                    ? "This comment and all nested replies will be permanently removed."
                    : "This comment will be permanently removed.",
                confirmText: "Delete",
                cancelText: "Cancel",
                danger: true,
                onConfirm: async () => {
                  try {
                    await deleteCommentFromPost({
                      postId,
                      commentId: node.id
                    });
                    clearCommentUiState(node);

                    if (typeof onCommentChange === "function") {
                      onCommentChange();
                    }
                  } catch (error) {
                    showToast(error.message || "Failed to delete comment.", "error");
                  }
                }
              });
            }
          : null,
        onReportSubmitted: ({ hideForReporter = false }) => {
          if (hideForReporter && typeof onCommentChange === "function") {
            onCommentChange();
          }
        }
      })
  });

  thread.append(commentCard);

  if (editForm) {
    thread.appendChild(editForm);
  }

  thread.appendChild(replyForm);

  if (node.children.length > 0) {
    thread.appendChild(repliesList);
  }

  return thread;
}

function createCommentForm({
  inputId,
  placeholder,
  helperText,
  noteText = "",
  submitText,
  onSubmit,
  onSuccess,
  compact = false,
  allowVoiceNote = false,
  initialValue = "",
  cancelText = "",
  onCancel = null
}) {
  const form = createElement("form", {
    className: `comment-form${compact ? " comment-form-reply" : ""}`
  });

  const inputWrapper = createElement("div", { className: "field-group" });
  const hasVoiceMode = allowVoiceNote && voiceNoteFeatureStatus.supported;
  let submissionMode = "text";
  let submitBtn = null;
  const textarea = document.createElement("textarea");
  textarea.className = `form-input comment-textarea${compact ? " comment-textarea-reply" : ""}`;
  textarea.placeholder = placeholder;
  textarea.required = true;
  textarea.maxLength = MAX_COMMENT_LENGTH;
  textarea.id = inputId;
  textarea.value = initialValue;
  const textModeFields = createElement("div", { className: "comment-input-mode-panel" });
  const textMetaRow = createElement("div", { className: "comment-form-meta-row" });
  const charCounter = createElement("span", {
    className: "char-counter",
    text: `0 / ${textarea.maxLength}`
  });

  const helper = createElement("p", {
    className: "field-helper",
    text: helperText
  });
  const note = noteText
    ? createElement("p", {
        className: "comment-form-note",
        text: noteText
      })
    : null;

  const error = createFieldError(inputId);
  const actions = createElement("div", { className: "comment-form-actions" });
  let modeSwitch = null;
  let textModeBtn = null;
  let voiceModeBtn = null;
  let voiceNoteComposer = null;
  let voiceNoteDraft = null;
  let voiceNoteRecorder = null;
  let recordingTimerId = null;
  let recordingStartedAt = 0;

  const clearRecordingTimer = () => {
    if (recordingTimerId) {
      window.clearInterval(recordingTimerId);
      recordingTimerId = null;
    }
  };

  let voiceNoteShell = null;
  let voiceNoteTimer = null;
  let voiceNoteAudio = null;
  let voiceNotePrimaryBtn = null;
  let voiceNoteSpeedBtn = null;
  let voiceNoteMeter = null;
  let voiceNoteWaveform = null;
  let voiceNoteProgressLine = null;
  let voiceNoteStateDot = null;
  let voiceNoteVisualizer = null;
  let voiceNoteLiveSession = null;
  let resumeVoicePreviewAfterSeek = false;
  let voiceNotePlaybackRate = 1;
  let previewProgressAnimationFrameId = null;

  const updateVoiceNoteComposer = () => {
    if (!voiceNoteTimer || !voiceNotePrimaryBtn || !voiceNoteMeter) {
      return;
    }

    const isRecording = Boolean(voiceNoteRecorder);
    const hasVoiceNote = Boolean(voiceNoteDraft?.dataUrl);
    const isPreviewPlaying = Boolean(
      voiceNoteAudio && !voiceNoteAudio.paused && !voiceNoteAudio.ended
    );
    const maxDurationLabel = formatVoiceNoteDuration(MAX_VOICE_NOTE_DURATION_MS);

    voiceNotePrimaryBtn.disabled = submissionMode !== "voice";

    if (submitBtn) {
      submitBtn.disabled = isRecording;
    }

    if (voiceNoteAudio) {
      configureVoiceNoteAudio(voiceNoteAudio, hasVoiceNote ? voiceNoteDraft.dataUrl : "");
      voiceNoteAudio.playbackRate = voiceNotePlaybackRate;
    }

    if (voiceNoteMeter) {
      voiceNoteMeter.classList.toggle("voice-note-bubble-recording", isRecording);
      voiceNoteMeter.classList.toggle("voice-note-bubble-playing", isPreviewPlaying);
    }

    if (voiceNoteStateDot) {
      voiceNoteStateDot.classList.toggle("voice-note-state-dot-active", isRecording);
      setToggleDisplay(voiceNoteStateDot, isRecording);
    }

    if (voiceNoteSpeedBtn) {
      voiceNoteSpeedBtn.textContent = formatVoiceNotePlaybackRate(voiceNotePlaybackRate);
      voiceNoteSpeedBtn.disabled = submissionMode !== "voice" || isRecording || !hasVoiceNote;
      setToggleDisplay(voiceNoteSpeedBtn, submissionMode === "voice" && hasVoiceNote);
    }

    voiceNotePrimaryBtn.classList.toggle("voice-note-main-btn-recording", isRecording);
    voiceNotePrimaryBtn.classList.toggle(
      "voice-note-main-btn-playback",
      hasVoiceNote && !isRecording
    );
    voiceNotePrimaryBtn.classList.toggle(
      "voice-note-main-btn-ready",
      !hasVoiceNote && !isRecording
    );

    const primaryConfig = isRecording
      ? {
          icon: "stop",
          label: "Stop recording voice note"
        }
      : hasVoiceNote
        ? isPreviewPlaying
          ? {
              icon: "pause",
              label: "Pause voice note preview"
            }
          : {
              icon: "play",
              label: "Play voice note preview"
            }
        : {
            icon: "mic",
            label: "Record voice note"
          };

    setVoiceNoteControlIcon(voiceNotePrimaryBtn, primaryConfig.icon);
    voiceNotePrimaryBtn.setAttribute("aria-label", primaryConfig.label);
    voiceNotePrimaryBtn.title = primaryConfig.label;

    if (submissionMode !== "voice") {
      voiceNoteTimer.textContent = `0:00 / ${maxDurationLabel}`;
      return;
    }

    if (isRecording) {
      const elapsedMs = Math.min(Date.now() - recordingStartedAt, MAX_VOICE_NOTE_DURATION_MS);
      voiceNoteTimer.textContent = `${formatVoiceNoteDuration(elapsedMs)} / ${maxDurationLabel}`;
      return;
    }

    if (hasVoiceNote) {
      const currentPreviewMs = Math.max(0, (voiceNoteAudio?.currentTime || 0) * 1000);
      voiceNoteTimer.textContent =
        `${formatVoiceNoteDuration(currentPreviewMs)} / ${formatVoiceNoteDuration(voiceNoteDraft.durationMs)}`;
      return;
    }

    voiceNoteTimer.textContent = `0:00 / ${maxDurationLabel}`;
  };

  const resetVoiceNotePlaybackRate = () => {
    voiceNotePlaybackRate = 1;

    if (voiceNoteAudio) {
      voiceNoteAudio.playbackRate = voiceNotePlaybackRate;
    }

    if (voiceNoteSpeedBtn) {
      voiceNoteSpeedBtn.textContent = formatVoiceNotePlaybackRate(voiceNotePlaybackRate);
    }
  };

  const stopPreviewProgressAnimation = () => {
    if (previewProgressAnimationFrameId) {
      window.cancelAnimationFrame(previewProgressAnimationFrameId);
      previewProgressAnimationFrameId = null;
    }
  };

  const startPreviewProgressAnimation = () => {
    if (previewProgressAnimationFrameId) {
      return;
    }

    const tick = () => {
      syncVoiceNotePreview();

      if (voiceNoteAudio && !voiceNoteAudio.paused && !voiceNoteAudio.ended) {
        previewProgressAnimationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      previewProgressAnimationFrameId = null;
    };

    previewProgressAnimationFrameId = window.requestAnimationFrame(tick);
  };

  const syncVoiceNotePreview = () => {
    if (!voiceNoteVisualizer) {
      return;
    }

    const progressRatio =
      voiceNoteDraft?.durationMs && voiceNoteAudio
        ? voiceNoteAudio.ended
          ? 1
          : Math.min((voiceNoteAudio.currentTime * 1000) / voiceNoteDraft.durationMs, 1)
        : 0;

    voiceNoteVisualizer.renderStoredWaveform({
      waveform: voiceNoteDraft?.waveform,
      progressRatio
    });
    updateVoiceNoteComposer();
  };

  const stopVoiceNotePreview = () => {
    if (!voiceNoteAudio) {
      return;
    }

    stopPreviewProgressAnimation();
    voiceNoteAudio.pause();
    voiceNoteAudio.currentTime = 0;
    syncVoiceNotePreview();
  };

  const clearVoiceNoteComposer = () => {
    clearRecordingTimer();

    if (voiceNoteRecorder) {
      voiceNoteRecorder.cancel();
      voiceNoteRecorder = null;
    }

    if (voiceNoteLiveSession) {
      voiceNoteLiveSession.cancel();
      voiceNoteLiveSession = null;
    }

    stopVoiceNotePreview();

    voiceNoteDraft = null;
    resetVoiceNotePlaybackRate();

    if (voiceNoteVisualizer) {
      voiceNoteVisualizer.renderStoredWaveform({
        waveform: [],
        progressRatio: 0
      });
    }

    updateVoiceNoteComposer();
  };

  const updateSubmissionMode = (nextMode) => {
    submissionMode = nextMode;

    if (modeSwitch) {
      textModeBtn.className =
        submissionMode === "text"
          ? "secondary-btn comment-mode-btn comment-mode-btn-active"
          : "secondary-btn comment-mode-btn";
      voiceModeBtn.className =
        submissionMode === "voice"
          ? "secondary-btn comment-mode-btn comment-mode-btn-active"
          : "secondary-btn comment-mode-btn";
    }

    const isTextMode = submissionMode === "text";

    if (isTextMode) {
      clearVoiceNoteComposer();
    }

    setToggleDisplay(textModeFields, isTextMode);
    textarea.disabled = !isTextMode;
    textarea.required = isTextMode;

    if (voiceNoteComposer) {
      setToggleDisplay(voiceNoteComposer, !isTextMode);
    }

    if (submitBtn) {
      submitBtn.textContent = submissionMode === "voice" ? "Post" : submitText;
    }

    updateVoiceNoteComposer();
  };

  const syncCharacterCounter = () => {
    const currentLength = textarea.value.length;
    charCounter.textContent = `${currentLength} / ${textarea.maxLength}`;
    charCounter.className =
      currentLength >= textarea.maxLength
        ? "char-counter char-counter-limit"
        : "char-counter";
  };

  if (hasVoiceMode) {
    modeSwitch = createElement("div", { className: "comment-mode-switch" });
    textModeBtn = createElement("button", {
      className: "secondary-btn comment-mode-btn",
      type: "button",
      text: "Text"
    });
    voiceModeBtn = createElement("button", {
      className: "secondary-btn comment-mode-btn",
      type: "button",
      text: "Voice note"
    });

    textModeBtn.addEventListener("click", () => {
      clearFormErrors(form);
      updateSubmissionMode("text");
      focusActiveCommentTarget();
    });

    voiceModeBtn.addEventListener("click", () => {
      clearFormErrors(form);
      updateSubmissionMode("voice");
      focusActiveCommentTarget();
    });

    modeSwitch.append(textModeBtn, voiceModeBtn);
  }

  if (hasVoiceMode) {
    voiceNoteComposer = createElement("div", {
      className: "voice-note-composer messages-voice-note-composer comment-voice-note-composer"
    });
    voiceNoteShell = createElement("div", {
      className: "voice-note-shell"
    });

    voiceNotePrimaryBtn = createElement("button", {
      className:
        "voice-note-btn voice-note-icon-btn voice-note-main-btn messages-voice-trigger-btn comment-voice-main-btn",
      type: "button",
      text: "\u{1F3A4}",
      attributes: {
        "aria-label": "Record voice note",
        title: "Record voice note"
      }
    });

    voiceNoteTimer = createElement("p", {
      className: "voice-note-timer"
    });
    voiceNoteSpeedBtn = createElement("button", {
      className: "voice-note-speed-btn messages-voice-speed-btn comment-voice-speed-btn",
      type: "button",
      text: formatVoiceNotePlaybackRate(voiceNotePlaybackRate),
      attributes: {
        "aria-label": "Change voice note playback speed",
        title: "Change voice note playback speed"
      }
    });
    voiceNoteMeter = createElement("div", {
      className:
        "voice-note-bubble voice-note-bubble-draft voice-note-meter voice-note-meter-seekable messages-voice-panel comment-voice-panel"
    });
    voiceNoteWaveform = createElement("div", {
      className: "voice-note-waveform messages-voice-waveform"
    });
    voiceNoteProgressLine = createElement("span", {
      className: "voice-note-progress-line"
    });
    const voiceNoteMeta = createElement("div", {
      className: "voice-note-meta comment-voice-meta"
    });
    voiceNoteStateDot = createElement("span", {
      className: "voice-note-state-dot",
      attributes: {
        "aria-hidden": "true"
      }
    });
    voiceNoteWaveform.appendChild(voiceNoteProgressLine);
    voiceNoteVisualizer = createVoiceNoteVisualizer({
      waveformElement: voiceNoteWaveform,
      progressLineElement: voiceNoteProgressLine
    });

    voiceNoteMeta.append(voiceNoteStateDot, voiceNoteTimer, voiceNoteSpeedBtn);
    voiceNoteMeter.append(voiceNotePrimaryBtn, voiceNoteWaveform, voiceNoteMeta);
    voiceNoteShell.append(voiceNoteMeter);

    voiceNoteAudio = document.createElement("audio");
    voiceNoteAudio.className = "voice-note-audio";
    configureVoiceNoteAudio(voiceNoteAudio);
    voiceNoteAudio.addEventListener("play", () => {
      startPreviewProgressAnimation();
      syncVoiceNotePreview();
    });
    ["pause", "ended"].forEach((eventName) => {
      voiceNoteAudio.addEventListener(eventName, () => {
        stopPreviewProgressAnimation();
        syncVoiceNotePreview();
      });
    });
    ["timeupdate", "loadedmetadata"].forEach((eventName) => {
      voiceNoteAudio.addEventListener(eventName, syncVoiceNotePreview);
    });

    const finalizeVoiceRecording = (nextVoiceNote) => {
      clearRecordingTimer();

      if (voiceNoteLiveSession) {
        const waveform = voiceNoteLiveSession.stop();
        voiceNoteLiveSession = null;
        voiceNoteDraft = nextVoiceNote
          ? {
              ...nextVoiceNote,
              waveform
            }
          : null;
      } else {
        voiceNoteDraft = nextVoiceNote;
      }

      voiceNoteRecorder = null;
      stopVoiceNotePreview();
      resetVoiceNotePlaybackRate();
      syncVoiceNotePreview();
    };

    voiceNotePrimaryBtn.addEventListener("click", async () => {
      if (voiceNoteRecorder) {
        voiceNoteRecorder.stop();
        return;
      }

      if (voiceNoteDraft?.dataUrl) {
        try {
          if (voiceNoteAudio.paused || voiceNoteAudio.ended) {
            if (voiceNoteAudio.ended) {
              voiceNoteAudio.currentTime = 0;
            }

            await voiceNoteAudio.play();
          } else {
            voiceNoteAudio.pause();
          }
        } catch (error) {
          setFieldError(inputId, error.message || "Could not play voice note preview.");
        }

        syncVoiceNotePreview();
        return;
      }

      clearFormErrors(form);

      try {
        voiceNoteDraft = null;
        voiceNoteRecorder = await startVoiceNoteRecording();
        voiceNoteLiveSession = await voiceNoteVisualizer.startRecording({
          stream: voiceNoteRecorder.stream,
          maxDurationMs: MAX_VOICE_NOTE_DURATION_MS
        });
        recordingStartedAt = Date.now();
        clearRecordingTimer();
        recordingTimerId = window.setInterval(updateVoiceNoteComposer, 250);
        voiceNoteRecorder.result
          .then((nextVoiceNote) => {
            if (voiceNoteRecorder) {
              finalizeVoiceRecording(nextVoiceNote);
            }
          })
          .catch((error) => {
            if (voiceNoteRecorder) {
              clearRecordingTimer();
              if (voiceNoteLiveSession) {
                voiceNoteLiveSession.cancel();
                voiceNoteLiveSession = null;
              }
              voiceNoteDraft = null;
              voiceNoteRecorder = null;
              setFieldError(inputId, error.message || "Voice note recording failed.");
              syncVoiceNotePreview();
            }
          });
        updateVoiceNoteComposer();
      } catch (error) {
        voiceNoteRecorder = null;
        if (voiceNoteLiveSession) {
          voiceNoteLiveSession.cancel();
          voiceNoteLiveSession = null;
        }
        setFieldError(inputId, error.message || "Could not start voice recording.");
      }
    });

    attachVoiceNoteScrubber({
      scrubElement: voiceNoteMeter,
      isEnabled: () => submissionMode === "voice" && Boolean(voiceNoteDraft?.durationMs),
      getDurationMs: () => voiceNoteDraft?.durationMs || 0,
      onSeekStart: () => {
        resumeVoicePreviewAfterSeek =
          Boolean(voiceNoteAudio) && !voiceNoteAudio.paused && !voiceNoteAudio.ended;

        if (voiceNoteAudio) {
          voiceNoteAudio.pause();
        }
      },
      onSeek: ({ timeMs }) => {
        if (!voiceNoteAudio) {
          return;
        }

        voiceNoteAudio.currentTime = timeMs / 1000;
        syncVoiceNotePreview();
      },
      onSeekEnd: async () => {
        if (resumeVoicePreviewAfterSeek && voiceNoteAudio) {
          try {
            await voiceNoteAudio.play();
          } catch (error) {
            setFieldError(
              inputId,
              error.message || "Could not continue voice note preview."
            );
          }
        }

        resumeVoicePreviewAfterSeek = false;
        syncVoiceNotePreview();
      }
    });

    voiceNoteSpeedBtn.addEventListener("click", () => {
      voiceNotePlaybackRate = getNextVoiceNotePlaybackRate(voiceNotePlaybackRate);

      if (voiceNoteAudio) {
        voiceNoteAudio.playbackRate = voiceNotePlaybackRate;
      }

      updateVoiceNoteComposer();
    });

    voiceNoteComposer.append(voiceNoteShell, voiceNoteAudio);
  }

  if (cancelText && typeof onCancel === "function") {
    const cancelBtn = createElement("button", {
      className: "secondary-btn comment-cancel-btn",
      type: "button",
      text: cancelText
    });

    cancelBtn.addEventListener("click", onCancel);
    actions.appendChild(cancelBtn);
  }

  submitBtn = createElement("button", {
    className: "primary-btn",
    type: "submit",
    text: submitText
  });
  actions.appendChild(submitBtn);

  textarea.addEventListener("input", syncCharacterCounter);
  textMetaRow.appendChild(charCounter);
  textModeFields.append(textMetaRow, textarea, helper);

  if (modeSwitch) {
    inputWrapper.appendChild(modeSwitch);
  }

  inputWrapper.appendChild(textModeFields);

  if (voiceNoteComposer) {
    inputWrapper.appendChild(voiceNoteComposer);
  }

  if (note) {
    inputWrapper.appendChild(note);
  }

  inputWrapper.appendChild(error);
  form.append(inputWrapper, actions);
  form._focusCommentTarget = focusActiveCommentTarget;
  form._resetCommentForm = () => {
    submissionMode = "text";
    textarea.value = initialValue;
    clearFormErrors(form);
    clearVoiceNoteComposer();
    updateSubmissionMode("text");
    syncCharacterCounter();
  };

  updateSubmissionMode("text");
  syncCharacterCounter();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormErrors(form);

    try {
      if (typeof onSubmit !== "function") {
        throw new Error("Comment form submit handler is missing.");
      }

      if (voiceNoteRecorder) {
        throw new Error("Stop the voice note recording before posting.");
      }

      const safeComment = validateCommentSubmission({
        content: textarea.value,
        voiceNote: voiceNoteDraft,
        mode: hasVoiceMode ? submissionMode : "text"
      });
      await onSubmit(safeComment);

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      const message = isVoiceNoteDailyLimitError(error)
        ? getVoiceNoteDailyLimitMessage(error)
        : error.message || "Failed to save comment.";

      setFieldError(inputId, message);

      if (isVoiceNoteDailyLimitError(error)) {
        showToast(message, "error");
      }
    }
  });

  return form;

  function focusActiveCommentTarget() {
    window.requestAnimationFrame(() => {
      if (submissionMode === "voice" && voiceNotePrimaryBtn && !voiceNotePrimaryBtn.disabled) {
        voiceNotePrimaryBtn.focus({ preventScroll: true });
        return;
      }

      if (!textarea.disabled) {
        textarea.focus({ preventScroll: true });
        const caretPosition = textarea.value.length;
        textarea.setSelectionRange(caretPosition, caretPosition);
        return;
      }

      if (voiceModeBtn) {
        voiceModeBtn.focus({ preventScroll: true });
      }
    });
  }
}

function clearCommentUiState(node) {
  commentUiState.openReplyForms.delete(node.id);
  commentUiState.openReplyLists.delete(node.id);
  commentUiState.openEditForms.delete(node.id);
  commentUiState.visibleReplyCounts.delete(node.id);

  node.children.forEach((childNode) => {
    clearCommentUiState(childNode);
  });
}

function openCommentActionSheet({
  comment,
  author,
  currentUserId,
  isOwner,
  canEditComment,
  onEdit,
  onDelete,
  onReportSubmitted = null
}) {
  showActionSheet({
    title: "Comment",
    actions: [
      {
        label: "Share",
        onSelect: () => shareCommentEntry(comment, author)
      },
      {
        label: "Report",
        onSelect: () => {
          showReportSheet({
            reporterUserId: currentUserId,
            targetType: "comment",
            targetId: comment.id,
            onSubmitted: onReportSubmitted
          });
        }
      },
      ...(isOwner && canEditComment && typeof onEdit === "function"
        ? [
            {
              label: "Edit",
              onSelect: onEdit
            }
          ]
        : []),
      ...(isOwner && typeof onDelete === "function"
        ? [
            {
              label: "Delete",
              danger: true,
              onSelect: onDelete
            }
          ]
        : [])
    ]
  });
}

async function shareCommentEntry(comment, author) {
  const authorName = author?.username || "Unknown User";
  const shareUrl = buildShareableFeedUrl({
    postId: comment?.postId || "",
    focusCommentId: comment?.id || ""
  });
  const shareText = comment?.content
    ? `${authorName}: ${comment.content}`
    : `${authorName} shared a voice note on yahneh.`;
  const shareMessage = buildShareClipboardText(
    shareText,
    shareUrl ? `Open this comment in yahneh: ${shareUrl}` : ""
  );

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const shareData = await buildBrandedShareData({
        title: `Comment from ${authorName}`,
        text: shareMessage,
        url: shareUrl
      });
      await navigator.share(shareData);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareMessage);
      showToast("Comment copied to clipboard.", "success");
      return;
    }

    throw new Error("Sharing is not available on this device.");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    showToast(error.message || "Could not share comment.", "error");
  }
}

function setToggleDisplay(element, isVisible) {
  element.style.display = isVisible ? "" : "none";
}

function resetCommentForm(form, initialValue = "") {
  if (typeof form?._resetCommentForm === "function") {
    form._resetCommentForm();
    return;
  }

  const textarea = form?.querySelector("textarea");

  if (textarea) {
    textarea.value = initialValue;
  }

  if (form) {
    clearFormErrors(form);
  }
}

function focusCommentForm(form) {
  if (!form) {
    return;
  }

  form.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  if (typeof form._focusCommentTarget === "function") {
    form._focusCommentTarget();
    return;
  }

  const textarea = form.querySelector("textarea");

  window.requestAnimationFrame(() => {
    textarea?.focus({ preventScroll: true });
  });
}

function focusCommentById(postId, commentId) {
  if (!postId || !commentId) {
    return;
  }

  window.requestAnimationFrame(() => {
    const postCard = findPostCardById(postId);
    const commentTarget = postCard?.querySelector(`[data-comment-id="${commentId}"]`);

    if (!commentTarget) {
      return;
    }

    commentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
}

function focusCommentInSheet(commentId) {
  if (!commentId) {
    return;
  }

  window.requestAnimationFrame(() => {
    const root = document.getElementById("comments-sheet-root");
    const panel = root?.querySelector(".comments-panel");
    const commentTarget = root?.querySelector(`[data-comment-id="${commentId}"]`);

    if (!panel || !commentTarget) {
      return;
    }

    commentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

    window.requestAnimationFrame(() => {
      panel.focus({ preventScroll: true });
    });
  });
}

function ensureCommentVisibility({ postId, commentTree, focusCommentId }) {
  if (!postId || !focusCommentId) {
    return;
  }

  const commentPath = findCommentPath(commentTree, focusCommentId);

  if (!commentPath || commentPath.length === 0) {
    return;
  }

  const topLevelIndex = commentTree.findIndex((node) => node.id === commentPath[0].id);

  if (topLevelIndex >= 0) {
    commentUiState.visibleCommentCounts.set(
      postId,
      Math.max(
        commentUiState.visibleCommentCounts.get(postId) || COMMENT_BATCH_SIZE,
        topLevelIndex + 1
      )
    );
  }

  for (let index = 0; index < commentPath.length - 1; index += 1) {
    const currentNode = commentPath[index];
    const nextNode = commentPath[index + 1];
    const childIndex = currentNode.children.findIndex((childNode) => childNode.id === nextNode.id);

    commentUiState.openReplyLists.add(currentNode.id);

    if (childIndex >= 0) {
      commentUiState.visibleReplyCounts.set(
        currentNode.id,
        Math.max(
          commentUiState.visibleReplyCounts.get(currentNode.id) || REPLY_BATCH_SIZE,
          childIndex + 1
        )
      );
    }
  }
}

function findCommentPath(nodes, targetCommentId, trail = []) {
  for (const node of nodes) {
    const nextTrail = [...trail, node];

    if (node.id === targetCommentId) {
      return nextTrail;
    }

    const childTrail = findCommentPath(node.children, targetCommentId, nextTrail);

    if (childTrail) {
      return childTrail;
    }
  }

  return null;
}

function findLatestReplyForParent(comments, parentId, userId) {
  return comments
    .filter((comment) => comment.parentId === parentId && comment.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function findPostCardById(postId) {
  return Array.from(document.querySelectorAll(".post-card")).find(
    (postCard) => postCard.dataset.postId === postId
  );
}

function createPostContent(post) {
  const wrapper = createElement("div", { className: "post-content-block" });
  const content = createElement("p", { className: "post-content" });
  const fullText = post.content || "";
  const isLongPost = fullText.length > POST_PREVIEW_LENGTH;
  let expanded = false;

  const renderContent = () => {
    if (!isLongPost || expanded) {
      content.textContent = fullText;
      return;
    }

    content.textContent = `${fullText.slice(0, POST_PREVIEW_LENGTH).trimEnd()}...`;
  };

  if (fullText) {
    renderContent();
    wrapper.appendChild(content);
  }

  if (getVoiceNoteSource(post.voiceNote)) {
    wrapper.appendChild(createVoiceNotePlayer(post.voiceNote));
  } else if (isVoiceNotePendingSync(post.voiceNote)) {
    wrapper.appendChild(
      createVoiceNotePendingNotice({
        className: "post-voice-note-pending-note"
      })
    );
  }

  if (!fullText || !isLongPost) {
    return wrapper;
  }

  const toggleBtn = createElement("button", {
    className: "link-btn post-content-toggle-btn",
    type: "button",
    text: "Read more"
  });

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    renderContent();
    toggleBtn.textContent = expanded ? "Show less" : "Read more";
  });

  wrapper.appendChild(toggleBtn);
  return wrapper;
}

function getCommentsToggleLabel(count) {
  const safeCount = Number.isFinite(count) ? count : 0;
  return `${formatCompactCount(safeCount)} ${safeCount === 1 ? "Comment" : "Comments"}`;
}

function countDescendants(node) {
  return node.children.reduce((total, childNode) => {
    return total + 1 + countDescendants(childNode);
  }, 0);
}

function formatPostMeta(post) {
  const baseMeta = `${formatLocation(post.location) || "Township update"} | ${formatTimestamp(post.createdAt)}`;
  return post.updatedAt ? `${baseMeta} | Edited` : baseMeta;
}

function formatTimestamp(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
