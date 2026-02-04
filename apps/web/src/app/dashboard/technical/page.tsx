'use client';

import React, { useState } from 'react';
import { Shield, Cpu, Layers, Workflow, Database, Globe, Zap, Lock, Terminal as TerminalIcon, Activity, Layout, Network } from 'lucide-react';
import PDFExportButton from '@/components/shared/PDFExportButton';
import { cn } from '@antigravity/ui';

// Interfaces for structured data
interface SectionProps {
    title: string;
    icon?: React.ElementType;
    tag?: string;
    children: React.ReactNode;
    className?: string;
}

const GlassCard = ({ children, className = "", title, icon: Icon, tag }: SectionProps) => (
    <div className={cn("relative group transition-all duration-500 hover:-translate-y-1 h-full", className)}>
        <div className="absolute -inset-[1px] bg-gradient-to-r from-red-600/50 via-transparent to-red-600/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none" />
        <div className="relative h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                {Icon && <Icon className="w-24 h-24" />}
            </div>
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                <Icon size={20} />
                            </div>
                        )}
                        <div>
                            {tag && <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/80 mb-0.5">{tag}</p>}
                            <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
                        </div>
                    </div>
                </div>
                {children}
            </div>
        </div>
    </div>
);

// Static Content (Mirrored from Legacy)
const defaultContent = {
    hero: {
        tag: 'Enterprise Core · Multi-Venue Mesh',
        title: 'Modern Gastronomi Operasyonlarının Dijital Omurgası.',
        subtitle: 'restin.ai; çevrimdışı öncelikli (offline-first), denetim odaklı (audit-first) ve idempotent mimarisiyle en yüksek operasyonel sürekliliği sağlar.',
        pills: ['Offline-First', 'Audit-First', 'Idempotent Mutations', 'Feature-Flag Modularity'],
        assurances: [
            'Resilient Core: 3 katmanlı failover (Bulut -> Edge -> Yerel)',
            'Veri Bütünlüğü: Hash-chain imzalı immutable günlükler',
            'Ölçeklenebilirlik: Micro-domain izole servis mimarisi',
            'Güvenlik: Kurumsal MFA ve venue-scoped erişim kontrolü'
        ]
    },
    backendSchema: [
        {
            title: 'Ultimate Data Models',
            items: [
                'InventoryItems: Çok lokasyonlu stok & lot takibi',
                'StockLedger: Immutable stok hareket günlüğü',
                'PurchaseOrder & Supplier: Tedarikçi & Satınalma',
                'Invoice: AI destekli fatura & varyans analizi'
            ]
        },
        {
            title: 'Core Architecture',
            items: [
                'Recipe & MenuItem: Otomatik reçete maliyetleri',
                'InternalOrder & ProductionBatch: Merkezi Mutfak (CPU)',
                'Journal & Forecast: COGS & Talep Tahminleme',
                'Observability: Sistem sağlığı & hata yönetimi'
            ]
        }
    ],
    frontendSchema: [
        {
            title: 'Management Interface',
            items: [
                'Central Dashboard: Unified multi-venue monitoring',
                'HR & People: Advanced shift, leave & payroll management',
                'Inventory Core: Reçete and stock lifecycle tracking',
                'Finance Hub: Procurement matching & revenue analysis'
            ]
        },
        {
            title: 'Operational Nodes',
            items: [
                'POS Engine: Offline-capable transaction layer',
                'KDS Station: Real-time kitchen workflow controller',
                'Device Hub: Printer, scanner & terminal orchestration',
                'Test Panel: Live system health & API validation'
            ]
        }
    ],
    menuTable: [
        { menu: 'Envanter', item: 'Stok Hareketleri (Ledger)', route: '/admin/inventory/ledger', status: 'Active', visibility: 'Primary' },
        { menu: 'Satınalma', item: 'AI Fatura OCR', route: '/admin/ai-invoice', status: 'Active', visibility: 'Primary' },
        { menu: 'Operasyon', item: 'Merkezi Mutfak (CPU)', route: '/admin/central-kitchen', status: 'Active', visibility: 'Primary' },
        { menu: 'HR', item: 'Shireburn Indigo Entegrasyonu', route: '/admin/hr/dashboard', status: 'Active', visibility: 'Primary' },
        { menu: 'Sistem', item: 'Talep Tahminleme (AI)', route: '—', status: 'Planned', visibility: 'Upcoming' }
    ],
    architectureLayers: [
        { key: 'cloud', title: 'Global Cloud Plane', description: 'Centralized orchestration, global reporting, and security policy management.' },
        { key: 'edge', title: 'Resilient Edge Gateway', description: 'Local high-performance nodes managing real-time data flow and offline operations.' },
        { key: 'device', title: 'Operational Mesh', description: 'Smart terminal network providing redundant interface and hardware control.' }
    ],
    microservices: [
        { key: 'core', title: 'Core Platform', items: ['Identity & Security', 'Venue Configuration', 'Transaction Engine', 'Global Audit Log'] },
        { key: 'operations', title: 'Operational Suite', items: ['POS/KDS Flow Control', 'Inventory Management', 'Procurement & Finance', 'Device Orchestrator'] },
        { key: 'intelligence', title: 'System Intelligence', items: ['Observability Inbox', 'Self-Healing Retry Engine', 'Event Bus Distribution', 'Advanced Analytics'] }
    ],
    apiSurface: [
        { key: 'auth', method: 'SECURE', path: '/auth/profile', desc: 'Enterprise Identity Management' },
        { key: 'transactions', method: 'SYNC', path: '/ops/orders', desc: 'Real-time order orchestration' },
        { key: 'inventory', method: 'AUDIT', path: '/ops/stock', desc: 'Stock lifecycle & valuation' },
        { key: 'system', method: 'INFO', path: '/ops/health', desc: 'Operational status & health monitoring' }
    ],
    diagrams: [
        {
            key: 'flow',
            title: 'Operational Continuity Flow',
            code: `sequenceDiagram
    participant Terminal
    participant EdgeNode
    participant GlobalCloud
    Terminal->>EdgeNode: Local Commit (Instant)
    EdgeNode->>GlobalCloud: Background Sync
    GlobalCloud-->>EdgeNode: Global Ack
    EdgeNode-->>Terminal: Status Reconcile`
        }
    ],
    security: [
        'Secure Session Rotation with MFA enforcement for management.',
        'Granular permission scopes localized to individual venues.',
        'Cryptographically signed audit logs for tamper-proof history.',
        'Encrypted data transport and storage across all nodes.'
    ]
};

