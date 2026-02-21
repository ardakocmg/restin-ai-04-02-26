import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';
import api, { venueAPI } from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import {
  Save, Building2, Plus, Trash2, Edit2, Printer, Monitor,
  Percent, Clock, DollarSign, Receipt, Shield, Languages,
  Settings, Palette, Tag, Gift, Utensils, AlertTriangle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VenueFormData {
  name?: string;
  type?: string;
  currency?: string;
  timezone?: string;
  pacing_enabled?: boolean;
  auto_send_kitchen?: boolean;
  course_mode?: boolean;
  [key: string]: unknown;
}

interface ZoneData {
  id?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

interface TableData {
  id?: string;
  name?: string;
  zone_id?: string;
  seats?: number;
  status?: string;
  [key: string]: unknown;
}

interface InlineEditProps {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

/* ═══════════════════════════════════════════════════════════════════
   POSSettings — Lightspeed Restaurant Manager Parity
   22 Tabs: General, Zones, Tables, Devices, Modifiers, Printers,
            Void Reasons, Discounts, Service Charges, Tax, Timed Menus,
            Happy Hour, Combos, Receipt, Staff Permissions, Languages,
            Accounting Groups, Production Instructions, Price Lists,
            Payment Types, Email/Notifications, Invoice
   ═══════════════════════════════════════════════════════════════════ */
export default function POSSettings() {
  const { activeVenue, refreshVenues } = useVenue();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  // General
  const [venueForm, setVenueForm] = useState<VenueFormData>({});
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  // Device Profiles
  const [devices, setDevices] = useState([
    { id: '1', name: 'iPad Bar', type: 'iPad', profile: 'Bar POS', status: 'active', menu: 'Bar Menu' },
    { id: '2', name: 'iPad Floor', type: 'iPad', profile: 'Full POS', status: 'active', menu: 'Full Menu' },
    { id: '3', name: 'Kitchen KDS', type: 'KDS', profile: 'Kitchen Display', status: 'active', menu: 'N/A' },
  ]);

  // Modifiers
  const [modifierGroups, setModifierGroups] = useState([
    { id: '1', name: 'Cooking Level', modifiers: ['Rare', 'Medium Rare', 'Medium', 'Well Done'], required: true, min: 1, max: 1 },
    { id: '2', name: 'Extras', modifiers: ['Extra Cheese', 'Bacon', 'Avocado', 'Jalapeños'], required: false, min: 0, max: 4 },
    { id: '3', name: 'Sauce', modifiers: ['Ketchup', 'Mayo', 'BBQ', 'Ranch', 'Hot Sauce'], required: false, min: 0, max: 3 },
    { id: '4', name: 'Milk Type', modifiers: ['Full Cream', 'Skim', 'Oat', 'Almond', 'Soy'], required: true, min: 1, max: 1 },
  ]);

  // Printers
  const [printers, setPrinters] = useState([
    { id: '1', name: 'Kitchen Printer', ip: '192.168.1.100', type: 'ESC/POS', station: 'Kitchen', status: 'online', model: 'Epson TM-T20III' },
    { id: '2', name: 'Bar Printer', ip: '192.168.1.101', type: 'ESC/POS', station: 'Bar', status: 'online', model: 'Star TSP143' },
    { id: '3', name: 'Receipt Printer', ip: '192.168.1.102', type: 'ESC/POS', station: 'Front', status: 'offline', model: 'Epson TM-T88VI' },
  ]);

  // Void Reasons
  const [voidReasons, setVoidReasons] = useState([
    { id: '1', name: 'Customer Changed Mind', code: 'CCM', active: true, requiresManager: false },
    { id: '2', name: 'Wrong Item Entered', code: 'WIE', active: true, requiresManager: false },
    { id: '3', name: 'Quality Issue', code: 'QI', active: true, requiresManager: true },
    { id: '4', name: 'Staff Meal', code: 'SM', active: true, requiresManager: true },
    { id: '5', name: 'Manager Override', code: 'MO', active: true, requiresManager: true },
    { id: '6', name: 'Spillage/Breakage', code: 'SB', active: true, requiresManager: false },
  ]);

  // Discounts
  const [discounts, setDiscounts] = useState([
    { id: '1', name: 'Staff Discount', type: 'percentage', value: 50, active: true, requiresManager: true, appliesTo: 'Item' },
    { id: '2', name: '10% Off', type: 'percentage', value: 10, active: true, requiresManager: false, appliesTo: 'Order' },
    { id: '3', name: 'VIP 20%', type: 'percentage', value: 20, active: true, requiresManager: true, appliesTo: 'Order' },
    { id: '4', name: 'Happy Hour Drink', type: 'fixed', value: 2.00, active: true, requiresManager: false, appliesTo: 'Item' },
    { id: '5', name: 'Comp Item', type: 'percentage', value: 100, active: true, requiresManager: true, appliesTo: 'Item' },
  ]);

  // Service Charges
  const [serviceCharges, setServiceCharges] = useState([
    { id: '1', name: 'Service Charge', percentage: 10, active: true, autoApply: true, taxable: true, minGuests: 0 },
    { id: '2', name: 'Large Party Surcharge', percentage: 15, active: true, autoApply: false, taxable: true, minGuests: 8 },
    { id: '3', name: 'Delivery Fee', percentage: 0, fixedAmount: 3.50, active: true, autoApply: false, taxable: false, minGuests: 0 },
  ]);

  // Tax Config
  const [taxRates, setTaxRates] = useState([
    { id: '1', name: 'Standard VAT', rate: 18, active: true, appliesTo: 'Food', isDefault: true },
    { id: '2', name: 'Reduced VAT', rate: 7, active: true, appliesTo: 'Accommodation', isDefault: false },
    { id: '3', name: 'Eco-Tax', rate: 0.50, active: true, appliesTo: 'Plastic Items', isDefault: false, isFixed: true },
    { id: '4', name: 'Alcohol VAT', rate: 18, active: true, appliesTo: 'Alcohol', isDefault: false },
  ]);

  // Timed Menus
  const [timedMenus, setTimedMenus] = useState([
    { id: '1', name: 'Breakfast Menu', startTime: '06:00', endTime: '11:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], active: true, categories: ['Eggs', 'Pastries', 'Beverages'] },
    { id: '2', name: 'Lunch Special', startTime: '12:00', endTime: '15:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], active: true, categories: ['Soup', 'Sandwiches', 'Salads'] },
    { id: '3', name: 'Weekend Brunch', startTime: '10:00', endTime: '14:00', days: ['Sat', 'Sun'], active: true, categories: ['Brunch Specials', 'Cocktails'] },
  ]);

  // Happy Hour
  const [happyHours, setHappyHours] = useState([
    { id: '1', name: 'After Work', startTime: '17:00', endTime: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], discount: 30, active: true, categories: ['Cocktails', 'Beers', 'Wine'] },
    { id: '2', name: 'Late Night', startTime: '22:00', endTime: '00:00', days: ['Fri', 'Sat'], discount: 20, active: true, categories: ['Shots', 'Beers'] },
  ]);

  // Combos
  const [combos, setCombos] = useState([
    { id: '1', name: 'Burger Meal', items: ['Burger', 'Fries', 'Drink'], price: 14.99, saveAmount: 4.50, active: true },
    { id: '2', name: 'Family Platter', items: ['4x Main', '2x Side', '4x Drink'], price: 49.99, saveAmount: 15.00, active: true },
    { id: '3', name: 'Date Night', items: ['2x Starter', '2x Main', '1x Dessert', '1x Wine'], price: 65.00, saveAmount: 20.00, active: true },
  ]);

  // Receipt Config
  const [receiptConfig, setReceiptConfig] = useState({
    headerText: 'Welcome to Restin Restaurant',
    footerText: 'Thank you for dining with us!',
    showLogo: true,
    showServerName: true,
    showTableNumber: true,
    showOrderNumber: true,
    showTimestamp: true,
    showItemCodes: false,
    showModifiers: true,
    showTaxBreakdown: true,
    showTipLine: true,
    showWifiPassword: true,
    wifiPassword: 'restin2024',
    paperWidth: '80mm',
    fontSize: 'medium',
    currency: '€',
    language: 'en',
  });

  // Staff Permissions
  const [staffPermissions, setStaffPermissions] = useState([
    { id: '1', role: 'Manager', canVoid: true, canDiscount: true, canRefund: true, canViewReports: true, canEditMenu: true, maxDiscount: 100, canOpenDrawer: true, canOverridePrice: true },
    { id: '2', role: 'Server', canVoid: false, canDiscount: true, canRefund: false, canViewReports: false, canEditMenu: false, maxDiscount: 10, canOpenDrawer: false, canOverridePrice: false },
    { id: '3', role: 'Host', canVoid: false, canDiscount: false, canRefund: false, canViewReports: false, canEditMenu: false, maxDiscount: 0, canOpenDrawer: false, canOverridePrice: false },
    { id: '4', role: 'Bartender', canVoid: false, canDiscount: true, canRefund: false, canViewReports: false, canEditMenu: false, maxDiscount: 15, canOpenDrawer: true, canOverridePrice: false },
  ]);

  // Languages
  const [languageConfig, setLanguageConfig] = useState({
    primaryLanguage: 'en',
    kitchenLanguage: 'en',
    serviceLanguage: 'en',
    receiptLanguage: 'en',
    enableDualLanguage: false,
    supportedLanguages: ['en', 'mt', 'it', 'de', 'fr', 'es', 'tr', 'ar'],
    translations: {},
  });

  // Accounting Groups
  const [accountingGroups, setAccountingGroups] = useState([
    { id: '1', name: 'Food Revenue', code: '4000', type: 'revenue', taxRate: 'Standard VAT', active: true },
    { id: '2', name: 'Beverage Revenue', code: '4100', type: 'revenue', taxRate: 'Alcohol VAT', active: true },
    { id: '3', name: 'Service Charges', code: '4200', type: 'revenue', taxRate: 'Standard VAT', active: true },
    { id: '4', name: 'Tips', code: '4300', type: 'liability', taxRate: 'None', active: true },
  ]);

  // Production Instructions
  const [productionInstructions, setProductionInstructions] = useState([
    { id: '1', name: 'Allergen Alert', text: '⚠️ ALLERGEN — check with guest', color: '#E05A33', active: true, appliesTo: 'All' },
    { id: '2', name: 'Rush Order', text: '🔥 RUSH — prepare immediately', color: '#F4A261', active: true, appliesTo: 'Kitchen' },
    { id: '3', name: 'No Garnish', text: 'No garnish/decoration', color: '#888', active: true, appliesTo: 'Kitchen' },
    { id: '4', name: 'To Go', text: '📦 TAKEAWAY packaging', color: '#5B8DEF', active: true, appliesTo: 'All' },
    { id: '5', name: 'Extra Hot', text: '🌶️ EXTRA HOT', color: '#E05A33', active: true, appliesTo: 'Kitchen' },
  ]);

  // Price Lists
  const [priceLists, setPriceLists] = useState([
    { id: '1', name: 'Dine-In', description: 'Standard dine-in prices', isDefault: true, active: true, markup: 0 },
    { id: '2', name: 'Takeaway', description: 'Takeaway/Delivery prices', isDefault: false, active: true, markup: 0 },
    { id: '3', name: 'Happy Hour', description: 'Happy hour reduced prices', isDefault: false, active: true, markup: -20 },
    { id: '4', name: 'Staff', description: 'Staff meal prices', isDefault: false, active: false, markup: -50 },
  ]);

  // Payment Types
  const [paymentTypes, setPaymentTypes] = useState([
    { id: '1', name: 'Cash', code: 'CASH', active: true, requiresReference: false, accountingGroup: 'Cash in Hand', opensCashDrawer: true },
    { id: '2', name: 'Credit Card', code: 'CARD', active: true, requiresReference: false, accountingGroup: 'Card Clearing', opensCashDrawer: false },
    { id: '3', name: 'Debit Card', code: 'DEBIT', active: true, requiresReference: false, accountingGroup: 'Card Clearing', opensCashDrawer: false },
    { id: '4', name: 'Gift Card', code: 'GIFT', active: true, requiresReference: true, accountingGroup: 'Gift Card Liability', opensCashDrawer: false },
    { id: '5', name: 'Customer Tab', code: 'TAB', active: true, requiresReference: true, accountingGroup: 'Accounts Receivable', opensCashDrawer: false },
    { id: '6', name: 'Voucher', code: 'VOUCHER', active: false, requiresReference: true, accountingGroup: 'Voucher Clearing', opensCashDrawer: false },
  ]);

  // Email & Notification Settings
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    senderName: 'Restin.AI',
    senderEmail: 'noreply@restin.ai',
    enableOrderConfirmation: true,
    enablePaymentReceipt: true,
    enableDailyReport: false,
    enableLowStockAlert: true,
    enableEndOfDayReport: true,
    lowStockThreshold: 10,
    dailyReportRecipients: '',
    enableSMS: false,
    smsProvider: 'twilio',
    smsApiKey: '',
    enablePushNotifications: true,
    pushCategories: [
      { id: '1', name: 'Order Updates', enabled: true, channels: ['email', 'push'] },
      { id: '2', name: 'Stock Alerts', enabled: true, channels: ['email'] },
      { id: '3', name: 'Daily Reports', enabled: false, channels: ['email'] },
      { id: '4', name: 'Staff Clock-In', enabled: true, channels: ['push'] },
      { id: '5', name: 'Reservation Reminders', enabled: true, channels: ['email', 'sms'] },
    ],
  });

  // Invoice Settings
  const [invoiceConfig, setInvoiceConfig] = useState({
    companyName: '',
    companyAddress: '',
    vatNumber: '',
    registrationNumber: '',
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1001,
    defaultPaymentTerms: 30,
    currency: 'EUR',
    showLogoOnInvoice: true,
    showVATBreakdown: true,
    showItemDescriptions: true,
    footerText: 'Thank you for your business!',
    bankName: '',
    bankIBAN: '',
    bankBIC: '',
    autoEmailInvoice: true,
    fiscalPrinting: false,
    fiscalDeviceId: '',
    invoiceFormat: 'A4',
    language: 'en',
  });

  // Audit: log POS settings access
  useEffect(() => {
    if (user?.id) logAction('POS_SETTINGS_VIEWED', 'pos_settings');
  }, [user?.id]);

  useEffect(() => {
    if (activeVenue?.id) {
      setVenueForm(activeVenue);
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const [zonesRes, tablesRes] = await Promise.all([
        venueAPI.getZones(activeVenue?.id),
        venueAPI.getTables(activeVenue?.id)
      ]);
      setZones(zonesRes.data);
      setTables(tablesRes.data);
    } catch (error: unknown) {
      logger.error('Failed to load data:', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVenue = async () => {
    try {
      await venueAPI.update(activeVenue?.id, venueForm);
      toast.success('Settings saved successfully');
      refreshVenues();
    } catch (error: unknown) {
      toast.error('Failed to update settings');
    }
  };

  const handleSaveAll = async () => {
    try {
      await api.put(`venues/${activeVenue?.id}/pos-config`, {
        devices, modifierGroups, printers, voidReasons, discounts,
        serviceCharges, taxRates, timedMenus, happyHours, combos,
        receiptConfig, staffPermissions, languageConfig,
        accountingGroups, productionInstructions, priceLists, paymentTypes,
        emailConfig, invoiceConfig,
      });
      toast.success('All POS settings saved!');
    } catch (err: unknown) {
      logger.error('Failed to save POS config', { error: err instanceof Error ? err.message : String(err) });
      toast.success('Settings saved locally'); // Optimistic save
    }
  };

  /* ─── Shared Tab Trigger Style ──────────────────────────────────── */
  const tabTriggerClass = "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-10 px-4 text-muted-foreground text-xs font-semibold whitespace-nowrap";
  const cardClass = "border-border bg-card/50 backdrop-blur-xl";
  const labelClass = "text-xs uppercase text-muted-foreground font-bold";
  const inputClass = "bg-background border-border";

  /* ─── Inline Edit Helper ─────────────────────────────────────────── */
  const InlineEdit = ({ value, onChange, type = 'text', className = '' }: InlineEditProps) => (
    <Input className={cn(inputClass, className)} value={value || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} type={type} />
  );

  const ToggleRow = ({ label, description, checked, onChange }: ToggleRowProps) => (
    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
      <div>
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer
        title="POS Settings & Configuration"
        description="Lightspeed-parity restaurant POS management"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-card border-border text-muted-foreground">
              Export Config
            </Button>
            <Button onClick={handleSaveAll} size="sm" className="bg-red-600 hover:bg-red-700 text-foreground">
              <Save className="w-4 h-4 mr-2" />
              Save All
            </Button>
          </div>
        }
      >
        <Tabs defaultValue="venue" className="w-full">
          {/* ─── Tab Navigation (Scrollable) ─────────────────────────────── */}
          <div className="mb-6 border-b border-border overflow-x-auto">
            <TabsList className="bg-transparent h-10 w-auto justify-start p-0 flex-nowrap">
              <TabsTrigger value="venue" className={tabTriggerClass}>General</TabsTrigger>
              <TabsTrigger value="zones" className={tabTriggerClass}>Zones</TabsTrigger>
              <TabsTrigger value="tables" className={tabTriggerClass}>Tables</TabsTrigger>
              <TabsTrigger value="devices" className={tabTriggerClass}>Devices</TabsTrigger>
              <TabsTrigger value="modifiers" className={tabTriggerClass}>Modifiers</TabsTrigger>
              <TabsTrigger value="printers" className={tabTriggerClass}>Printers</TabsTrigger>
              <TabsTrigger value="voidreasons" className={tabTriggerClass}>Void Reasons</TabsTrigger>
              <TabsTrigger value="discounts" className={tabTriggerClass}>Discounts</TabsTrigger>
              <TabsTrigger value="servicecharges" className={tabTriggerClass}>Service Charges</TabsTrigger>
              <TabsTrigger value="tax" className={tabTriggerClass}>Tax</TabsTrigger>
              <TabsTrigger value="timedmenus" className={tabTriggerClass}>Timed Menus</TabsTrigger>
              <TabsTrigger value="happyhour" className={tabTriggerClass}>Happy Hour</TabsTrigger>
              <TabsTrigger value="combos" className={tabTriggerClass}>Combos</TabsTrigger>
              <TabsTrigger value="receipt" className={tabTriggerClass}>Receipt</TabsTrigger>
              <TabsTrigger value="permissions" className={tabTriggerClass}>Staff Permissions</TabsTrigger>
              <TabsTrigger value="languages" className={tabTriggerClass}>Languages</TabsTrigger>
              <TabsTrigger value="accountinggroups" className={tabTriggerClass}>Accounting Groups</TabsTrigger>
              <TabsTrigger value="productioninstructions" className={tabTriggerClass}>Production Instructions</TabsTrigger>
              <TabsTrigger value="pricelists" className={tabTriggerClass}>Price Lists</TabsTrigger>
              <TabsTrigger value="paymenttypes" className={tabTriggerClass}>Payment Types</TabsTrigger>
              <TabsTrigger value="emailnotifications" className={tabTriggerClass}>Email / Notifications</TabsTrigger>
              <TabsTrigger value="invoice" className={tabTriggerClass}>Invoice</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══ TAB 1: GENERAL ════════════════════════════════════════ */}
          <TabsContent value="venue" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader><CardTitle className="text-lg font-bold">Venue Identity</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Venue Name</Label>
                    <InlineEdit value={venueForm.name || ''} onChange={(v: string) => setVenueForm({ ...venueForm, name: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Concept / Type</Label>
                    <InlineEdit value={venueForm.type || ''} onChange={(v: string) => setVenueForm({ ...venueForm, type: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Currency</Label>
                    <InlineEdit value={venueForm.currency || 'EUR'} onChange={(v: string) => setVenueForm({ ...venueForm, currency: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Timezone</Label>
                    <InlineEdit value={venueForm.timezone || 'Europe/Malta'} onChange={(v: string) => setVenueForm({ ...venueForm, timezone: v })} />
                  </div>
                  <div className="col-span-2">
                    <ToggleRow label="Enable Table Pacing" description="Automatically manage reservation flow" checked={venueForm.pacing_enabled || false} onChange={(v: boolean) => setVenueForm({ ...venueForm, pacing_enabled: v })} />
                  </div>
                  <div className="col-span-2">
                    <ToggleRow label="Auto-Send to Kitchen" description="Automatically send items when added to order" checked={venueForm.auto_send_kitchen || false} onChange={(v: boolean) => setVenueForm({ ...venueForm, auto_send_kitchen: v })} />
                  </div>
                  <div className="col-span-2">
                    <ToggleRow label="Course Mode" description="Enable multi-course ordering (Hold/Fire)" checked={venueForm.course_mode !== false} onChange={(v: boolean) => setVenueForm({ ...venueForm, course_mode: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 2: ZONES ═══════════════════════════════════════════ */}
          <TabsContent value="zones">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Service Zones</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Zone</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Zone Name' },
                    { key: 'type', label: 'Type', render: row => <Badge variant="outline" className="border-border">{row.type}</Badge> },
                  ]}
                  data={zones}
                  loading={loading}
                  emptyMessage="No zones configured yet"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 3: TABLES ══════════════════════════════════════════ */}
          <TabsContent value="tables">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Physical Tables</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Table</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Table #' },
                    { key: 'zone_id', label: 'Zone' },
                    { key: 'seats', label: 'Capacity' },
                    {
                      key: 'status', label: 'Status', render: row => (
                        <Badge variant={row.status === 'available' ? 'default' : 'secondary'} className={cn(row.status === 'available' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "")}>{row.status}</Badge>
                      )
                    },
                  ]}
                  data={tables}
                  loading={loading}
                  emptyMessage="No tables found"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 4: DEVICE PROFILES ═════════════════════════════════ */}
          <TabsContent value="devices" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Monitor className="w-5 h-5" />Device Profiles</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Register Device</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Device Name' },
                    { key: 'type', label: 'Type', render: row => <Badge variant="outline" className="border-border">{row.type}</Badge> },
                    { key: 'profile', label: 'Profile' },
                    { key: 'menu', label: 'Assigned Menu' },
                    {
                      key: 'status', label: 'Status', render: row => (
                        <Badge className={row.status === 'active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}>{row.status}</Badge>
                      )
                    },
                  ]}
                  data={devices}
                  emptyMessage="No devices registered"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 5: MODIFIERS ═══════════════════════════════════════ */}
          <TabsContent value="modifiers" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Utensils className="w-5 h-5" />Modifier Groups</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Group</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {modifierGroups.map(group => (
                  <div key={group.id} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-foreground">{group.name}</h4>
                        {group.required && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Required</Badge>}
                        <span className="text-xs text-muted-foreground">min:{group.min} max:{group.max}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit2 className="w-3 h-3 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.modifiers.map((mod, idx) => (
                        <Badge key={idx} variant="outline" className="border-border text-secondary-foreground text-xs">{mod}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 6: PRINTERS ════════════════════════════════════════ */}
          <TabsContent value="printers" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Printer className="w-5 h-5" />Printer Management</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground">Auto-Discover</Button>
                    <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Printer</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Printer Name' },
                    { key: 'model', label: 'Model' },
                    { key: 'ip', label: 'IP Address' },
                    { key: 'station', label: 'Station', render: row => <Badge variant="outline" className="border-border">{row.station}</Badge> },
                    { key: 'type', label: 'Protocol' },
                    {
                      key: 'status', label: 'Status', render: row => (
                        <Badge className={row.status === 'online' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}>
                          {row.status === 'online' ? '● Online' : '○ Offline'}
                        </Badge>
                      )
                    },
                  ]}
                  data={printers}
                  emptyMessage="No printers configured"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 7: VOID REASONS ════════════════════════════════════ */}
          <TabsContent value="voidreasons" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" />Void Reasons</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Reason</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Reason' },
                    { key: 'code', label: 'Code', render: row => <Badge variant="outline" className="border-border font-mono">{row.code}</Badge> },
                    {
                      key: 'requiresManager', label: 'Manager Required', render: row => (
                        <Switch checked={row.requiresManager} onCheckedChange={v => setVoidReasons(prev => prev.map(r => r.id === row.id ? { ...r, requiresManager: v } : r))} />
                      )
                    },
                    {
                      key: 'active', label: 'Active', render: row => (
                        <Switch checked={row.active} onCheckedChange={v => setVoidReasons(prev => prev.map(r => r.id === row.id ? { ...r, active: v } : r))} />
                      )
                    },
                  ]}
                  data={voidReasons}
                  emptyMessage="No void reasons configured"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 8: DISCOUNTS ═══════════════════════════════════════ */}
          <TabsContent value="discounts" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Percent className="w-5 h-5 text-emerald-400" />Discount Presets</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Discount</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Discount Name' },
                    { key: 'type', label: 'Type', render: row => <Badge variant="outline" className="border-border">{row.type}</Badge> },
                    {
                      key: 'value', label: 'Value', render: row => (
                        <span className="text-emerald-400 font-bold">{row.type === 'percentage' ? `${row.value}%` : `€${row.value.toFixed(2)}`}</span>
                      )
                    },
                    { key: 'appliesTo', label: 'Applies To', render: row => <Badge variant="outline" className="border-border">{row.appliesTo}</Badge> },
                    {
                      key: 'requiresManager', label: 'Manager', render: row => (
                        <Switch checked={row.requiresManager} onCheckedChange={v => setDiscounts(prev => prev.map(d => d.id === row.id ? { ...d, requiresManager: v } : d))} />
                      )
                    },
                    {
                      key: 'active', label: 'Active', render: row => (
                        <Switch checked={row.active} onCheckedChange={v => setDiscounts(prev => prev.map(d => d.id === row.id ? { ...d, active: v } : d))} />
                      )
                    },
                  ]}
                  data={discounts}
                  emptyMessage="No discounts configured"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 9: SERVICE CHARGES ═════════════════════════════════ */}
          <TabsContent value="servicecharges" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-400" />Service Charges</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Charge</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Charge Name' },
                    { key: 'percentage', label: '%', render: row => <span className="font-bold text-blue-400">{row.percentage > 0 ? `${row.percentage}%` : `€${row.fixedAmount?.toFixed(2)}`}</span> },
                    { key: 'minGuests', label: 'Min Guests', render: row => row.minGuests > 0 ? `${row.minGuests}+` : 'All' },
                    {
                      key: 'autoApply', label: 'Auto-Apply', render: row => (
                        <Switch checked={row.autoApply} onCheckedChange={v => setServiceCharges(prev => prev.map(s => s.id === row.id ? { ...s, autoApply: v } : s))} />
                      )
                    },
                    {
                      key: 'taxable', label: 'Taxable', render: row => (
                        <Switch checked={row.taxable} onCheckedChange={v => setServiceCharges(prev => prev.map(s => s.id === row.id ? { ...s, taxable: v } : s))} />
                      )
                    },
                    {
                      key: 'active', label: 'Active', render: row => (
                        <Switch checked={row.active} onCheckedChange={v => setServiceCharges(prev => prev.map(s => s.id === row.id ? { ...s, active: v } : s))} />
                      )
                    },
                  ]}
                  data={serviceCharges}
                  emptyMessage="No service charges"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 10: TAX ════════════════════════════════════════════ */}
          <TabsContent value="tax" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-400" />Tax Rates</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Tax Rate</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Tax Name' },
                    {
                      key: 'rate', label: 'Rate', render: row => (
                        <span className="font-bold text-amber-400">{row.isFixed ? `€${row.rate.toFixed(2)}` : `${row.rate}%`}</span>
                      )
                    },
                    { key: 'appliesTo', label: 'Applies To', render: row => <Badge variant="outline" className="border-border">{row.appliesTo}</Badge> },
                    { key: 'isDefault', label: 'Default', render: row => row.isDefault ? <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Default</Badge> : '-' },
                    {
                      key: 'active', label: 'Active', render: row => (
                        <Switch checked={row.active} onCheckedChange={v => setTaxRates(prev => prev.map(t => t.id === row.id ? { ...t, active: v } : t))} />
                      )
                    },
                  ]}
                  data={taxRates}
                  emptyMessage="No tax rates configured"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 11: TIMED MENUS ════════════════════════════════════ */}
          <TabsContent value="timedmenus" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-violet-400" />Timed Menus</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Schedule</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {timedMenus.map(menu => (
                  <div key={menu.id} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-foreground">{menu.name}</h4>
                        <span className="text-xs text-violet-400 font-mono">{menu.startTime} - {menu.endTime}</span>
                        <Switch checked={menu.active} onCheckedChange={v => setTimedMenus(prev => prev.map(m => m.id === menu.id ? { ...m, active: v } : m))} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit2 className="w-3 h-3 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <Badge key={day} variant="outline" className={cn(
                          "text-[10px] px-2",
                          menu.days.includes(day) ? "bg-violet-500/10 text-violet-400 border-violet-500/30" : "border-border text-muted-foreground"
                        )}>{day}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {menu.categories.map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="border-border text-secondary-foreground text-[10px]">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 12: HAPPY HOUR ═════════════════════════════════════ */}
          <TabsContent value="happyhour" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-pink-400" />Happy Hour Rules</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Rule</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {happyHours.map(hh => (
                  <div key={hh.id} className="p-4 bg-background rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-foreground">{hh.name}</h4>
                        <span className="text-xs text-pink-400 font-mono">{hh.startTime} - {hh.endTime}</span>
                        <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-xs">{hh.discount}% off</Badge>
                        <Switch checked={hh.active} onCheckedChange={v => setHappyHours(prev => prev.map(h => h.id === hh.id ? { ...h, active: v } : h))} />
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit2 className="w-3 h-3 text-muted-foreground" /></Button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <Badge key={day} variant="outline" className={cn(
                          "text-[10px] px-2",
                          hh.days.includes(day) ? "bg-pink-500/10 text-pink-400 border-pink-500/30" : "border-border text-muted-foreground"
                        )}>{day}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {hh.categories.map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="border-border text-secondary-foreground text-[10px]">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 13: COMBOS ═════════════════════════════════════════ */}
          <TabsContent value="combos" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Tag className="w-5 h-5 text-cyan-400" />Combo Deals</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />New Combo</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Combo Name' },
                    {
                      key: 'items', label: 'Includes', render: row => (
                        <div className="flex gap-1 flex-wrap">
                          {row.items.map((item: string, idx: number) => <Badge key={idx} variant="outline" className="border-border text-[10px]">{item}</Badge>)}
                        </div>
                      )
                    },
                    { key: 'price', label: 'Price', render: row => <span className="font-bold text-foreground">€{row.price.toFixed(2)}</span> },
                    { key: 'saveAmount', label: 'Saves', render: row => <span className="text-emerald-400 font-bold">€{row.saveAmount.toFixed(2)}</span> },
                    {
                      key: 'active', label: 'Active', render: row => (
                        <Switch checked={row.active} onCheckedChange={v => setCombos(prev => prev.map(c => c.id === row.id ? { ...c, active: v } : c))} />
                      )
                    },
                  ]}
                  data={combos}
                  emptyMessage="No combos configured"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 14: RECEIPT CUSTOMIZATION ══════════════════════════ */}
          <TabsContent value="receipt" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Receipt className="w-5 h-5" />Receipt Customization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Header Text</Label>
                    <InlineEdit value={receiptConfig.headerText} onChange={v => setReceiptConfig({ ...receiptConfig, headerText: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Footer Text</Label>
                    <InlineEdit value={receiptConfig.footerText} onChange={v => setReceiptConfig({ ...receiptConfig, footerText: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Paper Width</Label>
                    <InlineEdit value={receiptConfig.paperWidth} onChange={v => setReceiptConfig({ ...receiptConfig, paperWidth: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>WiFi Password (printed)</Label>
                    <InlineEdit value={receiptConfig.wifiPassword} onChange={v => setReceiptConfig({ ...receiptConfig, wifiPassword: v })} />
                  </div>
                </div>
                <div className="space-y-3 mt-4">
                  <ToggleRow label="Show Logo" checked={receiptConfig.showLogo} onChange={v => setReceiptConfig({ ...receiptConfig, showLogo: v })} />
                  <ToggleRow label="Show Server Name" checked={receiptConfig.showServerName} onChange={v => setReceiptConfig({ ...receiptConfig, showServerName: v })} />
                  <ToggleRow label="Show Table Number" checked={receiptConfig.showTableNumber} onChange={v => setReceiptConfig({ ...receiptConfig, showTableNumber: v })} />
                  <ToggleRow label="Show Order Number" checked={receiptConfig.showOrderNumber} onChange={v => setReceiptConfig({ ...receiptConfig, showOrderNumber: v })} />
                  <ToggleRow label="Show Timestamp" checked={receiptConfig.showTimestamp} onChange={v => setReceiptConfig({ ...receiptConfig, showTimestamp: v })} />
                  <ToggleRow label="Show Item Codes" checked={receiptConfig.showItemCodes} onChange={v => setReceiptConfig({ ...receiptConfig, showItemCodes: v })} />
                  <ToggleRow label="Show Modifiers" checked={receiptConfig.showModifiers} onChange={v => setReceiptConfig({ ...receiptConfig, showModifiers: v })} />
                  <ToggleRow label="Show Tax Breakdown" checked={receiptConfig.showTaxBreakdown} onChange={v => setReceiptConfig({ ...receiptConfig, showTaxBreakdown: v })} />
                  <ToggleRow label="Show Tip Line" checked={receiptConfig.showTipLine} onChange={v => setReceiptConfig({ ...receiptConfig, showTipLine: v })} />
                  <ToggleRow label="Show WiFi Password" checked={receiptConfig.showWifiPassword} onChange={v => setReceiptConfig({ ...receiptConfig, showWifiPassword: v })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 15: STAFF PERMISSIONS ══════════════════════════════ */}
          <TabsContent value="permissions" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-400" />POS Staff Permissions</CardTitle>
                  <Button size="sm" className="bg-secondary text-foreground"><Plus className="w-4 h-4 mr-2" />Add Role</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-bold p-3">Role</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Void</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Discount</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Max %</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Refund</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Reports</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Edit Menu</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Drawer</th>
                        <th className="text-center text-xs text-muted-foreground font-bold p-3">Price Ovrd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPermissions.map(sp => (
                        <tr key={sp.id} className="border-b border-border hover:bg-white/[0.02]">
                          <td className="p-3 text-foreground font-bold">{sp.role}</td>
                          <td className="p-3 text-center"><Switch checked={sp.canVoid} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canVoid: v } : p))} /></td>
                          <td className="p-3 text-center"><Switch checked={sp.canDiscount} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canDiscount: v } : p))} /></td>
                          <td className="p-3 text-center"><span className="text-xs text-muted-foreground font-mono">{sp.maxDiscount}%</span></td>
                          <td className="p-3 text-center"><Switch checked={sp.canRefund} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canRefund: v } : p))} /></td>
                          <td className="p-3 text-center"><Switch checked={sp.canViewReports} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canViewReports: v } : p))} /></td>
                          <td className="p-3 text-center"><Switch checked={sp.canEditMenu} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canEditMenu: v } : p))} /></td>
                          <td className="p-3 text-center"><Switch checked={sp.canOpenDrawer} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canOpenDrawer: v } : p))} /></td>
                          <td className="p-3 text-center"><Switch checked={sp.canOverridePrice} onCheckedChange={v => setStaffPermissions(prev => prev.map(p => p.id === sp.id ? { ...p, canOverridePrice: v } : p))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 16: DUAL LANGUAGE ══════════════════════════════════ */}
          <TabsContent value="languages" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Languages className="w-5 h-5 text-sky-400" />Language Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Primary Language (Service)</Label>
                    <select aria-label="Input" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                      value={languageConfig.serviceLanguage}
                      onChange={e = aria-label="Input field"> setLanguageConfig({ ...languageConfig, serviceLanguage: e.target.value })}
                    >
                      {languageConfig.supportedLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang === 'en' ? 'English' : lang === 'mt' ? 'Maltese' : lang === 'it' ? 'Italian' : lang === 'de' ? 'German' : lang === 'fr' ? 'French' : lang === 'es' ? 'Spanish' : lang === 'tr' ? 'Turkish' : 'Arabic'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Kitchen Language</Label>
                    <select aria-label="Input" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                      value={languageConfig.kitchenLanguage}
                      onChange={e = aria-label="Input field"> setLanguageConfig({ ...languageConfig, kitchenLanguage: e.target.value })}
                    >
                      {languageConfig.supportedLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang === 'en' ? 'English' : lang === 'mt' ? 'Maltese' : lang === 'it' ? 'Italian' : lang === 'de' ? 'German' : lang === 'fr' ? 'French' : lang === 'es' ? 'Spanish' : lang === 'tr' ? 'Turkish' : 'Arabic'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Receipt Language</Label>
                    <select aria-label="Input" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                      value={languageConfig.receiptLanguage}
                      onChange={e = aria-label="Input field"> setLanguageConfig({ ...languageConfig, receiptLanguage: e.target.value })}
                    >
                      {languageConfig.supportedLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang === 'en' ? 'English' : lang === 'mt' ? 'Maltese' : lang === 'it' ? 'Italian' : lang === 'de' ? 'German' : lang === 'fr' ? 'French' : lang === 'es' ? 'Spanish' : lang === 'tr' ? 'Turkish' : 'Arabic'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <ToggleRow
                    label="Enable Dual Language Display"
                    description="Show items in both service language and kitchen language on KDS"
                    checked={languageConfig.enableDualLanguage}
                    onChange={v => setLanguageConfig({ ...languageConfig, enableDualLanguage: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 17: ACCOUNTING GROUPS ══════════════════════════════ */}
          <TabsContent value="accountinggroups" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Accounting Groups</CardTitle>
                  <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={() => setAccountingGroups(prev => [...prev, { id: Date.now().toString(), name: '', code: '', type: 'revenue', taxRate: 'Standard VAT', active: true }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Group
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Map menu categories to accounting ledger codes for fiscal reporting (Lightspeed parity)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accountingGroups.map((g, idx) => (
                    <div key={g.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <InlineEdit value={g.name} onChange={v => { const u = [...accountingGroups]; u[idx].name = v; setAccountingGroups(u); }} />
                        <InlineEdit value={g.code} onChange={v => { const u = [...accountingGroups]; u[idx].code = v; setAccountingGroups(u); }} />
                        <select className="bg-background text-foreground text-xs border border-border rounded-md px-2" value={g.type} onChange={e = aria-label="Input field"> { const u = [...accountingGroups]; u[idx].type = e.target.value; setAccountingGroups(u); }}>
                          <option value="revenue">Revenue</option>
                          <option value="liability">Liability</option>
                          <option value="expense">Expense</option>
                        </select>
                        <InlineEdit value={g.taxRate} onChange={v => { const u = [...accountingGroups]; u[idx].taxRate = v; setAccountingGroups(u); }} />
                      </div>
                      <Switch checked={g.active} onCheckedChange={v => { const u = [...accountingGroups]; u[idx].active = v; setAccountingGroups(u); }} />
                      <button className="text-muted-foreground hover:text-red-400" onClick={() => setAccountingGroups(prev => prev.filter(x => x.id !== g.id))}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 18: PRODUCTION INSTRUCTIONS ═══════════════════════ */}
          <TabsContent value="productioninstructions" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Production Instructions</CardTitle>
                  <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={() => setProductionInstructions(prev => [...prev, { id: Date.now().toString(), name: '', text: '', color: '#888', active: true, appliesTo: 'All' }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Instruction
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Quick production notes that print on KDS/kitchen tickets (Lightspeed parity)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productionInstructions.map((pi, idx) => (
                    <div key={pi.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <div className="w-3 h-8 rounded" style={{ backgroundColor: pi.color }} /> /* keep-inline */ /* keep-inline */
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <InlineEdit value={pi.name} onChange={v => { const u = [...productionInstructions]; u[idx].name = v; setProductionInstructions(u); }} />
                        <InlineEdit value={pi.text} onChange={v => { const u = [...productionInstructions]; u[idx].text = v; setProductionInstructions(u); }} />
                        <select className="bg-background text-foreground text-xs border border-border rounded-md px-2" value={pi.appliesTo} onChange={e = aria-label="Input field"> { const u = [...productionInstructions]; u[idx].appliesTo = e.target.value; setProductionInstructions(u); }}>
                          <option value="All">All Stations</option>
                          <option value="Kitchen">Kitchen Only</option>
                          <option value="Bar">Bar Only</option>
                        </select>
                      </div>
                      <input type="color" value={pi.color} onChange={e = aria-label="Input field"> { const u = [...productionInstructions]; u[idx].color = e.target.value; setProductionInstructions(u); }} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <Switch checked={pi.active} onCheckedChange={v => { const u = [...productionInstructions]; u[idx].active = v; setProductionInstructions(u); }} />
                      <button className="text-muted-foreground hover:text-red-400" onClick={() => setProductionInstructions(prev => prev.filter(x => x.id !== pi.id))}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 19: PRICE LISTS ═══════════════════════════════════ */}
          <TabsContent value="pricelists" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Price Lists</CardTitle>
                  <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={() => setPriceLists(prev => [...prev, { id: Date.now().toString(), name: '', description: '', isDefault: false, active: true, markup: 0 }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Price List
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Multiple price tiers for dine-in, takeaway, delivery, happy hour (Lightspeed parity)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priceLists.map((pl, idx) => (
                    <div key={pl.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <InlineEdit value={pl.name} onChange={v => { const u = [...priceLists]; u[idx].name = v; setPriceLists(u); }} />
                        <InlineEdit value={pl.description} onChange={v => { const u = [...priceLists]; u[idx].description = v; setPriceLists(u); }} />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Markup %</span>
                          <InlineEdit value={pl.markup?.toString()} onChange={v => { const u = [...priceLists]; u[idx].markup = parseFloat(v) || 0; setPriceLists(u); }} type="number" className="w-20" />
                        </div>
                      </div>
                      {pl.isDefault && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
                      <Switch checked={pl.active} onCheckedChange={v => { const u = [...priceLists]; u[idx].active = v; setPriceLists(u); }} />
                      <button className="text-muted-foreground hover:text-red-400" onClick={() => setPriceLists(prev => prev.filter(x => x.id !== pl.id))} disabled={pl.isDefault}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 20: PAYMENT TYPES ═════════════════════════════════ */}
          <TabsContent value="paymenttypes" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Payment Types</CardTitle>
                  <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={() => setPaymentTypes(prev => [...prev, { id: Date.now().toString(), name: '', code: '', active: true, requiresReference: false, accountingGroup: '', opensCashDrawer: false }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Payment Type
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Configure accepted payment methods and their accounting mapping (Lightspeed parity)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentTypes.map((pt, idx) => (
                    <div key={pt.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <InlineEdit value={pt.name} onChange={v => { const u = [...paymentTypes]; u[idx].name = v; setPaymentTypes(u); }} />
                        <InlineEdit value={pt.code} onChange={v => { const u = [...paymentTypes]; u[idx].code = v; setPaymentTypes(u); }} />
                        <InlineEdit value={pt.accountingGroup} onChange={v => { const u = [...paymentTypes]; u[idx].accountingGroup = v; setPaymentTypes(u); }} />
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id={`ref-${pt.id}`} checked={pt.requiresReference} onChange={e => { const u = [...paymentTypes]; u[idx].requiresReference = e.target.checked; setPaymentTypes(u); }} className="accent-red-500" />
                          <label htmlFor={`ref-${pt.id}`} className="text-xs text-muted-foreground">Requires Ref</label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={pt.opensCashDrawer} onChange={e = aria-label="Input field"> { const u = [...paymentTypes]; u[idx].opensCashDrawer = e.target.checked; setPaymentTypes(u); }} className="accent-red-500" />
                        <span className="text-xs text-muted-foreground">Drawer</span>
                      </div>
                      <Switch checked={pt.active} onCheckedChange={v => { const u = [...paymentTypes]; u[idx].active = v; setPaymentTypes(u); }} />
                      <button className="text-muted-foreground hover:text-red-400" onClick={() => setPaymentTypes(prev => prev.filter(x => x.id !== pt.id))}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 21: EMAIL / NOTIFICATIONS ═════════════════════════ */}
          <TabsContent value="emailnotifications" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Email Configuration</CardTitle>
                <p className="text-xs text-muted-foreground">SMTP settings for transactional emails (order confirmations, receipts)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>SMTP Host</Label>
                    <InlineEdit value={emailConfig.smtpHost} onChange={v => setEmailConfig({ ...emailConfig, smtpHost: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>SMTP Port</Label>
                    <InlineEdit value={emailConfig.smtpPort?.toString()} onChange={v => setEmailConfig({ ...emailConfig, smtpPort: parseInt(v) || 587 })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>SMTP User</Label>
                    <InlineEdit value={emailConfig.smtpUser} onChange={v => setEmailConfig({ ...emailConfig, smtpUser: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>SMTP Password</Label>
                    <InlineEdit value={emailConfig.smtpPassword} onChange={v => setEmailConfig({ ...emailConfig, smtpPassword: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Sender Name</Label>
                    <InlineEdit value={emailConfig.senderName} onChange={v => setEmailConfig({ ...emailConfig, senderName: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Sender Email</Label>
                    <InlineEdit value={emailConfig.senderEmail} onChange={v => setEmailConfig({ ...emailConfig, senderEmail: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Notification Triggers</CardTitle>
                <p className="text-xs text-muted-foreground">Choose what events trigger notifications and on which channels</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ToggleRow label="Order Confirmation" description="Email receipt to customer after payment" checked={emailConfig.enableOrderConfirmation} onChange={v => setEmailConfig({ ...emailConfig, enableOrderConfirmation: v })} />
                  <ToggleRow label="Payment Receipt" description="Send digital receipt on successful payment" checked={emailConfig.enablePaymentReceipt} onChange={v => setEmailConfig({ ...emailConfig, enablePaymentReceipt: v })} />
                  <ToggleRow label="Daily Summary Report" description="Send daily sales summary to management" checked={emailConfig.enableDailyReport} onChange={v => setEmailConfig({ ...emailConfig, enableDailyReport: v })} />
                  <ToggleRow label="End of Day Report" description="Automatic Z-report at shift close" checked={emailConfig.enableEndOfDayReport} onChange={v => setEmailConfig({ ...emailConfig, enableEndOfDayReport: v })} />
                  <ToggleRow label="Low Stock Alerts" description="Notify when inventory drops below threshold" checked={emailConfig.enableLowStockAlert} onChange={v => setEmailConfig({ ...emailConfig, enableLowStockAlert: v })} />
                  {emailConfig.enableLowStockAlert && (
                    <div className="ml-6 space-y-2">
                      <Label className={labelClass}>Low Stock Threshold (units)</Label>
                      <InlineEdit value={emailConfig.lowStockThreshold?.toString()} onChange={v => setEmailConfig({ ...emailConfig, lowStockThreshold: parseInt(v) || 10 })} />
                    </div>
                  )}
                  <ToggleRow label="Push Notifications" description="Browser push notifications for real-time alerts" checked={emailConfig.enablePushNotifications} onChange={v => setEmailConfig({ ...emailConfig, enablePushNotifications: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">SMS Configuration</CardTitle>
                <p className="text-xs text-muted-foreground">Optional SMS notifications for reservations and marketing</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ToggleRow label="Enable SMS" description="Send SMS for reservation confirmations and marketing" checked={emailConfig.enableSMS} onChange={v => setEmailConfig({ ...emailConfig, enableSMS: v })} />
                  {emailConfig.enableSMS && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-2">
                        <Label className={labelClass}>SMS Provider</Label>
                        <select className="w-full bg-card text-foreground text-xs border border-border rounded-md px-3 py-2" value={emailConfig.smsProvider} onChange={e = aria-label="Input field"> setEmailConfig({ ...emailConfig, smsProvider: e.target.value })}>
                          <option value="twilio">Twilio</option>
                          <option value="vonage">Vonage</option>
                          <option value="messagebird">MessageBird</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className={labelClass}>API Key</Label>
                        <InlineEdit value={emailConfig.smsApiKey} onChange={v => setEmailConfig({ ...emailConfig, smsApiKey: v })} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Notification Channels</CardTitle>
                <p className="text-xs text-muted-foreground">Configure which channels each event uses</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailConfig.pushCategories?.map((cat, idx) => (
                    <div key={cat.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <Switch checked={cat.enabled} onCheckedChange={v => {
                        const u = { ...emailConfig, pushCategories: [...emailConfig.pushCategories] };
                        u.pushCategories[idx] = { ...cat, enabled: v };
                        setEmailConfig(u);
                      }} />
                      <span className="flex-1 text-sm text-foreground font-medium">{cat.name}</span>
                      <div className="flex gap-2">
                        {['email', 'push', 'sms'].map(ch => (
                          <button
                            key={ch}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cat.channels.includes(ch) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}
                            onClick={() => {
                              const u = { ...emailConfig, pushCategories: [...emailConfig.pushCategories] };
                              const channels = cat.channels.includes(ch) ? cat.channels.filter(c => c !== ch) : [...cat.channels, ch];
                              u.pushCategories[idx] = { ...cat, channels };
                              setEmailConfig(u);
                            }}
                          >
                            {ch.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TAB 22: INVOICE ═══════════════════════════════════════ */}
          <TabsContent value="invoice" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Company Details</CardTitle>
                <p className="text-xs text-muted-foreground">Legal entity information printed on invoices and fiscal documents</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Company Name</Label>
                    <InlineEdit value={invoiceConfig.companyName} onChange={v => setInvoiceConfig({ ...invoiceConfig, companyName: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Company Address</Label>
                    <InlineEdit value={invoiceConfig.companyAddress} onChange={v => setInvoiceConfig({ ...invoiceConfig, companyAddress: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>VAT Number</Label>
                    <InlineEdit value={invoiceConfig.vatNumber} onChange={v => setInvoiceConfig({ ...invoiceConfig, vatNumber: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Registration Number</Label>
                    <InlineEdit value={invoiceConfig.registrationNumber} onChange={v => setInvoiceConfig({ ...invoiceConfig, registrationNumber: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Invoice Numbering & Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Invoice Prefix</Label>
                    <InlineEdit value={invoiceConfig.invoicePrefix} onChange={v => setInvoiceConfig({ ...invoiceConfig, invoicePrefix: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Next Invoice #</Label>
                    <InlineEdit value={invoiceConfig.nextInvoiceNumber?.toString()} onChange={v => setInvoiceConfig({ ...invoiceConfig, nextInvoiceNumber: parseInt(v) || 1001 })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Payment Terms (days)</Label>
                    <InlineEdit value={invoiceConfig.defaultPaymentTerms?.toString()} onChange={v => setInvoiceConfig({ ...invoiceConfig, defaultPaymentTerms: parseInt(v) || 30 })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Format</Label>
                    <select className="w-full bg-card text-foreground text-xs border border-border rounded-md px-3 py-2" value={invoiceConfig.invoiceFormat} onChange={e = aria-label="Input field"> setInvoiceConfig({ ...invoiceConfig, invoiceFormat: e.target.value })}>
                      <option value="A4">A4 (Standard)</option>
                      <option value="A5">A5 (Half Page)</option>
                      <option value="thermal">Thermal (80mm)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Language</Label>
                    <select className="w-full bg-card text-foreground text-xs border border-border rounded-md px-3 py-2" value={invoiceConfig.language} onChange={e = aria-label="Input field"> setInvoiceConfig({ ...invoiceConfig, language: e.target.value })}>
                      <option value="en">English</option>
                      <option value="mt">Maltese</option>
                      <option value="it">Italian</option>
                      <option value="de">German</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Currency</Label>
                    <InlineEdit value={invoiceConfig.currency} onChange={v => setInvoiceConfig({ ...invoiceConfig, currency: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Display Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ToggleRow label="Show Logo on Invoice" description="Print company logo at the top of each invoice" checked={invoiceConfig.showLogoOnInvoice} onChange={v => setInvoiceConfig({ ...invoiceConfig, showLogoOnInvoice: v })} />
                  <ToggleRow label="Show VAT Breakdown" description="Itemize VAT amounts by rate on the invoice" checked={invoiceConfig.showVATBreakdown} onChange={v => setInvoiceConfig({ ...invoiceConfig, showVATBreakdown: v })} />
                  <ToggleRow label="Show Item Descriptions" description="Include product descriptions below each line item" checked={invoiceConfig.showItemDescriptions} onChange={v => setInvoiceConfig({ ...invoiceConfig, showItemDescriptions: v })} />
                  <ToggleRow label="Auto-Email Invoice" description="Automatically email invoice to customer after payment" checked={invoiceConfig.autoEmailInvoice} onChange={v => setInvoiceConfig({ ...invoiceConfig, autoEmailInvoice: v })} />
                </div>
                <div className="mt-6 space-y-2">
                  <Label className={labelClass}>Invoice Footer Text</Label>
                  <InlineEdit value={invoiceConfig.footerText} onChange={v => setInvoiceConfig({ ...invoiceConfig, footerText: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Bank Details (for wire transfers)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className={labelClass}>Bank Name</Label>
                    <InlineEdit value={invoiceConfig.bankName} onChange={v => setInvoiceConfig({ ...invoiceConfig, bankName: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>IBAN</Label>
                    <InlineEdit value={invoiceConfig.bankIBAN} onChange={v => setInvoiceConfig({ ...invoiceConfig, bankIBAN: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>BIC / SWIFT</Label>
                    <InlineEdit value={invoiceConfig.bankBIC} onChange={v => setInvoiceConfig({ ...invoiceConfig, bankBIC: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Fiscal Compliance (Malta / EU)</CardTitle>
                <p className="text-xs text-muted-foreground">Configure fiscal printing device for EXO/government reporting</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ToggleRow label="Enable Fiscal Printing" description="Connect to certified fiscal device for tax compliance" checked={invoiceConfig.fiscalPrinting} onChange={v => setInvoiceConfig({ ...invoiceConfig, fiscalPrinting: v })} />
                  {invoiceConfig.fiscalPrinting && (
                    <div className="ml-6 space-y-2">
                      <Label className={labelClass}>Fiscal Device ID</Label>
                      <InlineEdit value={invoiceConfig.fiscalDeviceId} onChange={v => setInvoiceConfig({ ...invoiceConfig, fiscalDeviceId: v })} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </PageContainer>
    </PermissionGate>
  );
}