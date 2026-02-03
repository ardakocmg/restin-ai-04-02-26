import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { venueAPI, deviceAPI } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Monitor, Building2, MapPin, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

export default function POSSetup() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    checkExistingBinding();
  }, [isAuthenticated, authLoading]);

  const checkExistingBinding = async () => {
    try {
      setLoading(true);
      const response = await deviceAPI.getBinding(deviceId);

      if (response.data.bound) {
        localStorage.setItem("restin_pos_venue", response.data.venue_id);
        localStorage.setItem("restin_pos_zone", response.data.station || "");
        navigate("/pos");
        return;
      }

      await loadVenues();
    } catch (error) {
      console.error("Binding check failed:", error);
      await loadVenues();
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      const response = await venueAPI.list();
      setVenues(response.data || []);
      if (!response.data || response.data.length === 0) {
        setError("No venues found");
      }
    } catch (error) {
      console.error("Failed to load venues:", error);
      setError("Failed to load venues");
    }
  };

  const handleVenueSelect = async (venueId) => {
    setSelectedVenue(venueId);
    try {
      const response = await venueAPI.getZones(venueId);
      setZones(response.data || []);
    } catch (error) {
      console.error("Failed to load zones:", error);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      await deviceAPI.bind({
        device_id: deviceId,
        venue_id: selectedVenue,
        station: selectedZone || 'pos-main',
        station_name: zones.find(z => z.id === selectedZone)?.name || 'POS Main'
      });

      localStorage.setItem("restin_pos_venue", selectedVenue);
      localStorage.setItem("restin_pos_zone", selectedZone || '');

      toast.success("POS configured!");
      navigate("/pos");
    } catch (error) {
      console.error("Bind failed:", error);
      toast.error("Failed to configure POS");
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0B' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#E53935' }} />
      </div>
    );
  }

  if (error && venues.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0B' }}>
        <Card>
          <CardContent className="pt-6 text-center">
            <p style={{ color: '#F5F5F7' }}>{error}</p>
            <Button onClick={checkExistingBinding} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0A0A0B' }}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(229, 57, 53, 0.15)' }}>
              <Monitor className="w-8 h-8" style={{ color: '#E53935' }} />
            </div>
            <div>
              <CardTitle>POS SETUP</CardTitle>
              <CardDescription>Configure this terminal</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="venue-select" className="mb-2 block">
              <Building2 className="w-4 h-4 inline mr-2" />
              Select Venue
            </Label>
            <Select id="venue-select" value={selectedVenue} onValueChange={handleVenueSelect}>
              <SelectTrigger id="venue-select">
                <SelectValue placeholder="Choose venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(venue => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {zones.length > 0 && (
            <div>
              <Label htmlFor="zone-select" className="mb-2 block">
                <MapPin className="w-4 h-4 inline mr-2" />
                Select Zone (Optional)
              </Label>
              <Select id="zone-select" value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger id="zone-select">
                  <SelectValue placeholder="Choose zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="flex-1"
              style={{ color: '#F5F5F7' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!selectedVenue || loading}
              className="flex-1"
              style={{
                backgroundColor: '#E53935',
                color: '#FFFFFF',
                fontWeight: 600,
                boxShadow: '0 0 20px rgba(229, 57, 53, 0.3)'
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  CONTINUE
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
