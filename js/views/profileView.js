import {
  clearElement,
  createElement,
  clearFormErrors,
  setFieldError,
  createFieldError
} from "../utils/dom.js";
import { createNavbar } from "../components/navbar.js";
import { navigate, registerViewCleanup } from "../router.js";
import { showToast } from "../components/toast.js";
import { formatLocation } from "../utils/location.js";
import { showUserPreviewSheet } from "../components/userPreviewSheet.js";
import {
  deleteAuthenticatedUserAvatar,
  requestPhoneVerificationOtp,
  uploadAuthenticatedUserAvatar,
  updateAuthenticatedUserProfile,
  verifyAuthenticatedUserPhoneOtp
} from "../services/authService.js";
import { createAvatarElement } from "../utils/avatar.js";
import {
  compressImageFile,
  formatImageOptimizationSummary
} from "../utils/imageCompression.js";
import { validateAvatarFile, MAX_AVATAR_FILE_BYTES } from "../utils/validators.js";
import { formatCompactCount } from "../utils/numberFormat.js";
import {
  getPostsByUserId,
  loadPostsByUserId,
  subscribeToPostChanges
} from "../services/postService.js";
import {
  getFollowerUsers,
  getFollowingUsers,
  fetchFollowerUsers,
  fetchFollowingUsers,
  syncCurrentUserFromApi
} from "../services/userService.js";
import { setLiveSyncOptions } from "../services/liveSyncService.js";
import { showLoadingOverlay } from "../components/loadingOverlay.js";
import { protectImageElement, protectMediaShell } from "../utils/protectedMedia.js";
import {
  buildBrandedShareData,
  buildShareClipboardText,
  getShareableAppUrl
} from "../utils/share.js";

const PROFILE_LOAD_PLACEHOLDER_TIMEOUT_MS = 3000;
const PROFILE_AVATAR_SCALE_STEPS = [1, 0.82, 0.68, 0.56];
const PROFILE_AVATAR_QUALITY_STEPS = [0.84, 0.72, 0.6];

