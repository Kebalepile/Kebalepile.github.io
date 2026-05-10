import { clearElement, createElement } from "../utils/dom.js";
import { navigate, handleLogout, registerViewCleanup } from "../router.js";
import { createAvatarElement } from "../utils/avatar.js";
import { protectImageElement, protectMediaShell } from "../utils/protectedMedia.js";
import { showUserPreviewSheet } from "./userPreviewSheet.js";
import { showToast } from "./toast.js";
import {
  getUnreadConversationCount,
  subscribeToConversationChanges
} from "../services/messageService.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import {
  clearConversationNotifications,
  deleteAllNotifications,
  deleteNotification,
  ensureBrowserNotificationPermission,
  getBrowserNotificationPermissionStatus,
  getNotificationsForUser,
  getUnreadNotificationCount,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerNotificationOpenHandler,
  subscribeToNotificationChanges
} from "../services/notificationService.js";
import {
  findUserById,
  setNotificationsEnabledRemote
} from "../services/userService.js";
import {
  NOTIFICATION_BATCH_SIZE,
  createLoadMoreControl,
  preserveElementScrollPosition
} from "../utils/listBatching.js";
import {
  bindInstallPrompt,
  canInstallApp,
  getInstallGuidance,
  promptInstallApp
} from "../utils/pwaInstall.js";
import { formatLocation } from "../utils/location.js";

const navbarBannerUrl = new URL("../../assets/banner.png", import.meta.url).href;
const drawerBrandLogoUrl = new URL("../../assets/stream-logo-transparent.png", import.meta.url).href;

