'use client';

import React from 'react';

interface PageContainerProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export default function PageContainer({ title, description, children, actions }: PageContainerProps) {
    return (
        <div className="space-y-6 pt-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight text-white uppercase">{title}</h2>
                    {description && (
                        <p className="text-muted-foreground text-zinc-400">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center space-x-2">
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-medium text-emerald-500">ONLINE</span>
                        </div>
                        {actions}
                    </div>
                )}
            </div>
            <div className="my-6 border-b border-white/5" />
            <div className="relative min-h-[calc(100vh-200px)]">
                {children}
            </div>
        </div>
    );
}
