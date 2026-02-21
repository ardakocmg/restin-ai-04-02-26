import { logger } from '@/lib/logger';
import { ArrowRight,Building2,ChefHat,Loader2,MapPin } from "lucide-react";
import { useEffect,useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "../../components/ui/select";
import { useAuth } from "../../context/AuthContext";
import { deviceAPI,venueAPI } from "../../lib/api";

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
      logger.error("Failed to check binding:", error);
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
      logger.error("Failed to load venues:", error);
      setError("Failed to load venues. Please login from Admin first.");
    }
  };

  const loadZones = async (venueId) => {
    try {
      const response = await venueAPI.getZones(venueId);
      setZones(response.data.filter(z => z.type === "kitchen" || z.type === "prep"));
    } catch (error) {
      logger.error("Failed to load zones:", error);
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
      logger.error("Failed to bind device:", error);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 dark:text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-foreground text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && venues.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('errors.setupError')}</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => checkExistingBinding()} className="bg-green-500 hover:bg-green-600">
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="bg-card/50 backdrop-blur-md border-border w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ChefHat className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-foreground text-2xl">{t('kds.setup')}</CardTitle>
              <CardDescription className="text-muted-foreground">{t('kds.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-foreground mb-2 block">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('common.venue')}
              </Label>
              <Select aria-label="Select option" value={selectedVenue} onValueChange={handleVenueSelect}>
                <SelectTrigger aria-label="Select option" className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Choose venue" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id} className="text-foreground">
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVenue && zones.length > 0 && (
              <div>
                <Label className="text-foreground mb-2 block">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Select Kitchen Zone (Optional)
                </Label>
                <Select aria-label="Select option" value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger aria-label="Select option" className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Choose zone" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id} className="text-foreground">
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
              className="flex-1 border-border text-foreground hover:bg-white/5"
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