function waitFor(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function renderProfile(app, currentUser, payload = null) {
  clearElement(app);
  const shell = createElement("section", { className: "feed-shell" });
  const navbar = createNavbar(currentUser, "profile");
  const main = createElement("main", { className: "profile-main profile-page-main" });
  const activeSection = payload?.section === "followers" || payload?.section === "following"
    ? payload.section
    : "home";
  const showEditForm = activeSection === "home" && payload?.editMode === true;

  if (activeSection === "followers" || activeSection === "following") {
    main.classList.add("profile-page-main-people");
  }

  shell.append(navbar, main);
  app.appendChild(shell);
  main.appendChild(
    createProfileLoadingSkeleton({
      activeSection,
      showEditForm
    })
  );

  const profileLoadPromise = Promise.allSettled([
    fetchFollowerUsers(currentUser.id),
    fetchFollowingUsers(currentUser.id),
    loadPostsByUserId(currentUser.id)
  ]);
  const racedProfileLoad = await Promise.race([
    profileLoadPromise.then((results) => ({
      timedOut: false,
      results
    })),
    waitFor(PROFILE_LOAD_PLACEHOLDER_TIMEOUT_MS).then(() => ({
      timedOut: true,
      results: null
    }))
  ]);
  const profileLoadResults = racedProfileLoad.timedOut
    ? [
        { status: "fulfilled", value: getFollowerUsers(currentUser.id) },
        { status: "fulfilled", value: getFollowingUsers(currentUser.id) },
        { status: "fulfilled", value: getPostsByUserId(currentUser.id) }
      ]
    : racedProfileLoad.results;
  const followerUsers =
    profileLoadResults[0]?.status === "fulfilled"
      ? profileLoadResults[0].value
      : getFollowerUsers(currentUser.id);
  const followingUsers =
    profileLoadResults[1]?.status === "fulfilled"
      ? profileLoadResults[1].value
      : getFollowingUsers(currentUser.id);

  if (
    !racedProfileLoad.timedOut &&
    profileLoadResults.some((result) => result.status === "rejected")
  ) {
    showToast(
      "Could not fully refresh your profile. Showing cached details where available.",
      "error"
    );
  }

  const followerCount = followerUsers.length;
  const followingCount = followingUsers.length;
  const avatarState = {
    savedDataUrl: currentUser.avatarDataUrl || "",
    pendingDataUrl: "",
    pendingBlob: null,
    pending: false,
    requestToken: 0
  };

  const summaryCard = createElement("section", {
    className: "profile-card profile-channel-hero"
  });
  const channelBanner = createElement("div", { className: "profile-channel-banner" });
  const channelHero = createElement("div", { className: "profile-channel-hero-main" });
  const avatarPreviewShell = createElement("div", {
    className: "profile-avatar-preview-shell profile-channel-avatar-shell"
  });
  const avatarPreview = createElement("div", { className: "profile-avatar-preview" });
  const heroCopy = createElement("div", { className: "profile-channel-copy" });
  const summaryTitle = createElement("h2", {
    className: "profile-channel-title",
    text: currentUser.username
  });
  const handleText = createElement("p", {
    className: "profile-channel-handle",
    text: `@${currentUser.username}`
  });
  const summaryText = createElement("p", {
    className: "profile-channel-description",
    text: `${formatLocation(currentUser.location) || "Township"} local voice. Share updates, jump into threads, and keep the township loop alive.`
  });
  const metaRow = createElement("p", {
    className: "profile-channel-meta",
    text: ""
  });
  const actionRow = createElement("div", { className: "profile-channel-actions" });
  const editProfileBtn = createElement("button", {
    className: "secondary-btn profile-channel-btn",
    text: "Edit profile",
    type: "button"
  });
  const inviteBtn = createElement("button", {
    className: "secondary-btn profile-channel-btn",
    text: "Invite",
    type: "button"
  });
  editProfileBtn.addEventListener("click", () => {
    navigate("profile", { editMode: true });
  });
  inviteBtn.addEventListener("click", async () => {
    await shareAppInvite(currentUser);
  });
  actionRow.append(editProfileBtn, inviteBtn);

  const tabs = createElement("div", { className: "profile-channel-tabs" });
  tabs.append(
    createChannelTab("Feed", {
      active: activeSection === "home",
      onClick: () => navigate("feed")
    }),
    createChannelTab("My Posts", {
      onClick: () =>
        navigate(
          "search",
          {
            mode: "posts",
            authorUserId: currentUser.id,
            authorUsername: currentUser.username
          },
          {
            skipTransition: true
          }
        )
    }),
    createChannelTab("Followers", {
      active: activeSection === "followers",
      onClick: () =>
        navigate("profile", {
          section: "followers"
        })
    }),
    createChannelTab("Following", {
      active: activeSection === "following",
      onClick: () =>
        navigate("profile", {
          section: "following"
        })
    })
  );

  avatarPreviewShell.appendChild(avatarPreview);
  heroCopy.append(summaryTitle, handleText, metaRow, summaryText, actionRow);
  channelHero.append(avatarPreviewShell, heroCopy);
  summaryCard.append(channelBanner, channelHero, tabs);
  main.replaceChildren();
  let profileEditor = null;

  if (activeSection === "followers" || activeSection === "following") {
    main.append(
      summaryCard,
      createPeoplePanel({
        currentUser,
        section: activeSection,
        users: activeSection === "followers" ? followerUsers : followingUsers
      })
    );
  } else if (showEditForm) {
    profileEditor = createProfileEditForm({
      currentUser,
      avatarState,
      avatarPreview,
      onAvatarStateChange: syncAvatarPreviewAndInteractivity
    });
    main.append(summaryCard, profileEditor.formCard);
  } else {
    main.append(summaryCard);
  }

  const syncMetaRow = () => {
    const nextUserPosts = getPostsByUserId(currentUser.id);
    metaRow.textContent = `${formatCompactCount(nextUserPosts.length)} ${
      nextUserPosts.length === 1 ? "post" : "posts"
    } | ${formatCompactCount(followerCount)} ${
      followerCount === 1 ? "follower" : "followers"
    } | ${formatCompactCount(followingCount)} following | Joined ${formatJoinDate(currentUser.createdAt)}`;
  };

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
      syncMetaRow();
    })
  );

  let profilePhotoDeletePending = false;
  let closeProfilePhotoViewer = null;

  function syncAvatarPreviewAndInteractivity() {
    renderAvatarPreview(avatarPreview, {
      username: document.getElementById("profile-username")?.value || currentUser.username,
      avatarDataUrl: getActiveAvatarDataUrl(avatarState)
    });
    syncAvatarPreviewInteractivity();
  }

  function syncAvatarPreviewInteractivity() {
    const canOpenViewer =
      Boolean(avatarState.savedDataUrl) &&
      !hasPendingAvatarSelection(avatarState) &&
      !profilePhotoDeletePending;

    avatarPreviewShell.classList.toggle(
      "profile-avatar-preview-shell-clickable",
      canOpenViewer
    );

    if (canOpenViewer) {
      avatarPreviewShell.tabIndex = 0;
      avatarPreviewShell.setAttribute("role", "button");
      avatarPreviewShell.setAttribute("aria-label", "Open profile photo");
      return;
    }

    avatarPreviewShell.tabIndex = -1;
    avatarPreviewShell.removeAttribute("role");
    avatarPreviewShell.removeAttribute("aria-label");
  }

  const openProfilePhotoViewer = () => {
    if (
      !avatarState.savedDataUrl ||
      hasPendingAvatarSelection(avatarState) ||
      profilePhotoDeletePending
    ) {
      return;
    }

    closeProfilePhotoViewer?.();
    closeProfilePhotoViewer = showProfilePhotoViewer({
      imageUrl: avatarState.savedDataUrl,
      username: currentUser.username,
      onDelete: async () => {
        if (profilePhotoDeletePending) {
          return false;
        }

        profilePhotoDeletePending = true;
        syncAvatarPreviewInteractivity();
        const deleteOverlay = showLoadingOverlay({
          label: "Removing profile photo..."
        });

        try {
          const updatedUser = await deleteAuthenticatedUserAvatar({
            currentUser
          });
          const syncedUser = await syncCurrentUserFromApi();

          Object.assign(currentUser, updatedUser, syncedUser, {
            avatarDataUrl: syncedUser.avatarDataUrl || "",
            avatarUrl: syncedUser.avatarUrl || ""
          });
          avatarState.savedDataUrl = "";
          avatarState.pendingDataUrl = "";
          avatarState.pendingBlob = null;
          profileEditor?.avatarUploadFieldController?.syncState("Profile photo removed.");
          syncAvatarPreviewAndInteractivity();
          showToast("Profile photo removed.", "success", {
            variant: "updated-success",
            durationMs: 1800
          });
          closeProfilePhotoViewer = null;
          return true;
        } catch (error) {
          handleProfileError(error, {
            switchToTab: profileEditor?.switchToTab
          });
          return false;
        } finally {
          deleteOverlay.close();
          profilePhotoDeletePending = false;
          syncAvatarPreviewInteractivity();
        }
      }
    });
  };

  avatarPreviewShell.addEventListener("click", openProfilePhotoViewer);
  avatarPreviewShell.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && avatarPreviewShell.tabIndex === 0) {
      event.preventDefault();
      openProfilePhotoViewer();
    }
  });

  registerViewCleanup(() => {
    closeProfilePhotoViewer?.();
    closeProfilePhotoViewer = null;
  });

  syncAvatarPreviewAndInteractivity();
  syncMetaRow();

  if (!profileEditor) {
    return;
  }

  let profileSavePending = false;
  let profileSaveOverlay = null;
  let trackedProfileControlStates = new Map();

  const setProfileSaveBusyState = (nextBusy) => {
    profileSavePending = Boolean(nextBusy);

    if (profileSavePending) {
      trackedProfileControlStates = new Map();
      Array.from(profileEditor.form.querySelectorAll("button, input, textarea, select")).forEach(
        (control) => {
          trackedProfileControlStates.set(control, control.disabled);
          control.disabled = true;
        }
      );
      profileEditor.form.classList.add("profile-form-busy");
      profileEditor.form.setAttribute("aria-busy", "true");
      profileEditor.submitBtn.textContent = "Saving...";
      return;
    }

    trackedProfileControlStates.forEach((wasDisabled, control) => {
      if (control) {
        control.disabled = wasDisabled;
      }
    });
    trackedProfileControlStates = new Map();
    profileEditor.form.classList.remove("profile-form-busy");
    profileEditor.form.removeAttribute("aria-busy");
    profileEditor.submitBtn.textContent = "Save";
  };

  const usernameInput = document.getElementById("profile-username");
  usernameInput?.addEventListener("input", () => {
    syncAvatarPreviewAndInteractivity();
  });

  profileEditor.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (profileSavePending) {
      return;
    }

    clearFormErrors(profileEditor.form);

    const username = document.getElementById("profile-username").value;
    const phoneNumber = document.getElementById("profile-phone")?.value || "";
    const province = document.getElementById("profile-province").value;
    const municipality = document.getElementById("profile-municipality").value;
    const township = document.getElementById("profile-township").value;
    const extension = document.getElementById("profile-extension").value;
    const streetName = document.getElementById("profile-street-name").value;
    const currentPassword = document.getElementById("profile-current-password").value;
    const newPassword = document.getElementById("profile-password").value;
    const confirmNewPassword = document.getElementById("profile-confirm-password").value;

    try {
      if (avatarState.pending) {
        const pendingAvatarError = new Error(
          "Please wait for the profile photo to finish optimizing."
        );
        pendingAvatarError.field = "avatar";
        throw pendingAvatarError;
      }

      setProfileSaveBusyState(true);
      profileSaveOverlay = showLoadingOverlay({
        label: "Saving profile..."
      });
      const pendingAvatarBlob =
        hasPendingAvatarSelection(avatarState) && avatarState.pendingBlob
          ? avatarState.pendingBlob
          : null;
      const updatedUser = await updateAuthenticatedUserProfile({
        currentUser,
        username,
        phoneNumber,
        province,
        municipality,
        township,
        extension,
        area: extension,
        streetName,
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      Object.assign(currentUser, updatedUser);
      avatarState.savedDataUrl = updatedUser.avatarDataUrl || "";
      if (!pendingAvatarBlob) {
        avatarState.pendingDataUrl = "";
        avatarState.pendingBlob = null;
      }
      syncAvatarPreviewAndInteractivity();

      if (pendingAvatarBlob) {
        try {
          const avatarUser = await uploadAuthenticatedUserAvatar({
            currentUser,
            file: pendingAvatarBlob
          });
          const syncedUser = await syncCurrentUserFromApi();

          Object.assign(currentUser, avatarUser, syncedUser, {
            avatarDataUrl: syncedUser.avatarDataUrl || "",
            avatarUrl: syncedUser.avatarUrl || ""
          });
          avatarState.savedDataUrl = syncedUser.avatarDataUrl || "";
          avatarState.pendingDataUrl = "";
          avatarState.pendingBlob = null;
          profileEditor.avatarUploadFieldController?.syncState("Current photo ready.");
          syncAvatarPreviewAndInteractivity();
        } catch (error) {
          error.message = `${error.message || "Could not upload the profile photo."} Your other profile changes were saved.`;
          throw error;
        }
      }

      showToast("Your profile changes are live.", "success", {
        variant: "updated-success",
        durationMs: 1800
      });
      void navigate("profile");
    } catch (error) {
      handleProfileError(error, {
        switchToTab: profileEditor.switchToTab
      });
    } finally {
      profileSaveOverlay?.close();
      profileSaveOverlay = null;
      setProfileSaveBusyState(false);
    }
  });
}