export function createNavbar(currentUser, activeRoute = "feed", options = {}) {
  bindInstallPrompt();
  const initialSearchQuery =
    typeof options.initialSearchQuery === "string" ? options.initialSearchQuery : "";
  const initialSearchMode = options.initialSearchMode === "users" ? "users" : "posts";
  const searchModeOnLoad = Boolean(options.searchMode || activeRoute === "search");
  const getMessagesMenuLabel = () => {
    const unreadConversationCount = getUnreadConversationCount(currentUser.id);
    return unreadConversationCount > 0
      ? `Messages (${formatCompactCount(unreadConversationCount)})`
      : "Messages";
  };
  const messagesMenuLabel = getMessagesMenuLabel();

  const header = createElement("header", { className: "topbar" });
  const topRow = createElement("div", { className: "topbar-row" });
  const brandGroup = createElement("div", { className: "topbar-brand-group" });
  const utilityActions = createElement("div", { className: "topbar-utility-actions" });

  const menuBtn = createElement("button", {
    className: "secondary-btn topbar-utility-btn",
    type: "button",
    attributes: {
      "aria-label": "Open menu",
      title: "Open menu"
    }
  });
  menuBtn.append(createNavButtonContent("menu", "Menu"));

  const brand = createElement("button", {
    className: "topbar-brand topbar-brand-link",
    type: "button",
    attributes: {
      "aria-label": "Go to home",
      title: "Home"
    }
  });
  brand.append(createNavbarBanner("topbar-brand-banner"));

  const searchBtn = createElement("button", {
    className: getTopbarButtonClass(activeRoute === "search"),
    type: "button",
    attributes: {
      "aria-label": "Search",
      title: "Search"
    }
  });
  searchBtn.append(createNavButtonContent("search", "Search"));

  const createBtn = createElement("button", {
    className:
      activeRoute === "create-post"
        ? "secondary-btn topbar-create-btn topbar-create-btn-active"
        : "secondary-btn topbar-create-btn",
    type: "button",
    attributes: {
      "aria-label": "Create post",
      title: "Create post"
    }
  });
  createBtn.append(createTopbarCreateContent());

  const goLiveBtn = createElement("button", {
    className: getTopbarButtonClass(activeRoute === "livestream-broadcast"),
    type: "button",
    attributes: {
      "aria-label": "Go live",
      title: "Go live"
    }
  });
  goLiveBtn.append(createNavButtonContent("go-live", "Go live"));

  let createNavigationPending = false;
  let profileNavigationPending = false;

  const setCreateNavigationBusyState = (nextBusy) => {
    createNavigationPending = Boolean(nextBusy);
    createBtn.disabled = createNavigationPending;
    createBtn.classList.toggle("topbar-create-btn-busy", createNavigationPending);
    createBtn.setAttribute("aria-busy", createNavigationPending ? "true" : "false");
  };

  const handleCreatePostNavigation = async () => {
    if (createNavigationPending || activeRoute === "create-post") {
      return;
    }

    try {
      setCreateNavigationBusyState(true);
      await navigate("create-post");
    } finally {
      setCreateNavigationBusyState(false);
    }
  };

  createBtn.addEventListener("click", () => {
    void handleCreatePostNavigation();
  });

  const notificationsBtn = createElement("button", {
    className: "secondary-btn topbar-utility-btn",
    type: "button",
    attributes: {
      "aria-label": "Notifications",
      title: "Notifications"
    }
  });
  notificationsBtn.append(createNavButtonContent("notifications", "Notifications"));

  const syncNotificationsButton = () => {
    const unreadNotificationCount = getUnreadNotificationCount(currentUser.id);
    notificationsBtn.classList.toggle(
      "topbar-utility-btn-active",
      unreadNotificationCount > 0
    );
    notificationsBtn.setAttribute(
      "aria-label",
      unreadNotificationCount > 0
        ? `${formatCompactCount(unreadNotificationCount)} unread notifications`
        : "Notifications"
    );

    const existingBadge = notificationsBtn.querySelector(".topbar-notifications-badge");

    if (unreadNotificationCount > 0) {
      if (existingBadge) {
        existingBadge.textContent = formatCompactCount(unreadNotificationCount);
      } else {
        notificationsBtn.appendChild(
          createElement("span", {
            className: "topbar-notifications-badge",
            text: formatCompactCount(unreadNotificationCount)
          })
        );
      }
      return;
    }

    existingBadge?.remove();
  };

  syncNotificationsButton();

  const profileBtn = createElement("button", {
    className:
      activeRoute === "profile"
        ? "secondary-btn topbar-profile-btn topbar-profile-btn-active"
        : "secondary-btn topbar-profile-btn",
    type: "button",
    attributes: {
      "aria-label": "Account menu",
      title: "Account menu"
    }
  });
  profileBtn.appendChild(
    createAvatarElement(currentUser, {
      size: "sm",
      className: "topbar-profile-avatar",
      decorative: true
    })
  );

  const setProfileNavigationBusyState = (nextBusy) => {
    profileNavigationPending = Boolean(nextBusy);
    profileBtn.disabled = profileNavigationPending;
    profileBtn.classList.toggle("topbar-profile-btn-busy", profileNavigationPending);
    profileBtn.setAttribute("aria-busy", profileNavigationPending ? "true" : "false");
  };

  const handleProfileNavigation = async (payload = null) => {
    if (profileNavigationPending || activeRoute === "profile") {
      return;
    }

    try {
      setProfileNavigationBusyState(true);
      await navigate("profile", payload);
    } finally {
      setProfileNavigationBusyState(false);
    }
  };

  const searchRow = createElement("div", { className: "topbar-search-row" });
  const searchBackBtn = createElement("button", {
    className: "secondary-btn topbar-search-back-btn",
    type: "button",
    attributes: {
      "aria-label": searchModeOnLoad && activeRoute === "search" ? "Back to feed" : "Close search",
      title: searchModeOnLoad && activeRoute === "search" ? "Back to feed" : "Close search"
    }
  });
  searchBackBtn.append(createNavButtonContent("back", "Back"));

  const searchForm = createElement("form", {
    className: "topbar-search-form"
  });
  const searchField = createElement("label", {
    className: "topbar-search-field"
  });
  const searchFieldIcon = createNavIcon("search");
  searchFieldIcon.classList.add("topbar-search-field-icon");

  const searchInput = createElement("input", {
    className: "topbar-search-input",
    type: "search",
    placeholder: "Search",
    autocomplete: "off",
    attributes: {
      "aria-label": "Search posts and users"
    }
  });
  searchInput.value = initialSearchQuery;

  const searchModeControl = createElement("div", {
    className: "topbar-search-mode-control"
  });
  const searchModeBtn = createElement("button", {
    className: "secondary-btn topbar-search-mode-btn",
    type: "button",
    attributes: {
      "aria-label": "Search settings",
      title: "Search settings",
      "aria-haspopup": "menu",
      "aria-expanded": "false"
    }
  });
  const searchModeIcon = createNavIcon("sliders");
  searchModeIcon.classList.add("topbar-search-mode-icon");
  const searchModeText = createElement("span", {
    className: "topbar-search-mode-text",
    text: formatSearchModeLabel(initialSearchMode)
  });
  const searchModeMenu = createElement("div", {
    className: "topbar-search-mode-menu",
    attributes: {
      role: "menu",
      "aria-label": "Search type"
    }
  });

  let searchTarget = initialSearchMode;
  let searchMenuOpen = false;
  let removeSearchMenuListeners = () => {};

  const buildSearchModeOptions = () => {
    searchModeMenu.replaceChildren();

    [
      { value: "posts", label: "Posts" },
      { value: "users", label: "Users" }
    ].forEach(({ value, label }) => {
      const optionBtn = createElement("button", {
        className: `topbar-search-mode-option${searchTarget === value ? " topbar-search-mode-option-active" : ""}`,
        type: "button",
        text: label,
        attributes: {
          role: "menuitemradio",
          "aria-checked": searchTarget === value ? "true" : "false"
        }
      });

      optionBtn.addEventListener("click", () => {
        searchTarget = value;
        searchModeText.textContent = formatSearchModeLabel(searchTarget);
        buildSearchModeOptions();
        closeSearchMenu();
      });

      searchModeMenu.appendChild(optionBtn);
    });
  };

  const closeSearchMenu = () => {
    if (!searchMenuOpen) {
      return;
    }

    searchMenuOpen = false;
    searchModeMenu.style.display = "none";
    searchModeBtn.setAttribute("aria-expanded", "false");
    removeSearchMenuListeners();
    removeSearchMenuListeners = () => {};
  };

  const openSearchMenu = () => {
    if (searchMenuOpen) {
      return;
    }

    buildSearchModeOptions();
    searchMenuOpen = true;
    searchModeMenu.style.display = "grid";
    searchModeBtn.setAttribute("aria-expanded", "true");

    const handlePointerDown = (event) => {
      if (!searchModeControl.contains(event.target)) {
        closeSearchMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSearchMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    removeSearchMenuListeners = () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  };

  searchModeBtn.append(searchModeIcon, searchModeText);
  searchModeBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    if (searchMenuOpen) {
      closeSearchMenu();
      return;
    }

    openSearchMenu();
  });

  searchModeControl.append(searchModeBtn, searchModeMenu);

  searchField.append(searchFieldIcon, searchInput);
  searchForm.append(searchField, searchModeControl);
  searchRow.append(searchBackBtn, searchForm);

  const drawerController = createTopbarDrawer({
    currentUser,
    getMessagesMenuLabel,
    onNavigate: (route, payload = null) => navigate(route, payload),
    onCreatePost: () => {
      void handleCreatePostNavigation();
    },
    onLogout: handleLogout
  });
  const notificationsMenuController = createNotificationsMenu({
    currentUser,
    onNavigate: (route, payload = null) => navigate(route, payload),
    onNotificationsChange: syncNotificationsButton
  });
  const accountMenuController = createAccountMenu({
    currentUser,
    getMessagesMenuLabel,
    onNavigate: (route, payload = null) => {
      if (route === "profile") {
        void handleProfileNavigation(payload);
        return;
      }

      navigate(route, payload);
    },
    onLogout: handleLogout
  });

  let searchMode = false;

  registerViewCleanup(
    subscribeToNotificationChanges(() => {
      syncNotificationsButton();
      notificationsMenuController.refresh();
    })
  );
  registerViewCleanup(
    subscribeToConversationChanges(() => {
      drawerController.refresh();
      accountMenuController.refresh();
    })
  );

  registerNotificationOpenHandler((notification) => {
    if (notification?.aggregate === true) {
      navigate("feed");
      return;
    }

    void handleNotificationSelection({
      notification,
      currentUserId: currentUser.id,
      onNavigate: (route, payload = null) => navigate(route, payload),
      onNotificationsChange: syncNotificationsButton,
      close: () => {}
    });
  });

  const openSearchMode = () => {
    searchMode = true;
    topRow.style.display = "none";
    searchRow.style.display = "flex";

    window.requestAnimationFrame(() => {
      searchInput.focus({ preventScroll: true });
      const caret = searchInput.value.length;
      searchInput.setSelectionRange(caret, caret);
    });
  };

  const closeSearchMode = () => {
    closeSearchMenu();

    if (activeRoute === "search") {
      navigate("feed");
      return;
    }

    searchMode = false;
    searchRow.style.display = "none";
    topRow.style.display = "flex";
    window.requestAnimationFrame(() => {
      searchBtn.focus({ preventScroll: true });
    });
  };

  const submitSearch = () => {
    const query = searchInput.value.trim();

    navigate("search", {
      query,
      mode: searchTarget
    });
  };

  brand.addEventListener("click", () => {
    void navigate("feed");
  });
  menuBtn.addEventListener("click", drawerController.open);
  notificationsBtn.addEventListener("click", notificationsMenuController.open);
  profileBtn.addEventListener("click", accountMenuController.open);
  searchBtn.addEventListener("click", openSearchMode);
  goLiveBtn.addEventListener("click", () => {
    void navigate("livestream-broadcast");
  });
  searchBackBtn.addEventListener("click", closeSearchMode);
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSearch();
  });

  brandGroup.append(menuBtn, brand);
  utilityActions.append(searchBtn, createBtn, goLiveBtn, notificationsBtn, profileBtn);
  topRow.append(brandGroup, utilityActions);
  header.append(topRow, searchRow);

  searchModeMenu.style.display = "none";
  searchRow.style.display = "none";

  if (searchModeOnLoad) {
    openSearchMode();
  }

  return header;
}

