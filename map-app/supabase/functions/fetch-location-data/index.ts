import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, latitude, longitude } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, get or create address record
    let addressId: string;
    const { data: existingAddress } = await supabase
      .from("sf_addresses")
      .select("id")
      .eq("address", address)
      .single();

    if (existingAddress) {
      addressId = existingAddress.id;
    } else {
      const { data: newAddress, error: addressError } = await supabase
        .from("sf_addresses")
        .insert({
          address,
          latitude: latitude || 37.7749,
          longitude: longitude || -122.4194,
          neighborhood: "Financial District", // Would geocode this properly
        })
        .select("id")
        .single();

      if (addressError) throw addressError;
      addressId = newAddress.id;
    }

    // Fetch data from SF Open Data APIs
    const PERMITS_API = "https://data.sf.gov/resource/i98e-djp9.json";
    const CRIME_API = "https://data.sf.gov/resource/wg3w-h783.json";
    const BUSINESS_API = "https://data.sf.gov/resource/g8m3-pdis.json";

    // Prepare address query parameter (clean and encode the address)
    const qParam = encodeURIComponent(address || "");
    const addressHash = address.toLowerCase().trim().replace(/\s+/g, '-');
    
    // Cache TTL: 24 hours
    const CACHE_TTL_HOURS = 24;

    // Helper to check and use cache
    const getCachedData = async (dataType: string) => {
      const { data: cached } = await supabase
        .from('api_cache')
        .select('cached_data, fetched_at')
        .eq('address_hash', addressHash)
        .eq('data_type', dataType)
        .single();
      
      if (cached) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;
        if (age < maxAge) {
          console.log(`Cache hit for ${dataType}`);
          return cached.cached_data;
        }
      }
      return null;
    };

    // Helper to save to cache
    const saveToCache = async (dataType: string, data: any) => {
      await supabase
        .from('api_cache')
        .upsert({
          address_hash: addressHash,
          data_type: dataType,
          cached_data: data,
          fetched_at: new Date().toISOString()
        }, {
          onConflict: 'address_hash,data_type'
        });
    };

    // Fetch permits from SF Open Data (with cache)
    let permits = await getCachedData('permits');
    if (!permits) {
      try {
        const permitsUrl = `${PERMITS_API}?$limit=200&$q=${qParam}`;
        let permitsResp = await fetch(permitsUrl);
        let permitsData: any[] = [];
        if (permitsResp.ok) {
          permitsData = await permitsResp.json();
        }
        // Fallback: filter by address field if full-text returns nothing
        if (!permitsResp.ok || permitsData.length === 0) {
          const escaped = (address || '').replace(/'/g, "''");
          const where1 = encodeURIComponent("upper(address) like upper('%" + escaped + "%')");
          const permitsUrl2 = `${PERMITS_API}?$limit=200&$where=${where1}`;
          const resp2 = await fetch(permitsUrl2);
          if (resp2.ok) {
            permitsData = await resp2.json();
          }
        }
        permits = (permitsData || []).map((p: any) => ({
          permit_number: p.permit_number || p.application_number,
          permit_type: p.permit_type || p.permit_type_definition,
          description: p.description || p.proposed_use,
          status: p.status || p.current_status,
          filed_date: p.filed_date || p.application_creation_date,
          issued_date: p.issued_date,
          completed_date: p.completed_date,
          estimated_cost: p.estimated_cost || p.estimated_construction_cost,
        }));
        await saveToCache('permits', permits);
      } catch (error) {
        console.error("Error fetching permits:", error);
        permits = [];
      }
    }

    // Fetch crime/complaints from SF Open Data (with cache)
    let complaints = await getCachedData('complaints');
    if (!complaints) {
      try {
        const crimeUrl = `${CRIME_API}?$limit=200&$q=${qParam}`;
        let crimeResp = await fetch(crimeUrl);
        let crimeData: any[] = [];
        if (crimeResp.ok) {
          crimeData = await crimeResp.json();
        }
        // Fallbacks: try specific fields
        if (!crimeResp.ok || crimeData.length === 0) {
          const escaped = (address || '').replace(/'/g, "''");
          // Try incident_address
          const whereA = encodeURIComponent("upper(incident_address) like upper('%" + escaped + "%')");
          const crimeUrl2 = `${CRIME_API}?$limit=200&$where=${whereA}`;
          const resp2 = await fetch(crimeUrl2);
          if (resp2.ok) {
            crimeData = await resp2.json();
          }
          // Try intersection if still empty
          if (crimeData.length === 0) {
            const whereB = encodeURIComponent("upper(intersection) like upper('%" + escaped + "%')");
            const crimeUrl3 = `${CRIME_API}?$limit=200&$where=${whereB}`;
            const resp3 = await fetch(crimeUrl3);
            if (resp3.ok) {
              crimeData = await resp3.json();
            }
          }
        }
        complaints = (crimeData || []).map((c: any) => ({
          case_id: c.incident_number || c.row_id,
          category: c.incident_category || c.category,
          request_type: c.incident_subcategory || c.descript,
          description: c.incident_description || c.resolution,
          status: c.resolution || "Open",
          priority: c.priority || "Medium",
          opened_date: c.incident_datetime || c.date,
        }));
        await saveToCache('complaints', complaints);
      } catch (error) {
        console.error("Error fetching complaints:", error);
        complaints = [];
      }
    }

    // Fetch businesses from SF Open Data (with cache)
    let businesses = await getCachedData('businesses');
    if (!businesses) {
      try {
        const businessUrl = `${BUSINESS_API}?$limit=200&$q=${qParam}`;
        let bizResp = await fetch(businessUrl);
        let businessData: any[] = [];
        if (bizResp.ok) {
          businessData = await bizResp.json();
        }
        // Fallbacks: try specific fields
        if (!bizResp.ok || businessData.length === 0) {
          const escaped = (address || '').replace(/'/g, "''");
          const whereA = encodeURIComponent("upper(business_location) like upper('%" + escaped + "%')");
          const businessUrl2 = `${BUSINESS_API}?$limit=200&$where=${whereA}`;
          const resp2 = await fetch(businessUrl2);
          if (resp2.ok) {
            businessData = await resp2.json();
          }
          if (businessData.length === 0) {
            const whereB = encodeURIComponent("upper(dba_name) like upper('%" + escaped + "%')");
            const businessUrl3 = `${BUSINESS_API}?$limit=200&$where=${whereB}`;
            const resp3 = await fetch(businessUrl3);
            if (resp3.ok) {
              businessData = await resp3.json();
            }
          }
        }
        businesses = (businessData || []).map((b: any) => ({
          business_name: b.dba_name,
          dba_name: b.dba_name,
          business_type: b.naics_code_description || b.business_corridor,
          status: b.business_end_date ? "Closed" : "Active",
          registration_date: b.business_start_date || b.ttxid,
          closed_date: b.business_end_date,
        }));
        await saveToCache('businesses', businesses);
      } catch (error) {
        console.error("Error fetching businesses:", error);
        businesses = [];
      }
    }

    // Property data - for now return null as we don't have a property API
    const property = null;

    // Calculate activity metrics
    const totalEvents = (permits?.length || 0) + (complaints?.length || 0);
    const activeComplaints = complaints?.filter((c: any) => c.status === "Open").length || 0;

    // Determine severity based on activity
    let severity: "high" | "medium" | "low" = "low";
    if (totalEvents > 15) severity = "high";
    else if (totalEvents > 5) severity = "medium";

    // AI-generated insights (simplified version)
    const insights = [];
    if (permits && permits.length > 3) {
      insights.push({
        severity: "medium",
        title: "Elevated Permit Activity",
        description: `This location has ${permits.length} permits on record, which is above the neighborhood average.`,
        action: "Review permit approval timelines",
      });
    }

    if (activeComplaints > 2) {
      insights.push({
        severity: "high",
        title: "Multiple Active Complaints",
        description: `There are ${activeComplaints} unresolved 311 complaints at this location.`,
        action: "Investigate complaint patterns",
      });
    }

    const response = {
      address: {
        id: addressId,
        address,
        latitude: latitude || 37.7749,
        longitude: longitude || -122.4194,
      },
      metrics: {
        totalEvents,
        activeComplaints,
        activeBusinesses: businesses?.filter((b: any) => b.status === "Active").length || 0,
        permits: permits?.length || 0,
      },
      severity,
      insights,
      data: {
        permits: permits || [],
        complaints: complaints || [],
        businesses: businesses || [],
        property: property || null,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching location data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