function createProfileLoadingSkeleton({ activeSection = "home", showEditForm = false } = {}) {
  const fragment = document.createDocumentFragment();
  const summaryCard = createElement("section", {
    className: "profile-card profile-channel-hero profile-loading-card"
  });
  const banner = createElement("div", {
    className: "profile-channel-banner profile-loading-banner feed-skeleton-rect"
  });
  const hero = createElement("div", {
    className: "profile-channel-hero-main profile-loading-hero-main"
  });
  const avatarShell = createElement("div", {
    className: "profile-avatar-preview-shell profile-channel-avatar-shell profile-loading-avatar-shell"
  });
  const avatar = createElement("span", {
    className: "feed-skeleton-circle profile-loading-avatar"
  });
  const copy = createElement("div", {
    className: "profile-channel-copy profile-loading-copy"
  });
  const title = createElement("span", {
    className: "feed-skeleton-block profile-loading-title"
  });
  const handle = createElement("span", {
    className: "feed-skeleton-block profile-loading-handle"
  });
  const meta = createElement("span", {
    className: "feed-skeleton-block profile-loading-meta"
  });
  const descriptionWide = createElement("span", {
    className: "feed-skeleton-block profile-loading-description"
  });
  const descriptionShort = createElement("span", {
    className: "feed-skeleton-block profile-loading-description profile-loading-description-short"
  });
  const actions = createElement("div", {
    className: "profile-channel-actions profile-loading-actions"
  });
  const tabs = createElement("div", {
    className: "profile-channel-tabs profile-loading-tabs"
  });

  for (let index = 0; index < 2; index += 1) {
    actions.appendChild(
      createElement("span", {
        className: "feed-skeleton-chip profile-loading-action-chip"
      })
    );
  }

  for (let index = 0; index < 4; index += 1) {
    tabs.appendChild(
      createElement("span", {
        className: "feed-skeleton-chip profile-loading-tab-chip"
      })
    );
  }

  avatarShell.appendChild(avatar);
  copy.append(title, handle, meta, descriptionWide, descriptionShort, actions);
  hero.append(avatarShell, copy);
  summaryCard.append(banner, hero, tabs);
  fragment.appendChild(summaryCard);

  if (showEditForm || activeSection === "followers" || activeSection === "following") {
    const detailCard = createElement("section", {
      className: "profile-card profile-loading-detail-card"
    });
    const detailTitle = createElement("span", {
      className: "feed-skeleton-block profile-loading-detail-title"
    });
    const detailLineOne = createElement("span", {
      className: "feed-skeleton-block profile-loading-detail-line"
    });
    const detailLineTwo = createElement("span", {
      className: "feed-skeleton-block profile-loading-detail-line profile-loading-detail-line-short"
    });

    detailCard.append(detailTitle, detailLineOne, detailLineTwo);
    fragment.appendChild(detailCard);
  }

  return fragment;
}

