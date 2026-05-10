import {
  clearElement,
  createElement,
  clearFormErrors,
  setFieldError,
  createFieldError
} from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { createPostImageField } from "../components/postImageField.js";
import { getPostById, loadPostById, updatePost } from "../services/postService.js";
import { showToast } from "../components/toast.js";
import { navigate, registerViewCleanup } from "../router.js";
import { getVoiceNoteSource, isVoiceNotePendingSync } from "../utils/voiceNotes.js";
import { showLoadingOverlay } from "../components/loadingOverlay.js";

const MAX_POST_LENGTH = 1000;

export async function renderEditPost(app, currentUser, payload) {
  clearElement(app);
  let viewActive = true;
  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "create-post");
  const main = createElement("main", { className: "profile-main editor-main" });

  main.appendChild(createEditPostLoadingSkeleton());
  shell.append(navbar, main);
  app.appendChild(shell);
  registerViewCleanup(() => {
    viewActive = false;
  });

  const postId = payload?.postId;
  if (postId) {
    try {
      await loadPostById(postId);
    } catch {
      // Let the cached lookup and existing UI handling resolve the empty state.
    }
  }

  if (!viewActive) {
    return;
  }

  const post = postId ? getPostById(postId) : null;

  if (!post) {
    showToast("Post not found.", "error");
    void navigate("feed");
    return;
  }

  if (post.userId !== currentUser.id) {
    showToast("You can only edit your own post.", "error");
    void navigate("feed");
    return;
  }

  if (getVoiceNoteSource(post.voiceNote) || isVoiceNotePendingSync(post.voiceNote)) {
    showToast("Voice-note posts can't be edited. Delete and repost instead.", "error");
    void navigate("feed");
    return;
  }

  const formCard = createElement("section", {
    className: "profile-card editor-card editor-form-card"
  });
  const formTitle = createElement("h2", {
    className: "section-title",
    text: "Edit post"
  });
  const formText = createElement("p", {
    className: "section-copy",
    text: "Keep the update sharp and direct. Voice-note posts can only be deleted, not edited."
  });

  const form = createElement("form", {
    className: "auth-form",
    id: "edit-post-form"
  });

  const contentField = createTextAreaField({
    labelText: "Content",
    inputId: "edit-post-content",
    placeholder: "Edit your post",
    value: post.content
  });
  const imageField = createPostImageField({
    form,
    inputId: "edit-post-image",
    titleText: "Edit post image",
    initialImage: post.image || post.imageUrl || ""
  });
  const imageControl = imageField.control || imageField.wrapper;

  contentField.mediaSlot.replaceChildren(imageControl);
  contentField.previewSlot.replaceChildren(imageField.wrapper);

  const actions = createElement("div", { className: "form-actions edit-post-actions" });

  const cancelBtn = createElement("button", {
    className: "secondary-btn",
    text: "Cancel",
    type: "button"
  });

  const submitBtn = createElement("button", {
    className: "primary-btn edit-post-save-btn",
    text: "Save",
    type: "submit"
  });

  cancelBtn.addEventListener("click", () => navigate("feed"));

  actions.append(cancelBtn, submitBtn);
  form.append(contentField.wrapper, actions);

  formCard.append(formTitle, formText, form);
  main.replaceChildren(formCard);

  attachCharacterCounter("edit-post-content", "edit-post-content-counter");

  let isSubmitting = false;
  let activeLoadingOverlay = null;
  let trackedDisabledStates = new Map();

  const setEditBusyState = (nextBusy) => {
    isSubmitting = Boolean(nextBusy);

    if (isSubmitting) {
      trackedDisabledStates = new Map();
      Array.from(form.querySelectorAll("button, input, textarea, select")).forEach((control) => {
        trackedDisabledStates.set(control, control.disabled);
        control.disabled = true;
      });
      form.classList.add("edit-post-form-busy");
      form.setAttribute("aria-busy", "true");
      submitBtn.textContent = "Saving...";
      return;
    }

    trackedDisabledStates.forEach((wasDisabled, control) => {
      if (control) {
        control.disabled = wasDisabled;
      }
    });
    trackedDisabledStates = new Map();
    form.classList.remove("edit-post-form-busy");
    form.removeAttribute("aria-busy");
    submitBtn.textContent = "Save";
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    clearFormErrors(form);

    const content = contentField.input.value;

    try {
      if (imageField.isProcessing()) {
        const pendingImageError = new Error("Please wait for the image to finish optimizing.");
        pendingImageError.field = "image";
        throw pendingImageError;
      }

      if (imageField.hasPreviewError()) {
        const invalidImageError = new Error(
          "That image could not be previewed. Choose another image or remove it first."
        );
        invalidImageError.field = "image";
        throw invalidImageError;
      }

      setEditBusyState(true);
      activeLoadingOverlay = showLoadingOverlay({
        label: "Saving changes..."
      });
      await updatePost({
        postId: post.id,
        content,
        image: imageField.getValue()
      });

      showToast("Your post changes are live.", "success", {
        variant: "edited-success",
        durationMs: 1800
      });
      await navigate("feed");
    } catch (error) {
      handleEditPostError(error);
    } finally {
      activeLoadingOverlay?.close();
      activeLoadingOverlay = null;
      setEditBusyState(false);
    }
  });
}

