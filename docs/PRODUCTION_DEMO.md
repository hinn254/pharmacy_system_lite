# Shared production demo

The production demo uses the same pre-seeded pharmacy and users as development. The landing-page button signs visitors directly into the seeded administrator account, so there is no workspace creation delay and no demo cleanup cron.

## Seed the demo

Run the existing idempotent seed command against the production database:

```bash
npm run db:seed
```

The seed marks `main-pharmacy` as a demo organization, restores its representative stock, patients, sales, payments, expiry alerts, and fast/slow mover data, and upserts the four development demo users. Running the command again resets the shared demo data in the same way development is reset.

Deployments also include a data migration that marks an existing `main-pharmacy` workspace as the demo. If the landing page reports that the sample pharmacy is being prepared, run the seed command once because the seeded administrator account is missing.

## Environment

- `ALLOW_PUBLIC_DEMO`: set to `false` to disable the landing-page demo. It is enabled by default.
- `DEMO_LOGIN_EMAIL`: optional seeded account used by the one-click demo. Defaults to `admin@pharmacy.local`.
- `SEED_DEMO_PASSWORD`: optional password shared by the seed command and demo sign-in route. If set, use the same value when running the seed and in the deployed application.

## Safety boundaries

- The shared organization is marked `isDemo`, so it is excluded from public business, team-member, and active-user metrics.
- Paystack checkout, subscription cancellation, and M-Pesa STK initiation are rejected server-side.
- AI remains available for evaluation, capped at 20 messages in the shared demo dataset.
- The workspace banner clearly identifies shared pre-seeded data and links visitors to public owner registration.

The seeded M-Pesa references and eTIMS statuses are illustrative records only. No external payment or compliance provider is contacted by the seed or one-click sign-in.