function createAvatarUploadField({
  currentUser,
  avatarState,
  avatarPreview,
  form,
  onAvatarStateChange = null
}) {
  const wrapper = createElement("div", {
    className: "field-group avatar-upload-field"
  });
  const label = createElement("label", {
    className: "form-label",
    text: "Profile Photo"
  });
  const controls = createElement("div", {
    className: "avatar-upload-compact-row"
  });
  const triggerBtn = createElement("button", {
    className: "secondary-btn post-image-picker-btn avatar-picker-btn",
    type: "button",
    attributes: {
      "aria-label": "Choose a profile photo",
      title: "Choose a profile photo"
    }
  });
  const status = createElement("p", {
    className: "field-helper image-upload-status avatar-upload-status",
    text: currentUser.avatarDataUrl ? "Current photo ready." : "No photo selected."
  });
  const input = createElement("input", {
    className: "form-input post-image-file-input-hidden",
    id: "profile-avatar",
    type: "file",
    attributes: {
      accept: "image/png,image/jpeg,image/webp"
    }
  });
  const removeBtn = createElement("button", {
    className: "secondary-btn post-image-compact-remove-btn avatar-remove-btn-compact",
    text: "Remove photo",
    type: "button"
  });
  const error = createFieldError("profile-avatar");

  triggerBtn.appendChild(createImagePickerIcon());

  const syncStatus = (text = "") => {
    status.textContent = text;
  };
  const syncState = (statusText = null) => {
    const hasPendingSelection = hasPendingAvatarSelection(avatarState);

    removeBtn.disabled = !hasPendingSelection || avatarState.pending === true;
    removeBtn.hidden = !hasPendingSelection;
    triggerBtn.disabled = avatarState.pending === true;
    triggerBtn.setAttribute("aria-busy", avatarState.pending ? "true" : "false");
    triggerBtn.classList.toggle("post-image-picker-btn-loading", avatarState.pending === true);
    triggerBtn.setAttribute(
      "aria-label",
      avatarState.pending ? "Optimizing profile photo..." : "Choose a profile photo"
    );
    triggerBtn.setAttribute(
      "title",
      avatarState.pending ? "Optimizing profile photo..." : "Choose a profile photo"
    );
    syncStatus(statusText ?? getAvatarUploadStatusText(avatarState));
  };

  triggerBtn.addEventListener("click", () => {
    input.click();
  });

  input.addEventListener("change", async () => {
    clearFormErrors(form);
    let requestToken = 0;

    try {
      const file = input.files?.[0] || null;

      if (!file) {
        return;
      }

      validateAvatarFile(file);
      requestToken = avatarState.requestToken + 1;

      avatarState.requestToken = requestToken;
      avatarState.pending = true;
      syncStatus("Optimizing photo...");
      const optimizedAvatar = await compressImageFile(file, {
        maxBytes: MAX_AVATAR_FILE_BYTES,
        maxWidth: 512,
        maxHeight: 512,
        scaleSteps: PROFILE_AVATAR_SCALE_STEPS,
        qualitySteps: PROFILE_AVATAR_QUALITY_STEPS
      });

      if (avatarState.requestToken !== requestToken) {
        return;
      }

      avatarState.pendingDataUrl = optimizedAvatar.dataUrl;
      avatarState.pendingBlob = optimizedAvatar.blob || null;
      avatarState.pending = false;
      syncState(formatImageOptimizationSummary(optimizedAvatar, "Profile photo"));
      renderAvatarPreview(avatarPreview, {
        username: document.getElementById("profile-username")?.value || currentUser.username,
        avatarDataUrl: getActiveAvatarDataUrl(avatarState)
      });
      onAvatarStateChange?.();
    } catch (errorObj) {
      if (requestToken && avatarState.requestToken !== requestToken) {
        return;
      }

      avatarState.pending = false;
      input.value = "";
      avatarState.pendingBlob = null;
      syncState();
      setFieldError("profile-avatar", errorObj.message || "Could not use that image.");
      onAvatarStateChange?.();
    }
  });

  removeBtn.addEventListener("click", () => {
    if (!hasPendingAvatarSelection(avatarState)) {
      return;
    }

    avatarState.requestToken += 1;
    avatarState.pending = false;
    input.value = "";
    avatarState.pendingDataUrl = "";
    avatarState.pendingBlob = null;
    syncState("Selected photo removed.");
    renderAvatarPreview(avatarPreview, {
      username: document.getElementById("profile-username")?.value || currentUser.username,
      avatarDataUrl: getActiveAvatarDataUrl(avatarState)
    });
    onAvatarStateChange?.();
  });

  controls.append(triggerBtn, removeBtn);
  wrapper.append(label, input, controls, status, error);

  syncState();

  return {
    wrapper,
    syncState
  };
}

function createImagePickerIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("post-image-picker-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute(
    "d",
    "M5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9A1.5 1.5 0 0 1 5.5 6Zm2.75 2.75h.01M6.75 15.75l3.05-3.05a1 1 0 0 1 1.41 0l1.74 1.74a1 1 0 0 0 1.41 0l2.64-2.64"
  );

  svg.appendChild(path);
  return svg;
}

