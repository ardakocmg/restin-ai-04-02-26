import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ApplicantsPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Applicants</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Applicant</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">Job applicant tracking</p>
        </CardContent>
      </Card>
    </div>
  );
}
