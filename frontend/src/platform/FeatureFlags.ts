// Feature Flags - Admin-Controllable Configuration

interface FlagMap {
  SAFE_MODE_ENABLED: boolean;
  AUTO_RETRY_SEND: boolean;
  MAX_SEND_RETRY: number;
  OFFLINE_QUEUE_ENABLED: boolean;
  OFFLINE_REPLAY_ENABLED: boolean;
  UNIT_ENGINE_STRICT: boolean;
  BLOCK_COST_IF_UNIT_UNRESOLVED: boolean;
  PRINTING_ENABLED: boolean;
  KDS_POLL_INTERVAL_SEC: number;
  AUTO_SUGGEST_UNIT_OVERRIDES: boolean;
  INCIDENT_AUTO_DETECTION: boolean;
  TOKEN_REFRESH_ENABLED: boolean;
  VOICE_NOTES_ENABLED: boolean;
  [key: string]: boolean | number;
}

class FeatureFlags {
  static FLAGS: FlagMap = {
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

  static get(flagName: string): boolean | number {
    // Check localStorage override first (for testing)
    const override = localStorage.getItem(`flag_${flagName}`);
    if (override !== null) {
      return override === 'true';
    }

    return this.FLAGS[flagName] !== undefined ? this.FLAGS[flagName] : false;
  }

  static set(flagName: string, value: boolean | number): void {
    localStorage.setItem(`flag_${flagName}`, String(value));
  }

  static reset(flagName: string): void {
    localStorage.removeItem(`flag_${flagName}`);
  }

  static getAll(): Record<string, boolean | number> {
    const flags: Record<string, boolean | number> = {};
    for (const [name] of Object.entries(this.FLAGS)) {
      flags[name] = this.get(name);
    }
    return flags;
  }
}

export default FeatureFlags;
