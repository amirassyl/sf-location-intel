import { useEffect, useRef, useState } from "react";
import L, { Icon, Map as LeafletMap, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Layers, Flame, MapPin, Target } from "lucide-react";

// Fix for default marker icons in Leaflet
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = new Icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  severity: "high" | "medium" | "low";
  events: number;
}

interface MapViewProps {
  onLocationClick?: (location: LocationData) => void;
  selectedLocation?: LocationData | null;
}

export const MapView = ({ onLocationClick, selectedLocation }: MapViewProps) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');

  // Enhanced sample locations with more data
  const sampleLocations: LocationData[] = [
    { lat: 37.7749, lng: -122.4194, address: "555 Market St", severity: "high", events: 24 },
    { lat: 37.7849, lng: -122.4094, address: "123 Mission St", severity: "medium", events: 12 },
    { lat: 37.7649, lng: -122.4294, address: "789 Valencia St", severity: "low", events: 3 },
    { lat: 37.7699, lng: -122.4344, address: "456 Geary St", severity: "high", events: 18 },
    { lat: 37.7799, lng: -122.4144, address: "321 Castro St", severity: "medium", events: 9 },
    { lat: 37.7729, lng: -122.4264, address: "100 Powell St", severity: "low", events: 5 },
    { lat: 37.7879, lng: -122.4074, address: "200 Broadway", severity: "high", events: 21 },
    { lat: 37.7629, lng: -122.4374, address: "888 Divisadero St", severity: "medium", events: 14 },
  ];

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "high":
        return "#ef4444"; // red
      case "medium":
        return "#f59e0b"; // orange
      case "low":
        return "#10b981"; // green
      default:
        return "#6b7280"; // gray
    }
  };

  const createCustomIcon = (severity: string, events: number) => {
    const color = getSeverityColor(severity);
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-weight: bold;
          color: white;
          font-size: 14px;
        ">
          ${events}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(containerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 13,
      zoomControl: true,
    });

    // Tile layer
    L.tileLayer(getTileLayer(), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // Initialize marker cluster group
    markersLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
      iconCreateFunction: function(cluster) {
        const markers = cluster.getAllChildMarkers();
        const total = markers.reduce((sum: number, m: any) => sum + (m.options.events || 0), 0);
        
        // Determine cluster severity
        let severity = 'low';
        markers.forEach((m: any) => {
          if (m.options.severity === 'high') severity = 'high';
          else if (m.options.severity === 'medium' && severity !== 'high') severity = 'medium';
        });
        
        const color = getSeverityColor(severity);
        
        return L.divIcon({
          html: `
            <div style="
              background: ${color};
              border: 4px solid white;
              border-radius: 50%;
              width: 60px;
              height: 60px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              font-weight: bold;
              color: white;
            ">
              <div style="font-size: 18px;">${markers.length}</div>
              <div style="font-size: 10px;">${total} events</div>
            </div>
          `,
          className: 'marker-cluster-custom',
          iconSize: L.point(60, 60),
        });
      }
    });

    // Add markers with rich popups
    sampleLocations.forEach((location) => {
      const marker = L.marker([location.lat, location.lng], {
        icon: createCustomIcon(location.severity, location.events),
        ...location as any, // Pass location data to marker options
      });

      const popupContent = `
        <div style="min-width: 200px; padding: 8px;">
          <p style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${location.address}</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: white;
              background: ${getSeverityColor(location.severity)};
            ">
              ${location.severity}
            </span>
            <span style="font-size: 12px; color: #6b7280;">${location.events} events</span>
          </div>
          <button
            onclick="window.dispatchEvent(new CustomEvent('marker-click', { detail: ${JSON.stringify(location)} }))"
            style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              width: 100%;
              font-weight: 500;
            "
          >
            View Full Report →
          </button>
        </div>
      `;
      
      marker.bindPopup(popupContent, { maxWidth: 300 });
      
      marker.on("click", () => onLocationClick?.(location));
      
      markersLayerRef.current?.addLayer(marker);
    });

    mapRef.current.addLayer(markersLayerRef.current);

    // Listen for marker clicks from popup
    window.addEventListener('marker-click', ((e: CustomEvent) => {
      onLocationClick?.(e.detail);
    }) as EventListener);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      window.removeEventListener('marker-click', (() => {}) as EventListener);
    };
  }, []);

  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.setView([selectedLocation.lat, selectedLocation.lng], 16, {
        animate: true,
        duration: 1,
      });
    }
  }, [selectedLocation]);

  const changeMapStyle = (style: 'streets' | 'satellite' | 'dark') => {
    if (!mapRef.current) return;
    
    // Remove old tile layer
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new tile layer
    L.tileLayer(getTileLayer(), {
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapRef.current);

    setMapStyle(style);
  };

  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.setView([37.7749, -122.4194], 13, { animate: true });
    }
  };

  return (
    <Card className="h-full overflow-hidden relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Map Style Toggle */}
        <Card className="p-2 bg-white/95 backdrop-blur">
          <div className="flex gap-1">
            <Button
              variant={mapStyle === 'streets' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => changeMapStyle('streets')}
              className="h-8 px-2"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => changeMapStyle('satellite')}
              className="h-8 px-2"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant={mapStyle === 'dark' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => changeMapStyle('dark')}
              className="h-8 px-2"
            >
              <Flame className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Recenter Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={recenterMap}
          className="h-10 w-10 p-0"
          title="Recenter map"
        >
          <Target className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <Card className="p-3 bg-white/95 backdrop-blur text-sm">
          <div className="font-semibold mb-2">Activity Level</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: '#ef4444' }}></div>
              <span>High (15+ events)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }}></div>
              <span>Medium (5-14 events)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: '#10b981' }}></div>
              <span>Low (&lt;5 events)</span>
            </div>
          </div>
        </Card>
      </div>

      <div ref={containerRef} className="h-full w-full" style={{ minHeight: "400px" }} />
    </Card>
  );
};
