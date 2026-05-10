import { clearElement, createElement } from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { createAvatarElement } from "../utils/avatar.js";
import { navigate, registerViewCleanup } from "../router.js";
import { showToast } from "../components/toast.js";
import { showUserPreviewSheet } from "../components/userPreviewSheet.js";
import { showActionSheet } from "../components/actionSheet.js";
import { showConfirmDialog } from "../components/confirmDialog.js";
import {
  blockUserRemote,
  findUserById,
  getDirectMessageAvailability,
  getUsers,
  isUserBlocked,
  loadUserDirectory,
  setDirectMessagesEnabledRemote,
  subscribeCurrentUserChanges,
  unblockUserRemote
} from "../services/userService.js";
import {
  MAX_VOICE_NOTE_DURATION_MS,
  configureVoiceNoteAudio,
  formatVoiceNoteDuration,
  formatVoiceNotePlaybackRate,
  getVoiceNotePendingSyncMessage,
  getVoiceNoteSource,
  getNextVoiceNotePlaybackRate,
  getVoiceNoteFeatureStatus,
  isVoiceNotePendingSync,
  startVoiceNoteRecording
} from "../utils/voiceNotes.js";
import {
  getVoiceNoteDailyLimitMessage,
  isVoiceNoteDailyLimitError
} from "../utils/voiceNoteLimit.js";
import { setVoiceNoteControlIcon } from "../utils/voiceNoteIcons.js";
import {
  attachVoiceNoteScrubber,
  createVoiceNoteVisualizer
} from "../utils/voiceNoteVisualizer.js";
import {
  archiveAllConversationsForUser,
  archiveSelectedConversationsForUser,
  canEditMessage,
  deleteMessageForEveryone,
  getConversationById,
  getConversationsForUser,
  getConversationWithUser,
  getOrCreateConversation,
  getUnreadMessageCountForConversation,
  loadConversations,
  markConversationRead,
  MESSAGE_EDIT_WINDOW_MS,
  sendMessage,
  subscribeToConversationChanges,
  updateMessage
} from "../services/messageService.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import { clearConversationNotifications } from "../services/notificationService.js";
import {
  CHAT_BATCH_SIZE,
  DISCOVER_USERS_BATCH_SIZE,
  THREAD_MESSAGE_BATCH_SIZE,
  createLoadMoreControl,
  preserveElementScrollPosition
} from "../utils/listBatching.js";
import { enableSensitiveMessagesShield } from "../utils/privacyShield.js";

const voiceNoteFeatureStatus = getVoiceNoteFeatureStatus();
const MESSAGE_REPLY_SWIPE_TRIGGER_PX = 72;
const MESSAGE_REPLY_SWIPE_MAX_PX = 92;
const MESSAGE_TARGET_HIGHLIGHT_MS = 1800;
const messagesUiState = {
  visibleMessageCounts: new Map()
};

export async function renderMessages(app, currentUser, payload = null) {
  clearElement(app);
  registerViewCleanup(enableSensitiveMessagesShield());
  const shell = createElement("section", { className: "feed-shell messages-shell" });
  const navbar = createNavbar(currentUser, "messages");
  const main = createElement("main", { className: "feed-main messages-main" });

  shell.append(navbar, main);
  app.appendChild(shell);

  const activeConversation = await resolveActiveConversation(currentUser.id, payload);
  const activeConversationId = activeConversation?.id || null;
  const editingMessageId =
    typeof payload?.editingMessageId === "string" ? payload.editingMessageId : "";

  const conversations = getConversationsForUser(currentUser.id);
  const activeConversationRecord = activeConversationId
    ? getConversationById(activeConversationId)
    : null;
  shell.classList.toggle("messages-shell-thread-open", Boolean(activeConversationRecord));
  const layout = createElement("section", {
    className: `messages-layout${activeConversationRecord ? " messages-layout-thread-open" : ""}`
  });

  const conversationPanel = createConversationPanel({
    currentUser,
    conversation: activeConversationRecord,
    editingMessageId
  });
  const conversationListCard = createConversationListCard({
    currentUser,
    conversations,
    activeConversationId,
    onDirectMessagesSettingChanged: (updatedUser) => {
      Object.assign(currentUser, updatedUser);
      conversationPanel.refresh({
        currentUser
      });
    }
  });

  layout.append(conversationListCard.element, conversationPanel.element);

  main.replaceChildren(layout);

  if (activeConversationId) {
    clearConversationNotifications({
      userId: currentUser.id,
      conversationId: activeConversationId
    });
    void markConversationRead({
      conversationId: activeConversationId,
      userId: currentUser.id
    }).catch(() => {});
  }

  void loadConversations({
    currentUserId: currentUser.id,
    force: false
  }).catch((error) => {
    showToast(error.message || "Could not load messages right now.", "error");
  });

  void loadUserDirectory()
    .then(() => {
      if (!activeConversationRecord) {
        conversationPanel.refresh();
      }
    })
    .catch((error) => {
      showToast(error.message || "Could not load messages right now.", "error");
    });

  registerViewCleanup(
    subscribeToConversationChanges(() => {
      const nextConversations = getConversationsForUser(currentUser.id);
      const nextActiveConversation = activeConversationId
        ? getConversationById(activeConversationId)
        : null;

      conversationListCard.refresh({
        conversations: nextConversations,
        activeConversationId
      });
      conversationPanel.refresh(nextActiveConversation);
    })
  );

  return getNormalizedMessagesRouteState({
    payload,
    activeConversationId,
    editingMessageId
  });
}

function getNormalizedMessagesRouteState({
  payload,
  activeConversationId,
  editingMessageId = ""
}) {
  const targetUserId = typeof payload?.userId === "string" ? payload.userId.trim() : "";

  if (!targetUserId || !activeConversationId) {
    return null;
  }

  const nextPayload = {
    conversationId: activeConversationId
  };

  if (editingMessageId) {
    nextPayload.editingMessageId = editingMessageId;
  }

  return {
    routeName: "messages",
    payload: nextPayload
  };
}

function isMessageSwipeReplyEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  return typeof window.PointerEvent === "function";
}

function createMessagesLoadingSkeleton() {
  const layout = createElement("section", {
    className: "messages-layout messages-layout-loading"
  });
  const listCard = createElement("section", {
    className: "profile-card messages-card messages-list-card messages-loading-card"
  });
  const listHeader = createElement("div", {
    className: "messages-list-header messages-loading-header"
  });
  const title = createElement("span", {
    className: "feed-skeleton-block messages-loading-title"
  });
  const action = createElement("span", {
    className: "feed-skeleton-chip messages-loading-chip"
  });
  const search = createElement("span", {
    className: "feed-skeleton-rect messages-loading-search"
  });
  const list = createElement("div", {
    className: "messages-thread-list messages-loading-list"
  });
  const panelCard = createElement("section", {
    className: "profile-card messages-card messages-panel-card messages-loading-card"
  });
  const panelHeader = createElement("div", {
    className: "messages-panel-header messages-loading-panel-header"
  });
  const panelHero = createElement("div", {
    className: "messages-loading-panel-hero"
  });
  const panelAvatar = createElement("span", {
    className: "feed-skeleton-circle"
  });
  const panelName = createElement("span", {
    className: "feed-skeleton-block messages-loading-panel-title"
  });
  const panelMeta = createElement("span", {
    className: "feed-skeleton-block messages-loading-panel-meta"
  });
  const bubbleList = createElement("div", {
    className: "messages-panel-body messages-loading-bubbles"
  });
  const composer = createElement("div", {
    className: "messages-composer messages-loading-composer"
  });
  const composerInput = createElement("span", {
    className: "feed-skeleton-rect messages-loading-composer-input"
  });
  const composerBtn = createElement("span", {
    className: "feed-skeleton-chip messages-loading-composer-btn"
  });

  listHeader.append(title, action);
  listCard.append(listHeader, search, list);

  panelHero.append(panelAvatar, panelName, panelMeta);
  panelHeader.append(panelHero);
  panelCard.append(panelHeader, bubbleList, composer);

  for (let index = 0; index < 5; index += 1) {
    const item = createElement("div", {
      className: "messages-loading-thread-item"
    });
    const avatar = createElement("span", {
      className: "feed-skeleton-circle"
    });
    const copy = createElement("div", {
      className: "messages-loading-thread-copy"
    });
    const name = createElement("span", {
      className: "feed-skeleton-block messages-loading-thread-title"
    });
    const preview = createElement("span", {
      className: "feed-skeleton-block messages-loading-thread-preview"
    });

    copy.append(name, preview);
    item.append(avatar, copy);
    list.appendChild(item);
  }

  for (let index = 0; index < 4; index += 1) {
    bubbleList.appendChild(
      createElement("span", {
        className: `feed-skeleton-rect messages-loading-bubble${
          index % 2 === 0 ? " messages-loading-bubble-self" : ""
        }`
      })
    );
  }

  composer.append(composerInput, composerBtn);
  layout.append(listCard, panelCard);
  return layout;
}

async function resolveActiveConversation(currentUserId, payload) {
  const conversationId =
    typeof payload?.conversationId === "string" ? payload.conversationId : "";
  const targetUserId = typeof payload?.userId === "string" ? payload.userId : "";

  if (targetUserId && targetUserId !== currentUserId) {
    const existingConversation = getConversationWithUser({
      currentUserId,
      targetUserId
    });

    if (existingConversation) {
      return existingConversation;
    }

    try {
      return await getOrCreateConversation({
        currentUserId,
        targetUserId
      });
    } catch (error) {
      showToast(error.message || "Could not open that conversation.", "error");
      return null;
    }
  }

  if (conversationId) {
    return getConversationById(conversationId);
  }

  return null;
}

