import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function HeadcountReport() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Head Count Report</h1>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">Detailed headcount analysis and breakdown</p>
        </CardContent>
      </Card>
    </div>
  );
}