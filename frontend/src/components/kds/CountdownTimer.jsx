import React, { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';

export default function CountdownTimer({ targetTime, createdAt }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [overtime, setOvertime] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetTime);
      const diff = target - now;

      if (diff <= 0) {
        setOvertime(true);
        const overtimeSecs = Math.abs(Math.floor(diff / 1000));
        const mins = Math.floor(overtimeSecs / 60);
        const secs = overtimeSecs % 60;
        setTimeLeft(`-${mins}:${secs.toString().padStart(2, '0')}`);
      } else {
        setOvertime(false);
        const totalSecs = Math.floor(diff / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!timeLeft) return null;

  return (
    <div 
      className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-bold"
      style={{
        backgroundColor: overtime ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
        color: overtime ? '#FCA5A5' : '#93C5FD',
        border: overtime ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
      }}
    >
      <Timer className="h-3 w-3" />
      {timeLeft}
    </div>
  );
}

export function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