function createConversationListCard({
  currentUser,
  conversations,
  activeConversationId,
  onDirectMessagesSettingChanged = null
}) {
  const card = createElement("section", {
    className: "profile-card messages-card messages-list-card"
  });
  const header = createElement("div", { className: "messages-list-header" });
  const titleRow = createElement("div", { className: "messages-list-title-row" });
  const heading = createElement("h2", {
    className: "messages-page-title",
    text: "Chats"
  });
  const dmToggle = createElement("label", {
    className: "messages-toggle"
  });
  const dmToggleText = createElement("span", {
    className: "messages-toggle-text",
    text: "Direct messages"
  });
  const dmToggleInput = createElement("input", {
    className: "messages-toggle-input",
    type: "checkbox",
    attributes: {
      "aria-label": "Enable direct messages"
    }
  });
  const dmToggleTrack = createElement("span", {
    className: "messages-toggle-track"
  });
  const actions = createElement("div", { className: "messages-list-actions" });
  const selectBtn = createElement("button", {
    className: "messages-list-action-btn",
    type: "button",
    text: "Select"
  });
  const deleteSelectedBtn = createElement("button", {
    className: "messages-list-action-btn messages-list-action-btn-danger",
    type: "button",
    text: "Delete selected"
  });
  const deleteAllBtn = createElement("button", {
    className: "messages-list-action-btn messages-list-action-btn-danger",
    type: "button",
    text: "Delete all"
  });
  const searchWrap = createElement("label", {
    className: "messages-search"
  });
  const searchIcon = createSearchIcon();
  const searchInput = createElement("input", {
    className: "messages-search-input",
    type: "search",
    placeholder: "Search chats",
    autocomplete: "off",
    attributes: {
      "aria-label": "Search chats"
    }
  });
  const list = createElement("div", { className: "messages-thread-list" });

  let selectionMode = false;
  let searchQuery = "";
  let visibleConversationCount = CHAT_BATCH_SIZE;
  let conversationsState = Array.isArray(conversations) ? conversations : [];
  let activeConversationIdState = activeConversationId;
  let dmTogglePending = false;
  const selectedConversationIds = new Set();

  dmToggleInput.checked = currentUser.directMessagesEnabled !== false;
  dmToggle.append(dmToggleText, dmToggleInput, dmToggleTrack);

  const getFilteredConversations = () => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversationsState;
    }

    return conversationsState.filter((conversation) => {
      const otherUser = getConversationPartner(conversation, currentUser.id);
      const lastMessage = conversation.messages[conversation.messages.length - 1] || null;
      const preview = getConversationPreviewText({
        currentUser,
        message: lastMessage,
        otherUser
      });

      return (
        otherUser?.username.toLowerCase().includes(normalizedQuery) ||
        preview.toLowerCase().includes(normalizedQuery)
      );
    });
  };

  const clearSelection = () => {
    selectedConversationIds.clear();
  };

  const syncActionButtons = () => {
    selectBtn.textContent = selectionMode ? "Cancel" : "Select";
    deleteSelectedBtn.hidden = !selectionMode;
    deleteSelectedBtn.disabled = selectedConversationIds.size === 0;
    deleteSelectedBtn.textContent =
      selectedConversationIds.size > 0
        ? `Delete selected (${selectedConversationIds.size})`
        : "Delete selected";
    deleteAllBtn.disabled = conversationsState.length === 0;
  };

  const archiveSelected = (conversationIds) => {
    if (conversationIds.length === 0) {
      showToast("Select at least one chat to delete.", "error");
      return;
    }

    showConfirmDialog({
      title: "Delete selected chats?",
      message: "They will be deleted for you. Messaging again will start a fresh conversation.",
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await archiveSelectedConversationsForUser({
            conversationIds,
            userId: currentUser.id
          });
          conversationIds.forEach((conversationId) => {
            clearConversationNotifications({
              userId: currentUser.id,
              conversationId
            });
          });

          const nextPayload =
            activeConversationIdState && !conversationIds.includes(activeConversationIdState)
              ? { conversationId: activeConversationIdState }
              : null;
          void navigate("messages", nextPayload);
        } catch (error) {
          showToast(error.message || "Could not delete the selected chats.", "error");
        }
      }
    });
  };

  const archiveAll = () => {
    if (conversationsState.length === 0) {
      showToast("There are no chats to delete.", "error");
      return;
    }

    showConfirmDialog({
      title: "Delete all chats?",
      message: "This deletes your current chat history. New messages will start fresh conversations.",
      confirmText: "Delete all",
      danger: true,
      onConfirm: async () => {
        try {
          await archiveAllConversationsForUser(currentUser.id);
          conversationsState.forEach((conversation) => {
            clearConversationNotifications({
              userId: currentUser.id,
              conversationId: conversation.id
            });
          });
          void navigate("messages");
        } catch (error) {
          showToast(error.message || "Could not delete all chats.", "error");
        }
      }
    });
  };

  const renderList = () => {
    clearElement(list);

    const filteredConversations = getFilteredConversations();

    if (filteredConversations.length === 0) {
      list.appendChild(
        createElement("p", {
          className: "messages-empty-copy",
          text:
            searchQuery.trim().length > 0
              ? "No chats matched your search."
              : "No conversations yet."
        })
      );
      syncActionButtons();
      return;
    }

    const visibleConversations = filteredConversations.slice(0, visibleConversationCount);

    visibleConversations.forEach((conversation) => {
      const otherUser = getConversationPartner(conversation, currentUser.id);

      if (!otherUser) {
        return;
      }

      const unreadCount = getUnreadMessageCountForConversation({
        conversationId: conversation.id,
        userId: currentUser.id
      });
      const lastMessage = conversation.messages[conversation.messages.length - 1] || null;
      const item = createElement("button", {
        className: `messages-thread-item${
          activeConversationIdState === conversation.id ? " messages-thread-item-active" : ""
        }${unreadCount > 0 ? " messages-thread-item-unread" : ""}`,
        type: "button",
        attributes: {
          "aria-label": `Open conversation with ${otherUser.username}`,
          title: otherUser.username
        }
      });
      const avatar = createAvatarElement(otherUser, {
        size: "md",
        className: "messages-thread-avatar",
        decorative: true
      });
      const copy = createElement("div", { className: "messages-thread-copy" });
      const topRow = createElement("div", { className: "messages-thread-top-row" });
      const name = createElement("strong", {
        className: "messages-thread-name",
        text: otherUser.username
      });
      const time = createElement("span", {
        className: "messages-thread-time",
        text: lastMessage ? formatMessageTimestamp(lastMessage.createdAt) : "New"
      });
      const preview = createElement("p", {
        className: "messages-thread-preview",
        text: getConversationPreviewText({
          currentUser,
          message: lastMessage,
          otherUser
        })
      });
      const statusRow = createElement("div", {
        className: "messages-thread-status-row"
      });

      topRow.append(name, time);
      copy.append(topRow, preview);

      if (unreadCount > 0) {
        statusRow.appendChild(
          createElement("span", {
            className: "messages-thread-badge",
            text: formatCompactCount(unreadCount)
          })
        );
      }

      item.append(avatar, copy);

      if (selectionMode) {
        const check = createElement("input", {
          className: "messages-thread-check",
          type: "checkbox",
          attributes: {
            "aria-label": `Select ${otherUser.username}`
          }
        });
        check.checked = selectedConversationIds.has(conversation.id);
        check.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        check.addEventListener("change", () => {
          if (check.checked) {
            selectedConversationIds.add(conversation.id);
          } else {
            selectedConversationIds.delete(conversation.id);
          }
          syncActionButtons();
        });
        statusRow.appendChild(check);
      }

      if (statusRow.childElementCount > 0) {
        copy.appendChild(statusRow);
      }

      item.addEventListener("click", () => {
        if (selectionMode) {
          if (selectedConversationIds.has(conversation.id)) {
            selectedConversationIds.delete(conversation.id);
          } else {
            selectedConversationIds.add(conversation.id);
          }
          renderList();
          return;
        }

        void navigate("messages", { conversationId: conversation.id });
      });
      list.appendChild(item);
    });

    if (filteredConversations.length > visibleConversations.length) {
      list.appendChild(
        createLoadMoreControl({
          label: "See more chats",
          className: "messages-load-more-row",
          onClick: () => {
            visibleConversationCount += CHAT_BATCH_SIZE;
            preserveElementScrollPosition(list, () => {
              renderList();
            });
          }
        })
      );
    }

    syncActionButtons();
  };

  titleRow.append(heading, actions);
  actions.append(dmToggle, selectBtn, deleteSelectedBtn, deleteAllBtn);
  searchWrap.append(searchIcon, searchInput);
  header.append(titleRow, searchWrap);
  card.append(header, list);

  dmToggleInput.addEventListener("change", () => {
    (async () => {
      const nextEnabled = dmToggleInput.checked;

      if (dmTogglePending) {
        dmToggleInput.checked = currentUser.directMessagesEnabled !== false;
        return;
      }

      try {
        dmTogglePending = true;
        dmToggleInput.disabled = true;
        const updatedUser = await setDirectMessagesEnabledRemote({
          enabled: nextEnabled
        });
        currentUser.directMessagesEnabled = updatedUser.directMessagesEnabled;
        dmToggleInput.checked = currentUser.directMessagesEnabled !== false;
        onDirectMessagesSettingChanged?.(updatedUser);
      } catch (error) {
        dmToggleInput.checked = currentUser.directMessagesEnabled !== false;
        showToast(error.message || "Could not update direct messages.", "error");
      } finally {
        dmTogglePending = false;
        dmToggleInput.disabled = false;
      }
    })();
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    visibleConversationCount = CHAT_BATCH_SIZE;
    renderList();
  });

  selectBtn.addEventListener("click", () => {
    selectionMode = !selectionMode;

    if (!selectionMode) {
      clearSelection();
    }

    renderList();
  });

  deleteSelectedBtn.addEventListener("click", () => {
    archiveSelected([...selectedConversationIds]);
  });

  deleteAllBtn.addEventListener("click", archiveAll);

  renderList();

  return {
    element: card,
    refresh({
      conversations: nextConversations = conversationsState,
      activeConversationId: nextActiveConversationId = activeConversationIdState
    } = {}) {
      conversationsState = Array.isArray(nextConversations) ? nextConversations : [];
      activeConversationIdState = nextActiveConversationId;

      const validConversationIds = new Set(conversationsState.map((conversation) => conversation.id));
      Array.from(selectedConversationIds).forEach((conversationId) => {
        if (!validConversationIds.has(conversationId)) {
          selectedConversationIds.delete(conversationId);
        }
      });

      renderList();
    }
  };
}

