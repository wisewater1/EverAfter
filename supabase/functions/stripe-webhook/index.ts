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

// Price → plan map, configured via Supabase secrets so production price IDs
// never live in code. Unmapped prices grant NOTHING (no silent defaults).
const PRICE_TO_PLAN_MAP: Record<string, string> = {};
const proPriceId = Deno.env.get('STRIPE_PRICE_ID_PRO');
const enterprisePriceId = Deno.env.get('STRIPE_PRICE_ID_ENTERPRISE');
if (proPriceId) PRICE_TO_PLAN_MAP[proPriceId] = 'pro';
if (enterprisePriceId) PRICE_TO_PLAN_MAP[enterprisePriceId] = 'enterprise';

// Statuses that keep paid entitlements. past_due is a grace period (Stripe
// is still retrying payment); canceled/unpaid/incomplete revoke access.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

// The premium saints managed by billing. Free saints are never touched here.
const PLAN_SAINTS: Record<string, string[]> = {
  pro: ['michael'],
  enterprise: ['michael', 'martin', 'agatha'],
};
const ALL_PREMIUM_SAINTS = ['michael', 'martin', 'agatha'];

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

    // NOTE: Stripe returns canceled subscriptions in status:'all' lists, so
    // an empty list means the customer never had one (or it was deleted
    // long ago). Entitlement for canceled-but-listed subs is handled below
    // via ENTITLED_STATUSES — not by this branch.
    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}`);
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
      await syncPremiumSaints(existingSub.user_id, []);
      return;
    }

    // Get the most recent subscription
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const mappedPlan = PRICE_TO_PLAN_MAP[priceId];

    if (!mappedPlan) {
      // Unmapped price: record it visibly and grant no premium entitlements.
      // (Previously this silently defaulted to 'pro' — a paid-tier grant for
      // any unrecognized price.)
      console.error(
        `Unmapped Stripe price ${priceId} for customer ${customerId} — ` +
        'no premium entitlements granted. Set STRIPE_PRICE_ID_PRO / ' +
        'STRIPE_PRICE_ID_ENTERPRISE secrets to map real price IDs.'
      );
    }

    const entitled = ENTITLED_STATUSES.has(subscription.status);
    const planName = mappedPlan || 'unmapped_price';
    const effectivePlan = entitled && mappedPlan ? mappedPlan : 'free';

    // Update subscription in database (record the raw truth: actual plan
    // name for the price, actual Stripe status).
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

    console.info(
      `Synced subscription for customer ${customerId}: plan=${planName}, ` +
      `status=${subscription.status}, effective=${effectivePlan}`
    );

    // Premium saints follow the EFFECTIVE plan: canceled/unpaid/downgraded
    // customers lose the saints their previous tier granted.
    await syncPremiumSaints(existingSub.user_id, PLAN_SAINTS[effectivePlan] ?? []);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Reconcile the user's premium-saint activations with what their current
 * plan grants: activate what's owed, deactivate what is no longer owed.
 */
async function syncPremiumSaints(userId: string, grantedSaints: string[]) {
  const granted = new Set(grantedSaints);
  for (const saintId of ALL_PREMIUM_SAINTS) {
    const shouldBeActive = granted.has(saintId);
    const { error } = await supabase
      .from('saints_subscriptions')
      .upsert({
        user_id: userId,
        saint_id: saintId,
        is_active: shouldBeActive,
        ...(shouldBeActive
          ? { activated_at: new Date().toISOString() }
          : { deactivated_at: new Date().toISOString() }),
      }, {
        onConflict: 'user_id,saint_id',
      });

    if (error) {
      console.error(`Failed to sync saint ${saintId} for user ${userId}:`, error);
    } else {
      console.info(`Saint ${saintId} for user ${userId}: is_active=${shouldBeActive}`);
    }
  }
}