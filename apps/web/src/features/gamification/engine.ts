// Rule #38: Gamification (XP & Levels)

interface StaffProfile {
    id: string;
    currentXP: number;
    level: number;
}

// XP Config
const XP_TABLE = {
    SALE_MULTIPLIER: 0.1, // 10% of Sale Value (Cents) -> XP
    TASK_COMPLETE: 50,    // Fixed
    SHIFT_ON_TIME: 100,
};

export class GamificationService {

    /**
     * Calculates XP Gained from a Sale.
     */
    calculateSaleXP(billAmountCents: number): number {
        return Math.floor(billAmountCents * XP_TABLE.SALE_MULTIPLIER);
    }

    /**
     * Checks if a user leveled up.
     * Formula: Level N requires 1000 * N^1.5 XP
     */
    checkLevelUp(currentXP: number, currentLevel: number): boolean {
        const nextLevelThreshold = Math.floor(1000 * Math.pow(currentLevel, 1.5));
        return currentXP >= nextLevelThreshold;
    }

    /**
     * Process Event and Return Updates
     */
    processEvent(
        eventType: 'SALE' | 'TASK' | 'SHIFT',
        profile: StaffProfile,
        value: number = 0
    ): { newXP: number; leveledUp: boolean; xpGained: number } {
        let xpGained = 0;

        switch (eventType) {
            case 'SALE':
                xpGained = this.calculateSaleXP(value);
                break;
            case 'TASK':
                xpGained = XP_TABLE.TASK_COMPLETE;
                break;
            case 'SHIFT':
                xpGained = XP_TABLE.SHIFT_ON_TIME;
                break;
        }

        const newXP = profile.currentXP + xpGained;
        const leveledUp = this.checkLevelUp(newXP, profile.level);

        // In real app, we'd emit an event / sound effect trigger here
        if (leveledUp) {
            console.log(`[GAME] LEVEL UP! User ${profile.id} reached Lvl ${profile.level + 1}`);
        }

        return { newXP, leveledUp, xpGained };
    }
}

export const gamification = new GamificationService();
