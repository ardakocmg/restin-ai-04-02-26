import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';
import api from '@/lib/api';

export default function OccupationsPage() {
  const [occupations, setOccupations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccupations();
  }, []);

  const fetchOccupations = async () => {
    try {
      const response = await api.get('/employee-setup/occupations');
      setOccupations(response.data);
    } catch (error) {
      console.error('Failed to fetch occupations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Occupations</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Occupation</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Occupation Name</th>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {occupations.map(occ => (
                <tr key={occ.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{occ.occupation_name}</td>
                  <td className="p-3">{occ.occupation_code}</td>
                  <td className="p-3">{occ.category || '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button className="text-blue-600"><Edit className="h-4 w-4" /></button>
                      <button className="text-red-600"><Trash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}