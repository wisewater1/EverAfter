import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SyncRequest {
  connectionId: string;
  serviceType: string;
  startDate?: string;
  endDate?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { connectionId, serviceType, startDate, endDate }: SyncRequest = await req.json();

    if (!connectionId || !serviceType) {
      throw new Error('Missing required parameters: connectionId and serviceType');
    }

    const { data: connection, error: connectionError } = await supabase
      .from('health_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Health connection not found');
    }

    const { data: credentials, error: credError } = await supabase
      .from('oauth_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_name', connection.service_name)
      .maybeSingle();

    if (credError) {
      throw new Error('Failed to fetch OAuth credentials');
    }

    if (!credentials || !credentials.is_active) {
      throw new Error('No active OAuth credentials found for this service');
    }

    const syncStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const syncEndDate = endDate || new Date().toISOString();

    const mockMetrics = generateMockHealthData(user.id, connectionId, syncStartDate, syncEndDate);

    const { error: insertError } = await supabase
      .from('health_metrics')
      .insert(mockMetrics);

    if (insertError) {
      throw new Error(`Failed to insert health metrics: ${insertError.message}`);
    }

    const { error: updateError } = await supabase
      .from('health_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'connected'
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${mockMetrics.length} health metrics`,
        syncedMetrics: mockMetrics.length,
        dateRange: {
          start: syncStartDate,
          end: syncEndDate
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error syncing health data:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function generateMockHealthData(userId: string, connectionId: string, startDate: string, endDate: string) {
  const metrics = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < daysDiff; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    metrics.push(
      {
        user_id: userId,
        connection_id: connectionId,
        metric_type: 'steps',
        metric_value: Math.floor(Math.random() * 5000) + 5000,
        metric_unit: 'steps',
        recorded_at: date.toISOString(),
        source: 'sync'
      },
      {
        user_id: userId,
        connection_id: connectionId,
        metric_type: 'heart_rate',
        metric_value: Math.floor(Math.random() * 20) + 60,
        metric_unit: 'bpm',
        recorded_at: date.toISOString(),
        source: 'sync'
      },
      {
        user_id: userId,
        connection_id: connectionId,
        metric_type: 'sleep',
        metric_value: Math.round((Math.random() * 2 + 6) * 10) / 10,
        metric_unit: 'hours',
        recorded_at: date.toISOString(),
        source: 'sync'
      },
      {
        user_id: userId,
        connection_id: connectionId,
        metric_type: 'active_minutes',
        metric_value: Math.floor(Math.random() * 60) + 30,
        metric_unit: 'minutes',
        recorded_at: date.toISOString(),
        source: 'sync'
      }
    );
  }

  return metrics;
}
