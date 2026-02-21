/**
 * Gamification Engine — XP & Level System
 * Rule #38: Staff Leaderboards, Quests, and Daily Goals
 */

// XP Configuration Table
const XP_TABLE = {
    SALE_MULTIPLIER: 0.1,   // 10% of sale value (cents) → XP
    TASK_COMPLETE: 50,       // Fixed XP per task
    SHIFT_ON_TIME: 100,      // Bonus for on-time clock-in
    FIVE_STAR_REVIEW: 200,   // Customer review bonus
    UPSELL_BONUS: 75,        // Successful upsell
} as const;

// Level thresholds: Level N requires 1000 * N^1.5 XP
const LEVEL_FORMULA = (level: number): number => Math.floor(1000 * Math.pow(level, 1.5));

export interface StaffProfile {
    id: string;
    name: string;
    currentXP: number;
    level: number;
    avatar?: string;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    progress: number;
    goal: number;
    rewardXP: number;
    icon: string;
    expiresAt?: string;
}

export type EventType = 'SALE' | 'TASK' | 'SHIFT' | 'REVIEW' | 'UPSELL';

export interface XPResult {
    newXP: number;
    xpGained: number;
    leveledUp: boolean;
    newLevel: number;
}

/**
 * Calculate XP gained from an event
 */
export function calculateXP(eventType: EventType, value: number = 0): number {
    switch (eventType) {
        case 'SALE': return Math.floor(value * XP_TABLE.SALE_MULTIPLIER);
        case 'TASK': return XP_TABLE.TASK_COMPLETE;
        case 'SHIFT': return XP_TABLE.SHIFT_ON_TIME;
        case 'REVIEW': return XP_TABLE.FIVE_STAR_REVIEW;
        case 'UPSELL': return XP_TABLE.UPSELL_BONUS;
        default: return 0;
    }
}

/**
 * Check if a level-up occurs
 */
export function checkLevelUp(currentXP: number, currentLevel: number): boolean {
    return currentXP >= LEVEL_FORMULA(currentLevel);
}

/**
 * Process a gamification event and return updated state
 */
export function processEvent(
    eventType: EventType,
    profile: StaffProfile,
    value: number = 0
): XPResult {
    const xpGained = calculateXP(eventType, value);
    const newXP = profile.currentXP + xpGained;
    const leveledUp = checkLevelUp(newXP, profile.level);
    const newLevel = leveledUp ? profile.level + 1 : profile.level;

    return { newXP, xpGained, leveledUp, newLevel };
}

/**
 * Get XP needed for next level
 */
export function xpForNextLevel(currentLevel: number): number {
    return LEVEL_FORMULA(currentLevel);
}

/**
 * Get XP progress percentage toward next level
 */
export function levelProgress(currentXP: number, currentLevel: number): number {
    const prevThreshold = currentLevel > 1 ? LEVEL_FORMULA(currentLevel - 1) : 0;
    const nextThreshold = LEVEL_FORMULA(currentLevel);
    const range = nextThreshold - prevThreshold;
    if (range <= 0) return 100;
    return Math.min(100, Math.floor(((currentXP - prevThreshold) / range) * 100));
}

/**
 * Level title mapping
 */
export function getLevelTitle(level: number): string {
    if (level <= 2) return 'Rookie';
    if (level <= 5) return 'Apprentice';
    if (level <= 10) return 'Veteran';
    if (level <= 20) return 'Expert';
    if (level <= 50) return 'Master';
    return 'Legend';
}
