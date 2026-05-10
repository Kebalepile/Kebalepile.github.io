import { createElement } from "../utils/dom.js";
import { formatLocation } from "../utils/location.js";
import { createAvatarElement } from "../utils/avatar.js";
import {
  fetchFollowerUsers,
  fetchFollowingUsers,
  fetchUserProfile,
  followUserRemote,
  getDirectMessageAvailability,
  subscribeCurrentUserChanges,
  unfollowUserRemote
} from "../services/userService.js";
import { showToast } from "./toast.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import { navigate } from "../router.js";

const USER_PREVIEW_ROOT_ID = "user-preview-sheet-root";

export function showUserPreviewSheet({ userId, currentUserId, initialListType = "following" }) {
  if (!userId) {
    return;
  }

  let closeSheetCleanup = () => {};

  const existing = document.getElementById(USER_PREVIEW_ROOT_ID);

  if (existing) {
    existing.remove();
  }

  const root = createElement("div", {
    id: USER_PREVIEW_ROOT_ID,
    className: "user-preview-root"
  });
  const overlay = createElement("div", {
    className: "user-preview-overlay"
  });
  const container = createElement("div", {
    className: "user-preview-container"
  });
  const sheet = createElement("section", {
    className: "user-preview-sheet",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "User profile preview"
    }
  });

  const closeSheet = () => {
    closeSheetCleanup();
    closeSheetCleanup = () => {};
    root.remove();
    document.removeEventListener("keydown", handleKeyDown);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSheet();
    }
  };

  const createPreviewLoadingState = () => {
    const fragment = document.createDocumentFragment();
    const chrome = createElement("div", { className: "user-preview-chrome" });
    const handle = createElement("span", {
      className: "user-preview-handle",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const closeBtn = createElement("button", {
      className: "user-preview-close-btn",
      type: "button",
      attributes: {
        "aria-label": "Close profile preview",
        title: "Close"
      }
    });
    const hero = createElement("div", {
      className: "user-preview-hero user-preview-loading-hero"
    });
    const avatarShell = createElement("div", {
      className: "user-preview-avatar-shell user-preview-loading-avatar-shell"
    });
    const avatar = createElement("span", {
      className: "feed-skeleton-circle user-preview-loading-avatar"
    });
    const identity = createElement("div", {
      className: "user-preview-identity user-preview-loading-identity"
    });
    const username = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-title"
    });
    const handleText = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-handle-text"
    });
    const joined = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-meta"
    });
    const location = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-meta user-preview-loading-meta-wide"
    });
    const stats = createElement("div", {
      className: "user-preview-stats user-preview-loading-stats"
    });
    const actions = createElement("div", {
      className: "user-preview-actions user-preview-loading-actions"
    });
    const followingSection = createElement("div", {
      className: "user-preview-following-section user-preview-loading-following"
    });
    const followingHeader = createElement("div", {
      className: "user-preview-following-header"
    });
    const followingTitle = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-following-title"
    });
    const followingHint = createElement("span", {
      className: "feed-skeleton-block user-preview-loading-following-hint"
    });
    const followingScroller = createElement("div", {
      className: "user-preview-following-scroller"
    });

    closeBtn.appendChild(createCloseIcon());
    closeBtn.addEventListener("click", closeSheet);

    avatarShell.appendChild(avatar);
    identity.append(username, handleText, joined, location);
    hero.append(avatarShell, identity);

    for (let index = 0; index < 2; index += 1) {
      stats.appendChild(
        createElement("span", {
          className: "feed-skeleton-rect user-preview-loading-stat"
        })
      );
    }

    actions.append(
      createElement("span", {
        className: "feed-skeleton-chip user-preview-loading-action user-preview-loading-action-wide"
      }),
      createElement("span", {
        className: "feed-skeleton-chip user-preview-loading-action"
      })
    );

    followingHeader.append(followingTitle, followingHint);

    for (let index = 0; index < 4; index += 1) {
      const card = createElement("div", {
        className: "user-preview-following-card user-preview-loading-card"
      });
      const personAvatar = createElement("span", {
        className: "feed-skeleton-circle user-preview-loading-following-avatar"
      });
      const personName = createElement("span", {
        className: "feed-skeleton-block user-preview-loading-following-name"
      });

      card.append(personAvatar, personName);
      followingScroller.appendChild(card);
    }

    chrome.append(handle, closeBtn);
    followingSection.append(followingHeader, followingScroller);
    fragment.append(chrome, hero, stats, actions, followingSection);
    return fragment;
  };

  const renderSheet = async (targetUserId, listType = "following") => {
    closeSheetCleanup();
    closeSheetCleanup = () => {};
    sheet.replaceChildren(createPreviewLoadingState());

    let profile;
    let followerUsers;
    let followingUsers;

    try {
      [profile, followerUsers, followingUsers] = await Promise.all([
        fetchUserProfile(targetUserId),
        fetchFollowerUsers(targetUserId, { limit: 18 }),
        fetchFollowingUsers(targetUserId, { limit: 18 })
      ]);
    } catch (error) {
      closeSheet();
      showToast(error.message || "That profile is no longer available.", "error");
      return;
    }

    const user = profile?.user || null;

    if (!user) {
      closeSheet();
      showToast("That profile is no longer available.", "error");
      return;
    }

    const isOwnProfile = user.id === currentUserId;
    const followerCount = Number(profile?.stats?.followerCount ?? followerUsers.length);
    const followingCount = Number(profile?.stats?.followingCount ?? followingUsers.length);
    const followsTarget = profile?.stats?.isFollowing === true;

    const chrome = createElement("div", { className: "user-preview-chrome" });
    const handle = createElement("span", {
      className: "user-preview-handle",
      attributes: {
        "aria-hidden": "true"
      }
    });
    const closeBtn = createElement("button", {
      className: "user-preview-close-btn",
      type: "button",
      attributes: {
        "aria-label": "Close profile preview",
        title: "Close"
      }
    });
    const hero = createElement("div", { className: "user-preview-hero" });
    const avatarShell = createElement("div", {
      className: "user-preview-avatar-shell"
    });
    const avatar = createAvatarElement(user, {
      size: "xl",
      className: "user-preview-avatar",
      decorative: true
    });
    const identity = createElement("div", { className: "user-preview-identity" });
    const username = createElement("h3", {
      className: "user-preview-username",
      text: user.username
    });
    const handleText = createElement("p", {
      className: "user-preview-user-handle",
      text: `@${user.username}`
    });
    const memberTag = createElement("span", {
      className: "user-preview-member-tag",
      text: "Community member"
    });
    const joined = createElement("p", {
      className: "user-preview-joined",
      text: `Joined ${formatJoinDate(user.createdAt)}`
    });
    const location = createElement("p", {
      className: "user-preview-location",
      text: formatLocation(user.location) || "Township not set"
    });
    const stats = createElement("div", { className: "user-preview-stats" });
    const followersStat = createStatChip({
      value: formatCompactCount(followerCount),
      label: followerCount === 1 ? "Follower" : "Followers",
      active: listType === "followers"
    });
    const followingStat = createStatChip({
      value: formatCompactCount(followingCount),
      label: "Following",
      active: listType === "following"
    });
    const actions = createElement("div", { className: "user-preview-actions" });
    const followingSection = createElement("div", {
      className: "user-preview-following-section"
    });
    const followingTitle = createElement("div", {
      className: "user-preview-following-header"
    });
    const followingHeading = createElement("h4", {
      className: "user-preview-following-title",
      text: listType === "followers" ? "Followers" : "Following"
    });
    const visibleUsers = listType === "followers" ? followerUsers : followingUsers;
    const emptyStateText =
      listType === "followers"
        ? `${user.username} has no followers yet.`
        : `${user.username} is not following anyone yet.`;
    const followingHint = createElement("p", {
      className: "user-preview-following-hint",
      text:
        visibleUsers.length > 0
          ? "Tap a person to open their profile."
          : `No ${listType} yet.`
    });

    closeBtn.appendChild(createCloseIcon());
    closeBtn.addEventListener("click", closeSheet);
    chrome.append(handle, closeBtn);

    avatarShell.appendChild(avatar);
    identity.append(username, handleText, memberTag, joined, location);
    stats.append(followersStat, followingStat);
    hero.append(avatarShell, identity);

    followersStat.addEventListener("click", () => {
      if (listType !== "followers") {
        renderSheet(user.id, "followers");
      }
    });
    followingStat.addEventListener("click", () => {
      if (listType !== "following") {
        renderSheet(user.id, "following");
      }
    });

    if (!isOwnProfile) {
      const followBtn = createElement("button", {
        className: followsTarget
          ? "secondary-btn user-preview-follow-btn"
          : "primary-btn user-preview-follow-btn",
        type: "button",
        text: followsTarget ? "Unfollow" : "Follow"
      });
      const dmBtn = createElement("button", {
        className: "secondary-btn user-preview-dm-btn",
        type: "button",
        attributes: {
          "aria-label": `Direct message ${user.username}`,
          title: "Direct message"
        }
      });

      dmBtn.appendChild(createDmIcon());
      const syncDmButtonState = () => {
        const availability = getDirectMessageAvailability({
          senderUserId: currentUserId,
          recipientUserId: user.id
        });

        dmBtn.disabled = !availability.allowed;
        dmBtn.classList.toggle("user-preview-dm-btn-disabled", !availability.allowed);
        dmBtn.setAttribute(
          "title",
          availability.allowed ? "Direct message" : availability.message || "Unavailable"
        );
        dmBtn.setAttribute(
          "aria-label",
          availability.allowed
            ? `Direct message ${user.username}`
            : `Direct message unavailable for ${user.username}`
        );
      };

      syncDmButtonState();
      closeSheetCleanup = subscribeCurrentUserChanges(() => {
        syncDmButtonState();
      });

      dmBtn.addEventListener("click", () => {
        if (dmBtn.disabled) {
          return;
        }

        closeSheet();
        navigate("messages", { userId: user.id });
      });

      followBtn.addEventListener("click", async () => {
        try {
          if (followsTarget) {
            await unfollowUserRemote({
              targetUserId: user.id
            });
          } else {
            await followUserRemote({
              targetUserId: user.id
            });
          }

          await renderSheet(user.id, listType);
        } catch (error) {
          showToast(error.message || "Could not update follow state.", "error");
        }
      });

      actions.append(followBtn, dmBtn);
    }

    followingTitle.append(followingHeading, followingHint);
    followingSection.appendChild(followingTitle);

    if (visibleUsers.length > 0) {
      const followingScroller = createElement("div", {
        className: "user-preview-following-scroller"
      });

      visibleUsers.forEach((followedUser) => {
        const personBtn = createElement("button", {
          className: "user-preview-following-card",
          type: "button",
          attributes: {
            "aria-label": `Open ${followedUser.username}'s profile`,
            title: followedUser.username
          }
        });
        const personAvatar = createAvatarElement(followedUser, {
          size: "md",
          className: "user-preview-following-avatar",
          decorative: true
        });
        const personName = createElement("span", {
          className: "user-preview-following-name",
          text: shortenUsername(followedUser.username)
        });

        personBtn.append(personAvatar, personName);
        personBtn.addEventListener("click", () => {
          void renderSheet(followedUser.id, "following");
        });
        followingScroller.appendChild(personBtn);
      });

      followingSection.appendChild(followingScroller);
    } else {
      followingSection.appendChild(
        createElement("p", {
          className: "user-preview-empty",
          text: emptyStateText
        })
      );
    }

    if (actions.childElementCount > 0) {
      sheet.replaceChildren(chrome, hero, stats, actions, followingSection);
      return;
    }

    sheet.replaceChildren(chrome, hero, stats, followingSection);
  };

  overlay.addEventListener("click", closeSheet);
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeSheet();
    }
  });
  sheet.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("keydown", handleKeyDown);

  container.appendChild(sheet);
  root.append(overlay, container);
  document.body.appendChild(root);

  void renderSheet(userId, initialListType === "followers" ? "followers" : "following");
}

function createStatChip({ value, label, active = false }) {
  const chip = createElement("button", {
    className: `user-preview-stat${active ? " user-preview-stat-active" : ""}`,
    type: "button"
  });
  const statValue = createElement("strong", {
    className: "user-preview-stat-value",
    text: value
  });
  const statLabel = createElement("span", {
    className: "user-preview-stat-label",
    text: label
  });

  chip.append(statValue, statLabel);
  return chip;
}

function createDmIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("user-preview-dm-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute(
    "d",
    "M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H8.8L4 21v-4.5A1.5 1.5 0 0 1 2.5 15V8A1.5 1.5 0 0 1 4 6.5Z"
  );
  svg.appendChild(path);

  return svg;
}

function createCloseIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("user-preview-close-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute("d", "m7 7 10 10M17 7 7 17");
  svg.appendChild(path);

  return svg;
}

function formatJoinDate(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium"
  }).format(date);
}

function shortenUsername(value = "") {
  const username = String(value || "").trim();

  if (username.length <= 12) {
    return username;
  }

  return `${username.slice(0, 9)}...`;
}
