import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent } from '@/components/ui/card';

import { Target, Award } from 'lucide-react';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function PerformanceManagement() {
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [view, setView] = useState('goals');
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (view === 'goals') fetchGoals();
    else fetchReviews();
  }, [view]);

  const fetchGoals = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/hr/goals`);
      setGoals(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch goals:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/hr/reviews`);
      setReviews(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch reviews:', error);
    }
  };

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer title="Performance Management" description="Goals, reviews & 360 feedback">
        <div className="space-y-6">
          <div className="flex gap-2">
            <button onClick={() => setView('goals')} className={`px-4 py-2 rounded ${view === 'goals' ? 'bg-blue-600' : 'bg-slate-700'}`}>Goals</button>
            <button onClick={() => setView('reviews')} className={`px-4 py-2 rounded ${view === 'reviews' ? 'bg-blue-600' : 'bg-slate-700'}`}>Reviews</button>
          </div>
          {view === 'goals' && <div className="space-y-4">{goals.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No goals</CardContent></Card> : goals.map(g => <Card key={g.id}><CardContent className="p-6"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-blue-400" /><div><p className="font-medium">{g.goal_title}</p><p className="text-sm text-slate-400">Progress: {g.progress}%</p></div></div></CardContent></Card>)}</div>}
          {view === 'reviews' && <div className="space-y-4">{reviews.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No reviews</CardContent></Card> : reviews.map(r => <Card key={r.id}><CardContent className="p-6"><div className="flex items-center gap-3"><Award className="h-5 w-5 text-yellow-400" /><div><p className="font-medium">{r.employee_name}</p><p className="text-sm text-slate-400">{r.review_type} - Rating: {r.overall_rating || 'N/A'}</p></div></div></CardContent></Card>)}</div>}
        </div>
      </PageContainer>
    </PermissionGate>
  );
}