function createConversationPanel({ currentUser, conversation, editingMessageId }) {
  const card = createElement("section", {
    className: "profile-card messages-card messages-panel-card"
  });

  if (!conversation) {
    const discoverPanel = createDiscoverPeoplePanel(currentUser);
    card.appendChild(discoverPanel.element);
    return {
      element: card,
      refresh() {
        discoverPanel.refresh();
      }
    };
  }

  let conversationState = conversation;
  let currentUserState = currentUser;
  let editingMessageIdState = editingMessageId;
  let replyingToMessageIdState = "";
  let isSending = false;
  let pendingClientRequestId = "";
  let focusedMessageTimeoutId = null;
  const otherUser = getConversationPartner(conversation, currentUser.id);
  const getAvailability = () =>
    getDirectMessageAvailability({
      senderUserId: currentUserState.id,
      recipientUserId: otherUser?.id || ""
    });
  let availabilityState = getAvailability();
  const currentUserBlockedOther = otherUser
    ? isUserBlocked({
        currentUserId: currentUserState.id,
        targetUserId: otherUser.id
      })
    : false;
  const header = createElement("div", { className: "messages-panel-header" });
  const topbar = createElement("div", { className: "messages-panel-topbar" });
  const backBtn = createElement("button", {
    className: "messages-panel-back-btn",
    type: "button",
    attributes: {
      "aria-label": "Back to chats",
      title: "Back"
    }
  });
  const userBtn = createElement("button", {
    className: "messages-panel-user",
    type: "button",
    attributes: {
      "aria-label": `Open ${otherUser?.username || "user"} profile`,
      title: otherUser?.username || "Profile"
    }
  });
  const panelMenuBtn = createElement("button", {
    className: "messages-panel-menu-btn",
    type: "button",
    attributes: {
      "aria-label": "Conversation options",
      title: "Conversation options"
    }
  });
  const avatar = createAvatarElement(otherUser, {
    size: "md",
    className: "messages-panel-avatar",
    decorative: true
  });
  const userCopy = createElement("div", { className: "messages-panel-user-copy" });
  const name = createElement("strong", {
    className: "messages-panel-name",
    text: otherUser?.username || "Unknown User"
  });
  const location = createElement("span", {
    className: "messages-panel-location",
    text: otherUser
      ? `${otherUser.location.township} ${otherUser.location.extension}`
      : "Profile unavailable"
  });
  const spotlightNote = createElement("p", {
    className: "messages-panel-note",
    text:
      availabilityState.allowed
        ? "Direct messages are synced to your account."
        : availabilityState.message
  });
  const body = createElement("div", { className: "messages-panel-body" });
  const messages = createElement("div", {
    className: "messages-bubble-list"
  });
  const composer = createElement("form", {
    className: "messages-composer"
  });
  const replyComposer = createElement("div", {
    className: "messages-reply-composer",
    attributes: {
      role: "status",
      "aria-live": "polite"
    }
  });
  replyComposer.hidden = true;
  const composerControls = createElement("div", {
    className: "messages-composer-controls"
  });
  const input = createElement("input", {
    className: "form-input messages-composer-input",
    type: "text",
    placeholder: otherUser ? `Message @${otherUser.username}` : "Write a message",
    autocomplete: "off",
    attributes: {
      "aria-label": "Write a direct message"
    }
  });
  const submitBtn = createElement("button", {
    className: "primary-btn messages-send-btn",
    type: "submit",
    attributes: {
      "aria-label": "Send message",
      title: "Send"
    }
  });
  submitBtn.appendChild(createSendIcon());
  const baseInputPlaceholder = otherUser ? `Message @${otherUser.username}` : "Write a message";
  const mobileComposerMediaQuery =
    typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 879px)") : null;
  let mobileComposerLayoutFrameId = 0;
  const syncMobileComposerLayout = () => {
    const isMobileViewport = mobileComposerMediaQuery
      ? mobileComposerMediaQuery.matches
      : window.innerWidth <= 879;

    if (!isMobileViewport) {
      card.style.removeProperty("--messages-mobile-composer-height");
      return;
    }

    const composerHeight = Math.ceil(composer.getBoundingClientRect().height || 0);

    if (composerHeight > 0) {
      card.style.setProperty("--messages-mobile-composer-height", `${composerHeight}px`);
    }
  };
  const queueMobileComposerLayoutSync = () => {
    window.cancelAnimationFrame(mobileComposerLayoutFrameId);
    mobileComposerLayoutFrameId = window.requestAnimationFrame(() => {
      mobileComposerLayoutFrameId = 0;
      syncMobileComposerLayout();
    });
  };
  const getComposerPlaceholder = (voiceState = null) => {
    const nextVoiceState = voiceState || voiceComposer?.getState?.() || {
      active: false,
      hasDraft: false,
      isRecording: false
    };

    if (!availabilityState.allowed) {
      return availabilityState.message;
    }

    if (nextVoiceState.isRecording) {
      return "Recording voice note...";
    }

    if (nextVoiceState.hasDraft) {
      return "Voice note ready to send";
    }

    return baseInputPlaceholder;
  };
  const setComposerBusyState = (nextBusy) => {
    isSending = Boolean(nextBusy);
    composer.classList.toggle("messages-composer-busy", isSending);
    composer.setAttribute("aria-busy", isSending ? "true" : "false");
    submitBtn.classList.toggle("messages-send-btn-busy", isSending);
    submitBtn.setAttribute("aria-busy", isSending ? "true" : "false");
    voiceComposer?.setDisabled(isSending || !availabilityState.allowed);
    syncComposerControls();
  };
  const voiceComposer = voiceNoteFeatureStatus.supported
    ? createDmVoiceComposer({
        onBeforeRecord: () => {
          if (input.value.trim()) {
            showToast("Send or clear your text before recording a voice note.", "error");
            return false;
          }

          return true;
        },
        onError: (message) => {
          showToast(message, "error");
        },
        onStateChange: ({ active, hasDraft, isRecording }) => {
          if (!isSending) {
            pendingClientRequestId = "";
          }

          composer.classList.toggle("messages-composer-voice-active", active);
          input.disabled = isSending || !availabilityState.allowed || active;
          input.placeholder = getComposerPlaceholder({
            active,
            hasDraft,
            isRecording
          });
          submitBtn.disabled =
            isSending ||
            !availabilityState.allowed ||
            isRecording ||
            (!input.value.trim() && !hasDraft);
          submitBtn.classList.toggle(
            "messages-send-btn-voice",
            !isSending && hasDraft && !isRecording
          );
        }
      })
    : null;
  const voiceTriggerBtn = voiceComposer?.triggerBtn || null;

  backBtn.appendChild(createChevronLeftIcon());
  panelMenuBtn.appendChild(createDotsIcon());

  userCopy.append(name, location);
  userBtn.append(avatar, userCopy);
  topbar.append(backBtn, userBtn, panelMenuBtn);
  header.append(topbar, spotlightNote);

  backBtn.addEventListener("click", () => {
    void navigate("messages");
  });

  userBtn.addEventListener("click", () => {
    if (!otherUser) {
      return;
    }

    showUserPreviewSheet({
      userId: otherUser.id,
      currentUserId: currentUser.id
    });
  });

  panelMenuBtn.addEventListener("click", () => {
    showActionSheet({
      title: "Conversation",
      actions: [
        {
          label: currentUserBlockedOther ? "Unblock" : "Block",
          danger: currentUserBlockedOther === false,
          onSelect: () => {
            const confirmTitle = currentUserBlockedOther ? "Unblock this user?" : "Block this user?";
            const confirmMessage = currentUserBlockedOther
              ? "You can send direct messages to each other again."
              : "Neither of you will be able to send or receive direct messages.";

            showConfirmDialog({
              title: confirmTitle,
              message: confirmMessage,
              confirmText: currentUserBlockedOther ? "Unblock" : "Block",
              danger: currentUserBlockedOther === false,
              onConfirm: async () => {
                try {
                  if (currentUserBlockedOther) {
                    await unblockUserRemote({
                      targetUserId: otherUser.id
                    });
                  } else {
                    await blockUserRemote({
                      targetUserId: otherUser.id
                    });
                  }

                  void navigate("messages", { conversationId: conversationState.id });
                } catch (error) {
                  showToast(error.message || "Could not update block state.", "error");
                }
              }
            });
          }
        },
        {
          label: "Delete chat",
          danger: true,
          onSelect: () => {
            showConfirmDialog({
              title: "Delete this chat?",
              message: "It will be deleted for you. Messaging again will start a fresh conversation.",
              confirmText: "Delete",
              danger: true,
              onConfirm: async () => {
                try {
                  await archiveSelectedConversationsForUser({
                    conversationIds: [conversationState.id],
                    userId: currentUser.id
                  });
                  clearConversationNotifications({
                    userId: currentUser.id,
                    conversationId: conversationState.id
                  });
                  void navigate("messages");
                } catch (error) {
                  showToast(error.message || "Could not delete that chat.", "error");
                }
              }
            });
          }
        }
      ]
    });
  });
  const composerResizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          queueMobileComposerLayoutSync();
        })
      : null;
  composerResizeObserver?.observe(composer);
  window.addEventListener("resize", queueMobileComposerLayoutSync);
  window.visualViewport?.addEventListener("resize", queueMobileComposerLayoutSync);
  if (mobileComposerMediaQuery?.addEventListener) {
    mobileComposerMediaQuery.addEventListener("change", queueMobileComposerLayoutSync);
  } else if (mobileComposerMediaQuery?.addListener) {
    mobileComposerMediaQuery.addListener(queueMobileComposerLayoutSync);
  }
  registerViewCleanup(() => {
    window.cancelAnimationFrame(mobileComposerLayoutFrameId);
    composerResizeObserver?.disconnect();
    window.removeEventListener("resize", queueMobileComposerLayoutSync);
    window.visualViewport?.removeEventListener("resize", queueMobileComposerLayoutSync);
    if (mobileComposerMediaQuery?.removeEventListener) {
      mobileComposerMediaQuery.removeEventListener("change", queueMobileComposerLayoutSync);
    } else if (mobileComposerMediaQuery?.removeListener) {
      mobileComposerMediaQuery.removeListener(queueMobileComposerLayoutSync);
    }
  });

  const getMessageById = (messageId) =>
    conversationState.messages.find((entry) => entry.id === messageId) || null;

  const clearMessageHighlight = () => {
    window.clearTimeout(focusedMessageTimeoutId);
    focusedMessageTimeoutId = null;

    messages.querySelectorAll(".messages-bubble-stack-targeted").forEach((node) => {
      node.classList.remove("messages-bubble-stack-targeted");
      node.removeAttribute("tabindex");
    });
  };

  const highlightMessageElement = (targetMessageElement) => {
    if (!targetMessageElement) {
      return false;
    }

    clearMessageHighlight();
    targetMessageElement.classList.add("messages-bubble-stack-targeted");
    targetMessageElement.setAttribute("tabindex", "-1");
    targetMessageElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    targetMessageElement.focus({ preventScroll: true });
    focusedMessageTimeoutId = window.setTimeout(() => {
      targetMessageElement.classList.remove("messages-bubble-stack-targeted");
      targetMessageElement.removeAttribute("tabindex");
      focusedMessageTimeoutId = null;
    }, MESSAGE_TARGET_HIGHLIGHT_MS);
    return true;
  };

  const focusMessageById = (messageId) => {
    if (!messageId) {
      return false;
    }

    const visibleMessageCount =
      messagesUiState.visibleMessageCounts.get(conversationState.id) || THREAD_MESSAGE_BATCH_SIZE;
    const targetMessageIndex = conversationState.messages.findIndex(
      (entry) => entry.id === messageId
    );

    if (targetMessageIndex === -1) {
      return false;
    }

    const requiredVisibleMessageCount = conversationState.messages.length - targetMessageIndex;

    if (requiredVisibleMessageCount > visibleMessageCount) {
      messagesUiState.visibleMessageCounts.set(
        conversationState.id,
        requiredVisibleMessageCount
      );
      renderMessagesList({ focusMessageId: messageId });
      return true;
    }

    const targetMessageElement = messages.querySelector(
      `[data-message-id="${messageId}"]`
    );

    if (targetMessageElement) {
      return highlightMessageElement(targetMessageElement);
    }

    renderMessagesList({ focusMessageId: messageId });
    return true;
  };

  const syncReplyComposer = () => {
    clearElement(replyComposer);
    replyComposer.hidden = true;
    queueMobileComposerLayoutSync();

    if (!replyingToMessageIdState || editingMessageIdState) {
      return;
    }

    const replyTargetMessage = getMessageById(replyingToMessageIdState);

    if (!replyTargetMessage) {
      replyingToMessageIdState = "";
      return;
    }

    const shell = createElement("div", {
      className: "messages-reply-composer-shell"
    });
    const copy = createElement("div", {
      className: "messages-reply-composer-copy"
    });
    const label = createElement("span", {
      className: "messages-reply-composer-label",
      text: `Replying to ${getReplyMessageAuthorLabel({
        message: replyTargetMessage,
        currentUser,
        otherUser
      })}`
    });
    const dismissBtn = createElement("button", {
      className: "messages-reply-composer-dismiss",
      type: "button",
      text: "Cancel"
    });

    copy.append(
      label,
      createReplyReference({
        message: replyTargetMessage,
        currentUser,
        otherUser,
        className: "messages-reply-reference-composer",
        onSelect: () => {
          focusMessageById(replyTargetMessage.id);
        }
      })
    );
    shell.append(copy, dismissBtn);
    replyComposer.appendChild(shell);
    replyComposer.hidden = false;
    queueMobileComposerLayoutSync();

    dismissBtn.addEventListener("click", () => {
      replyingToMessageIdState = "";
      if (!isSending) {
        pendingClientRequestId = "";
      }
      syncReplyComposer();

      if (!editingMessageIdState) {
        input.focus({ preventScroll: true });
      }
    });
  };

  const renderMessagesList = ({
    preserveScrollPosition = false,
    stickToBottom = false,
    focusMessageId = ""
  } = {}) => {
    const previousScrollTop = messages.scrollTop;
    const previousScrollHeight = messages.scrollHeight;

    clearElement(messages);

    if (conversationState.messages.length === 0) {
      messages.appendChild(
        createElement("p", {
          className: "messages-empty-copy",
          text: otherUser
            ? `No messages yet. Say hello to @${otherUser.username}.`
            : "This conversation is empty."
        })
      );
    } else {
      const lastSeenOwnMessageId = getLastSeenOwnMessageId({
        conversation: conversationState,
        currentUserId: currentUser.id,
        otherUserId: otherUser?.id || ""
      });
      const visibleMessageCount =
        messagesUiState.visibleMessageCounts.get(conversationState.id) || THREAD_MESSAGE_BATCH_SIZE;
      const visibleMessages = conversationState.messages.slice(-visibleMessageCount);

      if (conversationState.messages.length > visibleMessages.length) {
        messages.appendChild(
          createLoadMoreControl({
            label: "Load older messages",
            className: "messages-load-more-row",
            onClick: () => {
              messagesUiState.visibleMessageCounts.set(
                conversationState.id,
                visibleMessageCount + THREAD_MESSAGE_BATCH_SIZE
              );
              renderMessagesList({ preserveScrollPosition: true });
            }
          })
        );
      }

      visibleMessages.forEach((message) => {
        messages.appendChild(
          createMessageBubble({
            currentUser,
            otherUser,
            conversationId: conversationState.id,
            message,
            replyTargetMessage: getMessageById(message.replyToMessageId),
            seenUser: message.id === lastSeenOwnMessageId ? otherUser : null,
            isEditing: editingMessageIdState === message.id,
            onReply: (messageId) => {
              replyingToMessageIdState = messageId;
              pendingClientRequestId = "";
              syncReplyComposer();

              if (!editingMessageIdState) {
                input.focus({ preventScroll: true });
              }
            },
            onReplyTargetSelect: (messageId) => {
              focusMessageById(messageId);
            },
            onStartEdit: (messageId) => {
              editingMessageIdState = messageId;
              syncReplyComposer();
              renderMessagesList({ preserveScrollPosition: true });
            },
            onCancelEdit: () => {
              editingMessageIdState = "";
              syncReplyComposer();
              renderMessagesList({ preserveScrollPosition: true });
            },
            onMessageUpdated: (nextConversation) => {
              editingMessageIdState = "";
              conversationState = nextConversation;
              syncReplyComposer();
              renderMessagesList({ preserveScrollPosition: true });
            },
            onMessageDeleted: (nextConversation) => {
              editingMessageIdState = "";
              conversationState = nextConversation;
              syncReplyComposer();
              renderMessagesList({ preserveScrollPosition: true });
            }
          })
        );
      });
    }

    window.requestAnimationFrame(() => {
      if (focusMessageId) {
        highlightMessageElement(
          messages.querySelector(`[data-message-id="${focusMessageId}"]`)
        );
        return;
      }

      if (preserveScrollPosition) {
        messages.scrollTop = messages.scrollHeight - previousScrollHeight + previousScrollTop;
        return;
      }

      if (stickToBottom) {
        messages.scrollTo({
          top: messages.scrollHeight || 0,
          behavior: "auto"
        });
      }
    });

    syncReplyComposer();
  };

  const syncComposerControls = () => {
    const voiceState = voiceComposer?.getState?.() || {
      active: false,
      hasDraft: false,
      isRecording: false
    };

    input.disabled = isSending || !availabilityState.allowed || voiceState.active;
    input.placeholder = getComposerPlaceholder(voiceState);
    submitBtn.disabled =
      isSending ||
      !availabilityState.allowed ||
      voiceState.isRecording ||
      (!input.value.trim() && !voiceState.hasDraft);
    submitBtn.classList.toggle(
      "messages-send-btn-voice",
      !isSending && voiceState.hasDraft && !voiceState.isRecording
    );
    queueMobileComposerLayoutSync();
  };

  const syncAvailabilityState = () => {
    availabilityState = getAvailability();
    spotlightNote.textContent = availabilityState.allowed
      ? "Direct messages are synced to your account."
      : availabilityState.message;

    if (voiceComposer) {
      voiceComposer.setDisabled(isSending || !availabilityState.allowed);
    }

    syncComposerControls();
  };

  if (voiceComposer) {
    voiceComposer.setDisabled(!availabilityState.allowed);
  }
  syncComposerControls();

  composerControls.append(input);
  if (voiceTriggerBtn) {
    composerControls.appendChild(voiceTriggerBtn);
  }
  composerControls.appendChild(submitBtn);
  if (voiceComposer) {
    composer.append(voiceComposer.root);
  }
  composer.append(replyComposer, composerControls);

  input.addEventListener("input", () => {
    if (!isSending) {
      pendingClientRequestId = "";
    }

    syncComposerControls();
  });
  composer.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSending) {
      return;
    }

    try {
      if (voiceComposer?.isRecording()) {
        throw new Error("Stop the voice note recording before sending.");
      }

      const voiceNoteDraft = voiceComposer?.getDraft() || null;

      if (input.value.trim() && voiceNoteDraft?.dataUrl) {
        throw new Error("Send text or a voice note, not both.");
      }

      if (!pendingClientRequestId) {
        pendingClientRequestId = crypto.randomUUID();
      }

      setComposerBusyState(true);
      const updatedConversation = await sendMessage({
        conversationId: conversationState.id,
        clientRequestId: pendingClientRequestId,
        replyToMessageId: replyingToMessageIdState,
        text: input.value,
        voiceNote: voiceNoteDraft
      });

      if (voiceComposer) {
        voiceComposer.clear();
      }

      input.value = "";
      pendingClientRequestId = "";
      replyingToMessageIdState = "";
      conversationState = updatedConversation;
      syncReplyComposer();
      syncComposerControls();
      renderMessagesList({ stickToBottom: true });

      requestAnimationFrame(() => {
        if (!editingMessageIdState) {
          input.focus({ preventScroll: true });
        }
      });
    } catch (error) {
      const message = isVoiceNoteDailyLimitError(error)
        ? getVoiceNoteDailyLimitMessage(error)
        : error.message || "Could not send your message.";

      if (error?.code !== "API_NETWORK_ERROR" && error?.code !== "INTERNAL_SERVER_ERROR") {
        pendingClientRequestId = "";
      }

      showToast(message, "error");
    } finally {
      setComposerBusyState(false);
    }
  });

  body.append(messages, composer);
  card.append(header, body);
  renderMessagesList({ stickToBottom: true });
  queueMobileComposerLayoutSync();

  return {
    element: card,
    refresh(nextConversationOrOptions = null) {
      let nextConversation = nextConversationOrOptions;
      let nextCurrentUser = currentUserState;

      if (
        nextConversationOrOptions &&
        typeof nextConversationOrOptions === "object" &&
        ("conversation" in nextConversationOrOptions ||
          "currentUser" in nextConversationOrOptions)
      ) {
        nextConversation =
          Object.prototype.hasOwnProperty.call(nextConversationOrOptions, "conversation")
            ? nextConversationOrOptions.conversation
            : conversationState;
        nextCurrentUser =
          Object.prototype.hasOwnProperty.call(nextConversationOrOptions, "currentUser")
            ? nextConversationOrOptions.currentUser
            : currentUserState;
      }

      currentUserState = nextCurrentUser || currentUserState;
      syncAvailabilityState();

      if (!nextConversation || editingMessageIdState) {
        return;
      }

      const wasNearBottom =
        messages.scrollHeight - (messages.scrollTop + messages.clientHeight) < 64;
      const previousMessageCount = conversationState.messages.length;
      const nextMessageCount = Array.isArray(nextConversation.messages)
        ? nextConversation.messages.length
        : previousMessageCount;

      conversationState = nextConversation;
      syncReplyComposer();
      renderMessagesList({
        preserveScrollPosition: !wasNearBottom,
        stickToBottom: wasNearBottom || nextMessageCount > previousMessageCount
      });

      const hasUnreadIncoming = conversationState.messages.some(
        (message) =>
          message.senderId !== currentUserState.id &&
          !message.readBy.includes(currentUserState.id)
      );

      if (hasUnreadIncoming) {
        void markConversationRead({
          conversationId: conversationState.id,
          userId: currentUserState.id
        });
        void clearConversationNotifications({
          userId: currentUserState.id,
          conversationId: conversationState.id
        });
      }
    }
  };
}

