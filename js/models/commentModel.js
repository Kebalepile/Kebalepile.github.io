import { validateCommentSubmission } from "../utils/validators.js";
import { normalizeVoiceNote } from "../utils/voiceNotes.js";

export function createComment({
  postId,
  userId,
  parentId = null,
  content,
  voiceNote = null
}) {
  if (!postId || typeof postId !== "string") {
    throw new Error("A valid postId is required.");
  }

  if (!userId || typeof userId !== "string") {
    throw new Error("A valid userId is required.");
  }

  if (parentId !== null && typeof parentId !== "string") {
    throw new Error("parentId must be null or a valid comment id.");
  }

  const validatedComment = validateCommentSubmission({
    content,
    voiceNote
  });

  return {
    id: crypto.randomUUID(),
    postId,
    userId,
    parentId,
    content: validatedComment.content,
    reactions: {
      like: [],
      dislike: []
    },
    voiceNote: normalizeVoiceNote(validatedComment.voiceNote),
    createdAt: new Date().toISOString(),
    updatedAt: null
  };
}