function createTopbarDrawer({
  currentUser,
  getMessagesMenuLabel,
  onNavigate,
  onCreatePost,
  onLogout
}) {
  let root = null;
  let closeTimerId = null;
  let messagesItem = null;

  const ensureRoot = () => {
    if (root?.isConnected) {
      return root;
    }

    root = createElement("div", { className: "topbar-drawer-root" });
    const overlay = createElement("button", {
      className: "topbar-drawer-overlay",
      type: "button",
      attributes: {
        "aria-label": "Close menu"
      }
    });
    const panel = createElement("aside", {
      className: "topbar-drawer-panel",
      attributes: {
        "aria-label": "Main menu"
      }
    });
    const header = createElement("div", { className: "topbar-drawer-header" });
    const brandButton = createElement("button", {
      className: "topbar-drawer-brand-btn",
      type: "button",
      attributes: {
        "aria-label": "Go to home",
        title: "Home"
      }
    });
    brandButton.append(createNavbarBanner("topbar-drawer-brand-banner", drawerBrandLogoUrl));
    brandButton.addEventListener("click", () => {
      close();
      onNavigate("feed");
    });
    header.append(brandButton);

    const navSection = createElement("div", { className: "topbar-drawer-section" });
    navSection.append(
      createDrawerItem({
        iconName: "feed",
        label: "Feed",
        onSelect: () => onNavigate("feed")
      }),
      createDrawerItem({
        iconName: "create-post",
        label: "Create post",
        onSelect: onCreatePost
      }),
      createDrawerItem({
        iconName: "live",
        label: "Live streams",
        onSelect: () => onNavigate("livestream-discover")
      }),
      createDrawerItem({
        iconName: "go-live",
        label: "Go live",
        onSelect: () => onNavigate("livestream-broadcast")
      })
    );

    const accountSection = createElement("div", { className: "topbar-drawer-section" });
    const accountTitle = createElement("p", {
      className: "topbar-drawer-section-title",
      text: "Account"
    });
    messagesItem = createDrawerItem({
      iconName: "messages",
      label: getMessagesMenuLabel(),
      onSelect: () => onNavigate("messages")
    });
    accountSection.append(
      accountTitle,
      messagesItem,
      createDrawerItem({
        iconName: "logout",
        label: "Logout",
        danger: true,
        onSelect: onLogout
      })
    );

    const infoSection = createElement("div", {
      className: "topbar-drawer-section topbar-drawer-info-section"
    });
    const aboutTitle = createElement("p", {
      className: "topbar-drawer-section-title",
      text: "About"
    });
    const aboutCopy = createElement("p", {
      className: "topbar-drawer-about-copy",
      text: "yahneh is a township-first platform for local posts, replies, live streams, and voice-note conversations across South Africa."
    });
    const installItem = createDrawerItem({
      iconName: "install",
      label: "Install app",
      onSelect: async () => {
        const didPrompt = await promptInstallApp();

        if (!didPrompt) {
          showToast(getInstallGuidance(), "error", {
            title: "Install"
          });
        }
      }
    });
    installItem.hidden = !canInstallApp();
    const copyright = createElement("p", {
      className: "topbar-drawer-copyright",
      text: "Copyright 2025. All rights reserved."
    });

    infoSection.append(aboutTitle, aboutCopy, installItem, copyright);

    panel.append(header, navSection, accountSection, infoSection);
    root.append(overlay, panel);

    overlay.addEventListener("click", close);
    panel.addEventListener("click", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => {
      if (event.target === root) {
        close();
      }
    });

    return root;
  };

  const open = () => {
    const drawer = ensureRoot();
    const installItem = drawer.querySelector(".topbar-drawer-item-install");

    if (installItem) {
      installItem.hidden = !canInstallApp();
    }

    const messagesLabel = messagesItem?.querySelector(".topbar-drawer-item-label");
    if (messagesLabel) {
      messagesLabel.textContent = getMessagesMenuLabel();
    }

    if (!drawer.isConnected) {
      document.body.appendChild(drawer);
      window.requestAnimationFrame(() => {
        drawer.classList.add("topbar-drawer-root-open");
      });
    }
  };

  const close = () => {
    if (!root?.isConnected) {
      return;
    }

    root.classList.remove("topbar-drawer-root-open");
    window.clearTimeout(closeTimerId);
    closeTimerId = window.setTimeout(() => {
      root?.remove();
      closeTimerId = null;
    }, 180);
  };

  const refresh = () => {
    const messagesLabel = messagesItem?.querySelector(".topbar-drawer-item-label");
    if (messagesLabel) {
      messagesLabel.textContent = getMessagesMenuLabel();
    }
  };

  return { open, close, refresh };
}

