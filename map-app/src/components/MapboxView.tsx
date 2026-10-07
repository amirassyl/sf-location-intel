import { useRef, useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, ScaleControl } from 'react-map-gl';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxViewProps {
  selectedLocation: {
    lat: number;
    lng: number;
    address: string;
    severity?: "high" | "medium" | "low";
  } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export const MapboxView = ({ selectedLocation, onMapClick }: MapboxViewProps) => {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12
  });

  // Update map when location is selected
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      setViewState({
        longitude: selectedLocation.lng,
        latitude: selectedLocation.lat,
        zoom: 16
      });
    }
  }, [selectedLocation]);

  const handleMapClick = (event: any) => {
    const { lngLat } = event;
    onMapClick(lngLat.lat, lngLat.lng);
  };

  // For now, use a placeholder token - user will need to add their own
  const MAPBOX_TOKEN = 'YOUR_MAPBOX_TOKEN_HERE';

  return (
    <div className="w-full h-full relative">
      {!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md text-center">
            <h3 className="font-semibold mb-2">Mapbox Token Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please add your Mapbox public token to the Cloud secrets as <code className="bg-muted px-1 py-0.5 rounded">MAPBOX_PUBLIC_TOKEN</code>
            </p>
            <a 
              href="https://account.mapbox.com/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Get your token at mapbox.com →
            </a>
          </div>
        </div>
      ) : null}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Selected Location Marker */}
        {selectedLocation && (
          <Marker
            longitude={selectedLocation.lng}
            latitude={selectedLocation.lat}
            anchor="bottom"
          >
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full 
              shadow-lg border-2 border-white cursor-pointer
              ${selectedLocation.severity === 'high' ? 'bg-destructive' :
                selectedLocation.severity === 'medium' ? 'bg-warning' :
                'bg-success'}
            `}>
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
};
