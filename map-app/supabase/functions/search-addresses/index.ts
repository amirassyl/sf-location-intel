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
    const { query } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search addresses in database
    const { data: addresses, error } = await supabase
      .from("sf_addresses")
      .select("*")
      .ilike("address", `%${query}%`)
      .limit(10);

    if (error) throw error;

    // If no addresses found, return sample SF addresses
    const results =
      addresses && addresses.length > 0
        ? addresses
        : [
            { address: "555 Market St, San Francisco, CA", latitude: 37.7749, longitude: -122.4194 },
            { address: "123 Mission St, San Francisco, CA", latitude: 37.7849, longitude: -122.4094 },
            { address: "789 Valencia St, San Francisco, CA", latitude: 37.7649, longitude: -122.4294 },
            { address: "456 Geary St, San Francisco, CA", latitude: 37.7874, longitude: -122.4089 },
            { address: "321 Castro St, San Francisco, CA", latitude: 37.7609, longitude: -122.4350 },
          ].filter((addr) => addr.address.toLowerCase().includes(query.toLowerCase()));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error searching addresses:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
