import { useState } from "react";
import { Layers } from "lucide-react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";

interface LayerControlProps {
  activeLayers: {
    complaints: boolean;
    permits: boolean;
    businesses: boolean;
    crime: boolean;
  };
  onLayerToggle: (layer: string, active: boolean) => void;
}

export const LayerControl = ({ activeLayers, onLayerToggle }: LayerControlProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="secondary"
        className="bg-card shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Layers className="h-5 w-5" />
      </Button>

      {isOpen && (
        <Card className="absolute top-12 right-0 w-64 p-4 shadow-xl z-10">
          <h3 className="font-semibold mb-4 text-sm">Data Layers</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="complaints" className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-3 h-3 bg-warning rounded-full" />
                311 Complaints
              </Label>
              <Switch
                id="complaints"
                checked={activeLayers.complaints}
                onCheckedChange={(checked) => onLayerToggle('complaints', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="permits" className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-3 h-3 bg-accent rounded-full" />
                Building Permits
              </Label>
              <Switch
                id="permits"
                checked={activeLayers.permits}
                onCheckedChange={(checked) => onLayerToggle('permits', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="businesses" className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-3 h-3 bg-success rounded-full" />
                Businesses
              </Label>
              <Switch
                id="businesses"
                checked={activeLayers.businesses}
                onCheckedChange={(checked) => onLayerToggle('businesses', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="crime" className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-3 h-3 bg-destructive rounded-full" />
                Crime Incidents
              </Label>
              <Switch
                id="crime"
                checked={activeLayers.crime}
                onCheckedChange={(checked) => onLayerToggle('crime', checked)}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full"
              onClick={() => {
                // Toggle all layers
                const allActive = Object.values(activeLayers).every(v => v);
                Object.keys(activeLayers).forEach(layer => {
                  onLayerToggle(layer, !allActive);
                });
              }}
            >
              Toggle All
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