export default function TechnicalHubPage() {
    const [content] = useState(defaultContent);

    return (
        <div className="min-h-screen relative overflow-hidden bg-black text-white" id="technical-docs-root">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black" />

            <header className="sticky top-0 z-40 px-6 py-6 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 p-[1px]">
                            <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center">
                                <Cpu className="text-red-500 w-6 h-6 animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">System Hub</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Technical Blueprint
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <PDFExportButton
                            title="RESTIN.AI TECHNICAL DOSSIER"
                            content={typeof document !== 'undefined' ? document.getElementById('technical-docs-root')?.innerHTML || '' : ''}
                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 space-y-16">

                {/* HERO */}
                <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-start animate-in fade-in duration-700">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase">
                            <Zap size={12} />
                            {content.hero.tag}
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
                            {content.hero.title}
                        </h2>
                        <p className="text-lg text-zinc-400 font-light leading-relaxed">
                            {content.hero.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {content.hero.pills.map(originalPill => (
                                <span key={originalPill} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                                    {originalPill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 relative overflow-hidden">
                        <Shield className="absolute -right-4 -top-4 text-red-600/10 w-48 h-48 rotate-12" />
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-6">Core Assurances</h4>
                        <ul className="space-y-4 relative z-10">
                            {content.hero.assurances.map((item, i) => (
                                <li key={i} className="flex gap-4 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span className="text-sm text-zinc-300 font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* SCHEMAS */}
                <section className="grid md:grid-cols-2 gap-6">
                    <GlassCard title="Entity Schema" icon={Database} tag="Data Layer">
                        <div className="grid sm:grid-cols-2 gap-8 mt-4">
                            {content.backendSchema.map(b => (
                                <div key={b.title} className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500/80">{b.title}</p>
                                    <ul className="space-y-2">
                                        {b.items.map(item => (
                                            <li key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                                                <Activity size={10} className="mt-1 text-zinc-600" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard title="Interface Logic" icon={Layout} tag="Presentation Layer">
                        <div className="grid sm:grid-cols-2 gap-8 mt-4">
                            {content.frontendSchema.map(b => (
                                <div key={b.title} className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500/80">{b.title}</p>
                                    <ul className="space-y-2">
                                        {b.items.map(item => (
                                            <li key={item} className="flex items-start gap-2 text-xs text-zinc-400">
                                                <Zap size={10} className="mt-1 text-zinc-600" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </section>

                {/* TABLE */}
                <GlassCard title="Operational Route Mesh" icon={Network} tag="Routing Engine">
                    <div className="overflow-x-auto mt-6 rounded-xl border border-white/5 bg-black/40">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <tr>
                                    <th className="px-6 py-4">Namespace</th>
                                    <th className="px-6 py-4">Component</th>
                                    <th className="px-6 py-4">Route Persistence</th>
                                    <th className="px-6 py-4 text-red-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                                {content.menuTable.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-white">{row.menu}</td>
                                        <td className="px-6 py-4">{row.item}</td>
                                        <td className="px-6 py-4 font-mono text-zinc-500">{row.route}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* DIAGRAMS & API */}
                <div className="grid md:grid-cols-2 gap-6">
                    <GlassCard title="Secure API Surface" icon={TerminalIcon} tag="Communications Layer">
                        <div className="space-y-3 mt-4">
                            {content.apiSurface.map(api => (
                                <div key={api.key} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-red-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black px-2 py-1 rounded bg-red-500/10 text-red-500">{api.method}</span>
                                        <span className="text-xs font-mono text-zinc-400">{api.path}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard title="Protocol Handshake" icon={Workflow} tag="Integration Patterns">
                        {content.diagrams.map(d => (
                            <div key={d.key} className="mt-4 p-4 bg-black/50 border border-white/5 rounded-lg font-mono text-[10px] leading-relaxed text-emerald-500/80">
                                <pre>{d.code}</pre>
                            </div>
                        ))}
                    </GlassCard>
                </div>

                {/* SECURITY */}
                <section className="border-t border-white/5 pt-12">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Lock className="text-red-500" size={18} />
                        Security Constraints & Governance
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {content.security.map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400">
                                • {item}
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}
