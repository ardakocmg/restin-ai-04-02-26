import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VenueContext = createContext(null);

export const useVenue = () => {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error("useVenue must be used within VenueProvider");
  }
  return context;
};

export const VenueProvider = ({ children }) => {
  const [venues, setVenues] = useState([]);
  const [activeVenue, setActiveVenue] = useState(null);
  const [activeVenueId, setActiveVenueId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();

    // Load stored active venue ID or object
    const storedVenueId = localStorage.getItem("activeVenueId");
    const storedVenue = localStorage.getItem("restin_active_venue");

    if (storedVenueId) {
      setActiveVenueId(storedVenueId);
    }

    if (storedVenue) {
      const venue = JSON.parse(storedVenue);
      setActiveVenue(venue);
      setActiveVenueId(venue.id);
      // Ensure compatibility with components using 'currentVenueId'
      if (!localStorage.getItem('currentVenueId')) {
        localStorage.setItem('currentVenueId', venue.id);
      }
    }
  }, []);

  const loadVenues = async () => {
    try {
      const response = await axios.get(`${API}/venues`);
      setVenues(response.data);

      // Auto-select first venue if none selected
      if (!activeVenue && response.data.length > 0) {
        const storedVenue = localStorage.getItem("restin_active_venue");
        if (!storedVenue) {
          selectVenue(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectVenue = (venue) => {
    setActiveVenue(venue);
    setActiveVenueId(venue.id);
    localStorage.setItem("restin_active_venue", JSON.stringify(venue));
    localStorage.setItem("activeVenueId", venue.id);
    localStorage.setItem("currentVenueId", venue.id); // For compatibility
  };

  const refreshVenues = () => {
    loadVenues();
  };

  return (
    <VenueContext.Provider value={{
      venues,
      activeVenue,
      activeVenueId,
      loading,
      selectVenue,
      refreshVenues
    }}>
      {children}
    </VenueContext.Provider>
  );
};
