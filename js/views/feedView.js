import { clearElement, createElement } from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { navigate, registerViewCleanup } from "../router.js";
import {
  getVisiblePosts,
  loadFeedPosts,
  loadPostById,
  subscribeToPostChanges
} from "../services/postService.js";
import { findUserById } from "../services/userService.js";
import { createPostCard, openCommentsSheetForPost } from "../components/postCard.js";
import {
  FEED_BATCH_SIZE,
  createLoadMoreControl,
  preservePageScrollPosition
} from "../utils/listBatching.js";
import { setLiveSyncOptions } from "../services/liveSyncService.js";
import { showToast } from "../components/toast.js";
import { formatLocation } from "../utils/location.js";

const FEED_SKELETON_COUNT = 3;
const FEED_INVITE_PROMPTS = [
  "Something happened nearby",
  "Ask the community",
  "Plug a local person",
  "Share a warning",
  "Say what everyone is thinking"
];

export async function renderFeed(app, currentUser, payload = null) {
  clearElement(app);

  let visiblePostsCount = FEED_BATCH_SIZE;
  let lastFilterKey = "";
  let isFeedLoading = true;
  let viewActive = true;
  let feedScope = "all-townships";
  let focusedPostTimeoutId = null;
  let pendingPostTarget =
    typeof payload?.postId === "string"
      ? {
          postId: payload.postId,
          focusCommentId: typeof payload?.focusCommentId === "string" ? payload.focusCommentId : null
        }
      : null;

  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "feed");

  const feedMain = createElement("main", { className: "feed-main" });
  const feedHeader = createElement("section", {
    className: "feed-header-card feed-hero-card"
  });
  const heroTop = createElement("div", { className: "feed-hero-top" });
  const heroCopy = createElement("div", { className: "feed-hero-copy" });
  const eyebrow = createElement("p", {
    className: "feed-hero-eyebrow",
    text: "Your side of the story"
  });

  const feedTitle = createElement("h2", {
    className: "section-title",
    text: "What is moving in your kasi?"
  });
  const feedText = createElement("p", {
    className: "section-copy feed-hero-copy-text",
    text: "Bring the street talk online: ask what is happening, warn people early, shout out local wins, or say the thing everyone has been meaning to say."
  });
  const heroActions = createElement("div", { className: "feed-hero-actions" });
  const createPostBtn = createElement("button", {
    className: "primary-btn feed-hero-post-btn",
    text: "Gab",
    type: "button"
  });
  const profileHint = createElement("p", {
    className: "feed-hero-location",
    text: formatLocation(currentUser.location) || "Set your township on your profile"
  });
  const promptRail = createElement("div", {
    className: "feed-invite-rail",
    attributes: {
      "aria-label": "Post ideas"
    }
  });
  const statScroller = createElement("div", { className: "feed-stat-scroller" });
  const statRow = createElement("div", { className: "feed-stat-row" });
  statScroller.appendChild(statRow);

  const filterPanel = createElement("div", {
    className: "feed-discovery-panel feed-discovery-panel-collapsed"
  });
  const filterHeader = createElement("div", { className: "feed-discovery-header" });
  const filterTitle = createElement("p", {
    className: "feed-discovery-title",
    text: "Explore conversations"
  });
  const filterToggleBtn = createElement("button", {
    className: "feed-discovery-toggle-btn",
    type: "button",
    attributes: {
      "aria-label": "Show conversation filters",
      "aria-expanded": "false",
      "aria-controls": "feed-discovery-body",
      title: "Show filters"
    }
  });
  filterToggleBtn.appendChild(createChevronIcon());
  const filterBody = createElement("div", {
    className: "feed-discovery-body",
    id: "feed-discovery-body"
  });
  const filters = createElement("div", { className: "filter-row feed-filter-row" });
  const scopeTabs = createElement("div", {
    className: "feed-scope-tabs",
    attributes: {
      role: "tablist",
      "aria-label": "Feed scope"
    }
  });
  const scopeButtons = [
    { key: "all-townships", label: "Everyone" },
    { key: "nearby", label: "Nearby" },
    { key: "my-township", label: "My kasi" }
  ].map(({ key, label }) => {
    const button = createElement("button", {
      className: "secondary-btn feed-scope-tab",
      text: label,
      type: "button",
      attributes: {
        role: "tab",
        "aria-selected": key === feedScope ? "true" : "false"
      }
    });
    button.dataset.scopeKey = key;

    button.addEventListener("click", () => {
      feedScope = key;
      syncScopeTabs(scopeButtons, feedScope);
      renderPosts();
    });

    scopeTabs.appendChild(button);
    return { key, button };
  });

  const townshipInput = createElement("input", {
    className: "form-input filter-input",
    id: "feed-filter-township",
    type: "text",
    placeholder: "Township",
    autocomplete: "off"
  });

  const extensionInput = createElement("input", {
    className: "form-input filter-input",
    id: "feed-filter-extension",
    type: "text",
    placeholder: "Area or extension",
    autocomplete: "off"
  });

  const clearBtn = createElement("button", {
    className: "secondary-btn feed-clear-filters-btn",
    type: "button",
    attributes: {
      "aria-label": "Clear filters",
      title: "Clear filters"
    }
  });
  clearBtn.appendChild(createClearFiltersIcon());

  createPostBtn.addEventListener("click", () => navigate("create-post"));
  FEED_INVITE_PROMPTS.forEach((prompt) => {
    const promptBtn = createElement("button", {
      className: "feed-invite-chip",
      text: prompt,
      type: "button"
    });

    promptBtn.addEventListener("click", () => navigate("create-post"));
    promptRail.appendChild(promptBtn);
  });

  heroCopy.append(eyebrow, feedTitle, feedText);
  heroActions.append(createPostBtn, profileHint);
  heroTop.append(heroCopy, heroActions);
  filters.append(townshipInput, extensionInput, clearBtn);
  filterHeader.append(filterTitle, filterToggleBtn);
  filterBody.append(scopeTabs, statScroller, filters);
  filterPanel.append(filterHeader, filterBody);
  feedHeader.append(heroTop, promptRail, filterPanel);

  const feedList = createElement("section", { className: "feed-list" });

  feedMain.append(feedHeader, feedList);
  shell.append(navbar, feedMain);
  app.appendChild(shell);

  const focusPostCard = (postId) => {
    if (!postId) {
      return false;
    }

    const postCard = feedList.querySelector(`[data-post-id="${postId}"]`);

    if (!postCard) {
      return false;
    }

    postCard.classList.add("post-card-targeted");
    postCard.setAttribute("tabindex", "-1");
    postCard.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    postCard.focus({ preventScroll: true });
    window.clearTimeout(focusedPostTimeoutId);
    focusedPostTimeoutId = window.setTimeout(() => {
      postCard.classList.remove("post-card-targeted");
      postCard.removeAttribute("tabindex");
      focusedPostTimeoutId = null;
    }, 1800);

    return true;
  };

  const renderFeedSkeletons = () => {
    clearElement(statRow);
    clearElement(feedList);
    feedList.classList.add("feed-list-loading");
    feedList.setAttribute("aria-busy", "true");

    statRow.append(
      createFeedStatSkeleton(),
      createFeedStatSkeleton(),
      createFeedStatSkeleton(true)
    );

    for (let index = 0; index < FEED_SKELETON_COUNT; index += 1) {
      feedList.appendChild(createFeedPostSkeleton());
    }
  };

  const renderPosts = () => {
    const townshipQuery = townshipInput.value.trim().toLocaleLowerCase();
    const extensionQuery = extensionInput.value.trim().toLocaleLowerCase();
    let posts = getVisiblePosts(currentUser.id);
    const myLocation = currentUser.location || {};
    const myTownship = String(myLocation.township || "").toLocaleLowerCase();
    const myMunicipality = String(myLocation.municipality || "").toLocaleLowerCase();
    const myProvince = String(myLocation.province || "").toLocaleLowerCase();

    if (feedScope === "my-township" && myTownship) {
      posts = posts.filter(
        (post) => String(post.location?.township || "").toLocaleLowerCase() === myTownship
      );
    }

    if (feedScope === "nearby") {
      posts = posts.filter((post) => {
        const postLocation = post.location || {};
        const postTownship = String(postLocation.township || "").toLocaleLowerCase();
        const postMunicipality = String(postLocation.municipality || "").toLocaleLowerCase();
        const postProvince = String(postLocation.province || "").toLocaleLowerCase();

        if (myMunicipality && postMunicipality) {
          return postMunicipality === myMunicipality && postTownship !== myTownship;
        }

        if (myProvince && postProvince) {
          return postProvince === myProvince && postTownship !== myTownship;
        }

        return postTownship && postTownship !== myTownship;
      });
    }

    if (townshipQuery) {
      posts = posts.filter((post) =>
        post.location.township.toLocaleLowerCase().includes(townshipQuery)
      );
    }

    if (extensionQuery) {
      posts = posts.filter((post) =>
        `${post.location.extension || ""} ${post.location.area || ""}`
          .toLocaleLowerCase()
          .includes(extensionQuery)
      );
    }

    if (isFeedLoading && posts.length === 0) {
      renderFeedSkeletons();
      return;
    }

    clearElement(feedList);
    feedList.classList.remove("feed-list-loading");
    feedList.setAttribute("aria-busy", isFeedLoading ? "true" : "false");

    const uniqueAuthors = new Set(posts.map((post) => post.userId)).size;
    clearElement(statRow);
    statRow.append(
      createStatPill("Stories", String(posts.length)),
      createStatPill("Voices", String(uniqueAuthors)),
      createStatPill(
        "Home base",
        formatLocation(currentUser.location) || "Set location"
      )
    );

    const filterKey = `${townshipQuery}::${extensionQuery}`;

    if (filterKey !== lastFilterKey) {
      lastFilterKey = filterKey;
      visiblePostsCount = FEED_BATCH_SIZE;
    }

    if (posts.length === 0) {
      const emptyCard = createElement("div", { className: "placeholder-card" });
      const emptyTitle = createElement("h3", {
        text: townshipQuery || extensionQuery ? "No filtered posts found" : "No posts here yet"
      });
      const emptyText = createElement("p", {
        text:
          townshipQuery || extensionQuery
            ? "Try adjusting or clearing your filters."
            : "Be the first to post something in your community."
      });

      const emptyAction = createElement("button", {
        className: "primary-btn feed-empty-create-btn",
        text: "Post",
        type: "button"
      });

      emptyAction.addEventListener("click", () => navigate("create-post"));

      emptyCard.append(emptyTitle, emptyText, emptyAction);
      feedList.appendChild(emptyCard);
      return;
    }

    const visiblePosts = posts.slice(0, visiblePostsCount);

    visiblePosts.forEach((post) => {
      const author = post.author || findUserById(post.userId);
      const postCard = createPostCard(post, author, currentUser.id, renderPosts);
      feedList.appendChild(postCard);
    });

    if (posts.length > visiblePosts.length) {
      feedList.appendChild(
        createLoadMoreControl({
          label: "See more posts",
          onClick: () => {
            visiblePostsCount += FEED_BATCH_SIZE;
            preservePageScrollPosition(() => {
              renderPosts();
            });
          }
        })
      );
    }

    if (pendingPostTarget?.postId) {
      const { postId, focusCommentId } = pendingPostTarget;

      if (focusCommentId) {
        pendingPostTarget = null;
        window.requestAnimationFrame(() => {
          openCommentsSheetForPost({
            postId,
            currentUserId: currentUser.id,
            onPostChange: renderPosts,
            focusCommentId
          });
        });
        return;
      }

      if (focusPostCard(postId)) {
        pendingPostTarget = null;
      }
    }
  };

  townshipInput.addEventListener("input", renderPosts);
  extensionInput.addEventListener("input", renderPosts);

  clearBtn.addEventListener("click", () => {
    townshipInput.value = "";
    extensionInput.value = "";
    renderPosts();
  });

  filterToggleBtn.addEventListener("click", () => {
    const collapsed = filterPanel.classList.toggle("feed-discovery-panel-collapsed");
    filterToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    filterToggleBtn.setAttribute(
      "aria-label",
      collapsed ? "Show conversation filters" : "Hide conversation filters"
    );
    filterToggleBtn.title = collapsed ? "Show filters" : "Hide filters";
  });

  setLiveSyncOptions({
    includePosts: true
  });
  registerViewCleanup(() => {
    setLiveSyncOptions({
      includePosts: false
    });
  });
  registerViewCleanup(() => {
    viewActive = false;
  });
  registerViewCleanup(() => {
    window.clearTimeout(focusedPostTimeoutId);
  });
  registerViewCleanup(
    subscribeToPostChanges(() => {
      renderPosts();
    })
  );

  renderPosts();

  const loadInitialFeed = async () => {
    const initialLoadTasks = [loadFeedPosts()];

    if (typeof payload?.postId === "string" && payload.postId.trim()) {
      initialLoadTasks.push(loadPostById(payload.postId));
    }

    const initialLoadResults = await Promise.allSettled(initialLoadTasks);

    if (!viewActive) {
      return;
    }

    const failedInitialLoads = initialLoadResults.filter((result) => result.status === "rejected");

    if (failedInitialLoads.length > 0) {
      showToast(
        "Could not fully refresh the feed. Showing available cached posts.",
        "error"
      );
    }

    isFeedLoading = false;
    renderPosts();
  };

  void loadInitialFeed();
  syncScopeTabs(scopeButtons, feedScope);
}

