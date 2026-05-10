import { clearElement, createElement } from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { showUserPreviewSheet } from "../components/userPreviewSheet.js";
import { registerViewCleanup } from "../router.js";
import { searchUsers, searchPosts } from "../services/searchService.js";
import {
  filterVisiblePostsForUser,
  getPosts,
  getVisiblePostsByUserId,
  loadPostsByUserId,
  subscribeToPostChanges
} from "../services/postService.js";
import { createPostCard } from "../components/postCard.js";
import { findUserById, getUsers } from "../services/userService.js";
import { createAvatarElement } from "../utils/avatar.js";
import {
  SEARCH_BATCH_SIZE,
  createLoadMoreControl,
  preservePageScrollPosition
} from "../utils/listBatching.js";
import { setLiveSyncOptions } from "../services/liveSyncService.js";
import { showToast } from "../components/toast.js";

export async function renderSearch(app, currentUser, payload = null) {
  clearElement(app);

  const initialMode = payload?.mode === "users" ? "users" : "posts";
  const initialQuery = typeof payload?.query === "string" ? payload.query : "";
  const authorUserId = typeof payload?.authorUserId === "string" ? payload.authorUserId : "";
  const authorUsername =
    typeof payload?.authorUsername === "string" ? payload.authorUsername : "";
  const authorPostsView = Boolean(authorUserId && initialMode === "posts");

  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "search", {
    initialSearchQuery: initialQuery,
    initialSearchMode: initialMode,
    searchMode: true
  });

  const main = createElement("main", { className: "feed-main search-main" });

  const searchCard = createElement("section", {
    className: "feed-header-card search-hero-card"
  });
  const eyebrow = createElement("p", {
    className: "section-eyebrow",
    text: "Explore"
  });
  const title = createElement("h2", {
    className: "section-title",
    text: authorPostsView ? "Posts" : "Search people and local posts"
  });
  const description = createElement("p", {
    className: "section-copy",
    text: authorPostsView
      ? `Showing posts from @${authorUsername || "this user"}.`
      : initialQuery.trim()
      ? `Showing ${initialMode === "users" ? "people" : "posts"} for "${initialQuery}".`
      : "Find neighbors, trending updates, and township conversations without leaving the feed."
  });
  searchCard.append(eyebrow, title, description);

  const results = createElement("section", { className: "feed-list search-results-list" });
  let visibleUserCount = SEARCH_BATCH_SIZE;
  let visiblePostCount = SEARCH_BATCH_SIZE;
  const isPostResultsView =
    authorPostsView || (initialMode === "posts" && initialQuery.trim().length > 0);

  main.append(searchCard, results);
  shell.append(navbar, main);
  app.appendChild(shell);

  if (isPostResultsView) {
    setLiveSyncOptions({
      includePosts: true
    });
    registerViewCleanup(() => {
      setLiveSyncOptions({
        includePosts: false
      });
    });
    registerViewCleanup(
      subscribeToPostChanges(() => {
        renderCurrentPostResults();
      })
    );
  }

  if (authorPostsView || initialQuery.trim()) {
    renderSearchLoadingState(results, {
      mode: isPostResultsView ? "posts" : initialMode
    });
    await runSearch();
  } else {
    renderIdleState(results);
  }

  async function runSearch() {
    if (authorPostsView) {
      try {
        await loadPostsByUserId(authorUserId);
      } catch {
        showToast(
          "Could not fully refresh that profile's posts. Showing cached results where available.",
          "error"
        );
      }
      renderCurrentPostResults();
      return;
    }

    const query = initialQuery.trim();

    if (!query) {
      renderIdleState(results);
      return;
    }

    if (initialMode === "users") {
      let users = [];

      try {
        users = await searchUsers(query);
      } catch {
        users = getMatchingUsersFromCache(query);
        showToast(
          "Could not refresh user search right now. Showing cached matches.",
          "error"
        );
      }

      renderUserResults(results, users, {
        currentUserId: currentUser.id,
        visibleCount: visibleUserCount,
        onLoadMore: () => {
          visibleUserCount += SEARCH_BATCH_SIZE;
          preservePageScrollPosition(() => {
            runSearch();
          });
        }
      });
      return;
    }

    try {
      await searchPosts(query);
    } catch {
      showToast(
        "Could not refresh post search right now. Showing cached matches.",
        "error"
      );
    }

    renderCurrentPostResults();
  }

  function renderCurrentPostResults() {
    if (!isPostResultsView) {
      return;
    }

    const posts = authorPostsView
      ? getVisiblePostsByUserId(authorUserId, currentUser.id)
      : getMatchingPostsFromCache(initialQuery, currentUser.id);

    renderPostResults(results, posts, {
      currentUserId: currentUser.id,
      app,
      currentUser,
      searchPayload: authorPostsView
        ? {
            mode: "posts",
            authorUserId,
            authorUsername
          }
        : {
            mode: "posts",
            query: initialQuery.trim()
          },
      visibleCount: visiblePostCount,
      onLoadMore: () => {
        visiblePostCount += SEARCH_BATCH_SIZE;
        preservePageScrollPosition(() => {
          renderCurrentPostResults();
        });
      }
    });
  }
}

