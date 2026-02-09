import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';import { logger } from '@/lib/logger';

import { Button } from '@/components/ui/button';import { logger } from '@/lib/logger';

import { Input } from '@/components/ui/input';import { logger } from '@/lib/logger';

import { Plus, Edit, Trash } from 'lucide-react';import { logger } from '@/lib/logger';

import api from '@/lib/api';

import { logger } from '@/lib/logger';
export default function BanksPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/employee-setup/banks');
      setBanks(response.data);
    } catch (error) {
      logger.error('Failed to fetch banks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Banks</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Bank</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Bank Name</th>
                <th className="p-3 text-left">Bank Code</th>
                <th className="p-3 text-left">SWIFT Code</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banks.map(bank => (
                <tr key={bank.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{bank.bank_name}</td>
                  <td className="p-3">{bank.bank_code}</td>
                  <td className="p-3">{bank.swift_code}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button className="text-blue-600 dark:text-blue-400"><Edit className="h-4 w-4" /></button>
                      <button className="text-red-600 dark:text-red-400"><Trash className="h-4 w-4" /></button>
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
