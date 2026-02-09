import {
  Shield,
  Cpu,
  Layers,
  Workflow,
  Database,
  Globe,
  Zap,
  Lock,
  Code2,
  Terminal as TerminalIcon,
  Activity,
  FileText,
  Layout,
  Network,
  Settings,
  Briefcase
} from 'lucide-react';import { logger } from '@/lib/logger';

import api from '../lib/api';import { logger } from '@/lib/logger';

import PDFExportButton from '../components/PDFExportButton';

import { logger } from '@/lib/logger';
const GlassCard = ({ children, className = "", title, icon: Icon, tag }) => (
  <div className={`relative group transition-all duration-500 hover:-translate-y-1 ${className}`}>
    <div className="absolute -inset-[1px] bg-gradient-to-r from-red-600/50 via-transparent to-red-600/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none" />
    <div className="relative h-full bg-[#161617]/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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

const defaultContent = {
  hero: {
    tag: 'Enterprise Core · Multi-Venue Mesh',
    title: 'Modern Gastronomi Operasyonlarının Dijital Omurgası.',
    subtitle: 'restin.ai; çevrimdışı öncelikli (offline-first), denetim odaklı (audit-first) ve idempotent mimarisiyle en yüksek operasyonel sürekliliği sağlar. Ultimate paket özellikleriyle tam uyumlu, modüler ve güvenli altyapı.',
    pills: ['Offline-First', 'Audit-First', 'Idempotent Mutations', 'Feature-Flag Modularity'],
    assurances: [
      'Resilient Core: 3 katmanlı failover (Bulut → Edge → Yerel)',
      'Veri Bütünlüğü: Hash-chain imzalı immutable günlükler',
      'Ölçeklenebilirlik: Micro-domain izole servis mimarisi',
      'Güvenlik: Kurumsal MFA ve venue-scoped erişim kontrolü'
    ]
  },
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
  menuMap: [
    { title: 'Global Admin', items: ['Operations Control', 'Observability', 'People Management', 'Inventory Ledger', 'Financial Reporting'] },
    { title: 'POS Operations', items: ['Table Management', 'Order Routing', 'Payment Processing', 'Offline Resilience'] },
    { title: 'Kitchen Control', items: ['Ticket Prioritization', 'Station Routing', 'Timing Analysis'] }
  ],
  menuTable: [
    { menu: 'Envanter', item: 'Stok Hareketleri (Ledger)', route: '/admin/inventory/ledger', status: 'Active', visibility: 'Primary' },
    { menu: 'Satınalma', item: 'AI Fatura OCR', route: '/admin/ai-invoice', status: 'Active', visibility: 'Primary' },
    { menu: 'Operasyon', item: 'Merkezi Mutfak (CPU)', route: '/admin/central-kitchen', status: 'Active', visibility: 'Primary' },
    { menu: 'HR', item: 'Shireburn Indigo Entegrasyonu', route: '/admin/hr/dashboard', status: 'Active', visibility: 'Primary' },
    { menu: 'Sistem', item: 'Talep Tahminleme (AI)', route: '—', status: 'Planned', visibility: 'Upcoming' }
  ],
  eventFlows: [
    {
      title: 'İşlem Yaşam Döngüsü',
      description: 'POS\'tan Finans ve Envantere bir siparişin yolculuğu.',
      steps: [
        'POS Yakalama → Yerel Önbellek',
        'Edge Sync → Bulut Kaydı',
        'Envanter: Reçete tabanlı otomatik stok düşümü',
        'Finans: Gelir ve COGS defter kaydı oluşturma'
      ]
    },
    {
      title: 'Tedarik Zinciri Akışı',
      description: 'Satınalmadan terminal stok mevcudiyetine.',
      steps: [
        'Satınalma Siparişi Onayı (PO Approval)',
        'Mal Kabul ve Kalite Kontrol (GRN)',
        'Stok Defteri Değerlemesi (WAC/FIFO)',
        'Envanter Mevcudiyet Güncellemeleri'
      ]
    },
    {
      title: 'Sistem Kendi Kendini İyileştirme',
      description: 'Otomatik hata algılama ve kurtarma.',
      steps: [
        'Küresel Gelen Kutusunda Hata Yakalama',
        'Otomatik Yeniden Deneme Analizi',
        'Idempotent Payload Yeniden Oynatma',
        'Çözüm Doğrulama ve Raporlama'
      ]
    }
  ],
  ultimateDoc: {
    title: 'Professional Service Dossier',
    body: `Executive Overview

The system is engineered as a robust, domain-driven platform tailored for high-stakes hospitality environments. It integrates advanced operational logic with enterprise-grade resilience and observability.

Strategic Pillars:
• Resilience: High-availability design ensuring zero downtime during internet outages.
• Traceability: Every action is logged with immutable signatures for complete audit control.
• Precision: Real-time inventory and financial calculations based on recipe-level data.
• Extensibility: Modern API-first architecture allowing for seamless third-party integrations.

Key Capabilities:
Advanced Inventory Management: Real-time tracking across multiple locations with automated cost valuations and variance alerts.
Professional Procurement: Full lifecycle management from purchase requests to automated invoice matching and supplier performance metrics.
Unified Operational Hub: Centralized control for POS, KDS, and backend management, providing a "single source of truth" for the entire enterprise.`,
  },
  architectureLayers: [
    {
      key: 'cloud',
      title: 'Global Cloud Plane',
      description: 'Centralized orchestration, global reporting, and security policy management.'
    },
    {
      key: 'edge',
      title: 'Resilient Edge Gateway',
      description: 'Local high-performance nodes managing real-time data flow and offline operations.'
    },
    {
      key: 'device',
      title: 'Operational Mesh',
      description: 'Smart terminal network providing redundant interface and hardware control.'
    }
  ],
  microservices: [
    {
      key: 'core',
      title: 'Core Platform',
      items: ['Identity & Security', 'Venue Configuration', 'Transaction Engine', 'Global Audit Log']
    },
    {
      key: 'operations',
      title: 'Operational Suite',
      items: ['POS/KDS Flow Control', 'Inventory Management', 'Procurement & Finance', 'Device Orchestrator']
    },
    {
      key: 'intelligence',
      title: 'System Intelligence',
      items: ['Observability Inbox', 'Self-Healing Retry Engine', 'Event Bus Distribution', 'Advanced Analytics']
    }
  ],
  templates: [
    {
      key: 'inventory',
      title: 'Inventory Item Template',
      code: `{
  "item_id": "item_123",
  "name": "Mozerella Peyniri",
  "uom": "kg",
  "cost_method": "WAC",
  "current_cost": 120.50,
  "lot_tracking": true,
  "expiry_tracking": true
}`
    },
    {
      key: 'ledger',
      title: 'Stock Ledger Transaction',
      code: `{
  "event_type": "STOCK_OUT",
  "sub_type": "SALE",
  "quantity": -2,
  "unit_cost": 26.56,
  "hash": "edcba09876543210",
  "timestamp": "2026-02-15T18:25Z"
}`
    }
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
  apiSurface: [
    { key: 'auth', method: 'SECURE', path: '/auth/profile', desc: 'Enterprise Identity Management' },
    { key: 'transactions', method: 'SYNC', path: '/ops/orders', desc: 'Real-time order orchestration' },
    { key: 'inventory', method: 'AUDIT', path: '/ops/stock', desc: 'Stock lifecycle & valuation' },
    { key: 'system', method: 'INFO', path: '/ops/health', desc: 'Operational status & health monitoring' }
  ],
  security: [
    'Secure Session Rotation with MFA enforcement for management.',
    'Granular permission scopes localized to individual venues.',
    'Cryptographically signed audit logs for tamper-proof history.',
    'Encrypted data transport and storage across all nodes.'
  ]
};

export default function TechnicalHub() {
  const [content, setContent] = useState(defaultContent);
  const [isPreview, setIsPreview] = useState(false);
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('previewId');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = previewId
          ? await api.get(`/public-content/preview/${previewId}`)
          : await api.get('/public-content/current', { params: { type: 'technical' } });
        if (response.data?.content) {
          setContent({ ...defaultContent, ...response.data.content });
          setIsPreview(!!previewId);
        }
      } catch (error) {
        logger.warn('Technical content fallback used');
      }
    };
    loadContent();
  }, [previewId]);

  const hero = content.hero || defaultContent.hero;
  const frontendSchema = content.frontendSchema || defaultContent.frontendSchema;
  const backendSchema = content.backendSchema || defaultContent.backendSchema;
  const menuMap = content.menuMap || defaultContent.menuMap;
  const menuTable = content.menuTable || defaultContent.menuTable;
  const eventFlows = content.eventFlows || defaultContent.eventFlows;
  const architectureLayers = content.architectureLayers || defaultContent.architectureLayers;
  const microservices = content.microservices || defaultContent.microservices;
  const templates = content.templates || defaultContent.templates;
  const diagrams = content.diagrams || defaultContent.diagrams;
  const apiSurface = content.apiSurface || defaultContent.apiSurface;
  const security = content.security || defaultContent.security;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505]" style={{ color: '#F5F5F7' }} data-testid="technical-hub-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .glow-mesh {
          background-image: 
            radial-gradient(at 0% 0%, rgba(220, 38, 38, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(220, 38, 38, 0.03) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(220, 38, 38, 0.05) 0px, transparent 50%);
        }

        .premium-mask {
          mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }

        .scan-line {
          position: absolute;
          width: 100%;
          height: 100px;
          background: linear-gradient(to bottom, transparent, rgba(220, 38, 38, 0.02), transparent);
          animation: scan 8s linear infinite;
        }
      `}</style>

      {/* Background Effects */}
      <div className="fixed inset-0 glow-mesh pointer-events-none" />
      <div className="fixed inset-0 scan-line pointer-events-none opacity-50" />

      {isPreview && (
        <div className="fixed top-0 left-0 w-full z-50 text-center py-2 text-[10px] font-black uppercase tracking-widest bg-red-600/20 backdrop-blur-md border-b border-red-600/30 text-red-500">
          Preview Mode · Staged Changes Pending Approval
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 px-6 lg:px-12 py-6 bg-black/40 backdrop-blur-xl border-b border-white/5">
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
              <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Technical Blueprint <span className="text-zinc-500 font-light">v4.0</span>
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Genel Bakış', href: '#technical-content', icon: Layout },
              { label: 'Altyapı', href: '#architecture', icon: Layers },
              { label: 'Entegrasyon', href: '#api', icon: Globe }
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
              >
                <item.icon size={14} />
                {item.label}
              </a>
            ))}
            <div className="h-4 w-[1px] bg-white/10 mx-2 hidden sm:block" />
            <PDFExportButton
              title="restin.ai Technical Dossier"
              content={document.getElementById('full-dossier-root')?.innerHTML || 'Technical Documentation'}
              className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-transform active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
            />
          </nav>
        </div>
      </header>

      <main id="full-dossier-root" className="max-w-7xl mx-auto px-6 lg:px-12 py-12 relative z-10">

        {/* HERO SECTION */}
        <section id="technical-content" className="mb-24">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-start">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase">
                <Zap size={12} />
                {hero.tag}
              </div>
              <h2 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tighter text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {hero.title.split('.').map((part, i) => (
                  <span key={i} className={i === 1 ? "text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400" : ""}>
                    {part}{i === 0 ? '.' : ''}
                  </span>
                ))}
              </h2>
              <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed font-light">
                {hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                {(hero.pills || defaultContent.hero.pills).map((pill) => (
                  <div key={pill} className="px-5 py-3 rounded-2xl bg-[#161617]/50 backdrop-blur-md border border-white/5 text-sm font-semibold text-zinc-300 shadow-xl">
                    {pill}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 transition-transform group-hover:rotate-0 duration-700">
                <Shield className="w-32 h-32 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-6">Core Assurances</h4>
              <ul className="space-y-6">
                {(hero.assurances || defaultContent.hero.assurances).map((item, i) => (
                  <li key={i} className="flex gap-4 group/item">
                    <div className="w-6 h-6 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0 group-hover/item:scale-110 transition-transform">
                      <Zap size={12} fill="currentColor" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>


        {/* SCHEMAS GRID */}
        <section id="schemas" className="mb-24 scroll-mt-32">
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard title="Entity Schema" icon={Database} tag="Data Layer">
              <div className="grid sm:grid-cols-2 gap-8 mt-4">
                {backendSchema.map((block) => (
                  <div key={block.title} className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-red-500/80">{block.title}</p>
                    <ul className="space-y-3">
                      {block.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 group/li">
                          <Activity size={12} className="text-zinc-600 mt-0.5 group-hover/li:text-red-500 transition-colors" />
                          <span className="text-xs text-zinc-400 group-hover/li:text-zinc-200 transition-colors">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Interface Logic" icon={Layout} tag="Presentation Layer">
              <div className="grid sm:grid-cols-2 gap-8 mt-4">
                {frontendSchema.map((block) => (
                  <div key={block.title} className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-red-500/80">{block.title}</p>
                    <ul className="space-y-3">
                      {block.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 group/li">
                          <Zap size={12} className="text-zinc-600 mt-0.5 group-hover/li:text-red-500 transition-colors" />
                          <span className="text-xs text-zinc-400 group-hover/li:text-zinc-200 transition-colors">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="mt-6">
            <GlassCard title="Operational Route Mesh" icon={Network} tag="Routing Engine" className="w-full">
              <div className="overflow-x-auto mt-6 rounded-2xl border border-white/5 bg-black/40">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Namespace</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Component</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Route Persistence</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Deployment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {menuTable.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-zinc-200 px-2 py-1 rounded bg-white/5">{row.menu}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white text-sm">{row.item}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-zinc-500 group-hover:text-zinc-300">{row.route}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${row.status === 'Active' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                              {row.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* FLOWS AND ARCHITECTURE */}
        <div className="grid lg:grid-cols-2 gap-6 mb-24">
          <GlassCard title="Resilience Layers" icon={Layers} tag="Infrastructure Architecture">
            <div className="space-y-6 mt-6">
              {architectureLayers.map((layer) => (
                <div key={layer.key} className="relative pl-6 border-l border-white/10 group/layer">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-zinc-800 ring-4 ring-[#050505] group-hover/layer:bg-red-500 transition-colors" />
                  <h5 className="text-sm font-bold text-white mb-1">{layer.title}</h5>
                  <p className="text-xs text-zinc-400 group-hover/layer:text-zinc-300 transition-colors uppercase tracking-tight">{layer.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Cluster Topology" icon={Cpu} tag="Microservice Mesh">
            <div className="grid grid-cols-2 gap-6 mt-6">
              {microservices.map((service) => (
                <div key={service.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">{service.title}</h5>
                  <ul className="space-y-2">
                    {service.items.map(item => (
                      <li key={item} className="text-[10px] font-medium text-zinc-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* CODE & API */}
        <section id="code-architecture" className="mb-24 scroll-mt-32">
          <div className="grid lg:grid-cols-[1fr_0.8fr] gap-6">
            <GlassCard title="Secure API Surface" icon={TerminalIcon} tag="Communications Layer">
              <div className="space-y-3 mt-6">
                {apiSurface.map((api) => (
                  <div key={api.key} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="px-2 py-1 rounded bg-red-600/10 border border-red-600/20 text-[10px] font-black text-red-500">
                        {api.method}
                      </div>
                      <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200">{api.path}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter italic">{api.desc.slice(0, 30)}...</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Protocol Handshake" icon={Workflow} tag="Integration Patterns">
              <div className="space-y-6 mt-6">
                {diagrams.map(diagram => (
                  <div key={diagram.key} className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{diagram.title}</label>
                    <div className="p-4 rounded-xl bg-black border border-white/5 font-mono text-[10px] leading-relaxed text-emerald-500/80">
                      {diagram.code.split('\n').map((line, i) => (
                        <div key={i} className="pl-2 border-l border-emerald-500/20">{line}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* SECURITY FOOTER */}
        <section className="pb-24 border-t border-white/5 pt-12">
          <div className="grid md:grid-cols-[1fr_300px] gap-12 items-center">
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Lock className="text-red-500" size={18} />
                Security Constraints & Governance
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {security.map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-zinc-400 font-medium">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-red-600/5 border border-red-600/10 text-center">
              <Shield className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h5 className="text-sm font-bold text-white mb-1">Audit-First Policy</h5>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                Every mutation is hashed and chained. Non-repudiation is strictly enforced at the platform core.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Action Button for Support */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_35px_rgba(220,38,38,0.4)] transition-transform active:scale-95 hover:scale-105">
          <Activity size={24} />
        </button>
      </div>

    </div>
  );
}
