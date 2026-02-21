/**
 * UnitConversionMatrix — Automatic unit conversion engine
 * Apicbase parity: kg↔lb, L↔gal, piece↔case, custom conversions
 */
import React, { useState, useMemo } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    Scale, ArrowRightLeft, Plus, Trash2, Search, RefreshCw,
    Calculator, Ruler, Droplets, Weight, Package, Thermometer,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* ────────────────────────── Types ────────────────── */
interface UnitConversion {
    id: string;
    fromUnit: string;
    toUnit: string;
    factor: number;
    category: string;
}

interface ConversionCategory {
    name: string;
    icon: React.ElementType;
    units: string[];
    color: string;
}

/* ────────────────────────── Constants ────────────────── */
const CATEGORIES: ConversionCategory[] = [
    { name: 'Weight', icon: Weight, units: ['g', 'kg', 'lb', 'oz', 'mg', 'ton'], color: 'text-blue-400' },
    { name: 'Volume', icon: Droplets, units: ['ml', 'L', 'gal', 'fl oz', 'cup', 'tbsp', 'tsp', 'cl', 'dl'], color: 'text-cyan-400' },
    { name: 'Length', icon: Ruler, units: ['mm', 'cm', 'm', 'in', 'ft'], color: 'text-amber-400' },
    { name: 'Count', icon: Package, units: ['piece', 'dozen', 'case', 'box', 'pallet', 'bag', 'bunch', 'pack'], color: 'text-emerald-400' },
    { name: 'Temperature', icon: Thermometer, units: ['°C', '°F', 'K'], color: 'text-red-400' },
];

// Standard conversions (to base unit within category)
const STANDARD_CONVERSIONS: Record<string, number> = {
    // Weight → grams
    'g': 1, 'kg': 1000, 'lb': 453.592, 'oz': 28.3495, 'mg': 0.001, 'ton': 1000000,
    // Volume → ml
    'ml': 1, 'L': 1000, 'gal': 3785.41, 'fl oz': 29.5735, 'cup': 236.588,
    'tbsp': 14.7868, 'tsp': 4.92892, 'cl': 10, 'dl': 100,
    // Length → mm
    'mm': 1, 'cm': 10, 'm': 1000, 'in': 25.4, 'ft': 304.8,
};

function getStandardFactor(from: string, to: string): number | null {
    const fromVal = STANDARD_CONVERSIONS[from];
    const toVal = STANDARD_CONVERSIONS[to];
    if (fromVal !== undefined && toVal !== undefined) {
        return fromVal / toVal;
    }
    return null;
}

function convertTemperature(value: number, from: string, to: string): number | null {
    if (from === to) return value;
    if (from === '°C' && to === '°F') return (value * 9 / 5) + 32;
    if (from === '°F' && to === '°C') return (value - 32) * 5 / 9;
    if (from === '°C' && to === 'K') return value + 273.15;
    if (from === 'K' && to === '°C') return value - 273.15;
    if (from === '°F' && to === 'K') return (value - 32) * 5 / 9 + 273.15;
    if (from === 'K' && to === '°F') return (value - 273.15) * 9 / 5 + 32;
    return null;
}

/* ═══════════════════════════════════════════════════════════════════
   ██  UNIT CONVERSION MATRIX
   ═══════════════════════════════════════════════════════════════════ */