function createMessageBubble({
  currentUser,
  otherUser,
  conversationId,
  message,
  replyTargetMessage = null,
  seenUser = null,
  isEditing = false,
  onReply = () => {},
  onReplyTargetSelect = () => {},
  onStartEdit = () => {},
  onCancelEdit = () => {},
  onMessageUpdated = () => {},
  onMessageDeleted = () => {}
}) {
  const isOwnMessage = message.senderId === currentUser.id;
  const isVoiceMessage =
    Boolean(getVoiceNoteSource(message.voiceNote)) || isVoiceNotePendingSync(message.voiceNote);
  const swipeReplyEnabled = isMessageSwipeReplyEnabled();
  const forwardedIndicator = !message.deletedForEveryone && message.isForwarded
    ? createElement("span", {
        className: "messages-bubble-forwarded",
        text: "Forwarded"
      })
    : null;
  const stack = createElement("div", {
    className: `messages-bubble-stack${isOwnMessage ? " messages-bubble-stack-own" : ""}`,
    attributes: {
      "data-message-id": message.id
    }
  });
  const bubble = createElement("div", {
    className: `messages-bubble${isOwnMessage ? " messages-bubble-own" : ""}${
      message.deletedForEveryone ? " messages-bubble-deleted" : ""
    }${isVoiceMessage ? " messages-bubble-voice" : ""}${
      isVoiceMessage && isOwnMessage ? " messages-bubble-voice-own" : ""
    }${
      !message.deletedForEveryone && swipeReplyEnabled ? " messages-bubble-swipeable" : ""
    }`
  });
  const swipeIndicator = createElement("div", {
    className: `messages-swipe-reply-indicator${
      isOwnMessage ? " messages-swipe-reply-indicator-own" : ""
    }`
  });
  swipeIndicator.append(
    createReplyIcon(),
    createElement("span", {
      className: "messages-swipe-reply-label",
      text: "Reply"
    })
  );

  const createMessageMenuButton = () => {
    const menuBtn = createElement("button", {
      className: `messages-bubble-menu-btn${isVoiceMessage ? " messages-bubble-menu-btn-voice" : ""}`,
      type: "button",
      attributes: {
        "aria-label": "Message options",
        title: "Message options"
      }
    });

    menuBtn.appendChild(createDotsIcon());
    menuBtn.addEventListener("click", () => {
      const actions = [
        {
          label: "Reply",
          onSelect: () => {
            onReply(message.id);
          }
        }
      ];

      if (canForwardMessage(message)) {
        actions.push({
          label: "Forward",
          iconName: "share",
          onSelect: async () => {
            await showForwardMessageSheet({
              currentUser,
              sourceConversationId: conversationId,
              message
            });
          }
        });
      }

      if (
        isOwnMessage &&
        canEditMessage({ message, userId: currentUser.id }) &&
        !getVoiceNoteSource(message.voiceNote) &&
        !isVoiceNotePendingSync(message.voiceNote)
      ) {
        actions.push({
          label: "Edit",
          onSelect: () => {
            onStartEdit(message.id);
          }
        });
      }

      if (isOwnMessage) {
        actions.push({
          label: "Delete for everyone",
          danger: true,
          onSelect: () => {
            showConfirmDialog({
              title: "Delete this message?",
              message: "Everyone in this chat will see that you deleted it.",
              confirmText: "Delete",
              danger: true,
              onConfirm: async () => {
                try {
                  const updatedConversation = await deleteMessageForEveryone({
                    conversationId,
                    messageId: message.id
                  });
                  onMessageDeleted(updatedConversation);
                } catch (error) {
                  showToast(error.message || "Could not delete that message.", "error");
                }
              }
            });
          }
        });
      }

      showActionSheet({
        title: "Message",
        actions
      });
    });

    return menuBtn;
  };
  const attachVoiceBubbleMenu = (targetBlock) => {
    if (!targetBlock || message.deletedForEveryone) {
      return targetBlock;
    }

    const menuBtn = createMessageMenuButton();
    menuBtn.classList.add("messages-bubble-menu-btn-voice-card");
    targetBlock.appendChild(menuBtn);
    return targetBlock;
  };

  if (
    isEditing &&
    isOwnMessage &&
    canEditMessage({ message, userId: currentUser.id }) &&
    !getVoiceNoteSource(message.voiceNote) &&
    !isVoiceNotePendingSync(message.voiceNote)
  ) {
    bubble.appendChild(
      createMessageEditForm({
        conversationId,
        message,
        onCancel: onCancelEdit,
        onSave: onMessageUpdated
      })
    );
    stack.appendChild(bubble);
    return stack;
  }

  stack.appendChild(swipeIndicator);

  const header = createElement("div", { className: "messages-bubble-header" });
  const meta = createElement("span", {
    className: "messages-bubble-meta",
    text: formatBubbleMeta(message)
  });

  if (!isVoiceMessage) {
    header.appendChild(meta);
  }

  if (!message.deletedForEveryone) {
    header.appendChild(createMessageMenuButton());
  }

  if (!isVoiceMessage) {
    bubble.appendChild(header);
  }

  if (forwardedIndicator) {
    bubble.appendChild(forwardedIndicator);
  }

  if (!message.deletedForEveryone && message.replyToMessageId) {
    bubble.appendChild(
      createReplyReference({
        message: replyTargetMessage,
        currentUser,
        otherUser,
        className: "messages-reply-reference-bubble",
        onSelect: () => {
          if (message.replyToMessageId) {
            onReplyTargetSelect(message.replyToMessageId);
          }
        }
      })
    );
  }

  if (message.deletedForEveryone) {
    bubble.appendChild(
      createElement("p", {
        className: "messages-bubble-deleted-copy",
        text:
          message.senderId === currentUser.id
            ? "You deleted a message."
            : `${otherUser?.username || "Someone"} deleted a message.`
      })
    );
  } else if (getVoiceNoteSource(message.voiceNote)) {
    bubble.appendChild(
      attachVoiceBubbleMenu(
        createMessageVoiceNotePlayer({
          voiceNote: message.voiceNote,
          speakerUser: isOwnMessage ? currentUser : otherUser,
          isOwnMessage,
          metaText: formatMessageTimestamp(message.createdAt)
        })
      )
    );
  } else if (isVoiceNotePendingSync(message.voiceNote)) {
    bubble.appendChild(
      attachVoiceBubbleMenu(
        createMessageVoiceNotePendingState({
          voiceNote: message.voiceNote,
          isOwnMessage,
          metaText: formatMessageTimestamp(message.createdAt)
        })
      )
    );
  } else {
    bubble.appendChild(
      createElement("p", {
        className: "messages-bubble-text",
        text: message.text
      })
    );
  }

  stack.appendChild(bubble);
  if (swipeReplyEnabled) {
    enableMessageSwipeReply({
      stack,
      swipeSurface: bubble,
      messageId: message.id,
      isOwnMessage,
      onReply
    });
  }

  if (isOwnMessage && seenUser) {
    const seenIndicator = createElement("div", {
      className: "messages-seen-indicator",
      attributes: {
        "aria-label": `${seenUser.username} has seen this message`,
        title: `Seen by ${seenUser.username}`
      }
    });

    seenIndicator.appendChild(
      createAvatarElement(seenUser, {
        size: "sm",
        className: "messages-seen-avatar",
        decorative: true
      })
    );
    stack.appendChild(seenIndicator);
  }

  return stack;
}

