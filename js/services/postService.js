import { STORAGE_KEYS } from "../config/storageKeys.js";
import { storage } from "../storage/storage.js";
import { getHiddenTargetIdsForUser } from "./reportService.js";
import { apiRequest } from "./apiClient.js";
import { upsertUser, upsertUsers } from "./userService.js";
import { normalizeLocation } from "../utils/location.js";
import { serializeVoiceNoteForTransport } from "../utils/voiceNotes.js";
import {
  validateCommentSubmission,
  validateImageUrl,
  validatePostContent,
  validatePostSubmission,
  validateReactionType
} from "../utils/validators.js";

const REACTION_KEYS = ["like", "meh", "dislike"];
const MAX_PERSISTED_POSTS = 75;
const STORAGE_POST_FALLBACK_SIZES = [MAX_PERSISTED_POSTS, 50, 30, 15, 5];
const postListeners = new Set();
let postsCache = null;

function makeError(code, field, message) {
  const error = new Error(message);
  error.code = code;
  error.field = field;
  return error;
}

function createQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeVoiceNote(voiceNote) {
  const pendingSync = voiceNote?.pendingSync === true;

  if (
    !voiceNote ||
    (!pendingSync && !voiceNote.audioBase64 && !voiceNote.url && !voiceNote.storageKey)
  ) {
    return null;
  }

  return {
    dataUrl: "",
    audioBase64: typeof voiceNote.audioBase64 === "string" ? voiceNote.audioBase64 : "",
    url: typeof voiceNote.url === "string" ? voiceNote.url : "",
    storageKey: typeof voiceNote.storageKey === "string" ? voiceNote.storageKey : "",
    mimeType: typeof voiceNote.mimeType === "string" ? voiceNote.mimeType : "audio/webm",
    durationMs: Number.isFinite(voiceNote.durationMs) ? Number(voiceNote.durationMs) : 0,
    size: Number.isFinite(voiceNote.size) ? Number(voiceNote.size) : 0,
    waveform: Array.isArray(voiceNote.waveform) ? voiceNote.waveform : [],
    pendingSync
  };
}

function createReactionRecord(reactions = {}) {
  return {
    like: Array.isArray(reactions.like) ? [...reactions.like] : [],
    meh: Array.isArray(reactions.meh) ? [...reactions.meh] : [],
    dislike: Array.isArray(reactions.dislike) ? [...reactions.dislike] : []
  };
}

function normalizeCommentRecord(comment = {}) {
  const author = comment.author ? upsertUser(comment.author) : null;

  return {
    ...comment,
    id: typeof comment.id === "string" ? comment.id : "",
    postId: typeof comment.postId === "string" ? comment.postId : "",
    userId: typeof comment.userId === "string" ? comment.userId : author?.id || "",
    parentId: typeof comment.parentId === "string" ? comment.parentId : null,
    content: typeof comment.content === "string" ? comment.content : "",
    reactions: createReactionRecord(comment.reactions),
    voiceNote: normalizeVoiceNote(comment.voiceNote),
    createdAt:
      typeof comment.createdAt === "string" && comment.createdAt
        ? comment.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof comment.updatedAt === "string" && comment.updatedAt ? comment.updatedAt : null,
    author
  };
}

function normalizePostRecord(post = {}) {
  const author = post.author ? upsertUser(post.author) : null;
  const comments = Array.isArray(post.comments)
    ? post.comments.map((comment) => normalizeCommentRecord(comment))
    : [];

  return {
    ...post,
    id: typeof post.id === "string" ? post.id : "",
    userId: typeof post.userId === "string" ? post.userId : author?.id || "",
    content: typeof post.content === "string" ? post.content : "",
    image: typeof post.image === "string" ? post.image : post.imageUrl || "",
    imageUrl: typeof post.imageUrl === "string" ? post.imageUrl : post.image || "",
    location: normalizeLocation(post.location),
    voiceNote: normalizeVoiceNote(post.voiceNote),
    reactions: createReactionRecord(post.reactions),
    comments,
    commentCount: Number.isFinite(post.commentCount) ? Number(post.commentCount) : comments.length,
    createdAt:
      typeof post.createdAt === "string" && post.createdAt
        ? post.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof post.updatedAt === "string" && post.updatedAt ? post.updatedAt : null,
    author
  };
}

function normalizePostRecords(posts = []) {
  return Array.isArray(posts) ? posts.map((post) => normalizePostRecord(post)) : [];
}

function sanitizeVoiceNoteForStorage(voiceNote) {
  const normalizedVoiceNote = normalizeVoiceNote(voiceNote);

  if (!normalizedVoiceNote) {
    return null;
  }

  const remoteUrl =
    typeof normalizedVoiceNote.url === "string" ? normalizedVoiceNote.url.trim() : "";

  return {
    ...normalizedVoiceNote,
    audioBase64: "",
    pendingSync: !/^https?:\/\//i.test(remoteUrl)
  };
}

