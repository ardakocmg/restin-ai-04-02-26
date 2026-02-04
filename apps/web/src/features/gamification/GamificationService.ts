// Rule #38: Gamification - Staff Leaderboards & Quests

export const GamificationService = {
    awardXP: async (userId: string, amount: number, reason: string) => {
        console.log(`[GAME] Awarded ${amount} XP to ${userId} for ${reason}`);
        // DB call to increment User.xp
        return true;
    },

    getLeaderboard: async (organizationId: string) => {
        return [
            { userId: 'u1', name: 'Maria', xp: 1500, rank: 1 },
            { userId: 'u2', name: 'John', xp: 1200, rank: 2 },
        ];
    },

    getActiveQuests: async (userId: string) => {
        return [
            { id: 'q1', title: 'Sell 10 Coffees', progress: 5, goal: 10, reward: 100 },
            { id: 'q2', title: 'Perfect Shift', progress: 1, goal: 1, reward: 500 },
        ];
    }
};
