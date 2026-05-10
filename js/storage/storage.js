const isObject = (value) => value !== null && typeof value === "object";

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.error(`Failed to read storage key: ${key}`, error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to write storage key: ${key}`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove storage key: ${key}`, error);
      return false;
    }
  },

  clearAll() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Failed to clear localStorage", error);
      return false;
    }
  },

  update(key, updater, fallback = null) {
    const currentValue = this.get(key, fallback);
    const nextValue = updater(currentValue);

    if (typeof nextValue === "undefined") {
      throw new Error(`Updater for key "${key}" must return a value.`);
    }

    this.set(key, nextValue);
    return nextValue;
  }
};