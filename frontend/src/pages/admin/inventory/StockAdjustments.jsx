import React from 'react';
import PageContainer from '../../../layouts/PageContainer'; // Adjust depth dynamically in real app, hardcoded for now
import { Card, CardContent } from '../../../components/ui/card';
import { Construction } from 'lucide-react';

const StockAdjustments = () => {
  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Construction className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Under Construction</h3>
            <p className="text-muted-foreground">
              The <strong>Stock Adjustments</strong> module is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAdjustments;