function createNotificationsMenu({ currentUser, onNavigate, onNotificationsChange = null }) {
  let root = null;
  let closeTimerId = null;
  let permissionHelper = null;
  let visibleNotificationCount = NOTIFICATION_BATCH_SIZE;
  let renderCurrentList = () => {};

  const updatePermissionHelper = () => {
    if (!permissionHelper) {
      return;
    }

    const status = getBrowserNotificationPermissionStatus();
    const notificationsEnabled = currentUser.notificationsEnabled !== false;

    if (!notificationsEnabled || status.permission === "granted") {
      permissionHelper.textContent = "";
      permissionHelper.style.display = "none";
      return;
    }

    if (!status.supported) {
      permissionHelper.textContent = "Browser notifications are not supported on this device.";
      permissionHelper.style.display = "";
      return;
    }

    if (status.permission === "denied") {
      permissionHelper.textContent =
        "Browser notifications are blocked in your browser settings.";
      permissionHelper.style.display = "";
      return;
    }

    permissionHelper.textContent =
      "Allow browser notifications to get desktop alerts outside the bell.";
    permissionHelper.style.display = "";
  };

  const ensureRoot = () => {
    if (root?.isConnected) {
      return root;
    }

    root = createElement("div", { className: "topbar-notifications-root" });
    const overlay = createElement("button", {
      className: "topbar-notifications-overlay",
      type: "button",
      attributes: {
        "aria-label": "Close notifications"
      }
    });
    const panel = createElement("section", {
      className: "topbar-notifications-panel",
      attributes: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Notifications"
      }
    });
    const header = createElement("div", { className: "topbar-notifications-header" });
    const title = createElement("strong", {
      className: "topbar-notifications-title",
      text: "Notifications"
    });
    const actions = createElement("div", {
      className: "topbar-notifications-actions"
    });
    const notificationsToggle = createNotificationsToggle({
      checked: currentUser.notificationsEnabled !== false,
      onChange: async (enabled) => {
        try {
          const updatedUser = await setNotificationsEnabledRemote({
            enabled
          });
          currentUser.notificationsEnabled = updatedUser.notificationsEnabled;
        } catch (error) {
          showToast(error.message || "Could not update notification settings.", "error");
          return;
        }

        if (enabled) {
          await ensureBrowserNotificationPermission();
        }

        updatePermissionHelper();
      }
    });
    const markAllBtn = createElement("button", {
      className: "topbar-notifications-action",
      type: "button",
      text: "Mark all as read"
    });
    const clearAllBtn = createElement("button", {
      className: "topbar-notifications-action",
      type: "button",
      text: "Clear all"
    });
    permissionHelper = createElement("p", {
      className: "topbar-notifications-helper"
    });
    const list = createElement("div", { className: "topbar-notifications-list" });
    const renderList = () => {
      clearElement(list);

      const notifications = getNotificationsForUser(currentUser.id);
      markAllBtn.disabled = notifications.every((notification) => notification.read === true);
      clearAllBtn.disabled = notifications.length === 0;

      if (notifications.length === 0) {
        list.appendChild(
          createElement("p", {
            className: "topbar-notifications-empty",
            text: "No notifications yet."
          })
        );
        return;
      }

      const visibleNotifications = notifications.slice(0, visibleNotificationCount);

      visibleNotifications.forEach((notification) => {
        const actor = notification.actorUserId
          ? findUserById(notification.actorUserId)
          : null;
        const item = createElement("article", {
          className: `topbar-notification-item${notification.read ? "" : " topbar-notification-item-unread"}`,
          attributes: {
            "aria-label": notification.title || "Notification"
          }
        });
        const avatar = actor
          ? createAvatarElement(actor, {
              size: "sm",
              className: "topbar-notification-avatar",
              decorative: true
            })
          : createElement("span", {
              className: "topbar-notification-avatar topbar-notification-avatar-fallback",
              text: "!"
            });
        const itemButton = createElement("button", {
          className: "topbar-notification-content",
          type: "button",
          attributes: {
            "aria-label": notification.title || "Notification"
          }
        });
        const copy = createElement("div", { className: "topbar-notification-copy" });
        const itemTitle = createElement("strong", {
          className: "topbar-notification-item-title",
          text: getNotificationTitle(notification, actor)
        });
        const notificationBody = getNotificationBody(notification);
        const itemTime = createElement("span", {
          className: "topbar-notification-item-time",
          text: formatNotificationTimestamp(notification.createdAt)
        });

        copy.append(itemTitle);

        if (notificationBody) {
          copy.appendChild(
            createElement("p", {
              className: "topbar-notification-item-text",
              text: notificationBody
            })
          );
        }

        copy.appendChild(itemTime);
        itemButton.append(copy);
        itemButton.addEventListener("click", () => {
          void handleNotificationSelection({
            notification,
            currentUserId: currentUser.id,
            onNavigate,
            onNotificationsChange,
            close
          });
        });
        const deleteButton = createElement("button", {
          className: "topbar-notification-delete",
          type: "button",
          text: "X",
          attributes: {
            "aria-label": "Delete notification",
            title: "Delete notification"
          }
        });
        deleteButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          await deleteNotification(notification.id);
          if (typeof onNotificationsChange === "function") {
            onNotificationsChange();
          }
        });

        item.append(avatar, itemButton, deleteButton);

        list.appendChild(item);
      });

      if (notifications.length > visibleNotifications.length) {
        list.appendChild(
          createLoadMoreControl({
            label: "See more notifications",
            className: "topbar-notifications-load-more",
            onClick: () => {
              visibleNotificationCount += NOTIFICATION_BATCH_SIZE;
              preserveElementScrollPosition(list, () => {
                renderList();
              });
            }
          })
        );
      }
    };
    renderCurrentList = renderList;

    markAllBtn.addEventListener("click", async () => {
      await markAllNotificationsRead(currentUser.id);
      visibleNotificationCount = NOTIFICATION_BATCH_SIZE;
      renderList();
      close();
      if (typeof onNotificationsChange === "function") {
        onNotificationsChange();
      }
    });

    clearAllBtn.addEventListener("click", async () => {
      await deleteAllNotifications(currentUser.id);
      visibleNotificationCount = NOTIFICATION_BATCH_SIZE;
      renderList();
      if (typeof onNotificationsChange === "function") {
        onNotificationsChange();
      }
    });

    actions.append(markAllBtn, clearAllBtn);
    header.append(title, notificationsToggle);
    panel.appendChild(header);
    panel.appendChild(actions);
    panel.appendChild(permissionHelper);
    updatePermissionHelper();
    renderList();
    panel.appendChild(list);
    root.append(overlay, panel);

    overlay.addEventListener("click", close);
    panel.addEventListener("click", (event) => event.stopPropagation());

    return root;
  };

  const open = () => {
    const menu = ensureRoot();
    const wasConnected = menu.isConnected;

    if (!wasConnected) {
      visibleNotificationCount = NOTIFICATION_BATCH_SIZE;
    }

    window.clearTimeout(closeTimerId);
    closeTimerId = null;

    if (!menu.isConnected) {
      document.body.appendChild(menu);
    }

    window.requestAnimationFrame(() => {
      menu.classList.add("topbar-notifications-root-open");
    });

    void loadNotifications({
      currentUserId: currentUser.id,
      force: true
    })
      .then(() => {
        visibleNotificationCount = NOTIFICATION_BATCH_SIZE;
        renderCurrentList();
        if (typeof onNotificationsChange === "function") {
          onNotificationsChange();
        }
      })
      .catch((error) => {
        showToast(error.message || "Could not load notifications.", "error");
      });

    updatePermissionHelper();
  };

  const close = () => {
    if (!root?.isConnected) {
      return;
    }

    root.classList.remove("topbar-notifications-root-open");
    window.clearTimeout(closeTimerId);
    closeTimerId = window.setTimeout(() => {
      root?.remove();
      closeTimerId = null;
    }, 180);
  };

  const refresh = () => {
    updatePermissionHelper();
    renderCurrentList();
  };

  return { open, close, refresh };
}

