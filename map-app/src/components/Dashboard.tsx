import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertTriangle, Building2, FileText, TrendingUp, Download, Bell, Share2 } from "lucide-react";
import { Progress } from "./ui/progress";
import { useLocationData } from "@/hooks/useLocationData";

interface DashboardProps {
  address: string;
}

export const Dashboard = ({ address }: DashboardProps) => {
  const { data, isLoading, error } = useLocationData(address);

  // Helper to safely format dates
  const formatDate = (dateStr: any, format: 'date' | 'year' = 'date'): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return format === 'year' ? d.getFullYear().toString() : d.toISOString().slice(0, 10);
    } catch {
      return "—";
    }
  };

  const insights = data?.insights ?? [];

  const metrics = [
    { label: "Total Events", value: String(data?.metrics?.totalEvents ?? 0), trend: "" },
    { label: "Active Complaints", value: String(data?.metrics?.activeComplaints ?? 0), trend: "" },
    { label: "Businesses", value: String(data?.metrics?.activeBusinesses ?? 0), trend: "" },
    { label: "Permits (30d)", value: String(data?.metrics?.permits ?? 0), trend: "" },
  ];

  const events = [
    ...(data?.data?.permits || []).map((p: any) => ({
      date: p.filed_date || p.issued_date || p.completed_date,
      type: "Permit",
      desc: p.description || p.permit_type || p.permit_number || "Permit activity",
    })),
    ...(data?.data?.complaints || []).map((c: any) => ({
      date: c.opened_date,
      type: "Complaint",
      desc: c.description || c.request_type || c.category || c.case_id || "311 complaint",
    })),
  ]
    .filter((e) => !!e.date)
    .sort((a: any, b: any) => (new Date(b.date).getTime()) - (new Date(a.date).getTime()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{address}</h2>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Watch
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-3xl font-bold mt-1">{metric.value}</p>
                </div>
                {metric.trend && (
                  <Badge variant={metric.trend.startsWith("+") && !metric.trend.startsWith("+0") ? "warning" : "secondary"}>
                    {metric.trend}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <Card className="border-2 border-warning/20 bg-warning/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle>AI-Detected Patterns</CardTitle>
          </div>
          <CardDescription>
            Automatically identified anomalies and connections that warrant investigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <Card key={idx} className={`border-2 ${
                insight.severity === "high" ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={insight.severity === "high" ? "destructive" : "warning"}>
                        {String(insight.severity).toUpperCase()}
                      </Badge>
                      <h4 className="font-semibold">{insight.title}</h4>
                    </div>
                    <Button variant="link" size="sm">
                      View Details →
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  {insight.action && (
                    <Button variant="outline" size="sm">
                      {insight.action}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No AI insights available for this address yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Data Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="permits">Permits</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>All events across datasets in chronological order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(events || []).slice(0, 50).map((event, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="text-sm text-muted-foreground w-32">
                      {formatDate(event.date)}
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                    <p className="text-sm flex-1">{event.desc}</p>
                  </div>
                ))}
                {(!events || events.length === 0) && (
                  <p className="text-sm text-muted-foreground">No recent activity found for this address.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permits" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Building Permits</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.data?.permits || []).slice(0, 50).map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{p.description || p.permit_type || "Permit"}</p>
                      <p className="text-sm text-muted-foreground">Permit #{p.permit_number || "—"}</p>
                    </div>
                    <div className="text-right">
                      <Badge>{p.status || "—"}</Badge>
                      <p className="text-sm font-semibold mt-1">{p.estimated_cost ? `$${Number(p.estimated_cost).toLocaleString()}` : "—"}</p>
                    </div>
                  </div>
                ))}
                {(data?.data?.permits || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No permits found for this address.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>311 Complaints</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.data?.complaints || []).slice(0, 50).map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{c.category || c.request_type || "Complaint"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(c.opened_date)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={c.priority === "High" ? "destructive" : "secondary"}>
                        {c.priority || "—"}
                      </Badge>
                      <Badge variant="outline">{c.status || "—"}</Badge>
                    </div>
                  </div>
                ))}
                {(data?.data?.complaints || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No complaints found for this address.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="businesses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.data?.businesses || []).slice(0, 50).map((b: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{b.business_name || b.dba_name || "Business"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(b.registration_date, 'year')}
                      </p>
                    </div>
                    <Badge variant={b.status === "Active" ? "success" : "secondary"}>
                      {b.status || "—"}
                    </Badge>
                  </div>
                ))}
                {(data?.data?.businesses || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No businesses found for this address.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle>Property Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Assessed Value</p>
                  <p className="text-2xl font-bold">$2.4M</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Built</p>
                  <p className="text-2xl font-bold">1985</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="text-2xl font-bold">3,200</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Sale</p>
                  <p className="text-2xl font-bold">2019</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Value vs Neighborhood Average</p>
                <Progress value={68} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">15% above neighborhood median</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