function canForwardMessage(message) {
  if (!message || message.deletedForEveryone) {
    return false;
  }

  if (hasForwardableVoiceNote(message.voiceNote)) {
    return true;
  }

  return typeof message.text === "string" && message.text.trim().length > 0;
}

function hasForwardableVoiceNote(voiceNote) {
  if (!voiceNote) {
    return false;
  }

  if (getVoiceNoteSource(voiceNote)) {
    return true;
  }

  return (
    (typeof voiceNote.audioBase64 === "string" && voiceNote.audioBase64.trim().length > 0) ||
    (typeof voiceNote.encryptedAudioBase64 === "string" &&
      voiceNote.encryptedAudioBase64.trim().length > 0) ||
    (typeof voiceNote.url === "string" && voiceNote.url.trim().length > 0)
  );
}

function getForwardMessagePayload(message) {
  if (!canForwardMessage(message)) {
    return null;
  }

  if (hasForwardableVoiceNote(message.voiceNote)) {
    return {
      text: "",
      voiceNote: message.voiceNote
    };
  }

  return {
    text: message.text.trim(),
    voiceNote: null
  };
}

function buildForwardTargets({ currentUserId, sourceConversationId }) {
  const recentTargets = getConversationsForUser(currentUserId)
    .filter((conversation) => conversation.id !== sourceConversationId)
    .map((conversation) => {
      const user = getConversationPartner(conversation, currentUserId);

      if (!user?.id) {
        return null;
      }

      return {
        userId: user.id,
        conversationId: conversation.id,
        user,
        username: user.username || "Unknown",
        label: `@${user.username || "unknown"}`
      };
    })
    .filter(Boolean);

  const targetIds = new Set(recentTargets.map((target) => target.userId));
  const suggestedUsers = getUsers()
    .filter((user) => user?.id && user.id !== currentUserId && !targetIds.has(user.id))
    .slice(0, 8)
    .map((user) => ({
      userId: user.id,
      conversationId: "",
      user,
      username: user.username || "Unknown",
      label: `@${user.username || "unknown"}`
    }));

  return [...recentTargets.slice(0, 8), ...suggestedUsers].slice(0, 12);
}

async function showForwardMessageSheet({
  currentUser,
  sourceConversationId,
  message
}) {
  const payload = getForwardMessagePayload(message);

  if (!payload) {
    showToast("That message cannot be forwarded right now.", "error");
    return;
  }

  const targets = buildForwardTargets({
    currentUserId: currentUser.id,
    sourceConversationId
  });

  if (targets.length === 0) {
    showToast("No chats are ready for forwarding yet.", "error");
    return;
  }

  showActionSheet({
    title: "Forward to",
    actions: targets.map((target) => ({
      label: target.label,
      avatarUser: target.user,
      onSelect: async () => {
        try {
          const targetConversation = target.conversationId
            ? getConversationById(target.conversationId)
            : await getOrCreateConversation({
                currentUserId: currentUser.id,
                targetUserId: target.userId
              });

          if (!targetConversation?.id) {
            throw new Error("Could not open that conversation.");
          }

          await sendMessage({
            conversationId: targetConversation.id,
            clientRequestId: crypto.randomUUID(),
            text: payload.text,
            voiceNote: payload.voiceNote,
            isForwarded: true
          });

          showToast(`Forwarded to @${target.username}.`, "success");
        } catch (error) {
          showToast(error.message || "Could not forward that message.", "error");
        }
      }
    }))
  });
}