function createNotificationsToggle({ checked = true, onChange }) {
  const label = createElement("label", {
    className: "topbar-notifications-toggle"
  });
  const input = createElement("input", {
    className: "topbar-notifications-toggle-input",
    type: "checkbox",
    attributes: {
      "aria-label": "Enable notifications"
    }
  });
  const track = createElement("span", {
    className: "topbar-notifications-toggle-track"
  });
  const text = createElement("span", {
    className: "topbar-notifications-toggle-label",
    text: checked ? "On" : "Off"
  });

  input.checked = checked;
  input.addEventListener("change", () => {
    text.textContent = input.checked ? "On" : "Off";

    if (typeof onChange === "function") {
      onChange(input.checked);
    }
  });

  label.append(text, input, track);
  return label;
}

async function handleNotificationSelection({
  notification,
  currentUserId,
  onNavigate,
  onNotificationsChange,
  close
}) {
  if (notification.type === "dm" && notification.conversationId) {
    await clearConversationNotifications({
      userId: currentUserId,
      conversationId: notification.conversationId
    });
  } else {
    await markNotificationRead(notification.id);
  }

  if (typeof onNotificationsChange === "function") {
    onNotificationsChange();
  }

  close();

  if (notification.type === "dm" && notification.conversationId) {
    onNavigate("messages", {
      conversationId: notification.conversationId
    });
    return;
  }

  if (notification.type === "follow" && notification.actorUserId) {
    window.requestAnimationFrame(() => {
      showUserPreviewSheet({
        userId: notification.actorUserId,
        currentUserId
      });
    });
    return;
  }

  if (
    (notification.type === "post_comment" || notification.type === "post_reaction") &&
    notification.postId
  ) {
    onNavigate("feed", {
      postId: notification.postId
    });
    return;
  }

  if (
    (notification.type === "comment_reply" || notification.type === "comment_reaction") &&
    notification.postId
  ) {
    onNavigate("feed", {
      postId: notification.postId,
      focusCommentId: notification.commentId || null
    });
    return;
  }

  onNavigate("feed");
}

