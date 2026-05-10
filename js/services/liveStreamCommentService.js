import { broadcast, registerMessageListener } from "./liveSyncService.js";
import { getAuthenticatedUser } from "./authService.js";

class LiveStreamCommentService {
  constructor() {
    this.commentListeners = new Set();
    this.reactionListeners = new Set();
    this.unsubscribeRealtime = registerMessageListener("stream:*", (message) => {
      if (message.type === "stream:comment") {
        this.commentListeners.forEach((callback) => callback(message));
      }

      if (message.type === "stream:reaction") {
        this.reactionListeners.forEach((callback) => callback(message));
      }
    });
  }

  sendComment(streamId, text) {
    const safeText = typeof text === "string" ? text.trim().slice(0, 500) : "";

    if (!safeText) {
      return false;
    }

    const user = getAuthenticatedUser();
    return broadcast({
      type: "stream:comment",
      streamId,
      text: safeText,
      username: user?.username || "Neighbor",
      timestamp: Date.now()
    });
  }

  sendReaction(streamId, reactionType) {
    return broadcast({
      type: "stream:reaction",
      streamId,
      reactionType,
      timestamp: Date.now()
    });
  }

  onComment(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    this.commentListeners.add(callback);
    return () => this.commentListeners.delete(callback);
  }

  onReaction(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    this.reactionListeners.add(callback);
    return () => this.reactionListeners.delete(callback);
  }

  cleanup() {
    this.unsubscribeRealtime?.();
    this.commentListeners.clear();
    this.reactionListeners.clear();
  }
}

export const liveStreamCommentService = new LiveStreamCommentService();
