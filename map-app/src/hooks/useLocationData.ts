import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocationResponse {
  address: { id: string; address: string; latitude: number; longitude: number };
  metrics: {
    totalEvents: number;
    activeComplaints: number;
    activeBusinesses: number;
    permits: number;
  };
  severity: "high" | "medium" | "low";
  insights: Array<{ severity: string; title: string; description: string; action?: string }>;
  data: {
    permits: any[];
    complaints: any[];
    businesses: any[];
    property: any | null;
  };
}

export function useLocationData(address?: string, latitude?: number, longitude?: number) {
  return useQuery({
    queryKey: ["location-data", address, latitude, longitude],
    enabled: !!address && address.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-location-data", {
        body: { address, latitude, longitude },
      });
      if (error) throw error;
      return data as LocationResponse;
    },
  });
}
