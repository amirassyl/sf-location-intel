import { useState } from "react";
import { X, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface BottomSheetProps {
  location: {
    address: string;
    data?: any;
    metrics?: {
      totalEvents: number;
      activeComplaints: number;
      activeBusinesses: number;
      permits: number;
    };
    severity?: "high" | "medium" | "low";
    insights?: string[];
  } | null;
  onClose: () => void;
}

export const BottomSheet = ({ location, onClose }: BottomSheetProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!location) return null;

  const metrics = location.metrics || {
    totalEvents: 0,
    activeComplaints: 0,
    activeBusinesses: 0,
    permits: 0,
  };

  const data = location.data || { permits: [], complaints: [], businesses: [] };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 
          bg-card rounded-t-3xl shadow-2xl
          transition-all duration-300 ease-out
          z-50
          ${expanded ? 'h-[90vh]' : 'h-[45vh]'}
        `}
      >
        {/* Drag handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {location.address}
              </h1>
              <div className="flex flex-wrap gap-2">
                {metrics.permits > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {metrics.permits} Permits
                  </Badge>
                )}
                {metrics.activeComplaints > 0 && (
                  <Badge className="bg-warning text-warning-foreground text-xs">
                    {metrics.activeComplaints} Active Complaints
                  </Badge>
                )}
                {metrics.activeBusinesses > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {metrics.activeBusinesses} Businesses
                  </Badge>
                )}
                {location.severity && (
                  <Badge 
                    className={`text-xs ${
                      location.severity === 'high' ? 'bg-destructive' :
                      location.severity === 'medium' ? 'bg-warning' :
                      'bg-success'
                    }`}
                  >
                    {location.severity.toUpperCase()} Activity
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronUp className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* AI Insights */}
          {location.insights && location.insights.length > 0 && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <h3 className="font-semibold text-sm text-warning-foreground mb-2 flex items-center gap-2">
                🚨 AI-Detected Patterns
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {location.insights.map((insight, idx) => (
                  <li key={idx}>• {insight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <ScrollArea className="flex-1" style={{ height: expanded ? 'calc(90vh - 280px)' : 'calc(45vh - 280px)' }}>
          <Tabs defaultValue="overview" className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="permits">
                Permits ({data.permits?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="complaints">
                311 ({data.complaints?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="businesses">
                Business ({data.businesses?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics.totalEvents}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Events</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics.permits}
                  </div>
                  <div className="text-xs text-muted-foreground">Permits</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics.activeComplaints}
                  </div>
                  <div className="text-xs text-muted-foreground">Complaints</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics.activeBusinesses}
                  </div>
                  <div className="text-xs text-muted-foreground">Businesses</div>
                </Card>
              </div>

              {data.permits?.slice(0, 3).map((permit: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="font-semibold text-sm">{permit.permit_type}</div>
                  <div className="text-xs text-muted-foreground mt-1">{permit.description}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Filed: {permit.filed_date ? new Date(permit.filed_date).toLocaleDateString() : 'N/A'}
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="permits" className="space-y-3 mt-4">
              {data.permits?.length > 0 ? (
                data.permits.map((permit: any, idx: number) => (
                  <Card key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm">{permit.permit_type}</div>
                      <Badge variant="outline" className="text-xs">{permit.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{permit.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Filed:</span>{' '}
                        {permit.filed_date ? new Date(permit.filed_date).toLocaleDateString() : 'N/A'}
                      </div>
                      {permit.estimated_cost && (
                        <div>
                          <span className="text-muted-foreground">Cost:</span> ${permit.estimated_cost}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No permits found</div>
              )}
            </TabsContent>

            <TabsContent value="complaints" className="space-y-3 mt-4">
              {data.complaints?.length > 0 ? (
                data.complaints.map((complaint: any, idx: number) => (
                  <Card key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-sm">{complaint.request_type}</div>
                      <Badge variant="outline" className="text-xs">{complaint.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{complaint.category}</div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Opened:</span>{' '}
                      {complaint.opened_date ? new Date(complaint.opened_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No complaints found</div>
              )}
            </TabsContent>

            <TabsContent value="businesses" className="space-y-3 mt-4">
              {data.businesses?.length > 0 ? (
                data.businesses.map((business: any, idx: number) => (
                  <Card key={idx} className="p-4">
                    <div className="font-semibold text-sm mb-1">{business.dba_name || business.business_name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{business.business_type}</div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <Badge variant="outline" className="text-xs ml-1">{business.status}</Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No businesses found</div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t flex gap-2">
          <Button variant="secondary" className="flex-1">
            📥 Export Report
          </Button>
          <Button variant="secondary" className="flex-1">
            👁️ Watch Location
          </Button>
          <Button variant="secondary" className="flex-1">
            🔗 Share
          </Button>
        </div>
      </div>
    </>
  );
};