function createAccountMenu({ currentUser, getMessagesMenuLabel, onNavigate, onLogout }) {
  let root = null;
  let closeTimerId = null;
  let messagesItem = null;

  const ensureRoot = () => {
    if (root?.isConnected) {
      return root;
    }

    root = createElement("div", { className: "topbar-account-root" });
    const overlay = createElement("button", {
      className: "topbar-account-overlay",
      type: "button",
      attributes: {
        "aria-label": "Close account menu"
      }
    });
    const panel = createElement("section", {
      className: "topbar-account-panel",
      attributes: {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Account menu"
      }
    });
    const summary = createElement("div", { className: "topbar-account-summary" });
    const avatar = createAvatarElement(currentUser, {
      size: "md",
      className: "topbar-account-avatar",
      decorative: true
    });
    const summaryCopy = createElement("div", {
      className: "topbar-account-summary-copy"
    });
    const username = createElement("strong", {
      className: "topbar-account-name",
      text: currentUser.username
    });
    const handle = createElement("span", {
      className: "topbar-account-handle",
      text: `@${currentUser.username}`
    });
    const location = createElement("span", {
      className: "topbar-account-location",
      text: formatLocation(currentUser.location) || "Set your township"
    });
    const viewProfileBtn = createElement("button", {
      className: "topbar-account-link",
      type: "button",
      text: "View profile"
    });

    viewProfileBtn.addEventListener("click", () => {
      close();
      onNavigate("profile");
    });

    summaryCopy.append(username, handle, location, viewProfileBtn);
    summary.append(avatar, summaryCopy);

    const actions = createElement("div", { className: "topbar-account-actions" });
    messagesItem = createAccountItem({
        iconName: "messages",
        label: getMessagesMenuLabel(),
        onSelect: () => onNavigate("messages")
      });
    actions.append(
      messagesItem,
      createAccountItem({
        iconName: "logout",
        label: "Sign out",
        danger: true,
        onSelect: onLogout
      })
    );

    panel.append(summary, actions);
    root.append(overlay, panel);

    overlay.addEventListener("click", close);
    panel.addEventListener("click", (event) => event.stopPropagation());

    return root;
  };

  const open = () => {
    const menu = ensureRoot();
    const messagesLabel = messagesItem?.querySelector(".topbar-account-item-label");
    if (messagesLabel) {
      messagesLabel.textContent = getMessagesMenuLabel();
    }

    if (!menu.isConnected) {
      document.body.appendChild(menu);
      window.requestAnimationFrame(() => {
        menu.classList.add("topbar-account-root-open");
      });
    }
  };

  const close = () => {
    if (!root?.isConnected) {
      return;
    }

    root.classList.remove("topbar-account-root-open");
    window.clearTimeout(closeTimerId);
    closeTimerId = window.setTimeout(() => {
      root?.remove();
      closeTimerId = null;
    }, 180);
  };

  const refresh = () => {
    const messagesLabel = messagesItem?.querySelector(".topbar-account-item-label");
    if (messagesLabel) {
      messagesLabel.textContent = getMessagesMenuLabel();
    }
  };

  return { open, close, refresh };
}

