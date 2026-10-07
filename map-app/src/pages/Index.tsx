import { useState, useEffect } from "react";
import { MapboxView } from "@/components/MapboxView";
import { MapOverlaySearch } from "@/components/MapOverlaySearch";
import { BottomSheet } from "@/components/BottomSheet";
import { LayerControl } from "@/components/LayerControl";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  severity: "high" | "medium" | "low";
  data?: any;
  metrics?: any;
  insights?: string[];
}

const Index = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    complaints: true,
    permits: true,
    businesses: true,
    crime: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (address: string, lat?: number, lng?: number) => {
    setLoading(true);
    try {
      // Fetch location data from edge function
      const { data, error } = await supabase.functions.invoke('fetch-location-data', {
        body: { 
          address,
          latitude: lat || 37.7749,
          longitude: lng || -122.4194
        }
      });

      if (!error && data) {
        setSelectedLocation({
          lat: data.address?.latitude || lat || 37.7749,
          lng: data.address?.longitude || lng || -122.4194,
          address: data.address?.address || address,
          severity: data.severity || "low",
          data: data.data,
          metrics: data.metrics,
          insights: data.insights,
        });
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    // Reverse geocode to get address, then fetch data
    // For now, using placeholder
    const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    handleSearch(address, lat, lng);
  };

  const handleLayerToggle = (layer: string, active: boolean) => {
    setActiveLayers(prev => ({
      ...prev,
      [layer]: active
    }));
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Full-screen Map */}
      <MapboxView 
        selectedLocation={selectedLocation}
        onMapClick={handleMapClick}
      />

      {/* Top-left: Search Overlay */}
      <div className="absolute top-6 left-6 z-30">
        <MapOverlaySearch onSearch={handleSearch} />
      </div>

      {/* Top-right: Layer Controls */}
      <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
        <LayerControl 
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
        />
        <Button
          size="icon"
          variant="secondary"
          className="bg-card shadow-lg"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* Top-left: Menu button (mobile) */}
      <div className="absolute top-6 left-6 z-30 md:hidden">
        <Button
          size="icon"
          variant="secondary"
          className="bg-card shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Bottom: Attribution */}
      <div className="absolute bottom-4 left-4 z-20 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
        SF Civic Intelligence • Powered by Open Data
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-card px-4 py-2 rounded-full shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Loading data...</span>
          </div>
        </div>
      )}

      {/* Bottom Sheet with Location Details */}
      {selectedLocation && (
        <BottomSheet
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
};

export default Index;
