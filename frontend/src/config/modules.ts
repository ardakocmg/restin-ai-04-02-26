/**
 * RESTIN.AI MASTER CONFIG (Protocol v18.0)
 * 
 * Central feature registry and module flags.
 * Corresponds to the schema `ModuleConfig` logic.
 */

export const MODULES = {
    // PILLAR 0: COMMERCIAL
    COMMERCIAL: {
        id: 'commercial',
        name: 'Commercial Engine',
        enabled: true
    },

    // PILLAR 2: WEB
    WEB_BUILDER: {
        id: 'web',
        name: 'Website Builder',
        enabled: true,
        route: '/restin/web'
    },

    // PILLAR 4: VOICE
    VOICE_AI: {
        id: 'voice',
        name: 'Voice AI Receptionist',
        enabled: true,
        route: '/restin/voice'
    },

    // PILLAR 5: STUDIO
    STUDIO: {
        id: 'studio',
        name: 'Content Studio',
        enabled: true,
        route: '/restin/studio'
    },

    // PILLAR 6: RADAR
    RADAR: {
        id: 'radar',
        name: 'Market Radar',
        enabled: true,
        route: '/restin/radar'
    }
};

export const FEATURES = {
    USE_GOOGLE_AI: true,
    USE_OFFLINE_SYNC: true,
    USE_NEW_SIDEBAR: true
};

export default { MODULES, FEATURES };
