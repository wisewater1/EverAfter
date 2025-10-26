import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface StreamDataPoint {
  deviceConnectionId: string;
  metricType: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
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

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const deviceConnectionId = url.searchParams.get('deviceConnectionId');

      if (!deviceConnectionId) {
        throw new Error('Missing deviceConnectionId parameter');
      }

      const { data: deviceConnection, error: deviceError } = await supabase
        .from('device_connections')
        .select('*, device_registry:device_registry_id(*)')
        .eq('id', deviceConnectionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError || !deviceConnection) {
        throw new Error('Device connection not found');
      }

      const { data: existingStream, error: streamError } = await supabase
        .from('realtime_data_streams')
        .select('*')
        .eq('device_connection_id', deviceConnectionId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingStream) {
        return new Response(
          JSON.stringify({
            success: true,
            streamExists: true,
            stream: existingStream,
            message: 'Active stream already exists for this device',
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const streamConnectionId = crypto.randomUUID();

      const { data: newStream, error: createError } = await supabase
        .from('realtime_data_streams')
        .insert({
          user_id: user.id,
          device_connection_id: deviceConnectionId,
          stream_type: 'websocket',
          connection_id: streamConnectionId,
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          streamExists: false,
          stream: newStream,
          connectionId: streamConnectionId,
          message: 'New stream initialized',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (req.method === 'POST') {
      const body: StreamDataPoint = await req.json();

      const { deviceConnectionId, metricType, value, unit, timestamp, metadata } = body;

      if (!deviceConnectionId || !metricType || value === undefined || !timestamp) {
        throw new Error('Missing required fields: deviceConnectionId, metricType, value, timestamp');
      }

      const { data: deviceConnection, error: deviceError } = await supabase
        .from('device_connections')
        .select('*')
        .eq('id', deviceConnectionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError || !deviceConnection) {
        throw new Error('Device connection not found or not owned by user');
      }

      const { data: transformationRule, error: ruleError } = await supabase
        .from('data_transformation_rules')
        .select('*')
        .eq('provider_key', deviceConnection.provider_account_id)
        .eq('standard_metric_name', metricType)
        .eq('active', true)
        .maybeSingle();

      let qualityScore = 100;
      let anomalyDetected = false;
      let anomalyType = null;

      if (transformationRule?.validation_rules) {
        const rules = transformationRule.validation_rules as any;

        if (rules.min !== undefined && value < rules.min) {
          qualityScore -= 30;
          anomalyDetected = true;
          anomalyType = 'below_minimum';
        }

        if (rules.max !== undefined && value > rules.max) {
          qualityScore -= 30;
          anomalyDetected = true;
          anomalyType = 'above_maximum';
        }

        if (rules.critical_low !== undefined && value < rules.critical_low) {
          qualityScore -= 50;
          anomalyDetected = true;
          anomalyType = 'critical_low';

          await evaluateAlerts(supabase, user.id, deviceConnectionId, metricType, value, 'critical_low');
        }

        if (rules.critical_high !== undefined && value > rules.critical_high) {
          qualityScore -= 50;
          anomalyDetected = true;
          anomalyType = 'critical_high';

          await evaluateAlerts(supabase, user.id, deviceConnectionId, metricType, value, 'critical_high');
        }
      }

      const { error: qualityError } = await supabase
        .from('data_quality_logs')
        .insert({
          user_id: user.id,
          device_connection_id: deviceConnectionId,
          metric_type: metricType,
          quality_score: qualityScore,
          validation_results: {
            passed: qualityScore >= 70,
            rules_applied: transformationRule?.validation_rules || {},
          },
          anomaly_detected: anomalyDetected,
          anomaly_type: anomalyType,
          raw_value: value,
          corrected_value: value,
          recorded_at: timestamp,
        });

      if (qualityError) {
        console.error('Failed to log data quality:', qualityError);
      }

      const { error: metricError } = await supabase
        .from('health_metrics')
        .insert({
          user_id: user.id,
          source: deviceConnection.provider_account_id || 'unknown',
          metric: metricType,
          value: value,
          unit: unit || '',
          ts: timestamp,
          raw: metadata || {},
        });

      if (metricError) {
        throw metricError;
      }

      const { error: updateError } = await supabase
        .from('device_connections')
        .update({
          last_data_received_at: new Date().toISOString(),
          connection_status: 'active',
        })
        .eq('id', deviceConnectionId);

      if (updateError) {
        console.error('Failed to update device connection:', updateError);
      }

      const { error: streamUpdateError } = await supabase
        .from('realtime_data_streams')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          data_points_received: supabase.rpc('increment', { row_id: deviceConnectionId }),
        })
        .eq('device_connection_id', deviceConnectionId)
        .eq('status', 'active');

      if (streamUpdateError) {
        console.error('Failed to update stream stats:', streamUpdateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          dataPoint: {
            metricType,
            value,
            unit,
            timestamp,
          },
          quality: {
            score: qualityScore,
            anomalyDetected,
            anomalyType,
          },
          message: 'Data point processed successfully',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const streamId = url.searchParams.get('streamId');

      if (!streamId) {
        throw new Error('Missing streamId parameter');
      }

      const { error: closeError } = await supabase
        .from('realtime_data_streams')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', streamId)
        .eq('user_id', user.id);

      if (closeError) {
        throw closeError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Stream closed successfully',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed',
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error handling device stream:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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

async function evaluateAlerts(
  supabase: any,
  userId: string,
  deviceConnectionId: string,
  metricType: string,
  value: number,
  alertType: string
) {
  const severity = alertType.includes('critical') ? 'emergency' : 'warning';

  const { error: alertError } = await supabase
    .from('device_alerts')
    .insert({
      user_id: userId,
      device_connection_id: deviceConnectionId,
      alert_type: 'threshold_breach',
      severity: severity,
      metric_type: metricType,
      value_at_trigger: value,
      threshold_config: {
        type: alertType,
        value: value,
      },
    });

  if (alertError) {
    console.error('Failed to create alert:', alertError);
  }

  if (severity === 'emergency') {
    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_enabled', true);

    if (emergencyContacts && emergencyContacts.length > 0) {
      console.log(`Emergency alert triggered for user ${userId} - would notify ${emergencyContacts.length} contacts`);
    }
  }
}