function createPhoneVerificationField({
  currentUser,
  form,
  getPendingPhoneNumber
}) {
  const wrapper = createElement("div", {
    className: "field-group profile-phone-verification-field"
  });
  const header = createElement("div", {
    className: "profile-edit-panel-copy profile-phone-verification-copy"
  });
  const title = createElement("h3", {
    className: "profile-edit-panel-title",
    text: "Phone verification"
  });
  const status = createElement("p", {
    className: "profile-edit-panel-text",
    text: ""
  });
  const codeRow = createElement("div", {
    className: "profile-phone-verification-row"
  });
  const codeLabel = createElement("label", {
    className: "form-label",
    text: "Verification code"
  });
  const codeInput = createElement("input", {
    className: "form-input",
    id: "profile-phone-otp",
    type: "text",
    placeholder: "Enter the SMS code",
    required: false,
    autocomplete: "one-time-code",
    attributes: {
      inputmode: "numeric",
      maxlength: "8"
    }
  });
  const actions = createElement("div", {
    className: "form-actions profile-phone-verification-actions"
  });
  const sendBtn = createElement("button", {
    className: "secondary-btn",
    type: "button",
    text: "Send code"
  });
  const verifyBtn = createElement("button", {
    className: "primary-btn",
    type: "button",
    text: "Verify phone"
  });
  const error = createFieldError("profile-phone-otp");

  let otpState = null;
  let sending = false;
  let verifying = false;
  let countdownIntervalId = null;

  const clearCountdown = () => {
    if (countdownIntervalId) {
      window.clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  };

  const formatCountdown = (targetIsoDate) => {
    const remainingMs = new Date(targetIsoDate).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  };

  const formatDateTime = (isoDate) => {
    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
      return "soon";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  const syncUi = () => {
    const savedPhoneNumber = String(currentUser.phoneNumber || "").trim();
    const pendingPhoneNumber =
      typeof getPendingPhoneNumber === "function"
        ? String(getPendingPhoneNumber() || "").trim()
        : savedPhoneNumber;
    const phoneChanged = pendingPhoneNumber !== savedPhoneNumber;
    const phoneVerified = currentUser.phoneVerified === true && !phoneChanged;
    const hasSavedPhone = Boolean(savedPhoneNumber);
    const cooldownActive = Boolean(
      otpState?.cooldownUntil &&
        new Date(otpState.cooldownUntil).getTime() > Date.now()
    );

    clearCountdown();

    if (phoneChanged) {
      status.textContent = "Save your updated phone number before requesting a verification code.";
    } else if (!hasSavedPhone) {
      status.textContent = "Add a phone number first, then save your profile to verify it.";
    } else if (phoneVerified) {
      status.textContent = `This number is already verified: ${savedPhoneNumber}.`;
    } else if (otpState?.expiresAt) {
      status.textContent = cooldownActive
        ? `Code sent to ${savedPhoneNumber}. It expires ${formatDateTime(otpState.expiresAt)}. You can resend in ${formatCountdown(
            otpState.cooldownUntil
          )}.`
        : `Code sent to ${savedPhoneNumber}. It expires ${formatDateTime(otpState.expiresAt)}.`;
    } else {
      status.textContent = `Send a code to verify ${savedPhoneNumber}.`;
    }

    if (cooldownActive) {
      countdownIntervalId = window.setInterval(() => {
        syncUi();
      }, 1000);
    }

    codeRow.style.display = phoneVerified ? "none" : "";
    actions.style.display = phoneVerified ? "none" : "";
    sendBtn.disabled = sending || verifying || phoneChanged || !hasSavedPhone || cooldownActive;
    verifyBtn.disabled =
      sending ||
      verifying ||
      phoneChanged ||
      !hasSavedPhone ||
      !otpState?.expiresAt ||
      !codeInput.value.trim();

    sendBtn.textContent = sending
      ? "Sending..."
      : cooldownActive
        ? `Resend in ${formatCountdown(otpState.cooldownUntil)}`
        : otpState?.expiresAt
          ? "Resend code"
          : "Send code";
    verifyBtn.textContent = verifying ? "Verifying..." : "Verify phone";
  };

  sendBtn.addEventListener("click", async () => {
    error.textContent = "";
    sending = true;
    syncUi();

    try {
      const response = await requestPhoneVerificationOtp();
      otpState = {
        expiresAt: response.expiresAt || null,
        cooldownUntil: response.cooldownUntil || null
      };
      codeInput.value = "";
      showToast("Verification code sent.", "success");
      syncUi();
      codeInput.focus({ preventScroll: true });
    } catch (errorObj) {
      error.textContent = errorObj.message || "Could not send verification code.";

      if (errorObj?.details?.cooldownUntil) {
        otpState = {
          expiresAt: errorObj.details.expiresAt || otpState?.expiresAt || null,
          cooldownUntil: errorObj.details.cooldownUntil
        };
      }
    } finally {
      sending = false;
      syncUi();
    }
  });

  verifyBtn.addEventListener("click", async () => {
    error.textContent = "";
    verifying = true;
    syncUi();

    try {
      const updatedUser = await verifyAuthenticatedUserPhoneOtp({
        code: codeInput.value
      });

      Object.assign(currentUser, updatedUser);
      currentUser.phoneVerified = updatedUser.phoneVerified === true;
      otpState = null;
      codeInput.value = "";
      showToast("Phone number verified.", "success");
    } catch (errorObj) {
      error.textContent = errorObj.message || "Could not verify the code.";
    } finally {
      verifying = false;
      syncUi();
    }
  });

  codeInput.addEventListener("input", () => {
    error.textContent = "";
    syncUi();
  });

  registerViewCleanup(() => {
    clearCountdown();
  });

  header.append(title, status);
  codeLabel.appendChild(codeInput);
  codeRow.appendChild(codeLabel);
  actions.append(sendBtn, verifyBtn);
  wrapper.append(header, codeRow, actions, error);
  syncUi();

  return {
    wrapper,
    syncState: syncUi
  };
}

function renderAvatarPreview(container, userLike) {
  if (!container) {
    return;
  }

  container.replaceChildren(
    createAvatarElement(userLike, {
      size: "xl",
      className: "profile-avatar-display"
    })
  );
}

function getActiveAvatarDataUrl(avatarState) {
  if (!avatarState) {
    return "";
  }

  return String(avatarState.pendingDataUrl || avatarState.savedDataUrl || "").trim();
}

function hasPendingAvatarSelection(avatarState) {
  if (!avatarState) {
    return false;
  }

  return Boolean(String(avatarState.pendingDataUrl || "").trim());
}

function getAvatarUploadStatusText(avatarState) {
  if (hasPendingAvatarSelection(avatarState)) {
    return "Selected photo ready.";
  }

  return avatarState?.savedDataUrl ? "Current photo ready." : "No photo selected.";
}

function showProfilePhotoViewer({ imageUrl = "", username = "", onDelete = null } = {}) {
  const normalizedImageUrl = String(imageUrl || "").trim();

  if (!normalizedImageUrl) {
    return () => {};
  }

  document.body.classList.remove("profile-photo-viewer-open");
  document.getElementById("profile-photo-viewer-root")?.remove();
  document.body.classList.add("profile-photo-viewer-open");

  const root = createElement("div", {
    className: "profile-photo-viewer-root",
    attributes: {
      id: "profile-photo-viewer-root"
    }
  });
  const overlay = createElement("button", {
    className: "profile-photo-viewer-overlay",
    type: "button",
    attributes: {
      "aria-label": "Close profile photo"
    }
  });
  const container = createElement("div", {
    className: "profile-photo-viewer-container"
  });
  const card = createElement("section", {
    className: "profile-photo-viewer-card",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": username ? `${username}'s profile photo` : "Profile photo"
    }
  });
  const closeBtn = createElement("button", {
    className: "profile-photo-viewer-close-btn",
    type: "button",
    attributes: {
      "aria-label": "Close profile photo"
    }
  });
  const frame = createElement("div", {
    className: "profile-photo-viewer-frame"
  });
  protectMediaShell(frame);
  const image = document.createElement("img");
  image.className = "profile-photo-viewer-image";
  image.src = normalizedImageUrl;
  image.alt = username ? `${username}'s profile photo` : "Profile photo";
  image.decoding = "async";
  protectImageElement(image);
  const deleteBtn = createElement("button", {
    className: "profile-photo-viewer-delete-btn",
    type: "button",
    attributes: {
      "aria-label": "Delete current profile photo",
      title: "Delete current profile photo"
    }
  });

  closeBtn.appendChild(createViewerIcon("close"));
  deleteBtn.appendChild(createViewerIcon("trash"));
  frame.append(image, deleteBtn);
  card.append(closeBtn, frame);
  container.appendChild(card);
  root.append(overlay, container);

  let closed = false;
  let deleting = false;

  const closeViewer = () => {
    if (closed) {
      return;
    }

    closed = true;
    document.body.classList.remove("profile-photo-viewer-open");
    document.removeEventListener("keydown", handleKeyDown);
    root.remove();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeViewer();
    }
  };

  overlay.addEventListener("click", closeViewer);
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      closeViewer();
    }
  });
  closeBtn.addEventListener("click", closeViewer);
  card.addEventListener("click", (event) => {
    if (event.target.closest(".profile-photo-viewer-delete-btn")) {
      return;
    }

    closeViewer();
  });
  deleteBtn.addEventListener("click", async (event) => {
    event.stopPropagation();

    if (deleting || typeof onDelete !== "function") {
      return;
    }

    deleting = true;
    deleteBtn.disabled = true;
    closeBtn.disabled = true;

    try {
      const shouldClose = await onDelete();

      if (shouldClose !== false) {
        closeViewer();
      }
    } finally {
      deleting = false;

      if (!closed) {
        deleteBtn.disabled = false;
        closeBtn.disabled = false;
      }
    }
  });

  document.addEventListener("keydown", handleKeyDown);
  document.body.appendChild(root);

  return closeViewer;
}

function createViewerIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("profile-photo-viewer-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-width", "1.9");
  path.setAttribute(
    "d",
    name === "trash"
      ? "M4 7h16m-11 0V5.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7m-8.5 0 .8 11.1c.05.72.65 1.27 1.37 1.27h6.06c.72 0 1.32-.55 1.37-1.27L17 7M10 10.5v5.5M14 10.5v5.5"
      : "M6 6l12 12M18 6 6 18"
  );

  svg.appendChild(path);
  return svg;
}

async function shareAppInvite(currentUser) {
  const username = currentUser?.username ? `@${currentUser.username}` : "me";
  const township = currentUser?.location?.township?.trim?.() || "";
  const extension =
    currentUser?.location?.area?.trim?.() || currentUser?.location?.extension?.trim?.() || "";
  const locationText = [township, extension].filter(Boolean).join(" ");
  const appUrl = getShareableAppUrl();
  const shareText = [
    `Hi, I'm using yahneh as ${username}.`,
    `Join me on the app for local updates, posts, replies, and voice notes${locationText ? ` around ${locationText}` : ""}.`
  ].join(" ");
  const shareMessage = buildShareClipboardText(shareText, appUrl);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const shareData = await buildBrandedShareData({
        title: "Join me on yahneh",
        text: shareMessage
      });
      await navigator.share(shareData);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareMessage);
      showToast("Invite copied to clipboard.", "success");
      return;
    }

    throw new Error("Sharing is not available on this device.");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    showToast(error.message || "Could not share invite.", "error");
  }
}
function createChannelTab(label, options = {}) {
  const button = createElement("button", {
    className: `profile-channel-tab${options.active ? " profile-channel-tab-active" : ""}`,
    text: label,
    type: "button"
  });

  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }

  return button;
}

