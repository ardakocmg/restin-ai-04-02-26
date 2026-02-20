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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
      <Card className="w-full max-w-4xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Monitor className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">POS Configuration</CardTitle>
                <CardDescription className="text-zinc-400">
                  Setup terminal hardware and preferences
                </CardDescription>
              </div>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              ID: {deviceId}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-800 border-zinc-700">
              <TabsTrigger value="general" className="data-[state=active]:bg-zinc-700 text-zinc-300">
                <Building2 className="w-4 h-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger value="hardware" className="data-[state=active]:bg-zinc-700 text-zinc-300">
                <Printer className="w-4 h-4 mr-2" /> Hardware
              </TabsTrigger>
              <TabsTrigger value="kds" className="data-[state=active]:bg-zinc-700 text-zinc-300">
                <Server className="w-4 h-4 mr-2" /> KDS
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-zinc-700 text-zinc-300">
                <CreditCard className="w-4 h-4 mr-2" /> Payments
              </TabsTrigger>
            </TabsList>

            {/* --- GENERAL TAB --- */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Select value={selectedVenue} onValueChange={handleVenueSelect}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select Venue" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zone / Station</Label>
                  <Select value={selectedZone} onValueChange={setSelectedZone} disabled={!selectedVenue}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select Zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </TabsContent>

            {/* --- HARDWARE TAB --- */}
            <TabsContent value="hardware" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Receipt Printer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Connection Type</Label>
                    <Select value={printerType} onValueChange={setPrinterType}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Kitchen Printer (Backup)</h3>
                <div className="space-y-2">
                  <Label>Kitchen Printer IP</Label>
                  <Input
                    value={kitchenPrinterIp}
                    onChange={(e) => setKitchenPrinterIp(e.target.value)}
                    placeholder="192.168.1.101"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500">Only used if KDS is offline.</p>
                </div>
              </div>
            </TabsContent>

            {/* --- KDS TAB --- */}
            <TabsContent value="kds" className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-white">Enable KDS Integration</h4>
                  <p className="text-sm text-zinc-400">Send orders to Kitchen Display System</p>
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
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              )}
            </TabsContent>

            {/* --- PAYMENTS TAB --- */}
            <TabsContent value="payments" className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-white">Split Bill</h4>
                  <p className="text-sm text-zinc-400">Allow customers to split payments</p>
                </div>
                <Switch checked={enableSplitBill} onCheckedChange={setEnableSplitBill} />
              </div>

              <div className="space-y-2">
                <Label>Payment Terminal IP (EFTPOS)</Label>
                <Input
                  value={terminalIp}
                  onChange={(e) => setTerminalIp(e.target.value)}
                  placeholder="192.168.1.200"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </TabsContent>

          </Tabs>

          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
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
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedVenue || saving}
                className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
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
