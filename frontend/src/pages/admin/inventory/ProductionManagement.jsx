
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { ChefHat, ArrowRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

export default function ProductionManagement() {
  // Placeholder for Batch Cooking Logic
  // This would typically involve selecting a "Batch Recipe" and declaring "Produced X amount"
  // which triggers stock deduction of ingredients.

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <ChefHat className="w-6 h-6 text-green-500" />
        Production Management
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader><CardTitle className="text-white">Batch Cooking</CardTitle></CardHeader>
            <CardContent>
              <p className="text-zinc-400 mb-4">Produce internal stocks (sauces, pre-mixes) from raw ingredients.</p>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700">Start Production Run</Button>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader><CardTitle className="text-white">Thawing / Prep</CardTitle></CardHeader>
            <CardContent>
              <p className="text-zinc-400 mb-4">Track items moving from Freezer to Fridge (Prep status).</p>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700">Log Thawing</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900 border-white/10 h-full">
          <CardHeader><CardTitle className="text-white">Production Logs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/5">
              <div>
                <div className="font-bold text-white">Tomato Sauce Base</div>
                <div className="text-xs text-zinc-500">Produced 10L • Today 10:00 AM</div>
              </div>
              <span className="text-green-500 text-sm font-bold">COMPLETED</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/5">
              <div>
                <div className="font-bold text-white">Pizza Dough (Batch A)</div>
                <div className="text-xs text-zinc-500">Produced 50 Units • Yesterday</div>
              </div>
              <span className="text-green-500 text-sm font-bold">COMPLETED</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
