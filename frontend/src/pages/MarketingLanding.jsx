import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/logger';
import api from '../lib/api';

/* ────────────────────────────────────────────────────── */
/*  DEFAULT CONTENT — source of truth until API override  */
/* ────────────────────────────────────────────────────── */
const defaultContent = {
  hero: {
    tag: 'Enterprise-Grade · Offline-First · Europe-Ready',
    title: 'The operating system your restaurants deserve.',
    subtitle: 'restin.ai unifies POS, KDS, inventory, HR, AI copilot, IoT, and 20+ modules into a single resilience-first platform — built for European hospitality groups that refuse to compromise.',
    cardTitle: 'What you get on day one',
    cardItems: [
      'Full POS + KDS with offline resilience',
      'Inventory ledger with immutable audit trail',
      'AI Copilot (Hey Rin) — voice & text intelligence',
      'HR, payroll & workforce management',
      'Smart Home & IoT device control',
      'Observability hub with self-healing retry engine'
    ],
    metrics: [
      { key: 'uptime', value: '99.95%', label: 'Service continuity target' },
      { key: 'modules', value: '22+', label: 'Active production modules' },
      { key: 'venues', value: 'Multi-venue', label: 'Built for scaled groups' }
    ]
  },
  features: [
    {
      key: 'resilience',
      title: 'Zero-Drama Resilience',
      description: 'Offline-first architecture with 3-layer failover: Cloud → Edge → Local. Your service never stops.',
      icon: '🛡️'
    },
    {
      key: 'intelligence',
      title: 'AI-Native Intelligence',
      description: 'Built-in AI copilot, demand forecasting, market radar, and voice control — not bolted-on afterthoughts.',
      icon: '🧠'
    },
    {
      key: 'security',
      title: 'Audit-First Security',
      description: 'Immutable hash-chain logs, idempotent mutations, role-scoped permissions, and MFA enforcement.',
      icon: '🔐'
    },
    {
      key: 'iot',
      title: 'Connected Operations',
      description: 'Direct control of Tuya, Meross, and smart devices. Predictive maintenance and energy monitoring.',
      icon: '📡'
    },
    {
      key: 'compliance',
      title: 'Compliance Built-In',
      description: 'HACCP digital checklists, sustainability tracking, ESG reporting, and allergen management.',
      icon: '✅'
    },
    {
      key: 'speed',
      title: 'Operational Velocity',
      description: 'Faster table turns, smoother kitchens, real-time analytics, and AI-powered demand forecasting.',
      icon: '⚡'
    }
  ],
  modules: [
    {
      key: 'pos', title: 'POS Command Center',
      description: 'Seat-aware ordering, coursing, split checks, and high-velocity service flows with offline resilience.',
      capabilities: ['Seat & course pacing', 'Table transfers', 'Split checks', 'Discount engine'],
      status: 'active'
    },
    {
      key: 'kds', title: 'KDS Orchestration',
      description: 'Station routing, real-time ticket rails, and expo coordination with latency-aware prioritization.',
      capabilities: ['Station routing', 'Expo screens', 'Auto re-fire', 'Course timing'],
      status: 'active'
    },
    {
      key: 'inventory', title: 'Inventory Ledger',
      description: 'Immutable stock ledger, recipe costing, transfers, central kitchen production, and lot tracking.',
      capabilities: ['Ledger-based stock', 'Recipe costing', 'Central kitchen', 'Lot tracking'],
      status: 'active'
    },
    {
      key: 'ai', title: 'AI Copilot (Hey Rin)',
      description: 'Natural language data queries, actionable AI commands, voice control, and multi-provider intelligence.',
      capabilities: ['Ask-data interface', 'Voice control', 'Actionable commands', 'Multi-model'],
      status: 'active'
    },
    {
      key: 'hr', title: 'HR & Workforce',
      description: 'Complete people management: shifts, clocking, leave, payroll, and performance tracking.',
      capabilities: ['Shift management', 'Payroll', 'Leave tracking', 'Clocking'],
      status: 'active'
    },
    {
      key: 'analytics', title: 'Real-Time Analytics',
      description: 'Operational KPIs, labor insights, financial dashboards, and performance monitoring at venue scale.',
      capabilities: ['Live KPIs', 'Labor analytics', 'Financial reports', 'Forecasting'],
      status: 'active'
    },
    {
      key: 'iot', title: 'Smart Home & IoT',
      description: 'Direct device control for Tuya, Meross, and smart equipment with energy monitoring.',
      capabilities: ['Device control', 'Energy monitoring', 'Automation', 'Predictive maintenance'],
      status: 'active'
    },
    {
      key: 'quality', title: 'Quality & HACCP',
      description: 'Digital food safety checklists, allergen management, and compliance tracking.',
      capabilities: ['HACCP checklists', 'Allergen tracking', 'Audit logs', 'Compliance reports'],
      status: 'active'
    },
    {
      key: 'observability', title: 'Observability Hub',
      description: 'Test panel, error inbox, safe retry engine, and full system health monitoring.',
      capabilities: ['Error inbox', 'Retry engine', 'Health monitoring', 'Run artifacts'],
      status: 'active'
    },
    {
      key: 'crm', title: 'CRM & Guest Profiles',
      description: 'Guest preferences, taste tags, churn detection, and personalized marketing.',
      capabilities: ['Guest profiles', 'Taste tags', 'Churn alerts', 'Personalization'],
      status: 'coming_soon'
    },
    {
      key: 'voice', title: 'Voice AI Receptionist',
      description: '24/7 phone answering with auto-reservations, knowledge base, and call analytics.',
      capabilities: ['Auto-answer', 'Reservations', 'Knowledge RAG', 'Call analytics'],
      status: 'coming_soon'
    },
    {
      key: 'payments', title: 'Embedded Payments',
      description: 'Smart settlement workflows, kiosk mode, tap-to-pay, and embedded processing.',
      capabilities: ['Kiosk mode', 'Smart settlement', 'Tap-to-pay', 'Split pay'],
      status: 'coming_soon'
    }
  ],
  pricing: [
    {
      key: 'starter',
      name: 'Starter',
      price: '€199',
      period: '/month',
      yearly: '€2,150 /year',
      tagline: 'For single-location restaurants getting started with modern ops.',
      highlights: [
        'POS + KDS Core',
        'Inventory Ledger Lite',
        'Basic reporting & analytics',
        'Up to 15 staff accounts',
        'Email support'
      ],
      future: ['Mobile waitlist', 'Basic loyalty']
    },
    {
      key: 'professional',
      name: 'Professional',
      price: '€499',
      period: '/month',
      yearly: '€5,400 /year',
      popular: true,
      tagline: 'For ambitious operators who need intelligence & control.',
      highlights: [
        'Everything in Starter',
        'AI Copilot (Hey Rin)',
        'HR & Workforce management',
        'Advanced analytics & forecasting',
        'Quality & HACCP compliance',
        'Smart Home & IoT control',
        'Observability Hub',
        'Up to 50 staff accounts',
        'Priority support'
      ],
      future: ['CRM & guest profiles', 'Marketing automations']
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: '€999',
      period: '/month',
      yearly: '€10,800 /year',
      tagline: 'For multi-venue groups that demand resilience + compliance.',
      highlights: [
        'Everything in Professional',
        'Multi-venue management',
        'Central Kitchen (CPU)',
        'Procurement & supplier management',
        'Sustainability & ESG tracking',
        'Market Radar intelligence',
        'Unlimited staff accounts',
        'Custom workflows & integrations',
        'Dedicated account manager',
        'SLA with priority response'
      ],
      future: ['Voice AI Receptionist', 'Embedded payments', 'Multi-region failover']
    }
  ],
  roadmap: [
    'Voice AI Receptionist — 24/7 phone answering with auto-reservations',
    'CRM & Guest Profiles — Taste tags, churn detection, personalized outreach',
    'Embedded Payments — Kiosk mode, tap-to-pay, smart settlement',
    'Content Studio — AI-powered food photography and social media',
    'Web Architect — Drag & drop website builder synced with live menu',
    'Loyalty Program — Tiers, points, rewards, and referral programs',
    'Marketing Automations — Email, WhatsApp, and Telegram campaigns',
    'Dynamic Scheduling — AI-powered workforce rostering and optimization'
  ],
  cta: {
    title: 'Ready to see it live?',
    subtitle: 'We can onboard a pilot venue in under two weeks.'
  }
};

