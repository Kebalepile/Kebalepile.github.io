const existingBoitekongPulseConfig =
  typeof window.BOITEKONG_PULSE_CONFIG === "object" && window.BOITEKONG_PULSE_CONFIG !== null
    ? window.BOITEKONG_PULSE_CONFIG
    : {};

window.BOITEKONG_PULSE_CONFIG = {
  ...existingBoitekongPulseConfig,
  API_BASE_URL:
     typeof existingBoitekongPulseConfig.API_BASE_URL === "string"
      ? existingBoitekongPulseConfig.API_BASE_URL
      : "https://boitekong-pulse.onrender.com/api"
};