function createReplyReference({
  message,
  currentUser,
  otherUser,
  className = "",
  onSelect = null
}) {
  const isInteractive = message?.id && typeof onSelect === "function";
  const reference = createElement(isInteractive ? "button" : "div", {
    className: `messages-reply-reference${
      isInteractive ? " messages-reply-reference-button" : ""
    }${className ? ` ${className}` : ""}`,
    ...(isInteractive
      ? {
          type: "button",
          attributes: {
            "aria-label": "Open replied message"
          }
        }
      : {})
  });
  const author = createElement("span", {
    className: "messages-reply-reference-author",
    text: getReplyMessageAuthorLabel({
      message,
      currentUser,
      otherUser
    })
  });
  const excerpt = createElement("p", {
    className: "messages-reply-reference-text",
    text: getReplyMessageExcerpt({
      message,
      currentUser,
      otherUser
    })
  });

  if (isInteractive) {
    reference.addEventListener("click", (event) => {
      event.stopPropagation();
      onSelect(message.id);
    });
  }

  reference.append(author, excerpt);
  return reference;
}

function enableMessageSwipeReply({
  stack,
  swipeSurface,
  messageId,
  isOwnMessage,
  onReply = () => {}
}) {
  if (!stack || !swipeSurface || !messageId || typeof onReply !== "function") {
    return;
  }

  const swipeDirection = isOwnMessage ? -1 : 1;
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let trackingSwipe = false;
  let horizontalSwipeLocked = false;
  let swipeListenersAttached = false;

  const handlePointerMove = (event) => {
    if (!trackingSwipe || event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!horizontalSwipeLocked) {
      if (Math.abs(deltaY) > 14 && Math.abs(deltaY) > Math.abs(deltaX)) {
        resetSwipe();
        return;
      }

      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      horizontalSwipeLocked = true;
    }

    const directedDelta = deltaX * swipeDirection;

    if (directedDelta <= 0) {
      stack.style.setProperty("--messages-swipe-offset", "0px");
      stack.classList.remove("messages-bubble-stack-ready");
      return;
    }

    event.preventDefault();
    const offset = Math.min(MESSAGE_REPLY_SWIPE_MAX_PX, directedDelta) * swipeDirection;
    stack.style.setProperty("--messages-swipe-offset", `${offset}px`);
    stack.classList.add("messages-bubble-stack-swiping");
    stack.classList.toggle(
      "messages-bubble-stack-ready",
      directedDelta >= MESSAGE_REPLY_SWIPE_TRIGGER_PX
    );
  };

  const removeSwipeListeners = () => {
    if (!swipeListenersAttached) {
      return;
    }

    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", finishSwipe);
    window.removeEventListener("pointercancel", resetSwipe);
    swipeListenersAttached = false;
  };

  const addSwipeListeners = () => {
    if (swipeListenersAttached) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishSwipe);
    window.addEventListener("pointercancel", resetSwipe);
    swipeListenersAttached = true;
  };

  const resetSwipe = () => {
    removeSwipeListeners();
    stack.style.setProperty("--messages-swipe-offset", "0px");
    stack.classList.remove("messages-bubble-stack-swiping");
    stack.classList.remove("messages-bubble-stack-ready");

    activePointerId = null;
    startX = 0;
    startY = 0;
    trackingSwipe = false;
    horizontalSwipeLocked = false;
  };

  const shouldIgnoreSwipeTarget = (target) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "button, input, textarea, select, a, [role='button'], [role='link'], .voice-note-meter-seekable"
      )
    );

  swipeSurface.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (shouldIgnoreSwipeTarget(event.target)) {
      return;
    }

    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    trackingSwipe = true;
    horizontalSwipeLocked = false;
    stack.style.setProperty("--messages-swipe-offset", "0px");
    addSwipeListeners();
  });

  const finishSwipe = (event) => {
    if (!trackingSwipe || event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    const directedDelta = deltaX * swipeDirection;
    const shouldReply = directedDelta >= MESSAGE_REPLY_SWIPE_TRIGGER_PX;

    resetSwipe();

    if (shouldReply) {
      onReply(messageId);
    }
  };
}

function createMessageEditForm({ conversationId, message, onCancel = () => {}, onSave = () => {} }) {
  const form = createElement("form", {
    className: "messages-edit-form"
  });
  const input = createElement("input", {
    className: "form-input messages-edit-input",
    type: "text",
    placeholder: "Edit message",
    autocomplete: "off",
    attributes: {
      "aria-label": "Edit message"
    }
  });
  const actions = createElement("div", {
    className: "messages-edit-actions"
  });
  const cancelBtn = createElement("button", {
    className: "messages-edit-btn",
    type: "button",
    text: "Cancel"
  });
  const saveBtn = createElement("button", {
    className: "messages-edit-btn messages-edit-btn-primary",
    type: "submit",
    text: "Save"
  });
  const timeLimit = createElement("p", {
    className: "messages-edit-limit",
    text: `You can edit messages for ${Math.floor(MESSAGE_EDIT_WINDOW_MS / 1000)} seconds after sending.`
  });

  input.value = message.text;
  actions.append(cancelBtn, saveBtn);
  form.append(input, actions, timeLimit);

  cancelBtn.addEventListener("click", () => {
    onCancel();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const updatedConversation = await updateMessage({
        conversationId,
        messageId: message.id,
        text: input.value
      });
      onSave(updatedConversation);
    } catch (error) {
      showToast(error.message || "Could not update that message.", "error");
    }
  });

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  });

  return form;
}