function sanitizeCommentRecordForStorage(comment = {}) {
  const safeCommentAuthor = sanitizeUserPreviewForStorage(comment.author);

  return {
    id: typeof comment.id === "string" ? comment.id : "",
    postId: typeof comment.postId === "string" ? comment.postId : "",
    userId: typeof comment.userId === "string" ? comment.userId : "",
    parentId: typeof comment.parentId === "string" ? comment.parentId : null,
    content: typeof comment.content === "string" ? comment.content : "",
    reactions: createReactionRecord(comment.reactions),
    voiceNote: sanitizeVoiceNoteForStorage(comment.voiceNote)
      ,
    createdAt:
      typeof comment.createdAt === "string" && comment.createdAt
        ? comment.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof comment.updatedAt === "string" && comment.updatedAt ? comment.updatedAt : null,
    ...(safeCommentAuthor ? { author: safeCommentAuthor } : {})
  };
}

function sanitizePostImageForStorage(image = "") {
  const normalizedImage = typeof image === "string" ? image.trim() : "";
  return /^https?:\/\//i.test(normalizedImage) ? normalizedImage : "";
}

function sanitizeUserPreviewForStorage(user = null) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const safeAvatarUrl = sanitizePostImageForStorage(user.avatarDataUrl || user.avatarUrl || "");
  const safeUser = {
    id: typeof user.id === "string" ? user.id : "",
    username: typeof user.username === "string" ? user.username : "",
    avatarUrl: safeAvatarUrl,
    avatarDataUrl: safeAvatarUrl,
    location: normalizeLocation(user.location)
  };

  return safeUser.id || safeUser.username ? safeUser : null;
}

function sanitizePostRecordForStorage(post = {}) {
  const sanitizedImage = sanitizePostImageForStorage(post.imageUrl || post.image || "");
  const safePostAuthor = sanitizeUserPreviewForStorage(post.author);

  return {
    id: typeof post.id === "string" ? post.id : "",
    userId: typeof post.userId === "string" ? post.userId : "",
    content: typeof post.content === "string" ? post.content : "",
    image: sanitizedImage,
    imageUrl: sanitizedImage,
    location: normalizeLocation(post.location),
    voiceNote: sanitizeVoiceNoteForStorage(post.voiceNote),
    reactions: createReactionRecord(post.reactions),
    comments: Array.isArray(post.comments)
      ? post.comments.map((comment) => sanitizeCommentRecordForStorage(comment))
      : [],
    commentCount: Number.isFinite(post.commentCount)
      ? Number(post.commentCount)
      : Array.isArray(post.comments)
        ? post.comments.length
        : 0,
    createdAt:
      typeof post.createdAt === "string" && post.createdAt
        ? post.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof post.updatedAt === "string" && post.updatedAt ? post.updatedAt : null,
    ...(safePostAuthor ? { author: safePostAuthor } : {})
  };
}

function sanitizePostsForStorage(posts = []) {
  return Array.isArray(posts) ? posts.map((post) => sanitizePostRecordForStorage(post)) : [];
}

function getPostStorageAttemptSizes(postCount) {
  if (postCount <= 0) {
    return [0];
  }

  return Array.from(
    new Set(
      STORAGE_POST_FALLBACK_SIZES.map((size) => Math.min(size, postCount)).filter(
        (size) => Number.isInteger(size) && size >= 0
      )
    )
  );
}

function persistPostsSnapshot(posts = []) {
  const normalizedPosts = sortPosts(normalizePostRecords(posts));
  const attemptSizes = getPostStorageAttemptSizes(normalizedPosts.length);

  for (const attemptSize of attemptSizes) {
    const snapshot = sanitizePostsForStorage(normalizedPosts.slice(0, attemptSize));

    if (storage.set(STORAGE_KEYS.POSTS, snapshot)) {
      return true;
    }
  }

  storage.remove(STORAGE_KEYS.POSTS);
  return false;
}

