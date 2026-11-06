# Production demo workspaces

The landing-page demo creates an isolated pharmacy organization, signs the visitor in as its temporary administrator, and seeds representative stock, patients, sales, payments, expiry alerts, and fast/slow mover data. Each workspace expires after four hours.

## Environment

- `ALLOW_PUBLIC_DEMO`: set to `false` to disable the public demo route. It is enabled by default.
- `DEMO_MAX_ACTIVE`: maximum number of unexpired demo organizations. Defaults to `50`.
- `CRON_SECRET`: server-only secret used to authenticate cleanup requests.

The launch route also applies a 30-minute browser cooldown to reduce accidental duplicate workspaces.

## Cleanup

Vercel runs `GET /api/cron/demo-cleanup` once daily at 03:15 UTC, which is compatible with Hobby-plan cron limits. Other hosts should schedule the same request with:

```text
Authorization: Bearer <CRON_SECRET>
```

Demo access still ends after four hours; the dashboard rejects an expired workspace even if the daily cleanup has not run yet. The cleanup deletes up to 500 expired organizations per run where `isDemo = true` and `demoExpiresAt` is in the past. Organization-owned records and temporary Better Auth users are removed through database cascade rules.

## Safety boundaries

- Every launch gets its own organization; visitors never share demo data.
- Demo organizations are excluded from public business, team-member, and active-user metrics.
- Paystack checkout, subscription cancellation, and M-Pesa STK initiation are rejected server-side.
- AI remains available for evaluation, capped at 20 messages per demo workspace.
- The persistent workspace banner identifies sample data, states the expiry time, and links to public owner registration.

The seeded M-Pesa references and eTIMS statuses are illustrative records only. No external payment or compliance provider is contacted while creating a demo.
