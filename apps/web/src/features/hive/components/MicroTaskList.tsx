import React from 'react';
import { Button } from '@antigravity/ui';

// Rule #41 & #52: Micro-Tasking (Tinder-style)

interface Task {
    id: string;
    title: string;
    rewardXP: number;
    deadline?: string;
}

const MOCK_TASKS: Task[] = [
    { id: '1', title: 'Clean Coffee Machine', rewardXP: 50, deadline: '14:00' },
    { id: '2', title: 'Restock Napkins', rewardXP: 20 },
    { id: '3', title: 'Audit Fridge Temp', rewardXP: 35 }
];

export const MicroTaskList = () => {
    const handleSwipe = (direction: 'LEFT' | 'RIGHT', task: Task) => {
        if (direction === 'RIGHT') {
            console.log(`[TASK] Completed ${task.title} (+${task.rewardXP} XP)`);
            // Trigger Gamification Event
        } else {
            console.log(`[TASK] Snoozed ${task.title}`);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 bg-zinc-900 rounded-xl w-full max-w-sm">
            <h3 className="text-white font-bold text-lg border-b border-zinc-800 pb-2">
                ⚡ AVAILABLE TASKS
            </h3>

            <div className="space-y-4">
                {MOCK_TASKS.map(task => (
                    <div key={task.id} className="relative bg-zinc-800 p-4 rounded-lg shadow-lg overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-zinc-200">{task.title}</span>
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded font-mono">
                                +{task.rewardXP} XP
                            </span>
                        </div>
                        {task.deadline && (
                            <div className="text-xs text-red-400 mb-4">Deadline: {task.deadline}</div>
                        )}

                        {/* Mock Swipe Controls */}
                        <div className="flex gap-2 mt-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handleSwipe('LEFT', task)}
                            >
                                💤 SNOOZE
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-500 text-xs"
                                onClick={() => handleSwipe('RIGHT', task)}
                            >
                                ✅ DONE
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
