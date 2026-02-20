// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { venueAPI, deviceAPI } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Monitor, Building2, Printer, Server, CreditCard,
  MapPin, Save, RotateCcw, CheckCircle, Loader2
} from "lucide-react";

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

    } catch (error: any) {
      console.error("Failed to load setup data:", error);
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
    } catch (error: any) {
      console.error("Failed to load zones:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 1. Bind Device (Backend)
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

      // 2. Save Local Storage (Persistent)
      localStorage.setItem("restin_pos_venue", selectedVenue);
      localStorage.setItem("restin_pos_zone", selectedZone || '');
      localStorage.setItem("restin_pos_device_name", deviceName);
      localStorage.setItem("restin_pos_printer_config", JSON.stringify({
        type: printerType,
        ip: printerIp,
        kitchen_ip: kitchenPrinterIp
      }));

      toast.success("POS Configuration Saved!");
      navigate("/pos");

    } catch (error: any) {
      console.error("Save failed:", error);
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
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
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
              <TabsTrigger value="general" className="data-[state=active]:bg-zinc-700 text-secondary-foreground">
                <Building2 className="w-4 h-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger value="hardware" className="data-[state=active]:bg-zinc-700 text-secondary-foreground">
                <Printer className="w-4 h-4 mr-2" /> Hardware
              </TabsTrigger>
              <TabsTrigger value="kds" className="data-[state=active]:bg-zinc-700 text-secondary-foreground">
                <Server className="w-4 h-4 mr-2" /> KDS
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-zinc-700 text-secondary-foreground">
                <CreditCard className="w-4 h-4 mr-2" /> Payments
              </TabsTrigger>
            </TabsList>

            {/* --- GENERAL TAB --- */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Select value={selectedVenue} onValueChange={handleVenueSelect}>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
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
                  <Select value={selectedZone} onValueChange={setSelectedZone} disabled={!selectedVenue}>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
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
                  <Input
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
                    <Select value={printerType} onValueChange={setPrinterType}>
                      <SelectTrigger className="bg-secondary border-border text-foreground">
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
                      <Input
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
                  <Input
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
                  <Input
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
                <Input
                  value={terminalIp}
                  onChange={(e) => setTerminalIp(e.target.value)}
                  placeholder="192.168.1.200"
                  className="bg-secondary border-border text-foreground"
                />
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
                className="bg-red-600 hover:bg-red-700 text-foreground min-w-[120px]"
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
