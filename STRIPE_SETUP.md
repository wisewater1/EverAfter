# Stripe Payment Integration Setup Guide

This guide will help you configure Stripe payments for your EverAfter AI application.

## Prerequisites

Before you begin, you need:
1. A Stripe account (create one at https://stripe.com)
2. Access to your Supabase project dashboard

## Step 1: Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)

## Step 2: Set Up Stripe Products and Prices

### Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Click **+ Add product**

### Professional Plan
- **Name:** Professional Plan
- **Description:** Unlimited AI personalities with advanced features
- **Pricing:**
  - Type: Recurring
  - Price: $29
  - Billing period: Monthly
- After creating, **copy the Price ID** (starts with `price_`)

### Enterprise Plan
- **Name:** Enterprise Plan
- **Description:** Full team collaboration and custom features
- **Pricing:**
  - Type: Recurring
  - Price: $99
  - Billing period: Monthly
- After creating, **copy the Price ID** (starts with `price_`)

## Step 3: Update Price IDs in Your Code

Edit `src/pages/Pricing.tsx` and replace the placeholder price IDs:

```typescript
const plans = [
  // ... free plan ...
  {
    id: 'pro',
    name: 'Professional',
    priceId: 'price_YOUR_PRO_PRICE_ID_HERE', // Replace this
    // ...
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: 'price_YOUR_ENTERPRISE_PRICE_ID_HERE', // Replace this
    // ...
  },
];
```

## Step 4: Configure Supabase Edge Functions

### Set Stripe Secret in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add the following secrets:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

### Set Up Webhook Secret

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local Supabase function:
   ```bash
   stripe listen --forward-to https://YOUR_SUPABASE_URL/functions/v1/stripe-webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`)

5. Add to Supabase secrets:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

## Step 5: Test the Integration

### Test Mode

1. Sign up for an account at http://localhost:5173/signup
2. Go to the pricing page
3. Click "Subscribe Now" on a paid plan
4. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Verify Subscription

Check your Supabase database:
```sql
SELECT * FROM stripe_customers;
SELECT * FROM stripe_subscriptions;
```

## Step 6: Production Deployment

### Switch to Live Mode

1. Get your **live** API keys from Stripe dashboard
2. Update Supabase secrets with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_live_key_here
   ```

3. Set up production webhook endpoint:
   - Go to https://dashboard.stripe.com/webhooks
   - Click **+ Add endpoint**
   - URL: `https://YOUR_SUPABASE_URL/functions/v1/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`

4. Copy the webhook signing secret and update in Supabase

### Update Environment Variables

Update your `.env` file (if deploying frontend separately):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```

## Stripe Webhook Events Handled

The application automatically handles these Stripe events:

- ✅ `checkout.session.completed` - Creates customer and subscription records
- ✅ `customer.subscription.created` - Initializes subscription
- ✅ `customer.subscription.updated` - Updates subscription status
- ✅ `customer.subscription.deleted` - Cancels subscription
- ✅ `payment_intent.succeeded` - Processes one-time payments

## Database Schema

The following tables store Stripe data:

### stripe_customers
- Links Supabase users to Stripe customers
- Tracks customer_id for billing

### stripe_subscriptions
- Stores active subscription data
- Includes status, billing period, payment method

### stripe_orders
- Records one-time payment transactions
- Stores order details and payment status

## Testing Scenarios

### Test Cards

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Card declined |
| 3D Secure | 4000 0025 0000 3155 | Requires authentication |

### Test Subscription Flow

1. Sign up → redirects to pricing
2. Click subscribe → opens Stripe Checkout
3. Complete payment → redirects to dashboard
4. Check database for subscription record
5. Verify user has access to premium features

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify STRIPE_WEBHOOK_SECRET is set
3. Check Supabase function logs for errors

### Payment Not Completing

1. Check Stripe dashboard for events
2. Verify checkout session was created
3. Check browser console for errors
4. Ensure CORS is configured correctly

### Subscription Not Showing

1. Check `stripe_subscriptions` table
2. Verify webhook events were processed
3. Check Supabase function logs
4. Manually sync: view subscription in Stripe dashboard

## Security Best Practices

✅ Never expose Stripe secret keys in frontend code
✅ Always validate webhook signatures
✅ Use environment variables for all secrets
✅ Enable HTTPS in production
✅ Regularly rotate API keys
✅ Monitor Stripe dashboard for suspicious activity

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Test Mode: https://stripe.com/docs/testing

## Quick Commands

```bash
# Test webhook locally
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# View Stripe logs
stripe logs tail

# Verify webhook signature
stripe webhook verify --secret whsec_xxx

# Deploy edge function
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

---

**Need help?** Check the Stripe dashboard for detailed event logs and error messages.
