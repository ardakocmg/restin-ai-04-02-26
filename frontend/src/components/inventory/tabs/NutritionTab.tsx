import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Apple, Info } from 'lucide-react';

const NUTRITION_FIELDS = [
    { key: 'energy_kcal', label: 'Energy', unit: 'kcal', group: 'energy' },
    { key: 'energy_kj', label: 'Energy', unit: 'kJ', group: 'energy' },
    { key: 'fat', label: 'Fat', unit: 'g', group: 'fat' },
    { key: 'saturated_fat', label: '— Saturated Fat', unit: 'g', group: 'fat', indent: true },
    { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g', group: 'carbs' },
    { key: 'sugars', label: '— Sugars', unit: 'g', group: 'carbs', indent: true },
    { key: 'fibre', label: 'Fibre', unit: 'g', group: 'fibre' },
    { key: 'protein', label: 'Protein', unit: 'g', group: 'protein' },
    { key: 'salt', label: 'Salt', unit: 'g', group: 'salt' },
];

interface NutritionTabProps {
    data?: Record<string, unknown>;
    sku?: { nutrition?: Record<string, number | null>;[key: string]: unknown };
    onSave?: (updates: { nutrition: Record<string, number | null> }) => void;
}

export default function NutritionTab({ data: _data, sku, onSave }: NutritionTabProps) {
    const existingNutrition: Record<string, number | null> = (sku?.nutrition as Record<string, number | null>) || {};
    const [nutrition, setNutrition] = useState<Record<string, number | null>>(existingNutrition);
    const [hasChanges, setHasChanges] = useState(false);

    const handleChange = (key: string, value: string) => {
        setNutrition(prev => ({
            ...prev,
            [key]: value === '' ? null : parseFloat(value)
        }));
        setHasChanges(true);
    };

    const handleSave = () => {
        if (onSave) {
            onSave({ nutrition });
            setHasChanges(false);
        }
    };

    const hasAnyValues = Object.values(nutrition).some(v => v != null);

    return (
        <div className="space-y-4">
            {/* Info Banner */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <CardContent className="py-3">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                            Nutritional values per 100g / 100ml as per EU Regulation 1169/2011
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Nutrition Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Apple className="h-5 w-5" />
                            Nutritional Information
                        </CardTitle>
                        {hasChanges && (
                            <Button size="sm" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left px-4 py-2 text-sm font-medium text-muted-foreground">Nutrient</th>
                                    <th className="text-right px-4 py-2 text-sm font-medium text-muted-foreground">Per 100g/ml</th>
                                    <th className="text-center px-4 py-2 text-sm font-medium text-muted-foreground">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {NUTRITION_FIELDS.map(field => (
                                    <tr key={field.key} className="hover:bg-muted/30 transition-colors">
                                        <td className={`px-4 py-2 text-sm font-medium ${field.indent ? 'pl-8 text-muted-foreground' : ''}`}>
                                            {field.label}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Input aria-label="—"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="—"
                                                value={nutrition[field.key] ?? ''}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                className="w-24 ml-auto text-right h-8"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center text-sm text-muted-foreground">
                                            {field.unit}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Quick Summary */}
                    {hasAnyValues && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            {[
                                { key: 'energy_kcal', label: 'Energy', suffix: 'kcal', color: 'text-red-600 dark:text-red-400' },
                                { key: 'protein', label: 'Protein', suffix: 'g', color: 'text-blue-600 dark:text-blue-400' },
                                { key: 'carbohydrates', label: 'Carbs', suffix: 'g', color: 'text-amber-600 dark:text-amber-400' },
                                { key: 'fat', label: 'Fat', suffix: 'g', color: 'text-purple-600 dark:text-purple-400' },
                            ].map(({ key, label, suffix, color }) => (
                                <div key={key} className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className={`text-lg font-bold ${color}`}>
                                        {nutrition[key] != null ? nutrition[key] : '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{suffix}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
