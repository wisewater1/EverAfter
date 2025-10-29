import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (eventType: string, data: any) => {
        const message = `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const heartbeat = setInterval(() => {
        sendEvent('heartbeat', { timestamp: new Date().toISOString() });
      }, 30000);

      const subscription = supabase
        .channel(`device-updates-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            sendEvent('connection_update', payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'alerts',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            sendEvent('new_alert', payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webhook_logs',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            sendEvent('webhook_received', payload);
          }
        )
        .subscribe();

      sendEvent('connected', { userId });

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
