import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function CalendarSetupPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Calendar Setup</h1>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">Public holidays and calendar configuration</p>
        </CardContent>
      </Card>
    </div>
  );
}
