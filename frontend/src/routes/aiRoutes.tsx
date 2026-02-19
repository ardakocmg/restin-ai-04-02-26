/**
 * AI Route Module
 * AI Hub + Restin Master Protocol routes
 */
import React from 'react';
import { Route } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── AI Hub ─────────────────────────────────────────────────────────────────────
const AICopilot = React.lazy(() => import('../pages/manager/ai/AICopilot'));
const VoiceAI = React.lazy(() => import('../pages/manager/ai/VoiceAI'));
const Studio = React.lazy(() => import('../pages/manager/ai/Studio'));
const WebBuilderAI = React.lazy(() => import('../pages/manager/ai/WebBuilder'));
const Radar = React.lazy(() => import('../pages/manager/ai/Radar'));
const CRMAI = React.lazy(() => import('../pages/manager/ai/CRM'));
const Fintech = React.lazy(() => import('../pages/manager/ai/Fintech'));
const Ops = React.lazy(() => import('../pages/manager/ai/Ops'));
const AIModelConfig = React.lazy(() => import('../pages/manager/ai/AIModelConfig'));
const RestinSettings = React.lazy(() => import('../pages/manager/ai/RestinSettings'));
const MarketingAutomations = React.lazy(() => import('../pages/manager/ai/MarketingAutomations'));

// ─── Restin Master Protocol ─────────────────────────────────────────────────────
const RestinControlTower = React.lazy(() => import('../pages/manager/RestinControlTower'));
const WebBuilder = React.lazy(() => import('../features/restin/web/WebBuilder'));
const VoiceDashboard = React.lazy(() => import('../features/restin/voice/VoiceDashboard'));
const VoiceSettings = React.lazy(() => import('../features/restin/voice/VoiceSettings'));
const CallLogs = React.lazy(() => import('../features/restin/voice/CallLogs'));
const StudioDashboard = React.lazy(() => import('../features/restin/studio/StudioDashboard'));
const RadarDashboard = React.lazy(() => import('../features/restin/radar/RadarDashboard'));
const CrmDashboard = React.lazy(() => import('../features/restin/crm').then(m => ({ default: m.CrmDashboard })));

export const aiRoutes = (
    <>
        {/* AI Hub — Manager Pages */}
        <Route path="ai">
            <Route path="copilot" element={<RoleRoute requiredRole="OWNER"><AICopilot /></RoleRoute>} />
            <Route path="voice" element={<RoleRoute requiredRole="OWNER"><VoiceAI /></RoleRoute>} />
            <Route path="studio" element={<RoleRoute requiredRole="OWNER"><Studio /></RoleRoute>} />
            <Route path="web-builder" element={<RoleRoute requiredRole="OWNER"><WebBuilderAI /></RoleRoute>} />
            <Route path="radar" element={<RoleRoute requiredRole="OWNER"><Radar /></RoleRoute>} />
            <Route path="crm" element={<RoleRoute requiredRole="OWNER"><CRMAI /></RoleRoute>} />
            <Route path="fintech" element={<RoleRoute requiredRole="OWNER"><Fintech /></RoleRoute>} />
            <Route path="ops" element={<RoleRoute requiredRole="OWNER"><Ops /></RoleRoute>} />
            <Route path="models" element={<RoleRoute requiredRole="OWNER"><AIModelConfig /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute requiredRole="OWNER"><RestinSettings /></RoleRoute>} />
            <Route path="marketing" element={<RoleRoute requiredRole="OWNER"><MarketingAutomations /></RoleRoute>} />
        </Route>

        {/* Restin Master Protocol */}
        <Route path="restin">
            <Route index element={<RoleRoute requiredRole="OWNER"><RestinControlTower /></RoleRoute>} />
            <Route path="web" element={<RoleRoute requiredRole="OWNER"><WebBuilder /></RoleRoute>} />
            <Route path="voice" element={<RoleRoute requiredRole="OWNER"><VoiceDashboard /></RoleRoute>} />
            <Route path="voice/settings" element={<RoleRoute requiredRole="OWNER"><VoiceSettings /></RoleRoute>} />
            <Route path="voice/logs" element={<RoleRoute requiredRole="OWNER"><CallLogs /></RoleRoute>} />
            <Route path="studio" element={<RoleRoute requiredRole="OWNER"><StudioDashboard /></RoleRoute>} />
            <Route path="radar" element={<RoleRoute requiredRole="OWNER"><RadarDashboard /></RoleRoute>} />
            <Route path="crm" element={<RoleRoute requiredRole="OWNER"><CrmDashboard /></RoleRoute>} />
        </Route>
    </>
);