function sortPosts(posts = []) {
  return [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getCachedPosts() {
  if (!Array.isArray(postsCache)) {
    postsCache = sortPosts(normalizePostRecords(storage.get(STORAGE_KEYS.POSTS, [])));
  }

  return postsCache;
}

function emitPostChange(posts) {
  postListeners.forEach((listener) => {
    try {
      listener(posts);
    } catch {
      // Ignore listener errors so post cache updates continue.
    }
  });
}

function mergePostCollections(existingPosts, incomingPosts) {
  const postsById = new Map(existingPosts.map((post) => [post.id, post]));

  incomingPosts.forEach((post) => {
    postsById.set(post.id, {
      ...(postsById.get(post.id) || {}),
      ...post
    });
  });

  return sortPosts(Array.from(postsById.values()));
}

function saveNormalizedPosts(posts) {
  const nextPosts = sortPosts(normalizePostRecords(posts));
  const previousPosts = sortPosts(normalizePostRecords(getCachedPosts()));

  if (JSON.stringify(previousPosts) === JSON.stringify(nextPosts)) {
    return nextPosts;
  }

  postsCache = nextPosts;
  persistPostsSnapshot(nextPosts);
  emitPostChange(nextPosts);
  return nextPosts;
}

function replaceCachedPost(post) {
  const normalizedPost = normalizePostRecord(post);
  const mergedPosts = mergePostCollections(getPosts(), [normalizedPost]);
  saveNormalizedPosts(mergedPosts);
  return normalizedPost;
}

function syncCachedPosts(posts, { replace = false } = {}) {
  const normalizedPosts = normalizePostRecords(posts);

  if (replace) {
    saveNormalizedPosts(normalizedPosts);
    return sortPosts(normalizedPosts);
  }

  const mergedPosts = mergePostCollections(getPosts(), normalizedPosts);
  saveNormalizedPosts(mergedPosts);
  return mergedPosts;
}

function replaceCachedPostsForUser(userId, posts = []) {
  const safeUserId = typeof userId === "string" ? userId.trim() : "";

  if (!safeUserId) {
    return syncCachedPosts(posts);
  }

  const normalizedPosts = normalizePostRecords(posts);
  const nextPosts = [
    ...getPosts().filter((post) => post.userId !== safeUserId),
    ...normalizedPosts
  ];

  saveNormalizedPosts(nextPosts);
  return sortPosts(normalizedPosts);
}

function removeCachedPost(postId) {
  const nextPosts = getPosts().filter((post) => post.id !== postId);
  saveNormalizedPosts(nextPosts);
  return true;
}

function collectCommentBranchIds(comments, rootCommentId) {
  const ids = new Set([rootCommentId]);
  let foundNewChild = true;

  while (foundNewChild) {
    foundNewChild = false;

    comments.forEach((comment) => {
      if (comment.parentId && ids.has(comment.parentId) && !ids.has(comment.id)) {
        ids.add(comment.id);
        foundNewChild = true;
      }
    });
  }

  return ids;
}

function updateCachedPostComments(postId, updater) {
  const post = getPostById(postId);

  if (!post) {
    return null;
  }

  const nextComments = updater(Array.isArray(post.comments) ? [...post.comments] : []);
  const nextPost = {
    ...post,
    comments: nextComments,
    commentCount: nextComments.length
  };

  replaceCachedPost(nextPost);
  return nextPost;
}

export function getPosts() {
  return sortPosts(normalizePostRecords(getCachedPosts()));
}

export function filterVisiblePostsForUser(posts, userId) {
  const safePosts = Array.isArray(posts) ? posts : [];
  const hiddenPostIds = getHiddenTargetIdsForUser({
    userId,
    targetType: "post"
  });

  if (hiddenPostIds.size === 0) {
    return safePosts;
  }

  return safePosts.filter((post) => !hiddenPostIds.has(post.id));
}

export function getVisiblePosts(userId) {
  return filterVisiblePostsForUser(getPosts(), userId);
}

export function getVisiblePostsByUserId(userId, viewerUserId) {
  return filterVisiblePostsForUser(getPostsByUserId(userId), viewerUserId);
}

export function savePosts(posts) {
  return saveNormalizedPosts(posts);
}

export function resetPostState() {
  postsCache = null;
  storage.remove(STORAGE_KEYS.POSTS);
}

export function subscribeToPostChanges(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  postListeners.add(listener);

  return () => {
    postListeners.delete(listener);
  };
}

export async function loadFeedPosts({ limit } = {}) {
  const response = await apiRequest(`/posts/feed${createQueryString({ limit })}`);
  return syncCachedPosts(response.posts || [], { replace: true });
}

export async function loadPostsByUserId(userId, { limit } = {}) {
  const response = await apiRequest(
    `/posts/user/${encodeURIComponent(userId)}${createQueryString({ limit })}`
  );

  return replaceCachedPostsForUser(userId, response.posts || []);
}

export async function loadPostById(postId) {
  const response = await apiRequest(`/posts/${encodeURIComponent(postId)}`);
  return replaceCachedPost(response.post);
}

export async function searchPostsRemote(query, { limit } = {}) {
  const normalizedQuery = String(query ?? "").trim();

  if (!normalizedQuery) {
    return [];
  }

  const response = await apiRequest(
    `/posts/search${createQueryString({
      query: normalizedQuery,
      limit
    })}`
  );

  const posts = normalizePostRecords(response.posts || []);
  syncCachedPosts(posts);
  return posts;
}

export async function createAndStorePost({
  content = "",
  image = "",
  voiceNote = null,
  clientRequestId = ""
}) {
  const safePost = validatePostSubmission({
    content,
    voiceNote
  });
  const response = await apiRequest("/posts", {
    method: "POST",
    body: {
      clientRequestId,
      content: safePost.content,
      image,
      voiceNote: serializeVoiceNoteForTransport(safePost.voiceNote)
    }
  });

  return replaceCachedPost(response.post);
}

export function getPostById(postId) {
  const posts = getPosts();
  return posts.find((post) => post.id === postId) || null;
}

export function getPostsByUserId(userId) {
  return getPosts().filter((post) => post.userId === userId);
}

export async function updatePost({ postId, content, image = "" }) {
  const response = await apiRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: {
      content: validatePostContent(content),
      image: validateImageUrl(image)
    }
  });

  return replaceCachedPost(response.post);
}

