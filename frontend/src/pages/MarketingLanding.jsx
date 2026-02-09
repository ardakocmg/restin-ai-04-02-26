import React, { useEffect, useState } from 'react';import { logger } from '@/lib/logger';

import { useSearchParams } from 'react-router-dom';import { logger } from '@/lib/logger';

import api from '../lib/api';

import { logger } from '@/lib/logger';
const defaultContent = {
  hero: {
    tag: 'Enterprise-grade, offline-first, Europe-ready',
    title: 'Operate every venue with total control, even when the cloud disappears.',
    subtitle: 'restin.ai unifies POS, KDS, inventory, and observability into a single resilience-first platform built for European hospitality groups.',
    cardTitle: 'What you get on day one',
    cardItems: [
      'Zero‑downtime POS + KDS launch kit',
      'Inventory ledger with immutable audit trail',
      'Observability hub with safe retry flows',
      'Edge gateway for offline failover'
    ],
    metrics: [
      { key: 'uptime', value: '99.95%', label: 'Service continuity target' },
      { key: 'latency', value: '<50ms', label: 'Edge response time' },
      { key: 'venues', value: 'Multi‑venue', label: 'Built for scaled groups' }
    ]
  },
  features: [
    {
      key: 'resilience',
      title: 'Zero-Drama Resilience',
      description: 'Offline-first architecture keeps service alive even when connectivity drops.'
    },
    {
      key: 'security',
      title: 'Security You Can Audit',
      description: 'Immutable logs, idempotent retries, and role-scoped permissions.'
    },
    {
      key: 'speed',
      title: 'Operational Velocity',
      description: 'Faster table turns, smoother kitchens, fewer breakpoints.'
    }
  ],
  modules: [
    {
      key: 'pos',
      title: 'POS Command Center',
      description: 'Seat-aware ordering, coursing, split checks, and high‑velocity service flows with offline resilience.',
      capabilities: ['Seat & course pacing', 'Table transfers', 'Split checks']
    },
    {
      key: 'kds',
      title: 'KDS Orchestration',
      description: 'Station routing, real‑time ticket rails, and expo coordination with latency‑aware prioritization.',
      capabilities: ['Station routing', 'Expo screens', 'Auto re-fire']
    },
    {
      key: 'inventory',
      title: 'Inventory Ledger',
      description: 'Immutable stock ledger, recipe costing, transfers, and production management.',
      capabilities: ['Ledger-based stock', 'Recipe costing', 'Transfers']
    },
    {
      key: 'observability',
      title: 'Observability Hub',
      description: 'Test panel, error inbox, and safe retry engine with full run artifacts.',
      capabilities: ['Test panel', 'Error inbox', 'Retry engine']
    },
    {
      key: 'edge',
      title: 'Edge + Device Mesh',
      description: 'Cloud → Edge → Device failover with offline-first data sync and peer redundancy.',
      capabilities: ['Offline sync', 'Device mesh', 'Edge gateway']
    },
    {
      key: 'analytics',
      title: 'Real-Time Analytics',
      description: 'Operational KPIs, labor insights, and performance monitoring at venue scale.',
      capabilities: ['Live KPIs', 'Labor analytics', 'Compliance dashboards']
    }
  ],
  pricing: [
    {
      key: 'basic',
      name: 'Basic',
      price: '€299',
      period: '/month',
      yearly: '€3,050 /year (avg EU rate)',
      tagline: 'For single-location teams modernizing fast service.',
      highlights: ['POS + KDS Core', 'Inventory Ledger Lite', 'Daily Reports', 'Standard Support'],
      future: ['Unified mobile waitlist', 'Basic loyalty cards']
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '€699',
      period: '/month',
      yearly: '€7,100 /year (avg EU rate)',
      tagline: 'For multi‑venue operators who need visibility & control.',
      highlights: ['Everything in Basic', 'Observability Hub', 'Edge Gateway (1 site)', 'Advanced analytics', 'Role-based permissions'],
      future: ['Automated procurement', 'Menu intelligence insights']
    },
    {
      key: 'business',
      name: 'Business',
      price: '€1,290',
      period: '/month',
      yearly: '€13,100 /year (avg EU rate)',
      tagline: 'For enterprise groups that demand resilience + compliance.',
      highlights: ['Everything in Pro', 'Device Mesh redundancy', 'Custom workflows', 'Security + audit suite', 'SLA with priority response'],
      future: ['Multi-region failover', 'AI service optimization']
    }
  ],
  roadmap: [
    'Mermaid-based system diagrams + live topology',
    'Automated backup validation and restore drills',
    'Unified guest intelligence & CRM insights',
    'Dynamic workforce scheduling and forecasting',
    'Embedded payments & smart settlement workflows'
  ],
  cta: {
    title: 'Ready to see it live?',
    subtitle: 'We can onboard a pilot venue in under two weeks.'
  }
};

