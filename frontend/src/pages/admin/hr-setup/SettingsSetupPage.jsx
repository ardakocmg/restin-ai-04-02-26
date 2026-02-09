import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function SettingsSetupPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-6">HR Settings</h1>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">HR module settings and configuration</p>
        </CardContent>
      </Card>
    </div>
  );
}