function createPeoplePanel({ currentUser, section, users = [] }) {
  const panel = createElement("section", {
    className: "profile-card profile-people-panel"
  });
  const title = createElement("h3", {
    className: "profile-people-title",
    text: section === "followers" ? "Followers" : "Following"
  });
  const hint = createElement("p", {
    className: "profile-people-hint",
    text:
      users.length > 0
        ? "Tap a person to open their profile."
        : `No ${section} yet.`
  });
  const scroller = createElement("div", {
    className: "profile-people-scroller"
  });

  if (users.length === 0) {
    panel.append(
      title,
      hint,
      createElement("p", {
        className: "profile-people-empty",
        text:
          section === "followers"
            ? `${currentUser.username} has no followers yet.`
            : `${currentUser.username} is not following anyone yet.`
      })
    );
    return panel;
  }

  users.forEach((user) => {
    const personBtn = createElement("button", {
      className: "profile-people-card",
      type: "button",
      attributes: {
        "aria-label": `Open ${user.username}'s profile`,
        title: user.username
      }
    });
    const avatar = createAvatarElement(user, {
      size: "md",
      className: "profile-people-avatar",
      decorative: true
    });
    const name = createElement("span", {
      className: "profile-people-name",
      text: shortenUsername(user.username)
    });

    personBtn.append(avatar, name);
    personBtn.addEventListener("click", () => {
      showUserPreviewSheet({
        userId: user.id,
        currentUserId: currentUser.id
      });
    });
    scroller.appendChild(personBtn);
  });

  panel.append(title, hint, scroller);
  return panel;
}

function createProfileEditForm({
  currentUser,
  avatarState,
  avatarPreview,
  onAvatarStateChange = null
}) {
  const formCard = createElement("section", {
    className: "profile-card profile-form-card profile-edit-card"
  });
  const formHeader = createElement("div", {
    className: "section-header profile-edit-header"
  });
  const formEyebrow = createElement("p", {
    className: "section-eyebrow",
    text: "Edit profile"
  });
  const formTitle = createElement("h2", {
    className: "section-title",
    text: "Update your account"
  });
  const formText = createElement("p", {
    className: "section-copy profile-edit-copy",
    text: "Switch between tabs to update personal info, login details, and your location without one long form."
  });
  const tabList = createElement("div", {
    className: "profile-edit-tabs",
    attributes: {
      role: "tablist",
      "aria-label": "Edit profile sections"
    }
  });
  const form = createElement("form", {
    className: "auth-form profile-form profile-edit-form",
    id: "profile-form"
  });

  formHeader.append(formEyebrow, formTitle, formText);

  const personalPanel = createElement("section", {
    className: "profile-edit-panel profile-edit-panel-active",
    attributes: {
      role: "tabpanel",
      id: "profile-tab-panel-personal"
    }
  });
  const personalIntro = createElement("div", { className: "profile-edit-panel-copy" });
  personalIntro.append(
    createElement("h3", {
      className: "profile-edit-panel-title",
      text: "Personal info"
    }),
    createElement("p", {
      className: "profile-edit-panel-text",
      text: "Keep your public details current so people recognize you across posts, comments, and replies."
    })
  );
  const avatarUploadField = createAvatarUploadField({
    currentUser,
    avatarState,
    avatarPreview,
    form,
    onAvatarStateChange
  });
  const usernameField = createField({
    labelText: "Username",
    inputId: "profile-username",
    type: "text",
    placeholder: "Enter username",
    value: currentUser.username,
    autocomplete: "username",
    helperText: "3-30 characters. Can include emoji. Maximum 3 spaces."
  });
  const phoneField = createField({
    labelText: "Phone Number",
    inputId: "profile-phone",
    type: "tel",
    placeholder: "e.g. 071 234 5678",
    value: currentUser.phoneNumber || "",
    autocomplete: "tel",
    required: false,
    helperText: "Optional. Use numbers, spaces, +, or hyphens.",
    attributes: {
      inputmode: "tel"
    }
  });
  const phoneVerificationField = createPhoneVerificationField({
    currentUser,
    form,
    getPendingPhoneNumber: () => phoneField.querySelector("input")?.value || ""
  });
  phoneField
    .querySelector("input")
    ?.addEventListener("input", phoneVerificationField.syncState);
  personalPanel.append(
    personalIntro,
    avatarUploadField.wrapper,
    usernameField,
    phoneField,
    phoneVerificationField.wrapper
  );

  const credentialsPanel = createElement("section", {
    className: "profile-edit-panel",
    attributes: {
      role: "tabpanel",
      id: "profile-tab-panel-credentials",
      hidden: "hidden"
    }
  });
  const credentialsIntro = createElement("div", {
    className: "profile-edit-panel-copy"
  });
  credentialsIntro.append(
    createElement("h3", {
      className: "profile-edit-panel-title",
      text: "Login credentials"
    }),
    createElement("p", {
      className: "profile-edit-panel-text",
      text: "Only fill in these fields when you want to change your password."
    })
  );
  const currentPasswordField = createField({
    labelText: "Current Password",
    inputId: "profile-current-password",
    type: "password",
    value: "",
    placeholder: "Required only when changing password",
    autocomplete: "current-password",
    required: false,
    helperText: "Enter your current password before setting a new one."
  });
  const newPasswordField = createField({
    labelText: "New Password",
    inputId: "profile-password",
    type: "password",
    value: "",
    placeholder: "Leave blank to keep current password",
    autocomplete: "new-password",
    required: false,
    helperText: "Optional. If used, must meet password rules."
  });
  const confirmNewPasswordField = createField({
    labelText: "Confirm New Password",
    inputId: "profile-confirm-password",
    type: "password",
    value: "",
    placeholder: "Confirm new password",
    autocomplete: "new-password",
    required: false,
    helperText: "Only required when setting a new password."
  });
  credentialsPanel.append(
    credentialsIntro,
    currentPasswordField,
    newPasswordField,
    confirmNewPasswordField
  );

  const locationPanel = createElement("section", {
    className: "profile-edit-panel",
    attributes: {
      role: "tabpanel",
      id: "profile-tab-panel-location",
      hidden: "hidden"
    }
  });
  const locationIntro = createElement("div", { className: "profile-edit-panel-copy" });
  locationIntro.append(
    createElement("h3", {
      className: "profile-edit-panel-title",
      text: "Location"
    }),
    createElement("p", {
      className: "profile-edit-panel-text",
      text: "Set the township area attached to your posts. Keep it useful, but do not share an exact home address."
    })
  );
  const townshipField = createField({
    labelText: "Township",
    inputId: "profile-township",
    type: "text",
    placeholder: "e.g. Tembisa",
    value: currentUser.location.township,
    autocomplete: "address-level2",
    helperText: "Township is text only."
  });
  const extensionField = createField({
    labelText: "Extension / section / area",
    inputId: "profile-extension",
    type: "text",
    placeholder: "e.g. Ext 2, Zone 4, Section B",
    value: currentUser.location.area || currentUser.location.extension,
    autocomplete: "off",
    helperText: "Keep it general. Do not add a house number."
  });
  const provinceField = createField({
    labelText: "Province",
    inputId: "profile-province",
    type: "text",
    placeholder: "e.g. Gauteng",
    value: currentUser.location.province || "",
    autocomplete: "address-level1",
    helperText: "Province helps yahneh show nearby updates."
  });
  const municipalityField = createField({
    labelText: "Municipality or city/town",
    inputId: "profile-municipality",
    type: "text",
    placeholder: "e.g. Ekurhuleni",
    value: currentUser.location.municipality || "",
    autocomplete: "address-level2",
    required: false,
    helperText: "Optional, but useful for nearby feeds."
  });
  const streetField = createField({
    labelText: "Street name (optional)",
    inputId: "profile-street-name",
    type: "text",
    placeholder: "Street name only",
    value: currentUser.location.streetName || "",
    autocomplete: "address-line1",
    required: false,
    helperText: "Never add your exact house number publicly."
  });
  locationPanel.append(
    locationIntro,
    provinceField,
    municipalityField,
    townshipField,
    extensionField,
    streetField
  );

  const tabs = [
    {
      key: "personal",
      label: "Personal info",
      button: createProfileEditTab("Personal info", {
        key: "personal",
        active: true,
        controlsId: "profile-tab-panel-personal"
      }),
      panel: personalPanel
    },
    {
      key: "location",
      label: "Location",
      button: createProfileEditTab("Location", {
        key: "location",
        controlsId: "profile-tab-panel-location"
      }),
      panel: locationPanel
    },
    {
      key: "credentials",
      label: "Login credentials",
      button: createProfileEditTab("Login credentials", {
        key: "credentials",
        controlsId: "profile-tab-panel-credentials"
      }),
      panel: credentialsPanel
    }
  ];

  const switchToTab = (tabKey) => {
    tabs.forEach((tab) => {
      const isActive = tab.key === tabKey;
      tab.button.classList.toggle("profile-edit-tab-active", isActive);
      tab.button.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.button.tabIndex = isActive ? 0 : -1;
      tab.panel.classList.toggle("profile-edit-panel-active", isActive);
      if (isActive) {
        tab.panel.removeAttribute("hidden");
      } else {
        tab.panel.setAttribute("hidden", "hidden");
      }
    });
  };

  tabs.forEach((tab) => {
    tab.button.addEventListener("click", () => switchToTab(tab.key));
    tabList.appendChild(tab.button);
  });

  const actions = createElement("div", {
    className: "form-actions profile-edit-actions"
  });
  const cancelBtn = createElement("button", {
    className: "secondary-btn",
    text: "Cancel",
    type: "button"
  });
    const submitBtn = createElement("button", {
      className: "primary-btn",
      text: "Save",
      type: "submit"
    });

  cancelBtn.addEventListener("click", () => navigate("profile"));
  actions.append(cancelBtn, submitBtn);

  form.append(tabList, personalPanel, credentialsPanel, locationPanel, actions);
  formCard.append(formHeader, form);

  return {
    formCard,
    form,
    switchToTab,
    submitBtn,
    avatarUploadFieldController: avatarUploadField
  };
}

