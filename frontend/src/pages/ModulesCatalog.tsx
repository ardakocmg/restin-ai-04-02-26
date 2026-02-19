/**
 * Module Catalog — All Restin.AI capabilities
 * Active modules link to their pages. Planned modules show "Coming Soon".
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ShoppingCart, UtensilsCrossed, ChefHat, Warehouse, CalendarDays,
    Smartphone, Activity, FileDown, DollarSign, BarChart3, Users,
    Briefcase, CreditCard, Heart, Mail, Plug, Brain, Mic, Palette,
    Radar, Globe, Building2, GraduationCap, Leaf, ShieldCheck,
    TrendingUp, Home, Music, Truck, Package, Network, Wallet,
    LayoutDashboard, HardDrive, CalendarClock, Sparkles
} from 'lucide-react';

// ─── Module Definitions ──────────────────────────────────────────────────

interface ModuleDef {
    key: string;
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    status: 'active' | 'coming_soon';
    route?: string;
    capabilities: string[];
    pillar?: string;
}

const MODULES: ModuleDef[] = [
    // ─── CORE OPERATIONS ─────────────────
    {
        key: 'pos', title: 'POS Command Center', icon: ShoppingCart,
        gradient: 'from-blue-500 to-indigo-600',
        description: 'Seat-aware ordering, coursing, split checks, and offline queue.',
        status: 'active', route: '/pos',
        capabilities: ['Seat & course pacing', 'Split checks', 'Table transfers', 'Offline queue'],
        pillar: 'Core',
    },
    {
        key: 'kds', title: 'KDS Orchestration', icon: UtensilsCrossed,
        gradient: 'from-orange-500 to-red-600',
        description: 'Ticket routing, expo control, station analytics, and re-fire workflows.',
        status: 'active', route: '/kds',
        capabilities: ['Station routing', 'Expo screens', 'Prep timers', 'Re-fire workflows'],
        pillar: 'Core',
    },
    {
        key: 'menu', title: 'Menu Management', icon: ChefHat,
        gradient: 'from-amber-500 to-orange-600',
        description: 'Categories, modifiers, pricing rules, and allergen management.',
        status: 'active', route: '/manager/inventory/menu',
        capabilities: ['Menu builder', 'Modifiers & extras', 'Allergen icons', 'Multi-language'],
        pillar: 'Core',
    },
    {
        key: 'inventory', title: 'Inventory Ledger', icon: Warehouse,
        gradient: 'from-emerald-500 to-teal-600',
        description: 'Immutable stock ledger with FIFO, recipe costing, and waste logs.',
        status: 'active', route: '/manager/inventory',
        capabilities: ['FIFO ledger', 'Recipe costing', 'Stock transfers', 'Waste tracking'],
        pillar: 'Core',
    },
    {
        key: 'recipe', title: 'Recipe Engineering', icon: Package,
        gradient: 'from-rose-500 to-pink-600',
        description: 'Sub-recipes, yield management, nutritional data, and food cost %.',
        status: 'active', route: '/manager/recipe-engineering',
        capabilities: ['Sub-recipes', 'Yield management', 'Nutritional info', 'Food cost %'],
        pillar: 'Core',
    },
    {
        key: 'reservations', title: 'Reservations', icon: CalendarDays,
        gradient: 'from-violet-500 to-purple-600',
        description: 'Guest bookings, floor plan assignment, and capacity management.',
        status: 'active', route: '/manager/floorplan',
        capabilities: ['Table booking', 'Floor plan', 'Capacity alerts', 'Guest notes'],
        pillar: 'Core',
    },

    // ─── INTELLIGENCE ────────────────────
    {
        key: 'ai', title: 'AI Copilot (Hey Rin)', icon: Brain,
        gradient: 'from-violet-500 to-fuchsia-600',
        description: 'Ask-data interface, actionable AI, and smart query intelligence.',
        status: 'active', route: '/manager/ai/copilot',
        capabilities: ['Natural language queries', 'Actionable commands', 'Voice control', 'Smart data insights'],
        pillar: 'Intelligence',
    },
    {
        key: 'analytics', title: 'Real-Time Analytics', icon: BarChart3,
        gradient: 'from-cyan-500 to-blue-600',
        description: 'Operational intelligence, KPIs, labor insights, and performance alerts.',
        status: 'active', route: '/manager/reports',
        capabilities: ['Live KPIs', 'Labor insights', 'Revenue tracking', 'Custom reports'],
        pillar: 'Intelligence',
    },
    {
        key: 'forecasting', title: 'Demand Forecasting', icon: TrendingUp,
        gradient: 'from-sky-500 to-cyan-600',
        description: 'AI-powered sales forecasting, prep planning, and trend analysis.',
        status: 'active', route: '/manager/forecasting',
        capabilities: ['Sales predictions', 'Prep planning', 'Trend analysis', 'Seasonal modeling'],
        pillar: 'Intelligence',
    },
    {
        key: 'radar', title: 'Market Radar', icon: Radar,
        gradient: 'from-lime-500 to-green-600',
        description: 'Competitor analysis, pricing intelligence, and market insights.',
        status: 'active', route: '/manager/radar',
        capabilities: ['Competitor tracking', 'Price benchmarks', 'Market trends', 'Allergen guard'],
        pillar: 'Intelligence',
    },

    // ─── PEOPLE & OPS ────────────────────
    {
        key: 'hr', title: 'People & HR', icon: Users,
        gradient: 'from-teal-500 to-emerald-600',
        description: 'Staff management, shifts, clocking, payroll, and performance.',
        status: 'active', route: '/manager/hr',
        capabilities: ['Shift scheduling', 'Time & attendance', 'Performance reviews', 'Document vault'],
        pillar: 'People',
    },
    {
        key: 'training', title: 'Training Academy', icon: GraduationCap,
        gradient: 'from-indigo-500 to-blue-600',
        description: 'Staff LMS with video tutorials, quizzes, and onboarding flows.',
        status: 'active', route: '/manager/training',
        capabilities: ['Video tutorials', 'Quizzes', 'Onboarding paths', 'Certification tracking'],
        pillar: 'People',
    },
    {
        key: 'procurement', title: 'Procurement', icon: Truck,
        gradient: 'from-amber-500 to-yellow-600',
        description: 'Supplier management, auto-POs on low stock, and purchase orders.',
        status: 'active', route: '/manager/procurement',
        capabilities: ['Supplier directory', 'Auto-PO triggers', 'Order tracking', 'Cost comparison'],
        pillar: 'Operations',
    },
    {
        key: 'central_kitchen', title: 'Central Kitchen', icon: Building2,
        gradient: 'from-stone-500 to-zinc-600',
        description: 'Multi-branch production, transfers, and central prep management.',
        status: 'active', route: '/manager/central-kitchen',
        capabilities: ['Production planning', 'Branch transfers', 'Prep sheets', 'Batch tracking'],
        pillar: 'Operations',
    },

    // ─── DEVICES & IOT ───────────────────
    {
        key: 'devices', title: 'Devices & IoT', icon: Smartphone,
        gradient: 'from-pink-500 to-rose-600',
        description: 'POS terminals, KDS screens, printers, and device hub management.',
        status: 'active', route: '/manager/sync',
        capabilities: ['Device registry', 'Printer management', 'Health monitoring', 'Remote config'],
        pillar: 'Hardware',
    },
    {
        key: 'smart_home', title: 'Smart Home', icon: Home,
        gradient: 'from-sky-500 to-blue-600',
        description: 'IoT control for lights, sensors, HVAC, and music via Meross/Tuya/Spotify.',
        status: 'active', route: '/manager/smart-home',
        capabilities: ['Light control', 'Temperature sensors', 'Music playback', 'Energy monitoring'],
        pillar: 'Hardware',
    },
    {
        key: 'music', title: 'Restaurant Music', icon: Music,
        gradient: 'from-green-500 to-emerald-600',
        description: 'Spotify integration for restaurant ambiance and playlist management.',
        status: 'active', route: '/manager/smart-home',
        capabilities: ['Spotify playlists', 'Zone audio', 'Volume control', 'Schedule playlists'],
        pillar: 'Hardware',
    },

    // ─── COMPLIANCE & QUALITY ────────────
    {
        key: 'quality', title: 'Quality & HACCP', icon: ShieldCheck,
        gradient: 'from-red-500 to-rose-600',
        description: 'Digital food safety checklists, temperature logs, and compliance tracking.',
        status: 'active', route: '/manager/quality',
        capabilities: ['HACCP checklists', 'Temperature logs', 'Incident reports', 'Audit trails'],
        pillar: 'Compliance',
    },
    {
        key: 'sustainability', title: 'Sustainability & ESG', icon: Leaf,
        gradient: 'from-green-500 to-lime-600',
        description: 'Carbon footprint tracking, waste management, and sustainability scoring.',
        status: 'active', route: '/manager/sustainability',
        capabilities: ['Carbon tracking', 'Waste analytics', 'ESG reports', 'Supplier scoring'],
        pillar: 'Compliance',
    },

    // ─── FINANCE ─────────────────────────
    {
        key: 'finance', title: 'Finance Hub', icon: DollarSign,
        gradient: 'from-yellow-500 to-amber-600',
        description: 'Open orders, closed checks, tips, voids, and financial analysis.',
        status: 'active', route: '/manager/finance',
        capabilities: ['Revenue tracking', 'Void management', 'Tip distribution', 'GL integration'],
        pillar: 'Finance',
    },
    {
        key: 'exports', title: 'Data Exports', icon: FileDown,
        gradient: 'from-zinc-500 to-slate-600',
        description: 'Reports, data exports, and compliance document generation.',
        status: 'active', route: '/manager/reports',
        capabilities: ['PDF/Excel exports', 'Scheduled reports', 'Audit exports', 'API data access'],
        pillar: 'Finance',
    },
    {
        key: 'observability', title: 'Observability Hub', icon: Activity,
        gradient: 'from-purple-500 to-violet-600',
        description: 'System health, error inbox, retry engine, and performance monitoring.',
        status: 'active', route: '/admin/system',
        capabilities: ['Service health', 'Error inbox', 'Retry engine', 'Performance metrics'],
        pillar: 'System',
    },

    // ─── COMING SOON ─────────────────────
    {
        key: 'payroll', title: 'Payroll (Malta)', icon: Briefcase,
        gradient: 'from-slate-500 to-gray-600',
        description: 'Payroll processing, FSS compliance, and tax filings for Malta.',
        status: 'active', route: '/admin/hr/payroll-malta',
        capabilities: ['Pay calculations', 'FSS/NI deductions', 'Payslips', 'Tax filings'],
        pillar: 'Finance',
    },
    {
        key: 'crm', title: 'CRM & Guest Profiles', icon: Heart,
        gradient: 'from-pink-500 to-rose-600',
        description: 'Guest preferences, taste tags, churn detection, and personalized outreach.',
        status: 'active', route: '/admin/crm',
        capabilities: ['Guest profiles', 'Taste tags', 'Churn alerts', 'Hyper-personalized SMS'],
        pillar: 'Growth',
    },
    {
        key: 'loyalty', title: 'Loyalty Program', icon: CreditCard,
        gradient: 'from-amber-500 to-orange-600',
        description: 'Tiers, points, rewards, and gamified guest retention.',
        status: 'active', route: '/admin/loyalty',
        capabilities: ['Point accrual', 'Tier progression', 'Reward redemption', 'Referral programs'],
        pillar: 'Growth',
    },
    {
        key: 'automations', title: 'Marketing Automations', icon: Mail,
        gradient: 'from-blue-500 to-indigo-600',
        description: 'Email, WhatsApp, and Telegram automated campaigns and responders.',
        status: 'active', route: '/admin/ai/marketing',
        capabilities: ['Drip campaigns', 'Trigger-based sends', 'Template builder', 'A/B testing'],
        pillar: 'Growth',
    },
    {
        key: 'connectors', title: 'API Connectors', icon: Plug,
        gradient: 'from-cyan-500 to-teal-600',
        description: 'Admin-configurable integrations with Wolt, Bolt, UberEats, and more.',
        status: 'coming_soon',
        capabilities: ['Aggregator sync', 'Webhook builder', 'OAuth management', 'Rate limiting'],
        pillar: 'Integration',
    },
    {
        key: 'voice_ai', title: 'Voice AI Receptionist', icon: Mic,
        gradient: 'from-violet-500 to-purple-600',
        description: '24/7 AI phone answering with reservation booking and menu queries.',
        status: 'active', route: '/admin/ai/voice',
        capabilities: ['Inbound calls', 'Menu queries', 'Auto-reservations', 'Multi-language'],
        pillar: 'Intelligence',
    },
    {
        key: 'studio', title: 'Content Studio', icon: Palette,
        gradient: 'from-fuchsia-500 to-pink-600',
        description: 'AI-powered content creation for social media, menus, and marketing.',
        status: 'active', route: '/admin/ai/studio',
        capabilities: ['AI food photos', 'Social posts', 'Menu design', 'Brand kit'],
        pillar: 'Growth',
    },
    {
        key: 'website', title: 'Web Architect', icon: Globe,
        gradient: 'from-indigo-500 to-blue-600',
        description: 'Drag & drop website builder synced with your live menu and inventory.',
        status: 'active', route: '/admin/ai/web-builder',
        capabilities: ['Page builder', 'Live menu sync', 'SEO auto-gen', 'Custom domains'],
        pillar: 'Growth',
    },
    {
        key: 'edge_mesh', title: 'Edge + Device Mesh', icon: Network,
        gradient: 'from-slate-500 to-zinc-600',
        description: 'Cloud → Edge → Device failover with offline-first sync and peer redundancy.',
        status: 'coming_soon',
        capabilities: ['Edge gateway', 'Mesh election', 'Sync replay', 'Peer redundancy'],
        pillar: 'Hardware',
    },
    {
        key: 'waitlist', title: 'Mobile Waitlist', icon: CalendarClock,
        gradient: 'from-teal-500 to-cyan-600',
        description: 'Unified mobile waitlist with SMS/WhatsApp notifications and ETA tracking.',
        status: 'coming_soon',
        capabilities: ['Queue management', 'SMS alerts', 'ETA estimates', 'Walk-in tracking'],
        pillar: 'Core',
    },
    {
        key: 'menu_intelligence', title: 'Menu Intelligence', icon: Sparkles,
        gradient: 'from-purple-500 to-fuchsia-600',
        description: 'AI-powered menu optimization, item profitability analysis, and trend insights.',
        status: 'coming_soon',
        capabilities: ['Item profitability', 'Star/Puzzle matrix', 'Price optimization', 'Trend analysis'],
        pillar: 'Intelligence',
    },
    {
        key: 'multi_region', title: 'Multi-Region Failover', icon: HardDrive,
        gradient: 'from-red-500 to-orange-600',
        description: 'Geographic redundancy with automatic failover across EU data centers.',
        status: 'coming_soon',
        capabilities: ['Geo-redundancy', 'Auto-failover', 'Data replication', 'Latency routing'],
        pillar: 'System',
    },
    {
        key: 'embedded_payments', title: 'Embedded Payments', icon: Wallet,
        gradient: 'from-green-500 to-emerald-600',
        description: 'Smart settlement workflows, kiosk mode, and embedded payment processing.',
        status: 'coming_soon',
        capabilities: ['Kiosk mode', 'Smart settlement', 'Tap-to-pay', 'Split payments'],
        pillar: 'Finance',
    },
    {
        key: 'system_diagrams', title: 'System Topology', icon: LayoutDashboard,
        gradient: 'from-indigo-500 to-violet-600',
        description: 'Live system topology diagrams, health maps, and infrastructure visualization.',
        status: 'coming_soon',
        capabilities: ['Live topology', 'Health maps', 'Dependency graphs', 'Alert overlays'],
        pillar: 'System',
    },
    {
        key: 'workforce_scheduling', title: 'Dynamic Scheduling', icon: CalendarClock,
        gradient: 'from-orange-500 to-amber-600',
        description: 'AI-powered workforce scheduling, demand-based rostering, and cost optimization.',
        status: 'coming_soon',
        capabilities: ['Auto-rostering', 'Demand forecasting', 'Cost optimization', 'Shift swaps'],
        pillar: 'People',
    },
];

// ─── Pillar grouping ─────────────────────────────────────────────────────
const PILLAR_ORDER = ['Core', 'Intelligence', 'People', 'Operations', 'Hardware', 'Compliance', 'Finance', 'System', 'Growth', 'Integration'];

function groupByPillar(modules: ModuleDef[]): Map<string, ModuleDef[]> {
    const map = new Map<string, ModuleDef[]>();
    for (const p of PILLAR_ORDER) map.set(p, []);
    for (const m of modules) {
        const p = m.pillar || 'Other';
        if (!map.has(p)) map.set(p, []);
        map.get(p)!.push(m);
    }
    return map;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function ModulesCatalog() {
    const navigate = useNavigate();
    const groups = groupByPillar(MODULES);
    const activeCount = MODULES.filter(m => m.status === 'active').length;
    const comingSoonCount = MODULES.filter(m => m.status === 'coming_soon').length;

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#050505] text-[#F5F5F7]" data-testid="modules-catalog-page">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

                .mc-glow-mesh {
                    background-image:
                        radial-gradient(at 20% 0%, rgba(220, 38, 38, 0.06) 0px, transparent 50%),
                        radial-gradient(at 80% 10%, rgba(249, 115, 22, 0.04) 0px, transparent 50%),
                        radial-gradient(at 50% 100%, rgba(220, 38, 38, 0.05) 0px, transparent 50%);
                }

                @keyframes mc-scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(1000%); }
                }

                .mc-scan-line {
                    position: absolute;
                    width: 100%;
                    height: 100px;
                    background: linear-gradient(to bottom, transparent, rgba(220, 38, 38, 0.02), transparent);
                    animation: mc-scan 8s linear infinite;
                }

                .mc-glass-card {
                    background: rgba(22, 22, 23, 0.4);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    transition: all 0.5s ease;
                }

                .mc-glass-card:hover {
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

                .mc-tag-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 9999px;
                    background: rgba(220, 38, 38, 0.08);
                    border: 1px solid rgba(220, 38, 38, 0.15);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #EF4444;
                }
            `}</style>

            {/* Background Effects */}
            <div className="fixed inset-0 mc-glow-mesh pointer-events-none" />
            <div className="fixed inset-0 mc-scan-line pointer-events-none opacity-30" />

            {/* Header */}
            <header className="sticky top-0 z-40 px-6 lg:px-12 py-5 bg-black/40 backdrop-blur-xl border-b border-white/5" data-testid="modules-nav">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 p-[1px]">
                            <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center">
                                <span className="text-red-500 text-sm font-black tracking-widest">R</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Module Catalog</div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                                {activeCount} active · {comingSoonCount} coming soon
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="/" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Home</a>
                        <a href="/technic" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Technical Hub</a>
                        <a href="/login" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-white/10">Operator Login</a>
                    </div>
                </div>
            </header>

            {/* Module Groups */}
            <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 relative z-10 space-y-16">
                {Array.from(groups.entries()).map(([pillar, modules]) => {
                    if (modules.length === 0) return null;
                    return (
                        <section key={pillar}>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="h-px w-8 bg-gradient-to-r from-red-600/60 to-transparent" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                                    {pillar}
                                </h2>
                                <span className="text-[10px] font-bold text-zinc-600">({modules.length})</span>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {modules.map((mod, i) => (
                                    <motion.div
                                        key={mod.key}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03, duration: 0.3 }}
                                        onClick={() => mod.route && mod.status === 'active' && navigate(mod.route)}
                                        className={`
                                            mc-glass-card group relative p-5
                                            ${mod.status === 'active'
                                                ? 'cursor-pointer hover:border-white/15'
                                                : 'opacity-60'
                                            }
                                        `}
                                        data-testid={`modules-card-${mod.key}`}
                                    >
                                        {/* Icon + Status */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-lg`}>
                                                <mod.icon className="h-5 w-5 text-white" />
                                            </div>
                                            {mod.status === 'coming_soon' ? (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    Coming Soon
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Title & Description */}
                                        <h3 className="text-sm font-bold text-white mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                            {mod.title}
                                        </h3>
                                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                                            {mod.description}
                                        </p>

                                        {/* Capabilities */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {mod.capabilities.map(cap => (
                                                <span
                                                    key={cap}
                                                    className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${mod.status === 'active'
                                                        ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15'
                                                        : 'text-amber-400 bg-amber-500/5 border-amber-500/15'
                                                        }`}
                                                >
                                                    {cap}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Hover arrow for active */}
                                        {mod.status === 'active' && (
                                            <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 text-lg">
                                                →
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 px-6 lg:px-12 py-8" data-testid="modules-footer">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-4 text-sm text-zinc-500">
                    <div className="font-medium">Restin.AI — The Complete Restaurant Operating System</div>
                    <div className="flex gap-6">
                        <a href="/" className="hover:text-white transition-colors">Home</a>
                        <a href="/technic" className="hover:text-white transition-colors">Technical Hub</a>
                        <a href="mailto:hello@restin.ai" className="hover:text-white transition-colors">hello@restin.ai</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
