import React, { useState } from 'react';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import PageLayout from '../../layouts/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { calculateNetFromGross, calculateGrossFromNet, TaxCalculationResult } from '../../utils/calculations';

export default function PayrollCalculator() {
  const { logAction } = useAuditLog();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { logAction('PAYROLL_CALC_VIEWED', 'payroll-calculator'); }, []);
  const [grossSalary, setGrossSalary] = useState<string>('');
  const [netSalary, setNetSalary] = useState<string>('');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  const handleGrossCalculate = () => {
    const res = calculateNetFromGross(grossSalary);
    setResult(res);
  };

  const handleNetCalculate = () => {
    const res = calculateGrossFromNet(netSalary);
    setResult(res);
  };

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageLayout
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
                  <div className="p-4 bg-blue-950/20 border border-blue-900/50 rounded-lg">
                    <p className="text-sm font-medium text-blue-200 mb-3">Annual</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-400">Gross:</span>
                        <span className="font-bold text-zinc-100">€{result.annual_gross.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span className="text-sm">Tax:</span>
                        <span className="font-medium">-€{result.annual_tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span className="text-sm">SSC (10%):</span>
                        <span className="font-medium">-€{result.annual_ssc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-900/50 pt-2">
                        <span className="font-medium text-blue-200">Net:</span>
                        <span className="font-bold text-green-400">€{result.annual_net.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly */}
                  <div className="p-4 bg-green-950/20 border border-green-900/50 rounded-lg">
                    <p className="text-sm font-medium text-green-200 mb-3">Monthly</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-400">Gross:</span>
                        <span className="font-bold text-zinc-100">€{result.monthly_gross.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span className="text-sm">Tax:</span>
                        <span className="font-medium">-€{result.monthly_tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-orange-400">
                        <span className="text-sm">SSC:</span>
                        <span className="font-medium">-€{result.monthly_ssc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-green-900/50 pt-2">
                        <span className="font-medium text-green-200">Net:</span>
                        <span className="font-bold text-green-400">€{result.monthly_net.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Effective Rate */}
                  <div className="p-3 bg-zinc-900 rounded text-center border border-zinc-800">
                    <p className="text-sm text-zinc-400">Effective Tax Rate</p>
                    <p className="text-2xl font-bold text-zinc-100">
                      {result.effective_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayout>
    </PermissionGate>
  );
}