function createDrawerItem({ iconName, label, onSelect, danger = false }) {
  const button = createMenuItem({
    iconName,
    label,
    onSelect,
    danger,
    className: "topbar-drawer-item",
    labelClassName: "topbar-drawer-item-label",
    iconClassName: "topbar-drawer-item-icon",
    rootSelector: ".topbar-drawer-root",
    openClassName: "topbar-drawer-root-open"
  });

  button.classList.add(`topbar-drawer-item-${iconName}`);
  return button;
}

function createAccountItem({ iconName, label, onSelect, danger = false }) {
  return createMenuItem({
    iconName,
    label,
    onSelect,
    danger,
    className: "topbar-account-item",
    labelClassName: "topbar-account-item-label",
    iconClassName: "topbar-account-item-icon",
    rootSelector: ".topbar-account-root",
    openClassName: "topbar-account-root-open"
  });
}

function createMenuItem({
  iconName,
  label,
  onSelect,
  danger = false,
  className,
  labelClassName,
  iconClassName,
  rootSelector,
  openClassName
}) {
  const button = createElement("button", {
    className: `${className}${danger ? ` ${className}-danger` : ""}`,
    type: "button"
  });
  const icon = createNavIcon(iconName);
  icon.classList.add(iconClassName);
  const text = createElement("span", {
    className: labelClassName,
    text: label
  });

  button.append(icon, text);
  button.addEventListener("click", onSelect);
  button.addEventListener("click", () => {
    const root = button.closest(rootSelector);
    root?.classList.remove(openClassName);
    window.setTimeout(() => root?.remove(), 180);
  });

  return button;
}

