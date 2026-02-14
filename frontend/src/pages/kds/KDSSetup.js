import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { venueAPI, deviceAPI } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { ChefHat, Building2, MapPin, ArrowRight, Loader2 } from "lucide-react";

export default function KDSSetup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceId] = useState(() => {
    const existing = localStorage.getItem("restin_device_id");
    if (existing) return existing;
    const newId = `kds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("restin_device_id", newId);
    return newId;
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!isAuthenticated) {
      // navigate("/login"); // DISABLED - Safe Mode
      return;
    }
    checkExistingBinding();
  }, [isAuthenticated, authLoading]);

  const checkExistingBinding = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await deviceAPI.getBinding(deviceId);
      if (response.data.bound) {
        // Handle both response.data.venue_id and response.data.binding.venue_id
        const venueId = response.data.venue_id || response.data.binding?.venue_id;
        const zoneId = response.data.zone_id || response.data.binding?.zone_id || "";

        if (venueId) {
          localStorage.setItem("restin_kds_venue", venueId);
          localStorage.setItem("restin_kds_zone", zoneId);
          navigate("/kds");
          return;
        }
      }

      await loadVenues();
    } catch (error) {
      console.error("Failed to check binding:", error);
      setError("Failed to load setup data. Please try again.");
      await loadVenues();
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      // If no token, try to get from localStorage
      const token = localStorage.getItem("restin_token");
      if (!token) {
        setError("Please login first from Admin");
        return;
      }

      const response = await venueAPI.list();
      setVenues(response.data);
      if (response.data.length === 0) {
        setError("No venues found. Please contact your administrator.");
      }
    } catch (error) {
      console.error("Failed to load venues:", error);
      setError("Failed to load venues. Please login from Admin first.");
    }
  };

  const loadZones = async (venueId) => {
    try {
      const response = await venueAPI.getZones(venueId);
      setZones(response.data.filter(z => z.type === "kitchen" || z.type === "prep"));
    } catch (error) {
      console.error("Failed to load zones:", error);
      toast.error("Failed to load zones");
    }
  };

  const handleVenueSelect = (venueId) => {
    setSelectedVenue(venueId);
    setSelectedZone("");
    loadZones(venueId);
  };

  const handleComplete = async () => {
    if (!selectedVenue) {
      toast.error("Please select a venue");
      return;
    }

    setLoading(true);
    try {
      await deviceAPI.bind({
        device_id: deviceId,
        venue_id: selectedVenue,
        station: "kds",
        station_name: selectedZone || "Kitchen"
      });

      localStorage.setItem("restin_kds_venue", selectedVenue);
      localStorage.setItem("restin_kds_zone", selectedZone);

      toast.success("KDS terminal configured");
      navigate("/kds");
    } catch (error) {
      console.error("Failed to bind device:", error);

      // Prevent React crash by ensuring detail is a string
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string'
        ? detail
        : (typeof detail === 'object' ? JSON.stringify(detail) : "Failed to configure terminal");

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && venues.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-white/10 max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{t('errors.setupError')}</h2>
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button onClick={() => checkExistingBinding()} className="bg-green-500 hover:bg-green-600">
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="bg-zinc-900/50 backdrop-blur-md border-white/5 w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ChefHat className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-white text-2xl">{t('kds.setup')}</CardTitle>
              <CardDescription className="text-zinc-400">{t('kds.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('common.venue')}
              </Label>
              <Select value={selectedVenue} onValueChange={handleVenueSelect}>
                <SelectTrigger className="bg-zinc-800 border-white/10 text-white">
                  <SelectValue placeholder="Choose venue" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id} className="text-white">
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVenue && zones.length > 0 && (
              <div>
                <Label className="text-white mb-2 block">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Select Kitchen Zone (Optional)
                </Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="bg-zinc-800 border-white/10 text-white">
                    <SelectValue placeholder="Choose zone" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id} className="text-white">
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/manager/dashboard")}
              variant="outline"
              className="flex-1 border-white/10 text-zinc-100 hover:bg-white/5"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!selectedVenue || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configuring...
                </>
              ) : (
                <>
                  {t('common.continue')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
