import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get first 8 addresses
    const { data: addresses, error: addrError } = await supabase
      .from('sf_addresses')
      .select('id')
      .limit(8);

    if (addrError) throw addrError;
    if (!addresses || addresses.length === 0) {
      throw new Error('No addresses found in database');
    }

    // Insert sample complaints
    const complaints = [];
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      for (let j = 1; j <= 2; j++) {
        complaints.push({
          address_id: addr.id,
          case_id: `SF311-${String((i * 100 + j)).padStart(6, '0')}`,
          category: j === 1 ? 'Noise' : 'Building Code',
          request_type: j === 1 ? 'Noise Complaint' : 'Illegal Construction',
          description: 'Complaint filed by resident',
          status: j === 1 ? 'Open' : 'Resolved',
          priority: 'High',
          opened_date: new Date(Date.now() - (j * 15 * 24 * 60 * 60 * 1000)).toISOString(),
        });
      }
    }

    const { error: complaintsError } = await supabase
      .from('complaints')
      .upsert(complaints, { onConflict: 'case_id', ignoreDuplicates: true });

    if (complaintsError) throw complaintsError;

    // Insert sample businesses
    const businesses = [
      {
        address_id: addresses[0].id,
        business_name: 'SF Tech Solutions LLC',
        dba_name: 'Tech Solutions',
        business_type: 'Technology',
        status: 'Active',
        registration_date: '2020-01-15',
      },
      {
        address_id: addresses[1]?.id,
        business_name: 'Golden Gate Consulting',
        dba_name: 'GG Consulting',
        business_type: 'Professional Services',
        status: 'Active',
        registration_date: '2018-03-22',
      },
      {
        address_id: addresses[2]?.id,
        business_name: 'Bay Area Services Inc',
        dba_name: 'BA Services',
        business_type: 'Professional Services',
        status: 'Active',
        registration_date: '2019-07-10',
      },
      {
        address_id: addresses[3]?.id,
        business_name: 'Market Street Cafe',
        dba_name: 'MS Cafe',
        business_type: 'Food & Beverage',
        status: 'Active',
        registration_date: '2021-05-01',
      },
      {
        address_id: addresses[4]?.id,
        business_name: 'Valencia Shop',
        dba_name: 'V Shop',
        business_type: 'Retail',
        status: 'Closed',
        registration_date: '2015-09-12',
      },
    ].filter(b => b.address_id); // Only include if address exists

    const { error: businessesError } = await supabase
      .from('businesses')
      .insert(businesses);

    if (businessesError && businessesError.code !== '23505') { // Ignore duplicate key errors
      throw businessesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sample data seeded successfully',
        complaintsAdded: complaints.length,
        businessesAdded: businesses.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error seeding data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