function createDmVoiceComposer({
  onBeforeRecord = () => true,
  onError = () => {},
  onStateChange = () => {}
} = {}) {
  const root = createElement("div", {
    className: "messages-voice-note-composer"
  });
  const triggerBtn = createElement("button", {
    className: "messages-voice-trigger-btn",
    type: "button",
    attributes: {
      "aria-label": "Record voice note",
      title: "Record voice note"
    }
  });
  const panel = createElement("div", {
    className: "messages-voice-panel"
  });
  const top = createElement("div", {
    className: "messages-voice-panel-top"
  });
  const lead = createElement("div", {
    className: "messages-voice-panel-lead"
  });
  const liveTimer = createElement("p", {
    className: "messages-voice-live-timer",
    text: "0:00"
  });
  const playBtn = createElement("button", {
    className: "messages-voice-play-btn",
    type: "button",
    attributes: {
      "aria-label": "Play voice note preview",
      title: "Play voice note preview"
    }
  });
  const waveShell = createElement("div", {
    className: "messages-voice-wave-shell voice-note-meter-seekable"
  });
  const waveform = createElement("div", {
    className: "messages-voice-waveform"
  });
  const progressLine = createElement("span", {
    className: "voice-note-progress-line"
  });
  const previewMeta = createElement("div", {
    className: "messages-voice-preview-meta"
  });
  const previewTimer = createElement("p", {
    className: "messages-voice-preview-timer",
    text: "0:00"
  });
  const speedBtn = createElement("button", {
    className: "voice-note-speed-btn messages-voice-speed-btn",
    type: "button",
    text: formatVoiceNotePlaybackRate(1),
    attributes: {
      "aria-label": "Change voice note playback speed",
      title: "Change voice note playback speed"
    }
  });
  const deleteBtn = createElement("button", {
    className: "messages-voice-delete-btn",
    type: "button",
    attributes: {
      "aria-label": "Delete voice note draft",
      title: "Delete voice note draft"
    }
  });
  const audio = document.createElement("audio");

  root.hidden = true;
  setVoiceNoteControlIcon(triggerBtn, "mic");
  setVoiceNoteControlIcon(playBtn, "play");
  deleteBtn.appendChild(createTrashIcon());

  previewMeta.append(previewTimer, speedBtn);
  waveShell.appendChild(waveform);
  lead.append(liveTimer);
  top.append(lead, waveShell, previewMeta, deleteBtn);
  panel.append(top);
  audio.className = "messages-voice-audio";
  configureVoiceNoteAudio(audio);
  root.append(panel, audio);

  const visualizer = createVoiceNoteVisualizer({
    waveformElement: waveform,
    progressLineElement: progressLine
  });

  let draft = null;
  let recorder = null;
  let recordingTimerId = null;
  let recordingStartedAt = 0;
  let liveSession = null;
  let playbackRate = 1;
  let progressAnimationFrameId = null;
  let resumeAfterSeek = false;
  let disabled = false;
  let lastComposerState = {
    active: false,
    isRecording: false,
    hasDraft: false
  };

  const clearRecordingTimer = () => {
    if (recordingTimerId) {
      window.clearInterval(recordingTimerId);
      recordingTimerId = null;
    }
  };

  const stopProgressAnimation = () => {
    if (progressAnimationFrameId) {
      window.cancelAnimationFrame(progressAnimationFrameId);
      progressAnimationFrameId = null;
    }
  };

  const pausePreview = () => {
    stopProgressAnimation();
    audio.pause();
  };

  const resetPreview = () => {
    pausePreview();
    audio.currentTime = 0;
  };

  const setComposerState = (nextState) => {
    root.hidden = !nextState.active;

    if (
      nextState.active !== lastComposerState.active ||
      nextState.isRecording !== lastComposerState.isRecording ||
      nextState.hasDraft !== lastComposerState.hasDraft
    ) {
      lastComposerState = nextState;
      onStateChange(nextState);
    }
  };

  const updatePreview = () => {
    const isRecording = Boolean(recorder);
    const hasDraft = Boolean(draft?.dataUrl);
    const isPlaying = !audio.paused && !audio.ended;
    const active = isRecording || hasDraft;

    setComposerState({
      active,
      isRecording,
      hasDraft
    });
    panel.classList.toggle("messages-voice-panel-recording", isRecording);
    panel.classList.toggle("messages-voice-panel-draft", !isRecording && hasDraft);
    panel.classList.toggle("messages-voice-panel-playing", isPlaying);

    triggerBtn.disabled = disabled;
    deleteBtn.disabled = disabled || !active;
    playBtn.disabled = disabled || !hasDraft || isRecording;

    liveTimer.hidden = !isRecording;
    playBtn.hidden = isRecording || !hasDraft;
    previewMeta.hidden = isRecording || !hasDraft;
    deleteBtn.hidden = !active;

    if (isRecording) {
      triggerBtn.classList.add("messages-voice-trigger-btn-recording");
      setVoiceNoteControlIcon(triggerBtn, "stop");
      triggerBtn.setAttribute("aria-label", "Stop recording voice note");
      triggerBtn.title = "Stop recording voice note";
      liveTimer.textContent = formatVoiceNoteDuration(
        Math.min(Date.now() - recordingStartedAt, MAX_VOICE_NOTE_DURATION_MS)
      );
    } else {
      triggerBtn.classList.remove("messages-voice-trigger-btn-recording");
      setVoiceNoteControlIcon(triggerBtn, "mic");
      triggerBtn.setAttribute(
        "aria-label",
        hasDraft ? "Record the voice note again" : "Record voice note"
      );
      triggerBtn.title = hasDraft ? "Record the voice note again" : "Record voice note";
    }

    if (hasDraft) {
      if (!playBtn.isConnected) {
        lead.appendChild(playBtn);
      }

      configureVoiceNoteAudio(audio, draft.dataUrl);
      audio.playbackRate = playbackRate;
      speedBtn.textContent = formatVoiceNotePlaybackRate(playbackRate);
      previewTimer.textContent = formatVoiceNoteDuration(draft.durationMs);
      setVoiceNoteControlIcon(playBtn, isPlaying ? "pause" : "play");
      playBtn.setAttribute(
        "aria-label",
        isPlaying ? "Pause voice note preview" : "Play voice note preview"
      );
      playBtn.title = isPlaying ? "Pause voice note preview" : "Play voice note preview";

      visualizer.renderStoredWaveform({
        waveform: draft.waveform,
        progressRatio: audio.ended
          ? 1
          : draft.durationMs > 0
            ? (audio.currentTime * 1000) / draft.durationMs
            : 0
      });
    } else {
      if (playBtn.isConnected) {
        playBtn.remove();
      }

      configureVoiceNoteAudio(audio);
      previewTimer.textContent = "0:00";
      setVoiceNoteControlIcon(playBtn, "play");
      visualizer.renderStoredWaveform({
        waveform: [],
        progressRatio: 0
      });
    }
  };

  const clearDraft = () => {
    if (recorder) {
      recorder.cancel();
      recorder = null;
    }

    if (liveSession) {
      liveSession.cancel();
      liveSession = null;
    }

    clearRecordingTimer();
    resetPreview();
    draft = null;
    playbackRate = 1;
    updatePreview();
  };

  const finalizeVoiceRecording = (nextVoiceNote) => {
    clearRecordingTimer();

    if (liveSession) {
      const waveformData = liveSession.stop();
      liveSession = null;
      draft = nextVoiceNote
        ? {
            ...nextVoiceNote,
            waveform: waveformData
          }
        : null;
    } else {
      draft = nextVoiceNote;
    }

    recorder = null;
    resetPreview();
    playbackRate = 1;
    updatePreview();
  };

  const beginRecording = async ({ replaceDraft = false } = {}) => {
    try {
      if (replaceDraft) {
        draft = null;
        playbackRate = 1;
        resetPreview();
      }

      recorder = await startVoiceNoteRecording({
        maxDurationMs: MAX_VOICE_NOTE_DURATION_MS
      });
      liveSession = await visualizer.startRecording({
        stream: recorder.stream,
        maxDurationMs: MAX_VOICE_NOTE_DURATION_MS
      });
      recordingStartedAt = Date.now();
      clearRecordingTimer();
      recordingTimerId = window.setInterval(updatePreview, 250);

      recorder.result
        .then((nextVoiceNote) => {
          if (recorder) {
            finalizeVoiceRecording(nextVoiceNote);
          }
        })
        .catch((error) => {
          if (recorder) {
            recorder = null;

            if (liveSession) {
              liveSession.cancel();
              liveSession = null;
            }

            clearRecordingTimer();
            draft = null;
            updatePreview();
            onError(error.message || "Voice note recording failed.");
          }
        });

      updatePreview();
    } catch (error) {
      recorder = null;

      if (liveSession) {
        liveSession.cancel();
        liveSession = null;
      }

      clearRecordingTimer();
      onError(error.message || "Could not start voice recording.");
      updatePreview();
    }
  };

  const requestRecordingStart = async ({ replaceDraft = false } = {}) => {
    if (disabled) {
      return;
    }

    const shouldContinue = onBeforeRecord();

    if (shouldContinue === false) {
      return;
    }

    await beginRecording({ replaceDraft });
  };

  triggerBtn.addEventListener("click", async () => {
    if (disabled) {
      return;
    }

    if (recorder) {
      recorder.stop();
      return;
    }

    await requestRecordingStart({ replaceDraft: Boolean(draft?.dataUrl) });
  });

  deleteBtn.addEventListener("click", clearDraft);

  playBtn.addEventListener("click", async () => {
    if (disabled || !draft?.dataUrl) {
      return;
    }

    try {
      if (audio.paused || audio.ended) {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      onError(error.message || "Could not play the voice note preview.");
    }

    updatePreview();
  });

  speedBtn.addEventListener("click", () => {
    playbackRate = getNextVoiceNotePlaybackRate(playbackRate);
    audio.playbackRate = playbackRate;
    updatePreview();
  });

  audio.addEventListener("play", () => {
    const tick = () => {
      updatePreview();

      if (!audio.paused && !audio.ended) {
        progressAnimationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      progressAnimationFrameId = null;
    };

    if (!progressAnimationFrameId) {
      progressAnimationFrameId = window.requestAnimationFrame(tick);
    }

    updatePreview();
  });

  ["pause", "ended"].forEach((eventName) => {
    audio.addEventListener(eventName, () => {
      stopProgressAnimation();
      updatePreview();
    });
  });

  ["timeupdate", "loadedmetadata"].forEach((eventName) => {
    audio.addEventListener(eventName, updatePreview);
  });

  attachVoiceNoteScrubber({
    scrubElement: waveShell,
    isEnabled: () => Boolean(draft?.durationMs),
    getDurationMs: () => draft?.durationMs || 0,
    onSeekStart: () => {
      resumeAfterSeek = !audio.paused && !audio.ended;
      audio.pause();
    },
    onSeek: ({ timeMs }) => {
      audio.currentTime = timeMs / 1000;
      updatePreview();
    },
    onSeekEnd: async () => {
      if (resumeAfterSeek) {
        try {
          await audio.play();
        } catch (error) {
          onError(error.message || "Could not continue the voice note preview.");
        }
      }

      resumeAfterSeek = false;
      updatePreview();
    }
  });

  updatePreview();

  return {
    root,
    triggerBtn,
    getDraft: () => draft,
    getState: () => ({ ...lastComposerState }),
    clear: clearDraft,
    isRecording: () => Boolean(recorder),
    setDisabled(nextDisabled) {
      disabled = Boolean(nextDisabled);

      if (disabled && recorder) {
        recorder.cancel();
        recorder = null;

        if (liveSession) {
          liveSession.cancel();
          liveSession = null;
        }

        clearRecordingTimer();
      }

      if (disabled) {
        pausePreview();
      }

      updatePreview();
    }
  };
}

function createMessageVoiceNotePlayer({
  voiceNote,
  speakerUser = null,
  isOwnMessage = false,
  metaText = ""
}) {
  const block = createElement("div", {
    className: `messages-voice-note messages-voice-note-posted${
      isOwnMessage ? " messages-voice-note-posted-own" : ""
    }`
  });
  const content = createElement("div", {
    className: "messages-voice-note-content"
  });
  const trackRow = createElement("div", {
    className: "messages-voice-note-track-row voice-note-meter-seekable"
  });
  const playBtn = createElement("button", {
    className: "messages-voice-play-btn messages-voice-play-btn-posted",
    type: "button",
    attributes: {
      "aria-label": "Play voice note",
      title: "Play voice note"
    }
  });
  const waveShell = createElement("div", {
    className: "messages-voice-wave-shell messages-voice-wave-shell-posted"
  });
  const waveform = createElement("div", {
    className: "messages-voice-waveform"
  });
  const progressLine = createElement("span", {
    className: "voice-note-progress-line"
  });
  const footer = createElement("div", {
    className: "messages-voice-note-footer"
  });
  const footerLeft = createElement("div", {
    className: "messages-voice-note-footer-left"
  });
  const duration = createElement("p", {
    className: "messages-voice-note-duration",
    text: formatVoiceNoteDuration(voiceNote.durationMs)
  });
  const speedBtn = createElement("button", {
    className: "voice-note-speed-btn messages-voice-speed-btn messages-voice-speed-btn-posted",
    type: "button",
    text: formatVoiceNotePlaybackRate(1),
    attributes: {
      "aria-label": "Change voice note playback speed",
      title: "Change voice note playback speed"
    }
  });
  const meta = createElement("span", {
    className: "messages-voice-note-meta",
    text: metaText
  });

  if (speakerUser) {
    const chip = createElement("div", {
      className: "messages-voice-speaker-chip"
    });
    const avatar = createAvatarElement(speakerUser, {
      size: "md",
      className: "messages-voice-speaker-avatar",
      decorative: true
    });
    const badge = createElement("span", {
      className: "messages-voice-speaker-badge",
      attributes: {
        "aria-hidden": "true"
      }
    });

    badge.appendChild(createMicBadgeIcon());
    chip.append(avatar, badge);
    block.appendChild(chip);
  }

  setVoiceNoteControlIcon(playBtn, "play");
  waveShell.appendChild(waveform);
  trackRow.append(playBtn, waveShell);
  footerLeft.append(duration, speedBtn);
  footer.append(footerLeft, meta);
  content.append(trackRow, footer);
  block.appendChild(content);

  const audio = document.createElement("audio");
  audio.className = "messages-voice-audio";
  configureVoiceNoteAudio(audio, getVoiceNoteSource(voiceNote));
  block.appendChild(audio);

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

    block.classList.toggle("messages-voice-note-playing", isPlaying);
    setVoiceNoteControlIcon(playBtn, isPlaying ? "pause" : "play");
    playBtn.setAttribute("aria-label", isPlaying ? "Pause voice note" : "Play voice note");
    playBtn.title = isPlaying ? "Pause voice note" : "Play voice note";

    visualizer.renderStoredWaveform({
      waveform: voiceNote.waveform,
      progressRatio
    });

    duration.textContent = formatVoiceNoteDuration(voiceNote.durationMs);
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
      duration.textContent = formatVoiceNoteDuration(voiceNote.durationMs);
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
    scrubElement: trackRow,
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
          duration.textContent = formatVoiceNoteDuration(voiceNote.durationMs);
        }
      }

      resumeAfterSeek = false;
      syncPlayer();
    }
  });

  applyPlaybackRate();
  syncPlayer();
  return block;
}

