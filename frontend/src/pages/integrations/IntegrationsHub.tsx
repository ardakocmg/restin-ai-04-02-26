import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { useVenue } from '../../context/VenueContext';

import { useNavigate } from 'react-router-dom';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Label } from '../../components/ui/label';

import { Switch } from '../../components/ui/switch';

import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../components/ui/tabs';

import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from '../../components/ui/dialog';

import { Alert,AlertDescription } from '../../components/ui/alert';

import {
Building2,
CheckCircle2,
Clock,
Copy,
DollarSign,
ExternalLink,
Eye,EyeOff,
Globe,
Hotel,
Info,
Key,
Mail,
MessageSquare,
Settings,
Star,Zap
} from 'lucide-react';

import { toast } from 'sonner';

const AVAILABLE_INTEGRATIONS = [
  {
    key: 'stripe',
    name: 'Payment API',
    category: 'payment',
    description: 'Accept payments via external processor',
    icon: DollarSign,
    color: '#635BFF',
    requiredFields: [
      { key: 'api_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' }
    ]
  },
  {
    key: 'twilio',
    name: 'SMS API',
    category: 'communication',
    description: 'Send SMS notifications',
    icon: MessageSquare,
    color: '#F22F46',
    requiredFields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '...' },
      { key: 'phone_number', label: 'From Phone', type: 'text', placeholder: '+1234567890' }
    ]
  },
  {
    key: 'sendgrid',
    name: 'Email API',
    category: 'communication',
    description: 'Email notifications',
    icon: Mail,
    color: '#3368E5',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...' },
      { key: 'from_email', label: 'From Email', type: 'email', placeholder: 'noreply@yourdomain.com' },
      { key: 'from_name', label: 'From Name', type: 'text', placeholder: 'Your Restaurant' }
    ]
  },
  {
    key: 'google_maps',
    name: 'Maps API',
    category: 'location',
    description: 'Location services',
    icon: Globe,
    color: '#4285F4',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIza...' }
    ]
  },
  {
    key: 'tripadvisor',
    name: 'Review API',
    category: 'reviews',
    description: 'Review management',
    icon: Star,
    color: '#00AA6C',
    requiredFields: [
      { key: 'location_id', label: 'Location ID', type: 'text', placeholder: '123456' },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '...' }
    ]
  },
  {
    key: 'openai',
    name: 'AI API',
    category: 'ai',
    description: 'AI-powered features',
    icon: Zap,
    color: '#10A37F',
    requiredFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'org-...' }
    ]
  },
  {
    key: 'google_redirect',
    name: 'Google Redirect',
    category: 'channels',
    description: 'Track & manage reservations coming from Google Maps/Search',
    icon: ExternalLink,
    color: '#4285F4',
    requiredFields: [
      { key: 'tracking_id', label: 'Tracking ID (Optional)', type: 'text', placeholder: 'UA-...' }
    ]
  },
  {
    key: 'web_direct',
    name: 'Web Booking Widget',
    category: 'channels',
    description: 'Direct booking widget for your website',
    icon: Globe,
    color: '#00D1FF',
    requiredFields: [
      { key: 'custom_domain', label: 'Custom Domain', type: 'text', placeholder: 'book.yourrestaurant.com' }
    ]
  },
  {
    key: 'oracle_micros',
    name: 'Oracle Micros (Simphony)',
    category: 'pms',
    description: 'POS interface for hotel room charge posting via Simphony Cloud',
    icon: Building2,
    color: '#C74634',
    requiredFields: [
      { key: 'simphony_host', label: 'Simphony API Host', type: 'text', placeholder: 'https://tenant.hospitality.oracleindustry.com', helpText: 'Your Simphony Cloud tenant URL. Found in Oracle Hospitality Cloud Portal → API Settings.' },
      { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: 'micros-client-id', helpText: 'From Oracle Hospitality Integration Platform (OHIP) → App Registrations → Client ID.' },
      { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: '...', helpText: 'Generated once when creating the OHIP App Registration. Keep it safe — cannot be retrieved again.' },
      { key: 'org_short_name', label: 'Org Short Name', type: 'text', placeholder: 'ACME_HOTELS', helpText: 'Your organization\'s short name in Simphony EMC → Enterprise level → Organization.' },
      { key: 'location_ref', label: 'Location Ref (Revenue Center)', type: 'text', placeholder: 'LOC001', helpText: 'The Revenue Center ID for your restaurant outlet. Found in Simphony EMC → Property → Revenue Centers.' }
    ]
  },
  {
    key: 'oracle_opera',
    name: 'Oracle OPERA PMS',
    category: 'pms',
    description: 'Hotel property management — guest lookup, room charge posting, folio sync',
    icon: Hotel,
    color: '#C74634',
    requiredFields: [
      { key: 'ohip_host', label: 'OHIP Gateway URL', type: 'text', placeholder: 'https://tenant.hospitality.oracleindustry.com', helpText: 'Oracle Hospitality Integration Platform gateway URL. Your hotel IT team provides this from the OHIP admin console.' },
      { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: 'opera-client-id', helpText: 'OHIP App Registration Client ID. Created in OHIP Portal → App Registrations → Create New Application.' },
      { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: '...', helpText: 'Generated once during OHIP App Registration. Store securely — it cannot be shown again.' },
      { key: 'enterprise_id', label: 'Enterprise ID', type: 'text', placeholder: 'ENT001', helpText: 'Your hotel chain\'s Enterprise ID. Found in OPERA Cloud → Administration → Enterprise.' },
      { key: 'hotel_id', label: 'Hotel ID / Property Code', type: 'text', placeholder: 'PROP001', helpText: 'The specific property code for this hotel. Found in OPERA Cloud → Administration → Properties.' },
      { key: 'cashier_id', label: 'Cashier ID (for postings)', type: 'text', placeholder: '1001', helpText: 'The Cashier ID used for room charge postings. Your hotel\'s front desk manager sets this in OPERA → Cashiering → Cashier Setup.' }
    ]
  }
];

