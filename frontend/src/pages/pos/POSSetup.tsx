import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { venueAPI, deviceAPI } from "../../lib/api";
import { toast } from "sonner";
import { logger } from "../../lib/logger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Monitor, Building2, Printer, Server, CreditCard,
  MapPin, Save, RotateCcw, CheckCircle, Loader2,
  LayoutGrid, Tablet, Zap, Check, Flame, Sparkles
} from "lucide-react";
import { usePOSTheme, POSTheme } from "../../hooks/usePOSTheme";
import { setActiveTheme } from "../../features/pos/themes/builtinThemes";

export default function POSSetup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Data State
  const [venues, setVenues] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Configuration State
  const [activeTab, setActiveTab] = useState("general");

  // POS Theme
  const { theme: posTheme, setTheme: setPosTheme, themes: posThemes } = usePOSTheme();
  const THEME_ICONS: Record<string, React.ElementType> = { restin: Monitor, pro: Tablet, express: Zap, 'k-series': Flame, 'l-series': Sparkles };

  // -- General Settings --
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [deviceName, setDeviceName] = useState("");

  // -- Hardware Settings --
  const [printerType, setPrinterType] = useState("browser"); // browser, network
  const [printerIp, setPrinterIp] = useState("");
  const [kitchenPrinterIp, setKitchenPrinterIp] = useState("");

  // -- KDS Settings --
  const [enableKds, setEnableKds] = useState(true);
  const [kdsUrl, setKdsUrl] = useState("");

  // -- Payment Settings --
  const [enableSplitBill, setEnableSplitBill] = useState(true);
  const [terminalIp, setTerminalIp] = useState("");

  const [deviceId] = useState(() => {
    const existing = localStorage.getItem("restin_device_id");
    if (existing) return existing;
    const newId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("restin_device_id", newId);
    return newId;
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadUnconfiguredState();
  }, [isAuthenticated, authLoading]);

  const loadUnconfiguredState = async () => {
    try {
      setLoading(true);
      // Load Venues
      const response = await venueAPI.list();
      setVenues(response.data || []);

      // Load Local Configs
      const savedVenue = localStorage.getItem("restin_pos_venue");
      const savedZone = localStorage.getItem("restin_pos_zone");
      const savedDeviceName = localStorage.getItem("restin_pos_device_name");
      const savedPrinter = JSON.parse(localStorage.getItem("restin_pos_printer_config") || "{}");

      if (savedVenue) {
        setSelectedVenue(savedVenue);
        await handleVenueSelect(savedVenue); // Load zones
      }
      if (savedZone) setSelectedZone(savedZone);
      if (savedDeviceName) setDeviceName(savedDeviceName);

      setPrinterType(savedPrinter.type || "browser");
      setPrinterIp(savedPrinter.ip || "");
      setKitchenPrinterIp(savedPrinter.kitchen_ip || "");

    } catch (error) {
      logger.error("Failed to load setup data:", { error });
      toast.error("Failed to load configuration data");
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSelect = async (venueId) => {
    setSelectedVenue(venueId);
    try {
      const response = await venueAPI.getZones(venueId);
      setZones(response.data || []);
    } catch (error) {
      logger.error("Failed to load zones:", { error });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 1. Save Local Storage FIRST (Critical — POS won't load without this)
      localStorage.setItem("restin_pos_venue", selectedVenue);
      localStorage.setItem("restin_pos_zone", selectedZone || '');
      localStorage.setItem("restin_pos_device_name", deviceName);
      localStorage.setItem("restin_pos_printer_config", JSON.stringify({
        type: printerType,
        ip: printerIp,
        kitchen_ip: kitchenPrinterIp
      }));

      // 2. Bind Device (Backend — non-blocking, nice-to-have)
      try {
        await deviceAPI.bind({
          device_id: deviceId,
          venue_id: selectedVenue,
          station: selectedZone || 'pos-main',
          station_name: zones.find(z => z.id === selectedZone)?.name || deviceName || 'POS Terminal',
          config: {
            printer_type: printerType,
            printer_ip: printerIp,
            kitchen_printer_ip: kitchenPrinterIp,
            kds_enabled: enableKds
          }
        });
      } catch (bindErr) {
        // Device binding is non-critical — POS works with localStorage alone
        logger.warn('[POS Setup] Device bind failed (non-blocking)', { error: bindErr });
      }

      toast.success("POS Configuration Saved!");
      navigate("/pos");

    } catch (error) {
      logger.error("Save failed:", { error });
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 dark:text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-4xl bg-card border-border text-foreground">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Monitor className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-2xl text-foreground">POS Configuration</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Setup terminal hardware and preferences
                </CardDescription>
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              ID: {deviceId}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-secondary border-border">
              <TabsTrigger value="general" className="data-[state=active]:bg-secondary/80 text-secondary-foreground">
                <Building2 className="w-4 h-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger value="hardware" className="data-[state=active]:bg-secondary/80 text-secondary-foreground">
                <Printer className="w-4 h-4 mr-2" /> Hardware
              </TabsTrigger>
              <TabsTrigger value="kds" className="data-[state=active]:bg-secondary/80 text-secondary-foreground">
                <Server className="w-4 h-4 mr-2" /> KDS
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-secondary/80 text-secondary-foreground">
                <CreditCard className="w-4 h-4 mr-2" /> Payments
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-secondary/80 text-secondary-foreground">
                <LayoutGrid className="w-4 h-4 mr-2" /> Templates
              </TabsTrigger>
            </TabsList>

            {/* --- GENERAL TAB --- */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Select aria-label="Select option" value={selectedVenue} onValueChange={handleVenueSelect}>
                    <SelectTrigger aria-label="Select option" className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Select Venue" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border text-foreground">
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zone / Station</Label>
                  <Select aria-label="Select option" value={selectedZone} onValueChange={setSelectedZone} disabled={!selectedVenue}>
                    <SelectTrigger aria-label="Select option" className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border text-foreground">
                      {zones.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Terminal Name (Optional)</Label>
                  <Input aria-label="Input field"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Bar Pos 1"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>

            {/* --- HARDWARE TAB --- */}
            <TabsContent value="hardware" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Receipt Printer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Connection Type</Label>
                    <Select aria-label="Select option" value={printerType} onValueChange={setPrinterType}>
                      <SelectTrigger aria-label="Select option" className="bg-secondary border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border text-foreground">
                        <SelectItem value="browser">Browser Print (Default)</SelectItem>
                        <SelectItem value="network">Network (ESC/POS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {printerType === 'network' && (
                    <div className="space-y-2">
                      <Label>Printer IP Address</Label>
                      <Input aria-label="Input field"
                        value={printerIp}
                        onChange={(e) => setPrinterIp(e.target.value)}
                        placeholder="192.168.1.100"
                        className="bg-secondary border-border text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Kitchen Printer (Backup)</h3>
                <div className="space-y-2">
                  <Label>Kitchen Printer IP</Label>
                  <Input aria-label="Input field"
                    value={kitchenPrinterIp}
                    onChange={(e) => setKitchenPrinterIp(e.target.value)}
                    placeholder="192.168.1.101"
                    className="bg-secondary border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Only used if KDS is offline.</p>
                </div>
              </div>
            </TabsContent>

            {/* --- KDS TAB --- */}
            <TabsContent value="kds" className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Enable KDS Integration</h4>
                  <p className="text-sm text-muted-foreground">Send orders to Kitchen Display System</p>
                </div>
                <Switch checked={enableKds} onCheckedChange={setEnableKds} />
              </div>

              {enableKds && (
                <div className="space-y-2">
                  <Label>KDS Server URL</Label>
                  <Input aria-label="Input field"
                    value={kdsUrl}
                    onChange={(e) => setKdsUrl(e.target.value)}
                    placeholder="http://localhost:8000/kds"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              )}
            </TabsContent>

            {/* --- PAYMENTS TAB --- */}
            <TabsContent value="payments" className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Split Bill</h4>
                  <p className="text-sm text-muted-foreground">Allow customers to split payments</p>
                </div>
                <Switch checked={enableSplitBill} onCheckedChange={setEnableSplitBill} />
              </div>

              <div className="space-y-2">
                <Label>Payment Terminal IP (EFTPOS)</Label>
                <Input aria-label="Input field"
                  value={terminalIp}
                  onChange={(e) => setTerminalIp(e.target.value)}
                  placeholder="192.168.1.200"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </TabsContent>

            {/* --- TEMPLATES TAB --- */}
            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-medium text-foreground">POS Layout Template</h3>
                <p className="text-sm text-muted-foreground">Choose the POS layout that best fits your service style. Changes take effect immediately.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posThemes.map(t => {
                  const TIcon = THEME_ICONS[t.id] || Monitor;
                  const isActive = posTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPosTheme(t.id);
                        // Map usePOSTheme id to builtinThemes theme id
                        const themeIdMap: Record<string, string> = {
                          restin: 'theme-restin', pro: 'theme-pro', express: 'theme-express',
                          'k-series': 'theme-kseries', 'l-series': 'theme-lseries'
                        };
                        setActiveTheme(themeIdMap[t.id] || 'theme-restin');
                      }}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${isActive
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                        }`}
                    >
                      {isActive && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                          }`}>
                          <TIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{t.name}</div>
                          <div className="text-[11px] text-muted-foreground">{t.target}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

          </Tabs>

          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={resetConfig}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-border text-secondary-foreground hover:bg-secondary hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedVenue || saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save & Exit
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