function syncScopeTabs(scopeButtons, activeScope) {
  scopeButtons.forEach(({ key, button }) => {
    const active = key === activeScope;
    button.classList.toggle("feed-scope-tab-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function createChevronIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("feed-discovery-toggle-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2.2");
  path.setAttribute("d", "m6 9 6 6 6-6");
  svg.appendChild(path);

  return svg;
}

function createClearFiltersIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("feed-clear-filters-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "2");
  path.setAttribute(
    "d",
    "M4 5h16M7 12h10M10 19h4M19 5l-5.5 7v5l-3 2v-7L5 5"
  );
  svg.appendChild(path);

  return svg;
}

function createStatPill(label, value) {
  const pill = createElement("div", {
    className: `feed-stat-pill${label === "Home base" ? " feed-stat-pill-wide" : ""}`
  });
  const pillLabel = createElement("span", {
    className: "feed-stat-label",
    text: label
  });
  const pillValue = createElement("strong", {
    className: "feed-stat-value",
    text: value
  });

  pill.append(pillLabel, pillValue);
  return pill;
}

function createFeedStatSkeleton(isWide = false) {
  const pill = createElement("div", {
    className: `feed-stat-pill feed-stat-pill-skeleton${isWide ? " feed-stat-pill-wide" : ""}`
  });
  const label = createElement("span", {
    className: "feed-skeleton-block feed-skeleton-block-label"
  });
  const value = createElement("span", {
    className: `feed-skeleton-block feed-skeleton-block-value${isWide ? " feed-skeleton-block-value-wide" : ""}`
  });

  pill.append(label, value);
  return pill;
}

function createFeedPostSkeleton() {
  const card = createElement("article", {
    className: "post-card post-card-skeleton"
  });
  const header = createElement("div", {
    className: "post-card-header post-card-header-skeleton"
  });
  const avatar = createElement("span", {
    className: "feed-skeleton-circle"
  });
  const authorBlock = createElement("div", {
    className: "post-author-block"
  });
  const authorLine = createElement("span", {
    className: "feed-skeleton-block feed-skeleton-block-author"
  });
  const metaLine = createElement("span", {
    className: "feed-skeleton-block feed-skeleton-block-meta"
  });
  const menuDot = createElement("span", {
    className: "feed-skeleton-circle feed-skeleton-circle-sm"
  });
  const contentBlock = createElement("div", {
    className: "post-content-block"
  });
  const lineOne = createElement("span", {
    className: "feed-skeleton-block feed-skeleton-block-content"
  });
  const lineTwo = createElement("span", {
    className: "feed-skeleton-block feed-skeleton-block-content feed-skeleton-block-content-short"
  });
  const image = createElement("div", {
    className: "feed-skeleton-rect feed-skeleton-rect-image"
  });
  const footer = createElement("div", {
    className: "reaction-bar reaction-bar-skeleton"
  });

  authorBlock.append(authorLine, metaLine);
  header.append(avatar, authorBlock, menuDot);
  contentBlock.append(lineOne, lineTwo);
  footer.append(
    createElement("span", {
      className: "feed-skeleton-chip"
    }),
    createElement("span", {
      className: "feed-skeleton-chip"
    }),
    createElement("span", {
      className: "feed-skeleton-chip feed-skeleton-chip-wide"
    })
  );

  card.append(header, contentBlock, image, footer);
  return card;
}
