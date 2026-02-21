import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, ShieldAlert } from 'lucide-react';

// EU14 mandatory allergens
const EU_ALLERGENS = [
    { key: 'celery', label: 'Celery', icon: '🌿' },
    { key: 'gluten', label: 'Gluten', icon: '🌾' },
    { key: 'crustaceans', label: 'Crustaceans', icon: '🦐' },
    { key: 'eggs', label: 'Eggs', icon: '🥚' },
    { key: 'fish', label: 'Fish', icon: '🐟' },
    { key: 'lupin', label: 'Lupin', icon: '🌸' },
    { key: 'milk', label: 'Milk', icon: '🥛' },
    { key: 'molluscs', label: 'Molluscs', icon: '🦪' },
    { key: 'mustard', label: 'Mustard', icon: '🟡' },
    { key: 'nuts', label: 'Tree Nuts', icon: '🥜' },
    { key: 'peanuts', label: 'Peanuts', icon: '🥜' },
    { key: 'sesame', label: 'Sesame Seeds', icon: '⚪' },
    { key: 'soybeans', label: 'Soybeans', icon: '🫘' },
    { key: 'sulphites', label: 'Sulphur Dioxide', icon: '🟣' },
];

interface AllergensTabProps {
    data?: /**/any;
    sku?: { allergens?: string[];[key: string]: unknown };
    onSave?: (updates: { allergens: string[] }) => void;
}

export default function AllergensTab({ data: _data, sku, onSave }: AllergensTabProps) {
    const existingAllergens = sku?.allergens || [];
    const [allergens, setAllergens] = useState<string[]>(existingAllergens);
    const [hasChanges, setHasChanges] = useState(false);

    const toggleAllergen = (key: string) => {
        setAllergens(prev => {
            const next = prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key];
            setHasChanges(true);
            return next;
        });
    };

    const handleSave = () => {
        if (onSave) {
            onSave({ allergens });
            setHasChanges(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Allergen Summary */}
            {allergens.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
                    <CardContent className="py-3">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                Contains {allergens.length} allergen{allergens.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {allergens.map(key => {
                                const allergen = EU_ALLERGENS.find(a => a.key === key);
                                return (
                                    <Badge key={key} variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                                        {allergen?.icon} {allergen?.label || key}
                                    </Badge>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Allergen Checklist */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="h-5 w-5" />
                            EU 14 Allergens
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
                    <div className="grid grid-cols-2 gap-3">
                        {EU_ALLERGENS.map(allergen => (
                            <label
                                key={allergen.key}
                                className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                            >
                                <Checkbox
                                    checked={allergens.includes(allergen.key)}
                                    onCheckedChange={() => toggleAllergen(allergen.key)}
                                />
                                <span className="text-lg">{allergen.icon}</span>
                                <span className="text-sm font-medium">{allergen.label}</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