export default function UnitConversionMatrix() {
    const { t } = useTranslation();

    /* ── Converter State ── */
    const [fromValue, setFromValue] = useState<number>(1);
    const [fromUnit, setFromUnit] = useState('kg');
    const [toUnit, setToUnit] = useState('lb');
    const [activeCategory, setActiveCategory] = useState('Weight');

    /* ── Custom Conversions ── */
    const [customConversions, setCustomConversions] = useState<UnitConversion[]>([
        { id: 'cc1', fromUnit: 'piece', toUnit: 'case', factor: 24, category: 'Count' },
        { id: 'cc2', fromUnit: 'bunch', toUnit: 'piece', factor: 6, category: 'Count' },
        { id: 'cc3', fromUnit: 'bag', toUnit: 'kg', factor: 25, category: 'Weight' },
    ]);
    const [newFrom, setNewFrom] = useState('');
    const [newTo, setNewTo] = useState('');
    const [newFactor, setNewFactor] = useState<number>(1);
    const [newCategory, setNewCategory] = useState('Count');

    /* ── Conversion Result ── */
    const result = useMemo(() => {
        if (fromUnit === toUnit) return fromValue;

        // Check temperature
        if (['°C', '°F', 'K'].includes(fromUnit) && ['°C', '°F', 'K'].includes(toUnit)) {
            return convertTemperature(fromValue, fromUnit, toUnit);
        }

        // Check standard conversions
        const factor = getStandardFactor(fromUnit, toUnit);
        if (factor !== null) return fromValue * factor;

        // Check custom conversions
        const custom = customConversions.find(c =>
            (c.fromUnit === fromUnit && c.toUnit === toUnit) ||
            (c.fromUnit === toUnit && c.toUnit === fromUnit)
        );
        if (custom) {
            if (custom.fromUnit === fromUnit) return fromValue * custom.factor;
            return fromValue / custom.factor;
        }

        return null;
    }, [fromValue, fromUnit, toUnit, customConversions]);

    /* ── Category Units ── */
    const currentCategory = CATEGORIES.find(c => c.name === activeCategory);
    const availableUnits = currentCategory?.units || [];

    /* ── Quick Conversions Table ── */
    const quickTable = useMemo(() => {
        if (!currentCategory) return [];
        const units = currentCategory.units;
        return units.map(from => ({
            unit: from,
            conversions: units.filter(to => to !== from).map(to => {
                if (currentCategory.name === 'Temperature') {
                    const val = convertTemperature(1, from, to);
                    return { to, factor: val ? val.toFixed(2) : '—' };
                }
                const factor = getStandardFactor(from, to);
                return { to, factor: factor ? factor.toFixed(4) : '—' };
            }),
        }));
    }, [currentCategory]);

    const addCustom = () => {
        if (!newFrom || !newTo || newFactor <= 0) {
            toast.error('Please fill all fields');
            return;
        }
        setCustomConversions(prev => [...prev, {
            id: `cc-${Date.now()}`, fromUnit: newFrom, toUnit: newTo, factor: newFactor, category: newCategory,
        }]);
        setNewFrom(''); setNewTo(''); setNewFactor(1);
        toast.success('Custom conversion added');
    };

    const removeCustom = (id: string) => {
        setCustomConversions(prev => prev.filter(c => c.id !== id));
        toast.success('Conversion removed');
    };

    return (
        <PageContainer
            title="Unit Conversion Matrix"
            subtitle="Convert between measurement units — standard & custom conversions"
            icon={<Scale className="h-5 w-5 text-blue-400" />}
        >
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {CATEGORIES.map(cat => (
                    <Button
                        key={cat.name}
                        variant={activeCategory === cat.name ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setActiveCategory(cat.name);
                            setFromUnit(cat.units[0]); setToUnit(cat.units[1] || cat.units[0]);
                        }}
                        className={cn(activeCategory === cat.name ? '' : 'border-white/10')}
                    >
                        <cat.icon className="h-3.5 w-3.5 mr-1.5" />
                        {cat.name}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Live Converter ── */}
                <Card className="border-white/5 bg-zinc-900/40">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-emerald-400" /> Live Converter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <Label className="text-xs">Value</Label>
                                <Input aria-label="Input field" type="number" value={fromValue} onChange={e => setFromValue(Number(e.target.value))} className="text-lg font-bold h-12" />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs">From</Label>
                                <Select aria-label="Select option" value={fromUnit} onValueChange={setFromUnit}>
                                    <SelectTrigger aria-label="Select option" className="h-12"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="ghost" size="icon" aria-label="Action" className="h-12 w-12"
                                onClick={() => { setFromUnit(toUnit); setToUnit(fromUnit); }}>
                                <ArrowRightLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex-1">
                                <Label className="text-xs">To</Label>
                                <Select aria-label="Select option" value={toUnit} onValueChange={setToUnit}>
                                    <SelectTrigger aria-label="Select option" className="h-12"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-6 rounded-xl bg-zinc-800/60 border border-white/5 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Result</p>
                            {result !== null ? (
                                <>
                                    <p className="text-3xl font-bold text-emerald-400">
                                        {result.toFixed(result < 0.01 ? 6 : result < 1 ? 4 : 2)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {fromValue} {fromUnit} = {result.toFixed(result < 0.01 ? 6 : result < 1 ? 4 : 2)} {toUnit}
                                    </p>
                                </>
                            ) : (
                                <p className="text-lg text-muted-foreground">{"No "}conversion available</p>
                            )}
                        </div>

                        {/* Quick Reference Grid */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Common Conversions:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { from: '1 kg', to: '2.205 lb' },
                                    { from: '1 L', to: '0.264 gal' },
                                    { from: '1 oz', to: '28.35 g' },
                                    { from: '1 cup', to: '236.6 ml' },
                                ].map(q => (
                                    <div key={q.from} className="p-2 rounded-lg bg-zinc-900/50 border border-white/5 text-xs text-center">
                                        <span className="text-muted-foreground">{q.from}</span>
                                        <span className="mx-1">=</span>
                                        <span className="font-medium">{q.to}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Custom Conversions ── */}
                <Card className="border-white/5 bg-zinc-900/40">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4 text-purple-400" /> Custom Conversions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                            Define custom conversions for your specific products (e.g., 1 case = 24 pieces).
                        </p>

                        {/* Add New */}
                        <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5 space-y-3">
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <Label className="text-[10px]">From Unit</Label>
                                    <Input aria-label="e.g. case" placeholder="e.g. case" value={newFrom} onChange={e => setNewFrom(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-[10px]">To Unit</Label>
                                    <Input aria-label="e.g. piece" placeholder="e.g. piece" value={newTo} onChange={e => setNewTo(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-[10px]">Factor</Label>
                                    <Input aria-label="Input field" type="number" value={newFactor} onChange={e => setNewFactor(Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="text-[10px]">Category</Label>
                                    <Select aria-label="Select option" value={newCategory} onValueChange={setNewCategory}>
                                        <SelectTrigger aria-label="Select option" className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button size="sm" onClick={addCustom} className="w-full">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Conversion
                            </Button>
                        </div>

                        {/* Existing Custom Conversions */}
                        <div className="space-y-2">
                            {customConversions.map(conv => (
                                <div key={conv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="text-[10px] border-white/10">{conv.category}</Badge>
                                        <span>1 {conv.fromUnit}</span>
                                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{conv.factor} {conv.toUnit}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCustom(conv.id)}>
                                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                    </Button>
                                </div>
                            ))}
                            {customConversions.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-4">{"No "}custom conversions yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Conversion Reference Table ── */}
            <Card className="border-white/5 bg-zinc-900/40 mt-6">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4 text-amber-400" /> {activeCategory} Conversion Table
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="p-2 text-left font-medium">From ↓ / To →</th>
                                    {availableUnits.map(u => (
                                        <th key={u} className="p-2 text-center font-medium">{u}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {availableUnits.map(from => (
                                    <tr key={from} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-2 font-medium">{from}</td>
                                        {availableUnits.map(to => {
                                            if (from === to) return <td key={to} className="p-2 text-center text-muted-foreground">—</td>;
                                            let val: string;
                                            if (activeCategory === 'Temperature') {
                                                const r = convertTemperature(1, from, to);
                                                val = r !== null ? r.toFixed(2) : '—';
                                            } else {
                                                const f = getStandardFactor(from, to);
                                                val = f !== null ? (f >= 100 ? f.toFixed(0) : f >= 1 ? f.toFixed(2) : f.toFixed(4)) : '—';
                                            }
                                            return (
                                                <td key={to} className="p-2 text-center tabular-nums">
                                                    {val !== '—' ? val : <span className="text-muted-foreground">—</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
