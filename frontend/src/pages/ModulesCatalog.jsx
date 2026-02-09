import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

import { useSearchParams } from 'react-router-dom';

import api from '../lib/api';

const defaultModulesContent = {
  hero: {
    title: 'Module Catalog',
    subtitle: 'Every capability, service, and workflow module with EU-ready defaults.'
  },
  modules: [
    {
      key: 'pos',
      title: 'POS Command Center',
      description: 'Seat-aware ordering, coursing, and split checks designed for high-volume service.',
      capabilities: ['Seat & course pacing', 'Split checks', 'Table transfers', 'Offline queue']
    },
    {
      key: 'kds',
      title: 'KDS Orchestration',
      description: 'Ticket routing, expo control, and station-level analytics.',
      capabilities: ['Station routing', 'Expo screens', 'Prep timers', 'Re-fire workflows']
    },
    {
      key: 'inventory',
      title: 'Inventory Ledger',
      description: 'Immutable stock ledger with recipe costing and procurement.',
      capabilities: ['Ledger entries', 'Recipe costing', 'Stock transfers', 'Waste logs']
    },
    {
      key: 'observability',
      title: 'Observability Hub',
      description: 'System test panel, error inbox, and safe retry orchestration.',
      capabilities: ['Test panel', 'Error inbox', 'Retry engine', 'Step timeline']
    },
    {
      key: 'edge',
      title: 'Edge + Device Mesh',
      description: 'Local gateway with peer redundancy for offline resilience.',
      capabilities: ['Edge gateway', 'Mesh election', 'Sync replay', 'Local cache']
    },
    {
      key: 'analytics',
      title: 'Real-Time Analytics',
      description: 'Operational intelligence across venues.',
      capabilities: ['Live KPIs', 'Labor insights', 'Performance alerts', 'Compliance tracking']
    }
  ]
};

export default function ModulesCatalog() {
  const [content, setContent] = useState(defaultModulesContent);
  const [isPreview, setIsPreview] = useState(false);
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('previewId');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = previewId
          ? await api.get(`/public-content/preview/${previewId}`)
          : await api.get('/public-content/current', { params: { type: 'modules' } });
        if (response.data?.content) {
          setContent({ ...defaultModulesContent, ...response.data.content });
          setIsPreview(!!previewId);
        }
      } catch (error) {
        logger.warn('Module catalog fallback used');
      }
    };
    loadContent();
  }, [previewId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0B', color: '#F5F5F7' }} data-testid="modules-catalog-page">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      {isPreview && (
        <div className="w-full text-center py-2 text-xs" style={{ backgroundColor: 'rgba(229,57,53,0.2)' }} data-testid="modules-preview-banner">
          Preview mode — changes not yet approved
        </div>
      )}
      <nav className="px-6 lg:px-16 py-6 flex items-center justify-between" data-testid="modules-nav">
        <div>
          <div className="text-xs text-zinc-400">Modules</div>
          <div className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="modules-title">{content.hero?.title}</div>
        </div>
        <div className="flex gap-4 text-sm text-zinc-300">
          <a href="/" data-testid="modules-nav-home">Sales Home</a>
          <a href="/technic" data-testid="modules-nav-technical">Technical Hub</a>
        </div>
      </nav>

      <section className="px-6 lg:px-16 pb-12" data-testid="modules-hero">
        <p className="text-zinc-300" data-testid="modules-subtitle">{content.hero?.subtitle}</p>
      </section>

      <section className="px-6 lg:px-16 pb-20" data-testid="modules-list">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(content.modules || defaultModulesContent.modules).map((module) => (
            <div
              key={module.key}
              className="p-6 rounded-2xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(20,20,24,0.8)' }}
              data-testid={`modules-card-${module.key}`}
            >
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{module.title}</h3>
              <p className="mt-3 text-sm text-zinc-400">{module.description}</p>
              {(module.status || module.enabled_by_default !== undefined) && (
                <div className="mt-3 text-xs text-zinc-500" data-testid={`modules-status-${module.key}`}>
                  Status: {module.status || 'active'} · Default: {module.enabled_by_default ? 'Yes' : 'No'}
                </div>
              )}
              <ul className="mt-3 text-xs text-zinc-300 space-y-1" data-testid={`modules-capabilities-${module.key}`}>
                {(module.capabilities || []).map((capability) => (
                  <li key={capability}>• {capability}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}