import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Gift, Star, Award } from 'lucide-react';

export default function LoyaltyPage() {
  const { activeVenue } = useVenue();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadLoyalty();
    }
  }, [activeVenue?.id]);

  const loadLoyalty = async () => {
    try {
      const res = await api.get(`/loyalty/accounts?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }));
      setAccounts(res.data?.data || []);
    } catch (error) {
      console.error('Loyalty error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Loyalty Program" description="Customer loyalty and rewards">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Members</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
              <Gift className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Loyalty Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No loyalty members. Enable Loyalty in venue settings.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.guest_id} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                  <span>{acc.guest_id?.substring(0, 8)}</span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{acc.points} points</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