const featureBullets = defaultContent.features;
const modules = defaultContent.modules;
const pricing = defaultContent.pricing;
const roadmap = defaultContent.roadmap;

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
          setContent({ ...defaultContent, ...response.data.content });
          setIsPreview(!!previewId);
        }
      } catch (error) {
        logger.warn('Marketing content fallback used');
      }
    };
    loadContent();
  }, [previewId]);

  const hero = content.hero || defaultContent.hero;
  const features = content.features || featureBullets;
  const modulesList = content.modules || modules;
  const pricingList = content.pricing || pricing;
  const roadmapList = content.roadmap || roadmap;
  const cta = content.cta || defaultContent.cta;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0B', color: '#F5F5F7' }} data-testid="marketing-landing-page">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap');`}</style>

      {isPreview && (
        <div className="w-full text-center py-2 text-xs" style={{ backgroundColor: 'rgba(229,57,53,0.2)' }} data-testid="marketing-preview-banner">
          Preview mode — changes not yet approved
        </div>
      )}

      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-16 py-6" data-testid="marketing-nav">
        <div className="flex items-center gap-3" data-testid="marketing-brand">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(140deg, #E53935, #F97316)' }}>
            <span className="text-sm font-bold">RA</span>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>restin.ai</div>
            <div className="text-xs text-zinc-400">Enterprise Hospitality OS</div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-6 text-sm text-zinc-300" data-testid="marketing-nav-links">
          <a href="#features" data-testid="marketing-nav-features">Features</a>
          <a href="#modules" data-testid="marketing-nav-modules">Modules</a>
          <a href="/modules" data-testid="marketing-nav-modules-page">Module Catalog</a>
          <a href="#pricing" data-testid="marketing-nav-pricing">Pricing</a>
          <a href="#roadmap" data-testid="marketing-nav-roadmap">Future</a>
          <a href="/technic" data-testid="marketing-nav-technical">Technical Hub</a>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full text-xs border" style={{ borderColor: 'rgba(255,255,255,0.2)' }} data-testid="marketing-language-pill">
            EN · Multi-language ready
          </div>
          <button className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#1F1F23' }} data-testid="marketing-cta-secondary">
            Book Demo
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#E53935' }} data-testid="marketing-cta-primary">
            Start Pilot
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-16 pt-10 pb-20" data-testid="marketing-hero">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <div className="text-sm text-zinc-400 mb-4" data-testid="marketing-hero-tag">{hero.tag}</div>
            <h1 className="text-4xl lg:text-6xl font-semibold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-hero-title">
              {hero.title}
            </h1>
            <p className="mt-5 text-lg text-zinc-300" data-testid="marketing-hero-subtitle">
              {hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="px-5 py-3 rounded-xl font-semibold" style={{ backgroundColor: '#E53935' }} data-testid="marketing-hero-cta-primary">
                Request a live walkthrough
              </button>
              <a
                href="/technic"
                className="px-5 py-3 rounded-xl border inline-flex items-center"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                data-testid="marketing-hero-cta-secondary"
              >
                View technical blueprint
              </a>
            </div>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm" data-testid="marketing-hero-metrics">
              {(hero.metrics || defaultContent.hero.metrics).map((metric) => (
                <div key={metric.key} className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} data-testid={`marketing-stat-${metric.key}`}>
                  <div className="text-xl font-semibold">{metric.value}</div>
                  <div className="text-zinc-400">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-8" style={{ background: 'linear-gradient(140deg, rgba(229,57,53,0.2), rgba(14,14,16,0.8))' }} data-testid="marketing-hero-card">
            <h3 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-hero-card-title">{hero.cardTitle}</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300" data-testid="marketing-hero-card-list">
              {(hero.cardItems || defaultContent.hero.cardItems).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 lg:px-16 pb-20" data-testid="marketing-features-section">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.key} className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} data-testid={`marketing-feature-${feature.key}`}>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{feature.title}</h3>
              <p className="mt-3 text-sm text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="px-6 lg:px-16 pb-20" data-testid="marketing-modules-section">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-modules-title">Modules built to scale</h2>
            <p className="text-zinc-400 mt-2">Every module is designed as a microservice with shared observability and offline sync.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulesList.map((module) => (
            <div key={module.key} className="p-6 rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(20,20,24,0.8)' }} data-testid={`marketing-module-${module.key}`}>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{module.title}</h3>
              <p className="mt-3 text-sm text-zinc-400">{module.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 lg:px-16 pb-20" data-testid="marketing-pricing-section">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="pricing-title">Pricing aligned to EU market averages</h2>
          <p className="text-zinc-400 mt-2" data-testid="pricing-subtitle">Transparent packages with future-ready upgrades built in.</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {pricingList.map((plan) => (
            <div key={plan.key} className="p-6 rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(15,15,18,0.9)' }} data-testid={`pricing-card-${plan.key}`}>
              <div className="text-sm text-zinc-400" data-testid={`pricing-tagline-${plan.key}`}>{plan.tagline}</div>
              <h3 className="text-2xl font-semibold mt-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid={`pricing-name-${plan.key}`}>{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2" data-testid={`pricing-price-${plan.key}`}>
                <span className="text-4xl font-semibold">{plan.price}</span>
                <span className="text-sm text-zinc-400">{plan.period}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-2" data-testid={`pricing-yearly-${plan.key}`}>{plan.yearly}</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300" data-testid={`pricing-highlights-${plan.key}`}>
                {plan.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-zinc-500" data-testid={`pricing-future-title-${plan.key}`}>Future-ready additions</div>
              <ul className="mt-2 space-y-1 text-xs text-zinc-400" data-testid={`pricing-future-${plan.key}`}>
                {plan.future.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <button className="mt-6 w-full py-2 rounded-lg" style={{ backgroundColor: '#E53935' }} data-testid={`pricing-cta-${plan.key}`}>
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="px-6 lg:px-16 pb-20" data-testid="marketing-roadmap-section">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
          <div>
            <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="roadmap-title">Future roadmap</h2>
            <p className="text-zinc-400 mt-3" data-testid="roadmap-subtitle">Everything below is already planned — you keep the same contract tier.</p>
          </div>
          <div className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} data-testid="roadmap-list">
            <ul className="space-y-2 text-sm text-zinc-300">
              {roadmapList.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-16 pb-20" data-testid="marketing-final-cta">
        <div className="p-10 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-6" style={{ background: 'linear-gradient(140deg, rgba(229,57,53,0.3), rgba(20,20,25,0.9))' }}>
          <div>
            <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="marketing-final-cta-title">{cta.title}</h2>
            <p className="text-zinc-300 mt-2" data-testid="marketing-final-cta-subtitle">{cta.subtitle}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-3 rounded-lg" style={{ backgroundColor: '#F97316' }} data-testid="marketing-final-cta-demo">
              Schedule a demo
            </button>
            <a
              href="/technic"
              className="px-5 py-3 rounded-lg border inline-flex items-center"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              data-testid="marketing-final-cta-tech"
            >
              Review technical hub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-16 pb-12 text-sm text-zinc-500" data-testid="marketing-footer">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>© 2026 restin.ai — All rights reserved.</div>
          <div className="flex gap-4">
            <a href="/technic" data-testid="marketing-footer-technical">Technical Hub</a>
            <a href="/modules" data-testid="marketing-footer-modules">Module Catalog</a>
            <a href="/login" data-testid="marketing-footer-login">Operator Login</a>
            <a href="mailto:hello@restin.ai" data-testid="marketing-footer-contact">hello@restin.ai</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