function createEditPostLoadingSkeleton() {
  const fragment = document.createDocumentFragment();
  const infoCard = createElement("section", {
    className: "profile-card editor-card editor-loading-card"
  });
  const infoEyebrow = createElement("span", {
    className: "feed-skeleton-block editor-loading-eyebrow"
  });
  const infoTitle = createElement("span", {
    className: "feed-skeleton-block editor-loading-title"
  });
  const infoCopyOne = createElement("span", {
    className: "feed-skeleton-block editor-loading-line"
  });
  const infoCopyTwo = createElement("span", {
    className: "feed-skeleton-block editor-loading-line editor-loading-line-short"
  });

  infoCard.append(infoEyebrow, infoTitle, infoCopyOne, infoCopyTwo);
  fragment.appendChild(infoCard);

  const formCard = createElement("section", {
    className: "profile-card editor-card editor-form-card editor-loading-card"
  });
  const formTitle = createElement("span", {
    className: "feed-skeleton-block editor-loading-title"
  });
  const formCopy = createElement("span", {
    className: "feed-skeleton-block editor-loading-line"
  });
  const textarea = createElement("span", {
    className: "feed-skeleton-rect editor-loading-textarea"
  });
  const image = createElement("span", {
    className: "feed-skeleton-rect editor-loading-image"
  });
  const actions = createElement("div", {
    className: "form-actions editor-loading-actions"
  });

  actions.append(
    createElement("span", {
      className: "feed-skeleton-chip editor-loading-action"
    }),
    createElement("span", {
      className: "feed-skeleton-chip editor-loading-action"
    })
  );
  formCard.append(formTitle, formCopy, textarea, image, actions);
  fragment.appendChild(formCard);

  return fragment;
}

function createTextAreaField({ labelText, inputId, placeholder, value }) {
  const wrapper = createElement("div", { className: "field-group" });
  const topRow = createElement("div", { className: "field-top-row" });
  const label = createElement("label", {
    className: "form-label",
    text: labelText
  });
  const counter = createElement("span", {
    className: "char-counter",
    id: `${inputId}-counter`,
    text: `0 / ${MAX_POST_LENGTH}`
  });
  const textarea = document.createElement("textarea");
  textarea.className = "form-input form-textarea";
  textarea.id = inputId;
  textarea.placeholder = placeholder;
  textarea.required = true;
  textarea.maxLength = MAX_POST_LENGTH;
  textarea.value = value;
  const helper = createElement("p", {
    className: "field-helper",
    text: "Maximum 1000 characters."
  });
  const metaRow = createElement("div", {
    className: "create-post-text-meta-row"
  });
  const mediaSlot = createElement("div", {
    className: "create-post-text-media-slot"
  });
  const previewSlot = createElement("div", {
    className: "create-post-text-preview-slot"
  });
  const error = createFieldError(inputId);

  topRow.append(label, counter);
  metaRow.append(helper, mediaSlot);
  wrapper.append(topRow, textarea, metaRow, previewSlot, error);

  return {
    wrapper,
    input: textarea,
    counter,
    mediaSlot,
    previewSlot,
    error
  };
}

function attachCharacterCounter(inputId, counterId) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);

  if (!input || !counter) return;

  const sync = () => {
    counter.textContent = `${input.value.length} / ${MAX_POST_LENGTH}`;
    counter.className =
      input.value.length >= MAX_POST_LENGTH
        ? "char-counter char-counter-limit"
        : "char-counter";
  };

  input.addEventListener("input", sync);
  sync();
}

function handleEditPostError(error) {
  const message = error.message || "Failed to update post.";

  if (error?.field === "content" || message.toLowerCase().includes("post content")) {
    setFieldError("edit-post-content", message);
    return;
  }

  if (error?.field === "image" || error?.field === "imageUrl") {
    setFieldError("edit-post-image", message);
    return;
  }

  showToast(message, "error");
}