export default function IntegrationsHub() {
  const { activeVenue } = useVenue();
  const _navigate = useNavigate();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configData, setConfigData] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) {
      loadIntegrations();
    }
  }, [activeVenue?.id]);

  const loadIntegrations = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/integrations`);
      setIntegrations(response.data || []);
    } catch (error) {
      logger.error('Failed to load integrations:', error);
      // Initialize with empty data
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (key) => {
    return integrations.find(i => i.key === key);
  };

  const openConfiguration = (integration) => {
    setSelectedIntegration(integration);
    const existing = getIntegrationStatus(integration.key);
    if (existing) {
      setConfigData(existing.config || {});
    } else {
      setConfigData({});
    }
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;

    setSaving(true);
    try {
      await api.post(`/venues/${activeVenue.id}/integrations/${selectedIntegration.key}`, {
        enabled: true,
        config: configData
      });

      toast.success(`${selectedIntegration.name} configured successfully`);
      setConfigOpen(false);
      loadIntegrations();
    } catch (error) {
      toast.error('Failed to save configuration');
      logger.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleIntegration = async (key, enabled) => {
    try {
      await api.patch(`/venues/${activeVenue.id}/integrations/${key}`, { enabled });
      toast.success(enabled ? 'Integration enabled' : 'Integration disabled');
      loadIntegrations();
    } catch (error) {
      toast.error('Failed to toggle integration');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const categories = Array.from(new Set(AVAILABLE_INTEGRATIONS.map(i => i.category)));

  return (
    <PageContainer
      title="Integration Hub"
      description="Manage all your external service connections and API keys"
    >
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Integrations</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="ai">AI & ML</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="pms">Hotel / PMS</TabsTrigger>
        </TabsList>

        {['all', ...categories].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_INTEGRATIONS
                .filter(i => category === 'all' || i.category === category)
                .map((integration) => {
                  const status = getIntegrationStatus(integration.key);
                  const Icon = integration.icon;
                  const isConfigured = status && Object.keys(status.config || {}).length > 0;
                  const isEnabled = status?.enabled || false;

                  return (
                    <Card
                      key={integration.key}
                      className="hover:shadow-lg transition-all cursor-pointer border-2"
                      style={{ /* keep-inline */
                        borderColor: isEnabled ? integration.color : 'transparent',
                        borderWidth: isEnabled ? '2px' : '1px'
                       /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${integration.color}20`  /* keep-inline */ }}
                            >
                              <Icon className="h-6 w-6" style={{ color: integration.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <Badge
                                variant="outline"
                              >
                                {integration.category}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isConfigured ? (
                              <Badge className="bg-green-100 text-green-700 dark:text-green-400 border-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Configured
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Info className="h-3 w-3 mr-1" />
                                Not Setup
                              </Badge>
                            )}
                            {isConfigured && (
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => toggleIntegration(integration.key, checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {integration.description}
                        </p>

                        {status?.lastSync && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Clock className="h-3 w-3" />
                            Last synced: {new Date(status.lastSync).toLocaleString()}
                          </div>
                        )}

                        <Button
                          onClick={() => openConfiguration(integration)}
                          variant={isConfigured ? "outline" : "default"}
                          size="sm"
                          className="w-full"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {isConfigured ? 'Update Config' : 'Configure'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials and configuration for {selectedIntegration?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Your API keys are encrypted and stored securely. They will never be displayed in plain text after saving.
                </AlertDescription>
              </Alert>

              {selectedIntegration.requiredFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <div className="relative">
                    <Input aria-label="Input field"
                      id={field.key}
                      type={showSecrets[field.key] ? 'text' : field.type}
                      placeholder={field.placeholder}
                      value={configData[field.key] || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        [field.key]: e.target.value
                      })}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {field.type === 'password' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowSecrets({
                            ...showSecrets,
                            [field.key]: !showSecrets[field.key]
                          })}
                        >
                          {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      {configData[field.key] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(configData[field.key])}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}

              <div className="flex items-center space-x-2 pt-4">
                <Switch
                  id="test-mode"
                  // @ts-ignore
                  checked={configData.test_mode || false}
                  onCheckedChange={(checked) => setConfigData({
                    ...configData,
                    test_mode: checked
                  })}
                />
                <Label htmlFor="test-mode">Test Mode (Sandbox)</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setConfigOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}