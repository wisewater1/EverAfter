import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// Map price IDs to plan names (replace with your actual Stripe price IDs)
const PRICE_TO_PLAN_MAP: Record<string, string> = {
  'price_1234567890': 'pro', // Replace with your actual Pro plan price ID
  'price_0987654321': 'enterprise', // Replace with your actual Enterprise plan price ID
};

async function syncCustomerFromStripe(customerId: string) {
  try {
    // Get user_id from existing subscription record
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (!existingSub) {
      console.error(`No subscription record found for customer: ${customerId}`);
      return;
    }

    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      // Update to free plan if subscription cancelled
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_name: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) {
        console.error('Error updating subscription to free:', updateError);
      }
      return;
    }

    // Get the most recent subscription
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const planName = PRICE_TO_PLAN_MAP[priceId] || 'pro'; // Default to pro if price not mapped

    // Update subscription in database
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan_name: planName,
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      })
      .eq('stripe_customer_id', customerId);

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    console.info(`Successfully synced subscription for customer: ${customerId}, plan: ${planName}`);

    // Activate premium Saints based on plan
    if (planName === 'pro' || planName === 'enterprise') {
      // Activate St. Michael for Pro and Enterprise
      await activateSaint(existingSub.user_id, 'michael');
    }
    if (planName === 'enterprise') {
      // Activate St. Martin and St. Agatha for Enterprise
      await activateSaint(existingSub.user_id, 'martin');
      await activateSaint(existingSub.user_id, 'agatha');
    }
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function activateSaint(userId: string, saintId: string) {
  const { error } = await supabase
    .from('saints_subscriptions')
    .upsert({
      user_id: userId,
      saint_id: saintId,
      is_active: true,
      activated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,saint_id',
    });

  if (error) {
    console.error(`Failed to activate saint ${saintId} for user ${userId}:`, error);
  } else {
    console.info(`Activated saint ${saintId} for user ${userId}`);
  }
}