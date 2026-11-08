# Privacy-safe product analytics

## Purpose and north star

The north-star metric is **Weekly Value-Active Organizations**: distinct, non-demo organizations that emit at least one `sale_completed`, `stock_batch_received`, `consultation_completed`, or `insurance_claim_created` event in seven days. Report the combined number and each event's organization count separately.

Primary activation is an organization's first sale within seven days of `organization_registered`. The activation funnel is `organization_registered` → `inventory_item_created` → `stock_batch_received` → `sale_completed`. Track registration-to-first-sale conversion, median time between stages, and activation within 1, 3, and 7 days. Acquisition source remains missing until the application captures it reliably.

## Privacy contract

Analytics may contain opaque organization/user IDs, role, plan/status, demo flag, deployment environment, coarse item-count/payment/workflow categories, and sanitized route templates. It must never contain patient or record IDs, names, contact details, dates of birth, consultation or prescription content, drug or batch names/numbers, suppliers/insurers, exact money, file URLs, searches, AI content, form values, cookies/tokens/headers/request bodies, or raw dynamic URLs.

`lib/analytics/events.ts` is the allowlisted event contract. Add properties there before capture. Prefer buckets to exact values. Do not spread domain objects, request data, or form data into an event.

## Ownership and current triggers

| Event | Source of truth | Trigger |
| --- | --- | --- |
| `$pageview` | Client | pathname change after route sanitization |
| `organization_registered` | Server | organization and owner committed |
| `inventory_item_created` | Server | new inventory item committed |
| `stock_batch_received` | Server | new stock receipt committed |
| `sale_completed` | Server | POS sale committed |
| `insurance_claim_created` | Server | completed sale includes insurance |
| `consultation_completed` | Server | paid consultation is marked dispensed/closed |
| `billing_page_viewed` | Client | billing UI opens |
| `checkout_started` | Server | local pending billing payment created |
| `checkout_succeeded`, `subscription_activated` | Verified Paystack webhook | successful charge applied |
| `checkout_failed` | Server/webhook | initialization or verified renewal failure |
| `subscription_cancelled` | Server | Paystack disable request succeeds |

Client events are UI intent only. Transactional and subscription outcomes are server-owned and are not duplicated on the client. Analytics calls are caught so failures cannot fail business operations. Development delivery is disabled.

## Identity and page views

Authenticated users are identified only by internal user ID and grouped by internal organization ID. Email, name, phone, organization name, and domain records are excluded. Logout resets the browser identity before signing out. `/patients/abc` becomes `/patients/[patientId]`; comparable consultation, sale receipt, and invoice routes are templated, and all query strings/fragments are removed. Public and authenticated views carry a coarse `access` category.

## Configuration

Copy `.env.example` into the deployment environment. Use the PostHog project token, never a personal API key. The confirmed data region is PostHog US Cloud, so both SDKs use `https://us.i.posthog.com`. Browser variables are frozen at build time by Next.js.

Autocapture, automatic page views/page leaves, session replay, and surveys are disabled. Preview and production are labeled separately. No development events are sent.

## Dashboards

1. **Executive:** weekly value-active organizations, breakdown by core event, new and activated organizations, median time to first value, trial-to-paid, four-week retention, cancellations.
2. **Activation:** the four-step activation funnel, step drop-off, seven-day activation, and time-to-stage distributions by plan.
3. **Feature adoption:** organization counts by module, module combinations, plan, organization age, and new/retained cohort.
4. **Account health:** active users/roles/days, core workflow frequency, adopted modules, usage decline, trial expiry proximity, and billing intent.
5. **Workflow quality:** sale, consultation, and checkout success/failure rates plus report and AI success when those events are implemented.

Initially expose product-qualified account component signals independently (first sale, 3+ staff, 3+ modules, 3+ active days, billing intent, late-trial value activity, consultation/insurance adoption, sustained weekly activity). Do not create a composite score until 4–8 weeks of representative baseline data relates these signals to conversion and retention.

## Retention, deletion, and safe extension

Configure retention and deletion in PostHog to match the company's approved privacy policy and customer contracts; no duration is assumed here. Organization deletion should include deletion of its analytics group and associated opaque user identities through an approved operational process.

To add an event: choose a past-tense snake_case name, decide one client/server owner, add the exact payload to `events.ts`, verify every property against the prohibited list, capture only after the authoritative action succeeds, add a test for sanitization/allowlisting where applicable, and update this catalog. Never add replay or autocapture without a separate privacy review.

## Deferred measurements

`first_value_reached` needs a durable, race-safe once-per-organization marker. Additional module/report/AI events, active-staff signals, plan-limit proximity, four-week retention, and PostHog insight creation remain dashboard/configuration work after credentials and data-residency approval. No revenue or value outcome is inferred from browser events.
