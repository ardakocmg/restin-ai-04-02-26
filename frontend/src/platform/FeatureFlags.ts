// @ts-nocheck
// Feature Flags - Admin-Controllable Configuration
class FeatureFlags {
  static FLAGS = {
    SAFE_MODE_ENABLED: true,
    AUTO_RETRY_SEND: true,
    MAX_SEND_RETRY: 3,
    OFFLINE_QUEUE_ENABLED: true,
    OFFLINE_REPLAY_ENABLED: true,
    UNIT_ENGINE_STRICT: true,
    BLOCK_COST_IF_UNIT_UNRESOLVED: true,
    PRINTING_ENABLED: true,
    KDS_POLL_INTERVAL_SEC: 10,
    AUTO_SUGGEST_UNIT_OVERRIDES: false,
    INCIDENT_AUTO_DETECTION: true,
    TOKEN_REFRESH_ENABLED: true,
    VOICE_NOTES_ENABLED: true
  };

  static get(flagName) {
    // Check localStorage override first (for testing)
    const override = localStorage.getItem(`flag_${flagName}`);
    if (override !== null) {
      return override === 'true';
    }
    
    return this.FLAGS[flagName] !== undefined ? this.FLAGS[flagName] : false;
  }

  static set(flagName, value) {
    localStorage.setItem(`flag_${flagName}`, String(value));
  }

  static reset(flagName) {
    localStorage.removeItem(`flag_${flagName}`);
  }

  static getAll() {
    const flags = {};
    for (const [name, defaultValue] of Object.entries(this.FLAGS)) {
      flags[name] = this.get(name);
    }
    return flags;
  }
}

export default FeatureFlags;