function createField({
  labelText,
  inputId,
  type,
  placeholder,
  value,
  autocomplete,
  helperText = "",
  required = true,
  attributes = {}
}) {
  const wrapper = createElement("div", { className: "field-group" });
  const label = createElement("label", {
    className: "form-label",
    text: labelText
  });
  const input = createElement("input", {
    className: "form-input",
    id: inputId,
    type,
    placeholder,
    required,
    autocomplete,
    attributes
  });

  input.value = value;

  const helper = createElement("p", {
    className: "field-helper",
    text: helperText
  });
  const error = createFieldError(inputId);

  label.appendChild(input);
  wrapper.append(label, helper, error);

  return wrapper;
}

function createProfileEditTab(label, options = {}) {
  return createElement("button", {
    className: `profile-edit-tab${options.active ? " profile-edit-tab-active" : ""}`,
    text: label,
    type: "button",
    attributes: {
      role: "tab",
      "aria-selected": options.active ? "true" : "false",
      "aria-controls": options.controlsId || "",
      "data-tab-key": options.key || ""
    }
  });
}

function formatJoinDate(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
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

function handleProfileError(error, options = {}) {
  const fieldMap = {
    username: "profile-username",
    phoneNumber: "profile-phone",
    township: "profile-township",
    extension: "profile-extension",
    province: "profile-province",
    municipality: "profile-municipality",
    area: "profile-extension",
    streetName: "profile-street-name",
    avatar: "profile-avatar",
    avatarUrl: "profile-avatar",
    currentPassword: "profile-current-password",
    password: "profile-password",
    confirmPassword: "profile-confirm-password"
  };
  const tabMap = {
    username: "personal",
    phoneNumber: "personal",
    avatar: "personal",
    avatarUrl: "personal",
    currentPassword: "credentials",
    password: "credentials",
    confirmPassword: "credentials",
    township: "location",
    extension: "location"
  };

  if (error?.field && fieldMap[error.field]) {
    if (typeof options.switchToTab === "function" && tabMap[error.field]) {
      options.switchToTab(tabMap[error.field]);
    }
    setFieldError(fieldMap[error.field], error.message);
    if (error.code === "USERNAME_EXISTS" || error.code === "CURRENT_PASSWORD_INVALID") {
      showToast(error.message, "error");
    }
    return;
  }

  showToast(error?.message || "Failed to update profile.", "error");
}