export async function deletePost({ postId }) {
  if (!postId) {
    throw makeError("POST_NOT_FOUND", null, "Post not found.");
  }

  await apiRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE"
  });
  removeCachedPost(postId);

  return true;
}

export async function addCommentToPost({
  postId,
  parentId = null,
  content,
  voiceNote = null
}) {
  const safeComment = validateCommentSubmission({
    content,
    voiceNote
  });
  const response = await apiRequest(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: {
      parentId,
      content: safeComment.content,
      voiceNote: serializeVoiceNoteForTransport(safeComment.voiceNote)
    }
  });
  const comment = normalizeCommentRecord(response.comment);

  updateCachedPostComments(postId, (comments) => [...comments, comment]);

  return comment;
}

export async function updateCommentInPost({ postId, commentId, content }) {
  const response = await apiRequest(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PATCH",
      body: {
        content: validatePostContent(content)
      }
    }
  );
  const updatedComment = normalizeCommentRecord(response.comment);

  updateCachedPostComments(postId, (comments) =>
    comments.map((comment) =>
      comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
    )
  );

  return updatedComment;
}

export async function deleteCommentFromPost({ postId, commentId }) {
  await apiRequest(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE"
    }
  );

  updateCachedPostComments(postId, (comments) => {
    const commentIdsToDelete = collectCommentBranchIds(comments, commentId);
    return comments.filter((comment) => !commentIdsToDelete.has(comment.id));
  });

  return true;
}

export function getCommentsForPost(postOrId) {
  const postId = typeof postOrId === "string" ? postOrId : postOrId?.id;

  if (!postId) {
    return [];
  }

  const post = getPostById(postId);
  if (!post) {
    return [];
  }

  return Array.isArray(post.comments) ? post.comments : [];
}

export function getVisibleCommentsForPost(postOrId, userId) {
  const comments = getCommentsForPost(postOrId);
  const hiddenCommentIds = getHiddenTargetIdsForUser({
    userId,
    targetType: "comment"
  });

  if (hiddenCommentIds.size === 0) {
    return comments;
  }

  const hiddenBranchIds = new Set();
  let foundNewChild = true;

  comments.forEach((comment) => {
    if (hiddenCommentIds.has(comment.id)) {
      hiddenBranchIds.add(comment.id);
    }
  });

  while (foundNewChild) {
    foundNewChild = false;

    comments.forEach((comment) => {
      if (
        comment.parentId &&
        hiddenBranchIds.has(comment.parentId) &&
        !hiddenBranchIds.has(comment.id)
      ) {
        hiddenBranchIds.add(comment.id);
        foundNewChild = true;
      }
    });
  }

  return comments.filter((comment) => !hiddenBranchIds.has(comment.id));
}

export async function setPostReaction({ postId, reactionType }) {
  const safeReactionType = validateReactionType(reactionType);
  const response = await apiRequest(`/posts/${encodeURIComponent(postId)}/reactions`, {
    method: "POST",
    body: {
      reactionType: safeReactionType
    }
  });

  return replaceCachedPost(response.post);
}

export async function setCommentReaction({ postId, commentId, reactionType }) {
  const safeReactionType = validateReactionType(reactionType);
  const response = await apiRequest(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/reactions`,
    {
      method: "POST",
      body: {
        reactionType: safeReactionType
      }
    }
  );
  const updatedComment = normalizeCommentRecord(response.comment);

  updateCachedPostComments(postId, (comments) =>
    comments.map((comment) =>
      comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
    )
  );

  return updatedComment;
}

export function getUserReaction(post, userId) {
  return getActiveReaction(post, userId);
}

export function getCommentUserReaction(comment, userId) {
  return getActiveReaction(comment, userId);
}

function getActiveReaction(entity, userId) {
  if (!entity?.reactions || !userId) {
    return null;
  }

  if (entity.reactions.like?.includes(userId)) {
    return "like";
  }

  if (entity.reactions.dislike?.includes(userId)) {
    return "dislike";
  }

  return null;
}