export default function MarketingLanding() {
  const [content, setContent] = useState(defaultContent);
  const [isPreview, setIsPreview] = useState(false);
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('previewId');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = previewId
          ? await api.get(`/public-content/preview/${previewId}`)
          : await api.get('/public-content/current', { params: { type: 'marketing' } });
        if (response.data?.content) {
          const apiData = response.data.content;
          // Only merge text content from API — pricing/modules stay from code defaults
          setContent({
            ...defaultContent,
            hero: apiData.hero || defaultContent.hero,
            features: apiData.features || defaultContent.features,
            roadmap: apiData.roadmap || defaultContent.roadmap,
            cta: apiData.cta || defaultContent.cta,
          });
          setIsPreview(!!previewId);
        }
      } catch (error) {
        logger.warn('Marketing content fallback used');
      }
    };
    loadContent();
  }, [previewId]);

  const hero = content.hero || defaultContent.hero;
  const features = content.features || defaultContent.features;
  const modulesList = content.modules || defaultContent.modules;
  const pricingList = content.pricing || defaultContent.pricing;
  const roadmapList = content.roadmap || defaultContent.roadmap;
  const cta = content.cta || defaultContent.cta;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505] text-[#F5F5F7]" data-testid="marketing-landing-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .glow-mesh {
          background-image:
            radial-gradient(at 20% 0%, rgba(220, 38, 38, 0.06) 0px, transparent 50%),
            radial-gradient(at 80% 10%, rgba(249, 115, 22, 0.04) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(220, 38, 38, 0.05) 0px, transparent 50%);
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

        .glass-card {
          background: rgba(22, 22, 23, 0.4);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          transition: all 0.5s ease;
        }

        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .gradient-border {
          position: relative;
        }

        .gradient-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.4) 0%, transparent 50%, rgba(220, 38, 38, 0.4) 100%);
          border-radius: 17px;
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
          z-index: -1;
        }

        .gradient-border:hover::before {
          opacity: 1;
        }

        .premium-btn {
          background: linear-gradient(135deg, #DC2626, #B91C1C);
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
          transition: all 0.3s ease;
        }

        .premium-btn:hover {
          box-shadow: 0 0 35px rgba(220, 38, 38, 0.5);
          transform: scale(1.02);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 15px rgba(220, 38, 38, 0.08);
        }

        .tag-pill {
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

        .popular-badge {
          background: linear-gradient(135deg, #DC2626, #F97316);
          color: white;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 9999px;
        }
      `}</style>

      {/* Background Effects */}
      <div className="fixed inset-0 glow-mesh pointer-events-none" />
      <div className="fixed inset-0 scan-line pointer-events-none opacity-30" />

      {isPreview && (
        <div className="fixed top-0 left-0 w-full z-50 text-center py-2 text-[10px] font-black uppercase tracking-widest bg-red-600/20 backdrop-blur-md border-b border-red-600/30 text-red-500" data-testid="marketing-preview-banner">
          Preview Mode · Staged Changes Pending Approval
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 px-6 lg:px-12 py-5 bg-black/40 backdrop-blur-xl border-b border-white/5" data-testid="marketing-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4" data-testid="marketing-brand">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 p-[1px]">
              <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center">
                <span className="text-red-500 text-sm font-black tracking-widest">R</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>restin.ai</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Enterprise Restaurant OS</div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1" data-testid="marketing-nav-links">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Modules', href: '#modules' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Roadmap', href: '#roadmap' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >{item.label}</a>
            ))}
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <a href="/modules" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Module Catalog</a>
            <a href="/technic" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">Technical Hub</a>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/login" className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-white/10" data-testid="marketing-cta-login">
              Operator Login
            </a>
            <button className="premium-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white" data-testid="marketing-cta-primary">
              Start Free Pilot
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">

        {/* ═══════════ HERO ═══════════ */}
        <section className="pt-16 pb-24" data-testid="marketing-hero">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-16 items-start">
            <div className="space-y-8">
              <div className="tag-pill" data-testid="marketing-hero-tag">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {hero.tag}
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.08] tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-hero-title">
                {hero.title.split(' ').map((word, i) => (
                  <span key={i} className={word === 'deserve.' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400' : 'text-white'}>
                    {word}{' '}
                  </span>
                ))}
              </h1>

              <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed font-light" data-testid="marketing-hero-subtitle">
                {hero.subtitle}
              </p>

              <div className="flex flex-wrap gap-3">
                <button className="premium-btn px-6 py-3.5 rounded-xl font-bold text-white" data-testid="marketing-hero-cta-primary">
                  Request a live walkthrough
                </button>
                <a href="/technic" className="px-6 py-3.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all inline-flex items-center gap-2 font-semibold" data-testid="marketing-hero-cta-secondary">
                  View technical blueprint
                  <span className="text-xs">→</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4" data-testid="marketing-hero-metrics">
                {(hero.metrics || defaultContent.hero.metrics).map(metric => (
                  <div key={metric.key} className="glass-card p-5" data-testid={`marketing-stat-${metric.key}`}>
                    <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{metric.value}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Card */}
            <div className="relative group" data-testid="marketing-hero-card">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-red-600/40 via-transparent to-red-600/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none" />
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0 duration-700">
                  <span className="text-8xl">🚀</span>
                </div>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-6" data-testid="marketing-hero-card-title">{hero.cardTitle}</h4>
                <ul className="space-y-4" data-testid="marketing-hero-card-list">
                  {(hero.cardItems || defaultContent.hero.cardItems).map((item, i) => (
                    <li key={i} className="flex gap-4 group/item">
                      <div className="w-6 h-6 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0 group-hover/item:scale-110 transition-transform">
                        <span className="text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-300 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ FEATURES ═══════════ */}
        <section id="features" className="pb-24 scroll-mt-20" data-testid="marketing-features-section">
          <div className="text-center mb-12">
            <div className="tag-pill mx-auto mb-4">Why restin.ai</div>
            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Built different, by design</h2>
            <p className="text-zinc-400 mt-3 max-w-2xl mx-auto">Every architectural decision serves one goal: keep your restaurants running perfectly, no matter what.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div key={feature.key} className="glass-card gradient-border p-6" data-testid={`marketing-feature-${feature.key}`}>
                <div className="feature-icon mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ MODULES ═══════════ */}
        <section id="modules" className="pb-24 scroll-mt-20" data-testid="marketing-modules-section">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="tag-pill mb-4">22+ Active Modules</div>
              <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-modules-title">Modules built to scale</h2>
              <p className="text-zinc-400 mt-3 max-w-xl">Every module is designed as a microservice with shared observability and offline sync.</p>
            </div>
            <a href="/modules" className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all">
              View full catalog <span>→</span>
            </a>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modulesList.map(mod => (
              <div key={mod.key} className={`glass-card gradient-border p-6 ${mod.status === 'coming_soon' ? 'opacity-60' : ''}`} data-testid={`marketing-module-${mod.key}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{mod.title}</h3>
                  {mod.status === 'coming_soon' ? (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Coming Soon</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{mod.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(mod.capabilities || []).map(cap => (
                    <span key={cap} className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${mod.status === 'active'
                      ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15'
                      : 'text-amber-400 bg-amber-500/5 border-amber-500/15'
                      }`}>{cap}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ PRICING ═══════════ */}
        <section id="pricing" className="pb-24 scroll-mt-20" data-testid="marketing-pricing-section">
          <div className="text-center mb-12">
            <div className="tag-pill mx-auto mb-4">Simple Pricing</div>
            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="pricing-title">Pricing aligned to EU market averages</h2>
            <p className="text-zinc-400 mt-3 max-w-2xl mx-auto" data-testid="pricing-subtitle">Transparent packages with future-ready upgrades built in. No hidden fees.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {pricingList.map(plan => (
              <div key={plan.key} className={`glass-card gradient-border p-7 relative ${plan.popular ? 'ring-1 ring-red-600/30' : ''}`} data-testid={`pricing-card-${plan.key}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="popular-badge">Most Popular</span>
                  </div>
                )}
                <div className="text-xs text-zinc-400 mb-2 font-medium" data-testid={`pricing-tagline-${plan.key}`}>{plan.tagline}</div>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid={`pricing-name-${plan.key}`}>{plan.name}</h3>
                <div className="mt-4 flex items-end gap-2" data-testid={`pricing-price-${plan.key}`}>
                  <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{plan.price}</span>
                  <span className="text-sm text-zinc-500 mb-1">{plan.period}</span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-1 font-semibold" data-testid={`pricing-yearly-${plan.key}`}>{plan.yearly}</div>

                <ul className="mt-6 space-y-3" data-testid={`pricing-highlights-${plan.key}`}>
                  {plan.highlights.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="text-emerald-500 mt-0.5 text-xs">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-white/5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2" data-testid={`pricing-future-title-${plan.key}`}>Future-ready additions</div>
                  <ul className="space-y-1.5" data-testid={`pricing-future-${plan.key}`}>
                    {plan.future.map(item => (
                      <li key={item} className="text-xs text-zinc-500 flex items-start gap-2">
                        <span className="text-amber-500/60 mt-0.5">◇</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <button className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${plan.popular
                  ? 'premium-btn text-white'
                  : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`} data-testid={`pricing-cta-${plan.key}`}>
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ ROADMAP ═══════════ */}
        <section id="roadmap" className="pb-24 scroll-mt-20" data-testid="marketing-roadmap-section">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
            <div>
              <div className="tag-pill mb-4">Always Evolving</div>
              <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="roadmap-title">Future roadmap</h2>
              <p className="text-zinc-400 mt-3 leading-relaxed" data-testid="roadmap-subtitle">
                Everything below is already planned and in active development — you keep the same contract tier. No surprise upsells.
              </p>
            </div>
            <div className="glass-card p-6" data-testid="roadmap-list">
              <div className="space-y-4">
                {roadmapList.map((item, i) => (
                  <div key={i} className="relative pl-6 border-l border-white/10 group/item">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-zinc-800 ring-4 ring-[#161617] group-hover/item:bg-red-500 transition-colors" />
                    <p className="text-sm text-zinc-300 group-hover/item:text-white transition-colors font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ FINAL CTA ═══════════ */}
        <section className="pb-24" data-testid="marketing-final-cta">
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-red-600/50 via-transparent to-orange-600/50 rounded-3xl opacity-60 blur-sm pointer-events-none" />
            <div className="relative p-12 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-final-cta-title">{cta.title}</h2>
                <p className="text-zinc-400 mt-2 text-lg" data-testid="marketing-final-cta-subtitle">{cta.subtitle}</p>
              </div>
              <div className="flex gap-4 shrink-0">
                <button className="premium-btn px-6 py-3.5 rounded-xl font-bold text-white" data-testid="marketing-final-cta-demo">
                  Schedule a demo
                </button>
                <a href="/technic" className="px-6 py-3.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all font-semibold" data-testid="marketing-final-cta-tech">
                  Review technical hub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 lg:px-12 py-10" data-testid="marketing-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6 text-sm text-zinc-500">
          <div className="font-medium">© 2026 restin.ai — All rights reserved.</div>
          <div className="flex flex-wrap gap-6">
            <a href="/technic" className="hover:text-white transition-colors" data-testid="marketing-footer-technical">Technical Hub</a>
            <a href="/modules" className="hover:text-white transition-colors" data-testid="marketing-footer-modules">Module Catalog</a>
            <a href="/login" className="hover:text-white transition-colors" data-testid="marketing-footer-login">Operator Login</a>
            <a href="mailto:hello@restin.ai" className="hover:text-white transition-colors" data-testid="marketing-footer-contact">hello@restin.ai</a>
          </div>
        </div>
      </footer>
    </div>
  );
}