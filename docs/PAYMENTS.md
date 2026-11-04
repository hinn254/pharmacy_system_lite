# Paystack billing

Pharmacy OS offers a 30-day trial, then costs KES 1,999 monthly or KES 19,990 annually. Card checkout creates an automatically renewing Paystack subscription. M-Pesa checkout is a one-time payment because Paystack does not support recurring M-Pesa payments.

## Environment

Set `PAYSTACK_SECRET_KEY` to the Paystack secret key and `CRON_SECRET` to a random server-only value. `PAYSTACK_WEBHOOK_SECRET` is not used: Paystack signs webhooks with the secret key.

In Paystack, configure the webhook URL as:

`https://YOUR_DOMAIN/api/paystack/webhook`

Schedule a daily authenticated GET request to `/api/cron/billing` with `Authorization: Bearer $CRON_SECRET`. The cron refreshes trial, grace and expiry states and closes abandoned checkouts. Webhooks and callback verification activate and renew subscriptions immediately.

## Stored billing data

- `OrganizationSubscription`: current trial, paid period, grace period and Paystack customer/subscription identifiers.
- `BillingPayment`: immutable checkout/payment ledger keyed by Paystack reference.
- `BillingPlan`: Paystack plan codes created lazily for recurring card payments.
- `PaystackWebhookEvent`: signed event inbox and idempotency ledger.

The callback and webhook share the same idempotent settlement function, so processing the same successful charge twice does not extend access twice.
