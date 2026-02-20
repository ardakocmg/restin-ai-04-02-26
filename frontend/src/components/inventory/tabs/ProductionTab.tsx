import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function ProductionTab({ batches = [] }) {
  return (
    <div className="space-y-3">
      {batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No production batches recorded
          </CardContent>
        </Card>
      ) : (
        batches.map((batch) => (
          <Card key={batch.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{batch.display_id}</span>
                <span className="text-sm text-slate-600">
                  {new Date(batch.produced_at).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm text-slate-700">
                <p>Inputs: {batch.inputs?.length || 0} items</p>
                <p>Outputs: {batch.outputs?.length || 0} items</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
