/**
 * 🔄 Sync Dashboard — Types, Constants & Provider Definitions
 * Extracted from SyncDashboard.tsx for better code organization.
 */
import React from 'react';
import {
    Database, Server, Smartphone, ShoppingCart, Users, Cloud,
    Key, Activity, Globe, CreditCard, MessageSquare, Mail, Star, Zap,
    Building2, Lock, Store, Brain, Music
} from 'lucide-react';

// ─── Per-Provider Credential Field Definitions ──────────────────────────
export interface CredField {
    key: string;
    label: string;
    type: 'text' | 'password';
    placeholder: string;
}

export const PROVIDER_FIELDS: Record<string, CredField[]> = {
    LIGHTSPEED: [
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'ls_client_...' },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
        { key: 'restaurant_id', label: 'Restaurant ID', type: 'text', placeholder: '123456' },
        { key: 'api_base', label: 'API Region', type: 'text', placeholder: 'https://api.lightspeedapp.com' },
    ],
    SHIREBURN: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sb_live_...' },
        { key: 'company_code', label: 'Company Code', type: 'text', placeholder: 'MGGROUP' },
        { key: 'payroll_endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'https://...' },
    ],
    APICBASE: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'apic_...' },
        { key: 'restaurant_id', label: 'Restaurant UUID', type: 'text', placeholder: '550e8400-...' },
    ],
    GOOGLE_BUSINESS: [
        { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: '123456.apps.googleusercontent.com' },
        { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: 'GOCSPX-...' },
        { key: 'location_id', label: 'Business Profile ID', type: 'text', placeholder: 'locations/...' },
    ],
    GOOGLE_WORKSPACE: [
        { key: 'domain', label: 'Workspace Domain', type: 'text', placeholder: 'yourcompany.com' },
        { key: 'admin_email', label: 'Admin Email', type: 'text', placeholder: 'admin@yourcompany.com' },
        { key: 'service_account_key', label: 'Service Account Key', type: 'password', placeholder: '{"type":"service_account",...}' },
    ],
    GOOGLE_MAPS: [
        { key: 'api_key', label: 'Maps API Key', type: 'password', placeholder: 'AIza...' },
    ],
    GOOGLE_ANALYTICS: [
        { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
        { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
    ],
    NUKI: [
        { key: 'api_token', label: 'API Token (auto-filled via OAuth)', type: 'password', placeholder: 'Connect via OAuth below...' },
        { key: 'bridge_ip', label: 'Bridge IP (optional)', type: 'text', placeholder: '192.168.1.100' },
        { key: 'bridge_port', label: 'Bridge Port (optional)', type: 'text', placeholder: '8080' },
    ],
    TUYA: [
        { key: 'access_id', label: 'Access ID', type: 'text', placeholder: 'p9jnc...' },
        { key: 'access_key', label: 'Access Key', type: 'password', placeholder: '••••••••' },
        { key: 'endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://openapi.tuyaeu.com' },
    ],
    MEROSS: [
        { key: 'email', label: 'Meross Email', type: 'text', placeholder: 'user@example.com' },
        { key: 'password', label: 'Meross Password', type: 'password', placeholder: '••••••••' },
        { key: 'api_base', label: 'API Region', type: 'text', placeholder: 'https://iotx-eu.meross.com' },
    ],
    QINGPING: [
        { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'qp_...' },
        { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: '••••••••' },
    ],
    SPOTIFY: [
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'your-spotify-client-id' },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
    ],
    STRIPE: [
        { key: 'api_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
        { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
        { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    TWILIO: [
        { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
        { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
        { key: 'phone_number', label: 'From Phone', type: 'text', placeholder: '+1234567890' },
    ],
    SENDGRID: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...' },
        { key: 'from_email', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    ],
    OPENAI: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
        { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'org-...' },
    ],
    GOOGLE_GEMINI: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIzaSy...' },
    ],
    TRIPADVISOR: [
        { key: 'location_id', label: 'Location ID', type: 'text', placeholder: '123456' },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••' },
    ],
};

// ─── Provider Portal URLs (where to get API keys) ───────────────────────
export const PORTAL_URLS: Record<string, { url: string; label: string }> = {
    LIGHTSPEED: { url: 'https://www.lightspeedhq.com/pos/integrations/', label: 'Lightspeed Developer Portal →' },
    SHIREBURN: { url: 'https://www.shireburn.com/indigo/', label: 'Shireburn Portal →' },
    APICBASE: { url: 'https://my.apicbase.com/settings/api', label: 'Apicbase API Settings →' },
    GOOGLE_BUSINESS: { url: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud Console →' },
    GOOGLE_WORKSPACE: { url: 'https://admin.google.com/', label: 'Google Admin Console →' },
    GOOGLE_MAPS: { url: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud Console →' },
    GOOGLE_ANALYTICS: { url: 'https://analytics.google.com/analytics/web/', label: 'Google Analytics →' },
    NUKI: { url: 'https://web.nuki.io/#/pages/web-api', label: 'Nuki Web API Portal →' },
    TUYA: { url: 'https://iot.tuya.com/', label: 'Tuya IoT Platform →' },
    MEROSS: { url: 'https://iot.meross.com/', label: 'Meross Cloud →' },
    QINGPING: { url: 'https://developer.qingping.co/', label: 'Qingping Developer →' },
    SPOTIFY: { url: 'https://developer.spotify.com/dashboard', label: 'Spotify Developer Dashboard →' },
    STRIPE: { url: 'https://dashboard.stripe.com/apikeys', label: 'Stripe Dashboard →' },
    TWILIO: { url: 'https://console.twilio.com/', label: 'Twilio Console →' },
    SENDGRID: { url: 'https://app.sendgrid.com/settings/api_keys', label: 'SendGrid API Keys →' },
    OPENAI: { url: 'https://platform.openai.com/api-keys', label: 'OpenAI Platform →' },
    GOOGLE_GEMINI: { url: 'https://aistudio.google.com/apikey', label: 'Google AI Studio →' },
    TRIPADVISOR: { url: 'https://www.tripadvisor.com/developers', label: 'TripAdvisor API →' },
};

// ─── Per-Provider Setup Guides ("How to Configure") ─────────────────────
export const PROVIDER_SETUP_GUIDES: Record<string, string[]> = {
    LIGHTSPEED: [
        '1. Go to Lightspeed Restaurant → Settings → Integrations → API',
        '2. Create a new API Client (set redirect to your Restin.ai URL)',
        '3. Copy Client ID, Client Secret, and your Restaurant ID',
        '4. Paste them into the fields below and enable the integration',
    ],
    SHIREBURN: [
        '1. Contact Shireburn support to request an API key for HR module',
        '2. Ask for your Company Code and the Payroll Endpoint URL',
        '3. Paste the API Key, Company Code, and Endpoint below',
    ],
    APICBASE: [
        '1. Log in to Apicbase → Settings → API → Generate Key',
        '2. Copy your API Key and Restaurant UUID',
        '3. Paste them into the fields below',
    ],
    GOOGLE_BUSINESS: [
        '1. Go to console.cloud.google.com → APIs & Services → Credentials',
        '2. Create an OAuth 2.0 Client ID (Web Application type)',
        '3. Add https://restin.ai/api/google/callback as redirect URI',
        '4. Copy Client ID & Secret, find your Location ID in Business Profile',
    ],
    GOOGLE_WORKSPACE: [
        '1. Go to Google Admin Console → Security → API Controls',
        '2. Create a Service Account with domain-wide delegation',
        '3. Download the JSON key file',
        '4. Paste the JSON content into Service Account Key field',
    ],
    GOOGLE_MAPS: [
        '1. Go to console.cloud.google.com → APIs & Services → Credentials',
        '2. Create or select an API Key',
        '3. Enable Maps JavaScript API, Geocoding API, Places API',
        '4. Copy the API Key and paste below',
    ],
    GOOGLE_ANALYTICS: [
        '1. Go to Google Analytics → Admin → Data Streams',
        '2. Copy your Measurement ID (G-XXXXXXXXXX)',
        '3. Create an API Secret under Admin → Data API → Secrets',
    ],
    NUKI: [
        '1. Click "Connect with Nuki" below — you\'ll be redirected to Nuki',
        '2. Log in with your Nuki account and authorize Restin.ai',
        '3. Your API Token will be auto-saved after authorization',
        '4. Bridge IP/Port are optional — only needed for LAN-direct control',
    ],
    TUYA: [
        '1. Go to iot.tuya.com → Cloud → Create a Project',
        '2. Select your Data Center (e.g., Central Europe)',
        '3. Copy your Access ID and Access Key from the project overview',
        '4. The endpoint matches your data center (e.g., openapi.tuyaeu.com)',
    ],
    MEROSS: [
        '1. Use your Meross app login credentials (email + password)',
        '2. The API Region should match your account (EU, US, or Asia)',
        '3. Default EU endpoint: https://iotx-eu.meross.com',
    ],
    QINGPING: [
        '1. Go to developer.qingping.co → My Apps → Create App',
        '2. Copy your App Key and App Secret',
    ],
    SPOTIFY: [
        '1. Go to developer.spotify.com/dashboard → Create App',
        '2. Set Redirect URI to: https://restin.ai/api/spotify/callback',
        '3. Copy Client ID and Client Secret from the app settings',
        '4. Paste below, then click "Connect Spotify" to authorize',
    ],
    STRIPE: [
        '1. Go to dashboard.stripe.com → Developers → API Keys',
        '2. Copy your Secret Key (sk_live_...) and Publishable Key',
        '3. Set up a Webhook endpoint and copy the Webhook Secret',
    ],
    TWILIO: [
        '1. Go to console.twilio.com → Dashboard',
        '2. Copy your Account SID and Auth Token',
        '3. Buy a phone number and enter it as the From Phone',
    ],
    SENDGRID: [
        '1. Go to app.sendgrid.com → Settings → API Keys → Create Key',
        '2. Copy the API Key (starts with SG.)',
        '3. Verify your sender email under Sender Authentication',
    ],
    OPENAI: [
        '1. Go to platform.openai.com → API Keys → Create Key',
        '2. Copy the API Key (starts with sk-)',
        '3. Organization ID is found in Settings → Organization',
    ],
    GOOGLE_GEMINI: [
        '1. Go to aistudio.google.com → Get API Key → Create API Key',
        '2. Copy the API Key (starts with AIzaSy)',
        '3. Paste below — powers AI Copilot, Voice AI, Studio, and Radar',
        '4. Free tier: 1500 requests/day (Gemini Flash)',
    ],
    TRIPADVISOR: [
        '1. Go to tripadvisor.com/developers → Request API access',
        '2. Find your Location ID from your listing URL',
        '3. Enter the API Key and Location ID below',
    ],
};

// ─── Sort options ─────────────────────────────────────────────────────────
export type SortMode = 'status' | 'name' | 'lastSync';
export const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: 'status', label: 'Active First' },
    { id: 'name', label: 'A → Z' },
    { id: 'lastSync', label: 'Last Sync' },
];

export const STATUS_WEIGHT: Record<string, number> = { CONNECTED: 0, ERROR: 1, DISABLED: 2, NOT_CONFIGURED: 3 };

// ─── Provider Definitions (Categorized) ─────────────────────────────────
export interface ProviderDef {
    key: string;
    label: string;
    desc: string;
    icon: React.ElementType;
    category: string;
    appLink?: string;
    appLabel?: string;
    color?: string;
}

export const PROVIDERS: ProviderDef[] = [
    // POS & Operations
    { key: 'LIGHTSPEED', label: 'Lightspeed K-Series', desc: 'POS Orders, Menu, Shifts', icon: ShoppingCart, category: 'pos' },
    { key: 'APICBASE', label: 'Apicbase', desc: 'Inventory, Recipes, Stock', icon: Database, category: 'pos' },
    // HR & Payroll
    { key: 'SHIREBURN', label: 'Shireburn HR', desc: 'HR, Payroll, Leave', icon: Users, category: 'hr' },
    // Google Suite
    { key: 'GOOGLE_BUSINESS', label: 'Business Profile', desc: 'Maps, Reservations & Reviews', icon: Building2, category: 'google', color: '#4285F4', appLink: '/manager/google-workspace', appLabel: 'Workspace' },
    { key: 'GOOGLE_WORKSPACE', label: 'Workspace SSO', desc: 'Single Sign-On, Domain Auth', icon: Lock, category: 'google', color: '#4285F4', appLink: '/manager/google-workspace', appLabel: 'Workspace' },
    { key: 'GOOGLE_MAPS', label: 'Maps API', desc: 'Location Services, Geocoding', icon: Globe, category: 'google', color: '#34A853' },
    { key: 'GOOGLE_ANALYTICS', label: 'Analytics', desc: 'Website & App Tracking', icon: Activity, category: 'google', color: '#E37400' },
    // IoT & Smart Home
    { key: 'NUKI', label: 'Nuki Smart Lock', desc: 'Door Access, Keypad Codes', icon: Lock, category: 'iot', appLink: '/manager/door-access', appLabel: 'Door Control' },
    { key: 'TUYA', label: 'Tuya Smart Life', desc: 'Lights, Switches, Climate', icon: Smartphone, category: 'iot', appLink: '/manager/smart-home', appLabel: 'Smart Home' },
    { key: 'MEROSS', label: 'Meross IoT', desc: 'Plugs, Garage Doors, Sensors', icon: Smartphone, category: 'iot', appLink: '/manager/smart-home', appLabel: 'Smart Home' },
    { key: 'QINGPING', label: 'Qingping Sensors', desc: 'Temp & Humidity Monitoring', icon: Server, category: 'iot' },
    { key: 'SPOTIFY', label: 'Spotify', desc: 'Restaurant Music Control', icon: Music, category: 'iot', color: '#1DB954', appLink: '/manager/smart-home', appLabel: 'Smart Home' },
    // API Services
    { key: 'STRIPE', label: 'Stripe', desc: 'Payment Processing', icon: CreditCard, category: 'api', color: '#635BFF' },
    { key: 'TWILIO', label: 'Twilio', desc: 'SMS & Voice Notifications', icon: MessageSquare, category: 'api', color: '#F22F46' },
    { key: 'SENDGRID', label: 'SendGrid', desc: 'Email Notifications', icon: Mail, category: 'api', color: '#3368E5' },
    { key: 'OPENAI', label: 'OpenAI / Vertex AI', desc: 'AI-Powered Features', icon: Zap, category: 'api', color: '#10A37F' },
    { key: 'GOOGLE_GEMINI', label: 'Google Gemini AI', desc: 'Copilot, Voice AI, Studio, Radar — 5 Keys', icon: Brain, category: 'api', color: '#8B5CF6', appLink: '/manager/ai/models', appLabel: 'AI Config' },
    { key: 'TRIPADVISOR', label: 'TripAdvisor', desc: 'Review Management', icon: Star, category: 'api', color: '#00AA6C' },
];

export const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
    all: { label: 'All', icon: Activity, gradient: 'from-blue-500 to-cyan-500' },
    pos: { label: 'POS & Ops', icon: ShoppingCart, gradient: 'from-violet-500 to-purple-500' },
    hr: { label: 'HR & Payroll', icon: Users, gradient: 'from-rose-500 to-pink-500' },
    google: { label: 'Google', icon: Cloud, gradient: 'from-blue-500 to-green-500' },
    iot: { label: 'IoT & Smart', icon: Smartphone, gradient: 'from-amber-500 to-orange-500' },
    api: { label: 'API Services', icon: Zap, gradient: 'from-emerald-500 to-teal-500' },
};

// ─── Types ──────────────────────────────────────────────────────────────
export interface IntegrationConfig {
    key: string;
    enabled: boolean;
    status: string;
    lastSync: string | null;
    config: Record<string, unknown>;
    configured_at: string | null;
    configured_by: string | null;
    organization_id?: string;
    test_mode?: boolean;
}

export interface SyncRun {
    provider: string;
    job_type: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    items_processed: number;
    triggered_by: string | null;
}

// ─── Group integration types ────────────────────────────────────────────
export interface GroupVenue {
    id: string;
    name: string;
    brand: string;
}
export interface GroupData {
    venues: GroupVenue[];
    matrix: Record<string, Record<string, { status: string; enabled: boolean; lastSync: string | null; configured_by: string | null; configured_at: string | null; scope: string }>>;
    summary: { total_venues: number; total_connected: number; providers_used: string[] };
}
