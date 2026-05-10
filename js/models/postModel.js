import {
  validateTownship,
  validateExtension,
  validatePostContent,
  validateImageUrl
} from "../utils/validators.js";
import { normalizeVoiceNote } from "../utils/voiceNotes.js";

export function createPost({ userId, content = "", image = "", location, voiceNote = null }) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A valid userId is required.");
  }

  return {
    id: crypto.randomUUID(),
    userId,
    content,
    image: validateImageUrl(image),
    location: {
      township: validateTownship(location.township),
      extension: validateExtension(location.extension)
    },
    voiceNote: normalizeVoiceNote(voiceNote),
    reactions: {
      like: [],
      dislike: []
    },
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: null
  };
}
