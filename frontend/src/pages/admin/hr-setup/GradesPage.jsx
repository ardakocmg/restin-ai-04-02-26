import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function GradesPage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Grades</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Grade</Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">Employee grade management</p>
        </CardContent>
      </Card>
    </div>
  );
}
