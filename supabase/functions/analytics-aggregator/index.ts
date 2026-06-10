import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AnalyticsRequest {
  timePeriod?: string;
  sources?: string[];
  refreshCache?: boolean;
}

interface MetricData {
  category: string;
  value: number;
  unit: string;
  timestamp: string;
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

    const { timePeriod = 'week', sources, refreshCache = false }: AnalyticsRequest = 
      req.method === 'POST' ? await req.json() : { timePeriod: 'week' };

    // Get user's provider accounts
    const { data: providers, error: providersError } = await supabase
      .from('provider_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (providersError) {
      throw providersError;
    }

    const analytics: any[] = [];

    // Filter providers if specific sources requested
    const targetProviders = sources && sources.length > 0
      ? providers?.filter(p => sources.includes(p.provider)) || []
      : providers || [];

    // For each provider, aggregate analytics
    for (const provider of targetProviders) {
      // Check cache first if not forcing refresh
      if (!refreshCache) {
        const { data: cached } = await supabase
          .from('analytics_cache')
          .select('*')
          .eq('user_id', user.id)
          .eq('source_provider', provider.provider)
          .eq('time_period', timePeriod)
          .gt('cache_expires_at', new Date().toISOString())
          .order('last_refreshed_at', { ascending: false })
          .limit(10);

        if (cached && cached.length > 0) {
          // Use cached data
          analytics.push({
            provider: provider.provider,
            providerId: provider.id,
            status: provider.status,
            lastSync: provider.last_sync_at,
            metrics: cached.map(c => ({
              category: c.metric_category,
              data: c.aggregated_data,
              statistics: c.statistics,
              comparison: c.comparison_data,
              dataQuality: c.data_quality_score,
            })),
            cached: true,
          });
          continue;
        }
      }

      // Fetch fresh data from health_metrics table
      const timeRanges: Record<string, string> = {
        today: '1 day',
        week: '7 days',
        month: '30 days',
        year: '365 days',
      };

      const timeRange = timeRanges[timePeriod] || '7 days';
      
      const { data: metrics, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', provider.provider)
        .gte('timestamp', `now() - interval '${timeRange}'`)
        .order('timestamp', { ascending: false });

      if (metricsError) {
        console.error(`Error fetching metrics for ${provider.provider}:`, metricsError);
        continue;
      }

      // Aggregate metrics by category
      const metricsByCategory: Record<string, MetricData[]> = {};
      
      metrics?.forEach(metric => {
        const category = metric.metric_type || 'unknown';
        if (!metricsByCategory[category]) {
          metricsByCategory[category] = [];
        }
        metricsByCategory[category].push({
          category,
          value: metric.value || 0,
          unit: metric.unit || '',
          timestamp: metric.timestamp,
        });
      });

      // Calculate statistics for each category
      const categoryStats: Record<string, any> = {};
      
      for (const [category, data] of Object.entries(metricsByCategory)) {
        const values = data.map(d => d.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        const min = values.length > 0 ? Math.min(...values) : 0;
        const max = values.length > 0 ? Math.max(...values) : 0;
        
        // Calculate trend (simple linear regression)
        let trend = 0;
        if (values.length > 1) {
          const firstHalf = values.slice(0, Math.floor(values.length / 2));
          const secondHalf = values.slice(Math.floor(values.length / 2));
          const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          trend = ((avgSecond - avgFirst) / avgFirst) * 100;
        }

        categoryStats[category] = {
          count: values.length,
          sum,
          avg: Math.round(avg * 100) / 100,
          min,
          max,
          trend: Math.round(trend * 100) / 100,
          latest: values[0] || 0,
          unit: data[0]?.unit || '',
        };

        // Cache the aggregated data
        await supabase
          .from('analytics_cache')
          .upsert({
            user_id: user.id,
            source_provider: provider.provider,
            source_id: provider.id,
            metric_category: category,
            time_period: timePeriod,
            aggregated_data: { values: data },
            statistics: categoryStats[category],
            comparison_data: { trend: categoryStats[category].trend },
            data_quality_score: values.length > 0 ? 1.0 : 0.0,
            last_refreshed_at: new Date().toISOString(),
            cache_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min cache
          }, {
            onConflict: 'user_id,source_provider,metric_category,time_period',
          });
      }

      analytics.push({
        provider: provider.provider,
        providerId: provider.id,
        status: provider.status,
        lastSync: provider.last_sync_at,
        metrics: Object.entries(categoryStats).map(([category, stats]) => ({
          category,
          statistics: stats,
          data: metricsByCategory[category],
        })),
        cached: false,
      });
    }

    // Get source registry for display metadata
    const { data: registry } = await supabase
      .from('analytics_source_registry')
      .select('*')
      .in('provider_name', analytics.map(a => a.provider));

    // Enrich analytics with display metadata
    const enrichedAnalytics = analytics.map(a => {
      const registryEntry = registry?.find(r => r.provider_name === a.provider);
      return {
        ...a,
        displayName: registryEntry?.display_name || a.provider,
        icon: registryEntry?.icon || 'Activity',
        colorScheme: registryEntry?.color_scheme || {},
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        timePeriod,
        analytics: enrichedAnalytics,
        totalSources: enrichedAnalytics.length,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});