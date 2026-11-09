# Stripe Integration Guide & Next Steps

This document is the single source of truth for completing and verifying the Stripe Checkout integration.

---

## Values to Replace

The following values contain placeholders or environment-dependent values and should be reviewed or updated before going live in production.

**Files containing placeholders:**
- [app/api/stripe/create-checkout/route.ts](app/api/stripe/create-checkout/route.ts)
- [lib/stripe.ts](lib/stripe.ts)
- [.env.example](.env.example)

| Field | Current Value | What to Set |
|---|---|---|
| `mode` | `payment` | Set to `"payment"` for one-time payments or `"subscription"` for recurring billing. |
| `line_items[].price` | `price_...` (via `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` or dynamic fallback) | Your actual Stripe Price IDs created in the [Stripe Dashboard](https://dashboard.stripe.com/prices) or via the Stripe API. |
| `success_url` | `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}` | Post-payment success URL (configured to redirect to `/subscription/success`). Keep the `{CHECKOUT_SESSION_ID}` template parameter. |
| `cancel_url` | `${origin}/subscription/cancel` | Cancel/return URL when customers cancel payment (configured to redirect to `/subscription/cancel`). |

---

## Configured Parameters

These parameters were configured according to the Checkout Studio specifications and are set in the Checkout Session creation call.

**Files containing these parameters:**
- [app/api/stripe/create-checkout/route.ts](app/api/stripe/create-checkout/route.ts)

| Parameter | Value | Note |
|---|---|---|
| `ui_mode` | `hosted_page` | Configured for Stripe Node SDK version 23.1.0 (SDK >= 21.0.0 uses `hosted_page`). |
| `billing_address_collection` | `auto` | Automatically collects billing address when necessary. |
| `phone_number_collection` | `{ "enabled": false }` | Phone number collection disabled. |
| `automatic_tax` | `{ "enabled": false }` | Automatic tax calculation disabled. |
| `allow_promotion_codes` | `false` | Promotion codes not allowed. |
| `payment_method_collection` | `always` (conditional) | Only included when `mode` is `"subscription"`. |
| `submit_type` | `auto` | Automatic submit button text. |
| `integration_identifier` | `hosted_mobile_app_0001` | Integration identifier. |
| `origin_context` | `mobile_app` | Context origin identifier. |

---

## Setup and Next Steps

### 1. Environment Variables Setup

Ensure your `.env.local` file contains the following environment variables:

```bash
# Stripe API Keys (Dashboard -> Developers -> API keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (Dashboard -> Webhooks or via stripe CLI)
STRIPE_WEBHOOK_SECRET=whsec_...

# (Optional) Pre-created Stripe Price IDs from Dashboard
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...

# Application domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. How the Integration Works

```
1. Customer clicks "สมัครแพ็กเกจ" on /subscription page
2. Frontend sends POST request to /api/stripe/create-checkout with { plan: "monthly" | "yearly" }
3. Server creates Checkout Session via stripe.checkout.sessions.create(...)
4. Server returns session.url and customer is redirected to the Stripe-hosted Checkout page
5. Customer completes payment (Card, PromptPay, etc.)
6. Stripe sends a `checkout.session.completed` event to /api/stripe/webhook
7. Webhook verifies the signature and fulfills access by updating the database
8. Customer is redirected to /subscription/success
```

### 3. Testing with Stripe Test Mode

Use Stripe's official test credentials in Test Mode:
- **Card Numbers**: Visit [Stripe Testing Documentation](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`, any future expiration date, any 3-digit CVC).
- **PromptPay**: In test mode, Stripe provides simulated QR code payment buttons.
- **Webhook Testing**: Use the Stripe CLI to listen and forward events locally:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### 4. Next Steps

1. Configure Stripe API keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) in `.env.local`.
2. (Optional) Create products and prices in your [Stripe Dashboard](https://dashboard.stripe.com/prices) and copy their `price_...` IDs to `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`.
3. Verify fulfillment in [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts).
4. When ready for production, switch from `sk_test_...` to live keys `sk_live_...`.

---

## Resources

- [Stripe Checkout Documentation](https://docs.stripe.com/payments/checkout)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Support](https://support.stripe.com)
- [Stripe MCP](https://docs.stripe.com/mcp)
