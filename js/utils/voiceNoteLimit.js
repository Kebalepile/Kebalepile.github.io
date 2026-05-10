const FALLBACK_DAILY_VOICE_NOTE_LIMIT = 5;

export function isVoiceNoteDailyLimitError(error) {
  return error?.code === "VOICE_NOTE_DAILY_LIMIT_REACHED";
}

export function getVoiceNoteDailyLimitMessage(error) {
  if (!isVoiceNoteDailyLimitError(error)) {
    return error?.message || "Voice note usage is currently limited. Try again tomorrow.";
  }

  const rawLimit = error?.details?.limit;
  const limit = Number.isFinite(rawLimit) ? rawLimit : FALLBACK_DAILY_VOICE_NOTE_LIMIT;

  return `Voice note usage is currently limited. You have used up your daily ${limit} voice notes. Try again tomorrow.`;
}
