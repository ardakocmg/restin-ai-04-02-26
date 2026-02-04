import React, { useState } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';

export default function PayrollCalculator() {
  const [grossSalary, setGrossSalary] = useState('');
  const [netSalary, setNetSalary] = useState('');
  const [result, setResult] = useState(null);

  // Malta Tax Rates 2024
  const MALTA_TAX_BRACKETS = [
    { min: 0, max: 9100, rate: 0 },
    { min: 9101, max: 14500, rate: 15 },
    { min: 14501, max: 19500, rate: 25 },
    { min: 19501, max: 60000, rate: 25 },
    { min: 60001, max: Infinity, rate: 35 }
  ];

  const SSC_RATE = 0.10; // 10% Social Security

  const calculateNetFromGross = (gross) => {
    const annual = parseFloat(gross);
    if (isNaN(annual) || annual <= 0) return null;

    // Calculate tax
    let tax = 0;
    for (const bracket of MALTA_TAX_BRACKETS) {
      if (annual > bracket.min) {
        const taxableInBracket = Math.min(annual, bracket.max) - bracket.min;
        tax += taxableInBracket * (bracket.rate / 100);
      }
    }

    // Calculate SSC
    const ssc = annual * SSC_RATE;

    const net = annual - tax - ssc;
    const monthlyNet = net / 12;
    const monthlyGross = annual / 12;

    return {
      annual_gross: annual,
      annual_net: net,
      annual_tax: tax,
      annual_ssc: ssc,
      monthly_gross: monthlyGross,
      monthly_net: monthlyNet,
      monthly_tax: tax / 12,
      monthly_ssc: ssc / 12,
      effective_rate: ((tax + ssc) / annual) * 100
    };
  };

  const calculateGrossFromNet = (net) => {
    const targetNet = parseFloat(net);
    if (isNaN(targetNet) || targetNet <= 0) return null;

    // Binary search for gross salary
    let low = targetNet;
    let high = targetNet * 2;
    let iterations = 0;

    while (iterations < 50 && (high - low) > 0.01) {
      const mid = (low + high) / 2;
      const calc = calculateNetFromGross(mid);
      
      if (calc.annual_net < targetNet) {
        low = mid;
      } else {
        high = mid;
      }
      iterations++;
    }

    return calculateNetFromGross((low + high) / 2);
  };

  const handleGrossCalculate = () => {
    const res = calculateNetFromGross(grossSalary);
    setResult(res);
  };

  const handleNetCalculate = () => {
    const res = calculateGrossFromNet(netSalary);
    setResult(res);
  };

  return (
    <PageContainer
      title="Payroll Calculator"
      description="Malta jurisdiction - Net/Gross salary calculator"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Salary Calculator
            </CardTitle>
            <CardDescription>Calculate net or gross salary (Malta tax rules)</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gross" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gross">Gross → Net</TabsTrigger>
                <TabsTrigger value="net">Net → Gross</TabsTrigger>
              </TabsList>

              <TabsContent value="gross" className="space-y-4">
                <div>
                  <Label>Annual Gross Salary (€)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 30000"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                  />
                </div>
                <Button onClick={handleGrossCalculate} className="w-full">
                  Calculate Net Salary
                </Button>
              </TabsContent>

              <TabsContent value="net" className="space-y-4">
                <div>
                  <Label>Annual Net Salary (€)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 25000"
                    value={netSalary}
                    onChange={(e) => setNetSalary(e.target.value)}
                  />
                </div>
                <Button onClick={handleNetCalculate} className="w-full">
                  Calculate Gross Salary
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Calculation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Annual */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-3">Annual</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Gross:</span>
                      <span className="font-bold text-slate-900">€{result.annual_gross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-sm">Tax:</span>
                      <span className="font-medium">-€{result.annual_tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span className="text-sm">SSC (10%):</span>
                      <span className="font-medium">-€{result.annual_ssc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium text-slate-700">Net:</span>
                      <span className="font-bold text-green-600">€{result.annual_net.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-3">Monthly</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Gross:</span>
                      <span className="font-bold text-slate-900">€{result.monthly_gross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-sm">Tax:</span>
                      <span className="font-medium">-€{result.monthly_tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span className="text-sm">SSC:</span>
                      <span className="font-medium">-€{result.monthly_ssc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium text-slate-700">Net:</span>
                      <span className="font-bold text-green-600">€{result.monthly_net.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Effective Rate */}
                <div className="p-3 bg-slate-100 rounded text-center">
                  <p className="text-sm text-slate-600">Effective Tax Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {result.effective_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