function formatSearchModeLabel(value) {
  return value === "users" ? "Users" : "Posts";
}

function getNotificationTitle(notification, actor) {
  const actorName = actor?.username || "Someone";

  if (notification.type === "dm") {
    return `${actorName} sent you a message`;
  }

  if (notification.type === "follow") {
    return `${actorName} followed you`;
  }

  if (notification.type === "post_comment") {
    return `${actorName} commented on your post`;
  }

  if (notification.type === "comment_reply") {
    return `${actorName} replied to your comment`;
  }

  if (notification.type === "post_reaction") {
    return `${actorName} reacted to your post`;
  }

  if (notification.type === "comment_reaction") {
    return `${actorName} reacted to your comment`;
  }

  return notification.title || "Notification";
}

function getNotificationBody(notification) {
  if (
    notification.type === "dm" ||
    notification.type === "follow" ||
    notification.type === "post_comment" ||
    notification.type === "comment_reply" ||
    notification.type === "post_reaction" ||
    notification.type === "comment_reaction"
  ) {
    return "";
  }

  return notification.text || "";
}

function formatNotificationTimestamp(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function getTopbarButtonClass(isActive) {
  return isActive
    ? "secondary-btn topbar-utility-btn topbar-utility-btn-active"
    : "secondary-btn topbar-utility-btn";
}

function createNavbarBanner(className = "", imageUrl = navbarBannerUrl) {
  const shell = createElement("span", {
    className: `navbar-brand-banner${className ? ` ${className}` : ""}`
  });
  const image = document.createElement("img");

  image.className = "navbar-brand-banner-image";
  image.src = imageUrl;
  image.alt = "yahneh";
  image.decoding = "async";
  protectMediaShell(shell);
  protectImageElement(image);
  shell.appendChild(image);
  return shell;
}

function createTopbarCreateContent() {
  const content = createElement("span", { className: "topbar-create-content" });
  const icon = createNavIcon("create-post");
  icon.classList.add("topbar-create-icon");
  const text = createElement("span", {
    className: "topbar-create-label",
    text: "Create"
  });

  content.append(icon, text);
  return content;
}

function createNavButtonContent(iconName, label) {
  const content = createElement("span", { className: "nav-action-content" });
  const icon = createNavIcon(iconName);
  const text = createElement("span", {
    className: "nav-action-label",
    text: label
  });

  content.append(icon, text);
  return content;
}

function createNavIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("nav-action-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", getNavIconPath(name));

  svg.appendChild(path);
  return svg;
}

function getNavIconPath(name) {
  const paths = {
    feed: "M4 6.5h16M4 12h12M4 17.5h9",
    "create-post": "M12 5v14M5 12h14",
    search: "m20 20-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
    sliders:
      "M4 7h6m4 0h6M10 7a2 2 0 1 0 0 .001M4 12h12m4 0h0M16 12a2 2 0 1 0 0 .001M4 17h3m5 0h8M9 17a2 2 0 1 0 0 .001",
    menu: "M4 7h16M4 12h16M4 17h16",
    back: "M15 18 9 12l6-6",
    notifications: "M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m2 0a2 2 0 0 0 4 0h-4Z",
    live: "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm6 3.5v5l5-2.5-5-2.5ZM8 21h8",
    "go-live": "M4 8h10a2 2 0 0 1 2 2v1.5l4-2.5v8l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM6 4a9 9 0 0 1 12 0M8.5 6.5a5.5 5.5 0 0 1 7 0",
    messages:
      "M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
    install: "M12 3v10m0 0 4-4m-4 4-4-4M5 17v3h14v-3",
    profile: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0",
    logout: "M14 7l5 5-5 5M19 12H9M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"
  };

  return paths[name] || paths.feed;
}
