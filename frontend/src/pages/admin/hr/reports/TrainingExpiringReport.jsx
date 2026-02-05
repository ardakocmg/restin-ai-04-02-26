
import React from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { GraduationCap, AlertTriangle } from 'lucide-react';

export default function TrainingExpiringReport() {
  // Mock data for LMS
  const expiringTraining = [
    { id: 1, name: "Hygiene Certificate L2", employee: "John Doe", expiry: "2026-03-01", status: "expiring" },
    { id: 2, name: "Fire Safety", employee: "Jane Smith", expiry: "2026-02-15", status: "critical" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-yellow-500" />
        Training & Compliance Audit
      </h1>

      <div className="grid gap-4">
        {expiringTraining.map(item => (
          <Card key={item.id} className="bg-zinc-900 border-white/10 hover:border-yellow-500/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${item.status === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-sm text-zinc-400">{item.employee}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-white">{item.expiry}</div>
                <div className="text-xs text-red-400 font-bold uppercase">{item.status}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-zinc-500 text-sm text-center mt-8">
        Connect to Restin Academy for live LMS data synchronization.
      </p>
    </div>
  );
}
