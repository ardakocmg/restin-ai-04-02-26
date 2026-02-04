import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';
import api from '@/lib/api';

export default function CountriesPage() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await api.get('/employee-setup/countries');
      setCountries(response.data);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Countries</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Country Name</th>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Currency</th>
              </tr>
            </thead>
            <tbody>
              {countries.map(country => (
                <tr key={country.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{country.country_name}</td>
                  <td className="p-3">{country.country_code}</td>
                  <td className="p-3">{country.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
