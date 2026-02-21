import React, { useState } from 'react';
import {
    Rocket, Building2, UtensilsCrossed, LayoutGrid,
    Users, Check, ChevronRight, ChevronLeft, Loader2,
    Sparkles, MapPin, Clock, Phone, Globe, Wifi
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../../lib/api';

const STEPS = [
    { id: 'venue', label: 'Venue Info', icon: Building2 },
    { id: 'menu', label: 'Menu Setup', icon: UtensilsCrossed },
    { id: 'floor', label: 'Floor Plan', icon: LayoutGrid },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'launch', label: 'Go Live', icon: Rocket },
];

const BUSINESS_TYPES = [
    { key: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
    { key: 'cafe', label: 'Café / Coffee', emoji: '☕' },
    { key: 'bar', label: 'Bar / Lounge', emoji: '🍸' },
    { key: 'fast_food', label: 'Fast Food', emoji: '🍔' },
    { key: 'hotel', label: 'Hotel F&B', emoji: '🏨' },
    { key: 'cloud_kitchen', label: 'Cloud Kitchen', emoji: '☁️' },
];

/**
 * 🧙 Setup Wizard — Guided Onboarding (Rule 63)
 * Multi-step form for new venue setup.
 */
export default function SetupWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        business_type: '',
        address: '',
        city: 'Sliema',
        country: 'Malta',
        phone: '',
        timezone: 'Europe/Malta',
        currency: 'EUR',
        menu_source: 'scratch',
        table_count: 10,
        staff_count: 5,
        modules: ['pos', 'inventory', 'reservations', 'hr']
    });

    const update = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const MODULE_OPTIONS = [
        { key: 'pos', label: 'Point of Sale', desc: 'Orders & payments' },
        { key: 'inventory', label: 'Inventory', desc: 'Stock & recipes' },
        { key: 'reservations', label: 'Reservations', desc: 'Table bookings' },
        { key: 'hr', label: 'HR & Payroll', desc: 'Staff management' },
        { key: 'crm', label: 'CRM', desc: 'Guest loyalty' },
        { key: 'voice', label: 'Voice AI', desc: '24/7 receptionist' },
        { key: 'web', label: 'Website Builder', desc: 'Digital menu' },
        { key: 'haccp', label: 'HACCP Compliance', desc: 'Food safety' },
    ];

    const toggleModule = (key) => {
        update('modules', formData.modules.includes(key)
            ? formData.modules.filter(m => m !== key)
            : [...formData.modules, key]
        );
    };

    const launchMutation = useMutation({
        mutationFn: async () => {
            return api.post('/venues', {
                name: formData.name,
                business_type: formData.business_type,
                address: formData.address,
                city: formData.city,
                country: formData.country,
                phone: formData.phone,
                timezone: formData.timezone,
                currency: formData.currency,
                table_count: formData.table_count,
                modules: formData.modules,
            });
        },
        onSuccess: () => {
            toast.success('Venue created! Welcome to Restin.AI 🚀');
            setCurrentStep(STEPS.length - 1);
        },
        onError: () => toast.error('Failed to create venue')
    });

    const canProceed = () => {
        if (currentStep === 0) return formData.name && formData.business_type;
        return true;
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0: // Venue Info
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Venue Name</label>
                            <Input aria-label="Input field"
                                value={formData.name}
                                onChange={(e) => update('name', e.target.value)}
                                placeholder="e.g., Harbour Club Restaurant"
                                className="bg-background border-border text-foreground text-lg h-12"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Business Type</label>
                            <div className="grid grid-cols-3 gap-3">
                                {BUSINESS_TYPES.map(type => (
                                    <Card
                                        key={type.key}
                                        onClick={() => update('business_type', type.key)}
                                        className={cn(
                                            "p-4 cursor-pointer text-center transition-all border-2",
                                            formData.business_type === type.key
                                                ? "border-emerald-500 bg-emerald-500/5"
                                                : "border-border bg-card hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <div className="text-2xl mb-1">{type.emoji}</div>
                                        <div className="text-sm font-medium text-foreground">{type.label}</div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 block">City</label>
                                <Input aria-label="Input field"
                                    value={formData.city}
                                    onChange={(e) => update('city', e.target.value)}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
                                <Input aria-label="Input field"
                                    value={formData.phone}
                                    onChange={(e) => update('phone', e.target.value)}
                                    placeholder="+356 2123 4567"
                                    className="bg-background border-border text-foreground"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 1: // Menu Setup
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">How would you like to set up your menu?</label>
                            <div className="space-y-3">
                                {[
                                    { key: 'scratch', label: 'Start from scratch', desc: 'Build your menu item by item', icon: '✏️' },
                                    { key: 'import', label: 'Import from Excel', desc: 'Upload a spreadsheet with your menu', icon: '📊' },
                                    { key: 'migrate', label: 'Migrate from competitor', desc: 'Move from Lightspeed, Apicbase, etc.', icon: '🔄' },
                                ].map(opt => (
                                    <Card
                                        key={opt.key}
                                        onClick={() => update('menu_source', opt.key)}
                                        className={cn(
                                            "p-4 cursor-pointer flex items-center gap-4 border-2 transition-all",
                                            formData.menu_source === opt.key
                                                ? "border-emerald-500 bg-emerald-500/5"
                                                : "border-border bg-card hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <span className="text-2xl">{opt.icon}</span>
                                        <div>
                                            <div className="font-medium text-foreground">{opt.label}</div>
                                            <div className="text-xs text-muted-foreground">{opt.desc}</div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 2: // Floor Plan
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Number of Tables</label>
                            <Input aria-label="Input field"
                                type="number"
                                value={formData.table_count}
                                onChange={(e) => update('table_count', parseInt(e.target.value) || 0)}
                                className="bg-background border-border text-foreground h-12 text-lg"
                            />
                        </div>
                        <Card className="p-6 bg-muted/30 border-border text-center">
                            <LayoutGrid className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                You can set up your full floor plan later with drag-and-drop layout.
                                For now, we'll create {formData.table_count} numbered tables.
                            </p>
                        </Card>
                    </div>
                );

            case 3: // Staff
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Select your modules</label>
                            <div className="grid grid-cols-2 gap-3">
                                {MODULE_OPTIONS.map(mod => (
                                    <Card
                                        key={mod.key}
                                        onClick={() => toggleModule(mod.key)}
                                        className={cn(
                                            "p-4 cursor-pointer border-2 transition-all",
                                            formData.modules.includes(mod.key)
                                                ? "border-emerald-500 bg-emerald-500/5"
                                                : "border-border bg-card hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-foreground text-sm">{mod.label}</div>
                                                <div className="text-[10px] text-muted-foreground">{mod.desc}</div>
                                            </div>
                                            {formData.modules.includes(mod.key) && (
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 4: // Go Live
                return (
                    <div className="text-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                            <Sparkles className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">You're All Set! 🎉</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            <strong className="text-foreground">{formData.name}</strong> is ready to go.
                            You can refine your menu, floor plan, and staff details from the dashboard.
                        </p>

                        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> {formData.business_type}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> {formData.table_count} tables
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> {formData.modules.length} modules
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" /> {formData.city}, {formData.country}
                            </div>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-2xl space-y-6">
                {/* Logo */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground">
                        restin<span className="text-emerald-500">.ai</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Setup Wizard</p>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between px-4">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;
                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                        isCompleted ? "bg-emerald-500 text-foreground" :
                                            isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500" :
                                                "bg-muted text-muted-foreground"
                                    )}>
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={cn(
                                        "text-[10px]",
                                        isActive ? "text-emerald-500 font-semibold" : "text-muted-foreground"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={cn(
                                        "flex-1 h-0.5 mx-2",
                                        idx < currentStep ? "bg-emerald-500" : "bg-border"
                                    )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step Content */}
                <Card className="p-6 bg-card border-border min-h-[300px]">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        {React.createElement(STEPS[currentStep].icon, { className: "w-5 h-5 text-emerald-500" })}
                        {STEPS[currentStep].label}
                    </h2>
                    {renderStep()}
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        currentStep === 3 ? (
                            <Button
                                onClick={() => launchMutation.mutate()}
                                // @ts-ignore
                                disabled={!canProceed() || launchMutation.isLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                            >
                                {/* @ts-ignore */}
                                {launchMutation.isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                    <Rocket className="w-4 h-4 mr-1" />
                                )}
                                Launch Venue
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setCurrentStep(currentStep + 1)}
                                disabled={!canProceed()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