function getMatchingPostsFromCache(query, currentUserId) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return filterVisiblePostsForUser(getPosts(), currentUserId).filter((post) => {
    const authorUsername = post.author?.username || findUserById(post.userId)?.username || "";
    const haystack = [
      post.content,
      authorUsername,
      post.location?.township || "",
      post.location?.extension || ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function getMatchingUsersFromCache(query) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return getUsers()
    .filter((user) => {
      const haystack = [
        user.username,
        user.location?.township || "",
        user.location?.extension || ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .sort((first, second) => first.username.localeCompare(second.username));
}

function renderIdleState(results) {
  clearElement(results);
}

function renderNoResults(results, label) {
  clearElement(results);

  const card = createElement("div", { className: "placeholder-card" });
  const title = createElement("h3", { text: "No results found" });
  const text = createElement("p", {
    text: `No ${label} matched your search.`
  });

  card.append(title, text);
  results.appendChild(card);
}

function renderSearchLoadingState(results, { mode = "posts" } = {}) {
  clearElement(results);

  if (mode === "users") {
    for (let index = 0; index < 4; index += 1) {
      const card = createElement("div", {
        className: "profile-card search-user-card search-user-card-skeleton"
      });
      const avatar = createElement("span", {
        className: "feed-skeleton-circle"
      });
      const copy = createElement("div", {
        className: "search-user-copy search-user-copy-skeleton"
      });
      const username = createElement("span", {
        className: "feed-skeleton-block search-user-title-skeleton"
      });
      const location = createElement("span", {
        className: "feed-skeleton-block search-user-meta-skeleton"
      });
      const hint = createElement("span", {
        className: "feed-skeleton-block search-user-hint-skeleton"
      });

      copy.append(username, location, hint);
      card.append(avatar, copy);
      results.appendChild(card);
    }

    return;
  }

  for (let index = 0; index < 3; index += 1) {
    const card = createElement("article", {
      className: "post-card post-card-skeleton"
    });
    const header = createElement("div", {
      className: "post-card-header post-card-header-skeleton"
    });
    const avatar = createElement("span", {
      className: "feed-skeleton-circle"
    });
    const authorMeta = createElement("div", {
      className: "post-author-block"
    });
    const author = createElement("span", {
      className: "feed-skeleton-block feed-skeleton-block-author"
    });
    const meta = createElement("span", {
      className: "feed-skeleton-block feed-skeleton-block-meta"
    });
    const menu = createElement("span", {
      className: "feed-skeleton-circle feed-skeleton-circle-sm"
    });
    const contentLineOne = createElement("span", {
      className: "feed-skeleton-block feed-skeleton-block-content"
    });
    const contentLineTwo = createElement("span", {
      className: "feed-skeleton-block feed-skeleton-block-content feed-skeleton-block-content-short"
    });
    const image = createElement("span", {
      className: "feed-skeleton-rect feed-skeleton-rect-image"
    });
    const footer = createElement("div", {
      className: "reaction-bar reaction-bar-skeleton"
    });

    authorMeta.append(author, meta);
    header.append(avatar, authorMeta, menu);
    footer.append(
      createElement("span", { className: "feed-skeleton-chip" }),
      createElement("span", { className: "feed-skeleton-chip" }),
      createElement("span", { className: "feed-skeleton-chip feed-skeleton-chip-wide" })
    );
    card.append(header, contentLineOne, contentLineTwo, image, footer);
    results.appendChild(card);
  }
}

function renderUserResults(results, users, { currentUserId, visibleCount, onLoadMore }) {
  clearElement(results);

  if (users.length === 0) {
    renderNoResults(results, "users");
    return;
  }

  const visibleUsers = users.slice(0, visibleCount);

  visibleUsers.forEach((user) => {
    const card = createElement("button", {
      className: "profile-card search-user-card",
      type: "button",
      attributes: {
        "aria-label": `Open ${user.username}'s profile preview`,
        title: user.username
      }
    });
    const avatar = createAvatarElement(user, {
      size: "md",
      className: "search-user-avatar",
      decorative: true
    });
    const body = createElement("div", { className: "search-user-copy" });
    const username = createElement("h3", { text: user.username });
    const location = createElement("p", {
      text: `${user.location.township} ${user.location.extension}`
    });
    const hint = createElement("span", {
      className: "search-user-hint",
      text: "Community member"
    });

    body.append(username, location, hint);
    card.append(avatar, body);
    card.addEventListener("click", () => {
      showUserPreviewSheet({
        userId: user.id,
        currentUserId
      });
    });
    results.appendChild(card);
  });

  if (users.length > visibleUsers.length) {
    results.appendChild(
      createLoadMoreControl({
        label: "See more users",
        onClick: onLoadMore
      })
    );
  }
}

function renderPostResults(
  results,
  posts,
  { currentUserId, app, currentUser, searchPayload, visibleCount, onLoadMore }
) {
  clearElement(results);

  if (posts.length === 0) {
    if (searchPayload?.authorUserId) {
      const card = createElement("div", { className: "placeholder-card" });
      card.append(
        createElement("h3", { text: "No posts yet" }),
        createElement("p", {
          text: `@${searchPayload.authorUsername || "This user"} has not posted yet.`
        })
      );
      results.appendChild(card);
      return;
    }

    renderNoResults(results, "posts");
    return;
  }

  const visiblePosts = posts.slice(0, visibleCount);

  visiblePosts.forEach((post) => {
    const author = post.author || findUserById(post.userId);
    const card = createPostCard(post, author, currentUserId, () => {
      void renderSearch(app, currentUser, searchPayload);
    });

    results.appendChild(card);
  });

  if (posts.length > visiblePosts.length) {
    results.appendChild(
      createLoadMoreControl({
        label: "See more posts",
        onClick: onLoadMore
      })
    );
  }
}