function createMessageVoiceNotePendingState({
  voiceNote,
  isOwnMessage = false,
  metaText = ""
}) {
  const block = createElement("div", {
    className: `messages-voice-pending${isOwnMessage ? " messages-voice-pending-own" : ""}`
  });
  const status = createElement("p", {
    className: "messages-voice-pending-text",
    text: getVoiceNotePendingSyncMessage()
  });
  const metaParts = [];

  if (voiceNote?.durationMs) {
    metaParts.push(formatVoiceNoteDuration(voiceNote.durationMs));
  }

  if (metaText) {
    metaParts.push(metaText);
  }

  block.appendChild(status);

  if (metaParts.length > 0) {
    block.appendChild(
      createElement("p", {
        className: "messages-voice-pending-meta",
        text: metaParts.join(" | ")
      })
    );
  }

  return block;
}

function createDiscoverPeoplePanel(currentUser) {
  const panel = createElement("section", {
    className: "messages-discover"
  });
  const header = createElement("div", {
    className: "messages-discover-header"
  });
  const title = createElement("h3", {
    className: "messages-discover-title",
    text: "Search people"
  });
  const copy = createElement("p", {
    className: "messages-discover-copy",
    text: "Find users by name or location, sort them, and start a direct message."
  });
  const controls = createElement("div", {
    className: "messages-discover-controls"
  });
  const queryInput = createElement("input", {
    className: "messages-discover-input",
    type: "search",
    placeholder: "Search by name or location",
    autocomplete: "off",
    attributes: {
      "aria-label": "Search users for direct messages"
    }
  });
  const sortSelect = createElement("select", {
    className: "messages-discover-sort",
    attributes: {
      "aria-label": "Sort users"
    }
  });
  const results = createElement("div", {
    className: "messages-discover-results"
  });
  let visibleUserCount = DISCOVER_USERS_BATCH_SIZE;

  [
    ["name", "Name A-Z"],
    ["township", "Township"],
    ["recent", "Newest members"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    sortSelect.appendChild(option);
  });

  const getSortedUsers = () => {
    const query = queryInput.value.trim().toLowerCase();
    const sortValue = sortSelect.value;

    return getUsers()
      .filter((user) => user.id !== currentUser.id)
      .filter((user) => {
        if (!query) {
          return true;
        }

        const haystack = [
          user.username,
          user.location?.township || "",
          user.location?.extension || ""
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((first, second) => {
        if (sortValue === "township") {
          return `${first.location.township} ${first.location.extension}`.localeCompare(
            `${second.location.township} ${second.location.extension}`
          );
        }

        if (sortValue === "recent") {
          return new Date(second.createdAt) - new Date(first.createdAt);
        }

        return first.username.localeCompare(second.username);
      });
  };

  const renderResults = () => {
    clearElement(results);
    const users = getSortedUsers();

    if (users.length === 0) {
      results.appendChild(
        createElement("p", {
          className: "messages-empty-copy",
          text: "No people matched your search."
        })
      );
      return;
    }

    const visibleUsers = users.slice(0, visibleUserCount);

    visibleUsers.forEach((user) => {
      const availability = getDirectMessageAvailability({
        senderUserId: currentUser.id,
        recipientUserId: user.id
      });
      const card = createElement("div", {
        className: "messages-discover-user-card"
      });
      const identityBtn = createElement("button", {
        className: "messages-discover-user",
        type: "button",
        attributes: {
          "aria-label": `Open ${user.username}'s profile`
        }
      });
      const avatar = createAvatarElement(user, {
        size: "md",
        className: "messages-discover-avatar",
        decorative: true
      });
      const body = createElement("div", {
        className: "messages-discover-user-copy"
      });
      const username = createElement("strong", {
        className: "messages-discover-user-name",
        text: user.username
      });
      const location = createElement("p", {
        className: "messages-discover-user-location",
        text: `${user.location.township} ${user.location.extension}`
      });
      const hint = createElement("p", {
        className: "messages-discover-user-hint",
        text: availability.allowed ? "Direct message available" : availability.message
      });
      const actionBtn = createElement("button", {
        className: `messages-discover-message-btn${
          availability.allowed ? "" : " messages-discover-message-btn-disabled"
        }`,
        type: "button",
        text: availability.allowed ? "Message" : "Unavailable"
      });

      actionBtn.disabled = !availability.allowed;
      identityBtn.append(avatar, body);
      body.append(username, location, hint);
      card.append(identityBtn, actionBtn);

      identityBtn.addEventListener("click", () => {
        showUserPreviewSheet({
          userId: user.id,
          currentUserId: currentUser.id
        });
      });

      actionBtn.addEventListener("click", () => {
        void navigate("messages", { userId: user.id });
      });

      results.appendChild(card);
    });

    if (users.length > visibleUsers.length) {
      results.appendChild(
        createLoadMoreControl({
          label: "See more people",
          className: "messages-load-more-row",
          onClick: () => {
            visibleUserCount += DISCOVER_USERS_BATCH_SIZE;
            preserveElementScrollPosition(results, () => {
              renderResults();
            });
          }
        })
      );
    }
  };

  header.append(title, copy);
  controls.append(queryInput, sortSelect);
  panel.append(header, controls, results);

  queryInput.addEventListener("input", () => {
    visibleUserCount = DISCOVER_USERS_BATCH_SIZE;
    renderResults();
  });
  sortSelect.addEventListener("change", () => {
    visibleUserCount = DISCOVER_USERS_BATCH_SIZE;
    renderResults();
  });
  const unsubscribeCurrentUserChanges = subscribeCurrentUserChanges(() => {
    renderResults();
  });
  registerViewCleanup(unsubscribeCurrentUserChanges);

  renderResults();
  return {
    element: panel,
    refresh() {
      renderResults();
    }
  };
}

function getConversationPartner(conversation, currentUserId) {
  const otherUserId = conversation.participantIds.find((userId) => userId !== currentUserId);
  return otherUserId ? findUserById(otherUserId) : null;
}

function getConversationPreviewText({ currentUser, message, otherUser }) {
  if (!message) {
    return otherUser ? `Start a conversation with @${otherUser.username}.` : "Start a conversation.";
  }

  if (message.deletedForEveryone) {
    const actorLabel =
      message.senderId === currentUser.id ? "You" : otherUser?.username || "Someone";
    return `${actorLabel} deleted a message.`;
  }

  if (getVoiceNoteSource(message.voiceNote)) {
    return message.senderId === currentUser.id
      ? "You sent a voice note."
      : `${otherUser?.username || "Someone"} sent you a voice note.`;
  }

  if (isVoiceNotePendingSync(message.voiceNote)) {
    return message.senderId === currentUser.id
      ? "Your voice note is reloading after refresh."
      : `${otherUser?.username || "Someone"} sent a voice note that is reloading.`;
  }

  return message.senderId === currentUser.id
    ? "You sent a message."
    : `${otherUser?.username || "Someone"} sent you a message.`;
}

function getReplyMessageAuthorLabel({ message, currentUser, otherUser }) {
  if (!message) {
    return "Original message";
  }

  return message.senderId === currentUser.id ? "You" : otherUser?.username || "Someone";
}

function getReplyMessageExcerpt({ message, currentUser, otherUser }) {
  if (!message) {
    return "Original message unavailable.";
  }

  const authorLabel = getReplyMessageAuthorLabel({
    message,
    currentUser,
    otherUser
  });

  if (message.deletedForEveryone) {
    return `${authorLabel} deleted a message.`;
  }

  if (getVoiceNoteSource(message.voiceNote)) {
    return `${authorLabel} sent a voice note.`;
  }

  if (isVoiceNotePendingSync(message.voiceNote)) {
    return `${authorLabel} sent a voice note that is reloading.`;
  }

  const normalizedText = String(message.text || "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedText || "Message unavailable.";
}

function getLastSeenOwnMessageId({ conversation, currentUserId, otherUserId }) {
  if (!conversation || !currentUserId || !otherUserId) {
    return "";
  }

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];

    if (message.senderId !== currentUserId || message.deletedForEveryone) {
      continue;
    }

    if (message.readBy.includes(otherUserId)) {
      return message.id;
    }

    break;
  }

  return "";
}

function formatBubbleMeta(message) {
  const time = formatMessageTimestamp(message.createdAt);
  const encryptionLabel = message.isEndToEndEncrypted ? " | Encrypted" : "";

  if (message.deletedForEveryone) {
    return `${time} | Deleted${encryptionLabel}`;
  }

  if (message.editedAt) {
    return `${time} | Edited${encryptionLabel}`;
  }

  return `${time}${encryptionLabel}`;
}

function formatMessageTimestamp(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function createSearchIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-search-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", "m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z");
  svg.appendChild(path);

  return svg;
}

function createChevronLeftIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-panel-back-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("d", "m15 18-6-6 6-6");
  svg.appendChild(path);

  return svg;
}

function createDotsIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-dots-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("d", "M12 5.5h.01M12 12h.01M12 18.5h.01");
  svg.appendChild(path);

  return svg;
}

function createTrashIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-voice-action-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.8");
  path.setAttribute(
    "d",
    "M4.5 6.75h15M9.75 10.25v5.5M14.25 10.25v5.5M8.5 6.75l.5-2h6l.5 2m-8 0 .55 10.06A1.5 1.5 0 0 0 10.05 18h3.9a1.5 1.5 0 0 0 1.5-1.19L16 6.75"
  );
  svg.appendChild(path);

  return svg;
}

function createSendIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-voice-action-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M4.9 4.86a1 1 0 0 1 1.09-.2l12.6 5.67a.92.92 0 0 1 0 1.68L5.99 17.68a1 1 0 0 1-1.38-1.13l1.47-4.93a.9.9 0 0 1 .86-.64h5.4a.75.75 0 0 1 0 1.5H7.5l-.8 2.67 9.73-4.39L6.7 6.37l.8 2.67h4.84a.75.75 0 0 1 0 1.5h-5.4a.9.9 0 0 1-.86-.64L4.61 5.97a1 1 0 0 1 .29-1.11Z");
  svg.appendChild(path);

  return svg;
}

function createReplyIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-reply-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("d", "M9 7 4 12l5 5M4.5 12H15a5 5 0 0 1 5 5");
  svg.appendChild(path);

  return svg;
}

function createMicBadgeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("messages-voice-badge-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    "M12 14.2a3.08 3.08 0 0 0 3.08-3.08V7.68a3.08 3.08 0 1 0-6.16 0v3.44A3.08 3.08 0 0 0 12 14.2Zm-4.66-3.05a.72.72 0 0 1 1.44 0 3.22 3.22 0 1 0 6.44 0 .72.72 0 0 1 1.44 0 4.67 4.67 0 0 1-3.94 4.6V18h1.55a.72.72 0 0 1 0 1.44H9.73a.72.72 0 0 1 0-1.44h1.55v-2.25a4.67 4.67 0 0 1-3.94-4.6Z"
  );
  svg.appendChild(path);

  return svg;
}
