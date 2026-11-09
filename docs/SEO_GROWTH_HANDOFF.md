# Pharmacy OS SEO & Organic Acquisition Handoff

**Canonical domain:** `https://pharmacyos.co.ke`
**Market:** Kenya
**Product:** Pharmacy management software for pharmacy owners and their teams
**Prepared:** 7 November 2026
**Document purpose:** Implementation brief for the agent responsible for improving the public website, technical SEO, conversion tracking, and initial search content.

## 1. Commercial Objective

Build a search-driven acquisition system that produces qualified Pharmacy OS registrations and demo starts from Kenyan pharmacy owners, administrators, and multi-branch operators.

Traffic alone is not the success metric. The primary funnel is:

`qualified non-brand search -> relevant landing page -> demo or registration -> activated pharmacy workspace`

### 90-day targets

Treat these as initial operating targets, not historical baselines:

- All intended public pages indexed and free of material Search Console errors.
- Top 20 visibility for at least five high-intent, non-brand Kenyan queries.
- At least 3% organic visitor-to-registration-start conversion.
- At least 25% registration-start-to-completed-registration conversion.
- Establish a measured baseline for activated workspaces and qualified sales conversations from organic search.

Do not promise rankings or traffic volumes. Revise targets after 30 days of Search Console and analytics data.

## 2. Positioning

### Primary positioning

> Pharmacy management software built for Kenyan pharmacies.

### Supporting value proposition

> Run pharmacy POS, dispensing, batch inventory, patients, M-Pesa payments, insurance, finance and operational reporting in one connected workspace.

### Differentiation to express consistently

- Pharmacy-specific rather than a generic retail POS.
- Connects commercial and clinical work: consultation, prescription, checkout and dispensing.
- Batch-level inventory with expiry tracking and FEFO workflows.
- Kenyan operating context: M-Pesa, insurance administration and eTIMS record fields/status.
- Role-specific workflows for owners, administrators, cashiers, pharmacy technologists and doctors.
- Self-service registration and a working product demo.

### Claims constraints

Do not invent or imply:

- Customer counts, savings, revenue uplift, uptime or market leadership.
- Testimonials, customer logos, ratings or case studies.
- Regulatory certification, PPB approval, DHA certification or KRA/eTIMS approval.
- Production-ready integrations that are not confirmed in the repository and deployment.
- Features described as planned in `PRODUCT.md`.

Use precise phrasing such as “eTIMS status and references” unless production integration and certification are verified.

## 3. Target Buyers and Search Jobs

| Buyer | Search job | Desired next step |
| --- | --- | --- |
| Independent pharmacy owner | Replace paper, Excel or a generic till | Start demo or create pharmacy |
| Growing multi-branch owner | See stock, sales and staff activity across operations | Request a tailored demo |
| Pharmacy administrator | Improve stock, expiry, purchasing and reporting controls | Explore inventory workflow |
| Pharmacy technologist or pharmacist | Improve prescription and dispensing traceability | Explore dispensing workflow |
| New pharmacy founder | Choose software before opening | Use launch checklist and register |

### Objections the website must answer

- Is it built for pharmacies or adapted from a normal POS?
- Can my existing drug and stock list be imported?
- Will staff learn it quickly?
- Does it work with the hardware I already own?
- How are M-Pesa, insurance and eTIMS handled?
- Can I manage multiple roles or branches?
- What does it cost?
- Who supports onboarding and data migration?
- How is pharmacy data protected?

If the answer is not yet verified, do not fabricate it. Add it to the evidence gap list for the owner.

## 4. Keyword and Page Strategy

Keyword priorities are based on language repeatedly used by Kenyan competitors and current search results. No paid keyword-volume tool was available, so validate demand and difficulty in Google Ads Keyword Planner and Search Console after launch.

### Priority 1: High-commercial-intent pages

| Route | Primary search intent | Required focus |
| --- | --- | --- |
| `/` | pharmacy management software Kenya | Category, Kenya fit, strongest differentiation, registration/demo CTA |
| `/pricing` | pharmacy software price Kenya | Transparent plans or an honest “contact us” structure; include what is included and onboarding costs |
| `/demo` | pharmacy software demo | Product walkthrough, demo credentials/flow, expected time and CTA |
| `/pharmacy-pos-system` | pharmacy POS system Kenya; chemist POS Kenya | Checkout, barcode/search, receipts, cash/M-Pesa/insurance, FEFO |
| `/pharmacy-inventory-management` | pharmacy inventory software Kenya | Batches, expiry, low stock, suppliers, FEFO and reporting |
| `/mpesa-pharmacy-pos` | pharmacy POS with M-Pesa | Verified M-Pesa workflow, payment states, reconciliation boundaries |
| `/etims-pharmacy-software` | eTIMS pharmacy software Kenya | Exact live capabilities, status/reference capture and compliance disclaimers |
| `/pharmacy-insurance-claims` | pharmacy insurance claims software Kenya | Scheme pricing, member details, claims and insurer invoicing |
| `/multi-branch-pharmacy-software` | multi-branch pharmacy software Kenya | Publish only after current multi-branch capability is verified |

### Priority 2: Clinical and operational differentiation

- `/pharmacy-dispensing-software`
- `/pharmacy-expiry-tracking`
- `/pharmacy-patient-records`
- `/pharmacy-finance-reporting`
- `/pharmacy-consultation-software`

### Priority 3: Educational acquisition content

Create useful decision content, not generic AI-written articles:

1. `/guides/how-to-choose-pharmacy-software-kenya`
2. `/guides/pharmacy-software-vs-generic-pos`
3. `/guides/pharmacy-inventory-migration-checklist`
4. `/guides/how-fefo-reduces-pharmacy-expiry-losses`
5. `/guides/pharmacy-stocktake-checklist`
6. `/guides/starting-a-pharmacy-software-checklist-kenya`
7. `/guides/mpesa-reconciliation-for-pharmacies`
8. `/guides/questions-to-ask-a-pharmacy-pos-vendor`

Every guide needs a natural internal link to the most relevant commercial page and one useful next action.

## 5. Homepage Brief

### Metadata

**Title:** `Pharmacy Management Software Kenya | Pharmacy OS`

**Description:** `Run pharmacy POS, dispensing, batch inventory, patients, M-Pesa payments, insurance and finance in one connected workspace. Start with Pharmacy OS.`

### Above-the-fold content

**Recommended H1:** `Pharmacy management software built for Kenyan pharmacies.`

**Supporting copy:** `Connect selling, dispensing, stock, patients, insurance and finance so your team works from one operational truth.`

**Primary CTA:** `Create your pharmacy`
**Secondary CTA:** `Try the live demo`

Keep the current “One sale should move your whole pharmacy forward” line as campaign or supporting copy rather than the only H1.

### Required homepage sections

1. Clear category and Kenya positioning.
2. Immediate product evidence using current screenshots.
3. Outcomes by workflow: sell, dispense, control stock, get paid, report.
4. Kenya-specific capabilities with careful claim language.
5. Role-specific outcomes.
6. Product tour or demo CTA.
7. Pricing or pricing-path summary.
8. FAQ addressing the buyer objections above.
9. Trust footer with company identity, support contact, privacy and terms.

## 6. Technical SEO Implementation

This repository uses Next.js 16.4.5. Before changing implementation, read the relevant local documentation under `node_modules/next/dist/docs/`, especially:

- `01-app/01-getting-started/14-metadata-and-og-images.md`
- `01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
- `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `01-app/02-guides/json-ld.md`

Do not rely on older Next.js conventions.

### Required work

- Set `metadataBase` to `https://pharmacyos.co.ke`.
- Give every indexable public page a unique title, description and canonical URL.
- Add `app/robots.ts` and `app/sitemap.ts` using the current Next.js file conventions.
- Add a branded Open Graph image and appropriate Open Graph/Twitter metadata.
- Add favicon and app icons that use the Pharmacy OS identity, replacing default framework assets where applicable.
- Add truthful `Organization` JSON-LD on the homepage.
- Add `BreadcrumbList` JSON-LD to nested public pages.
- Add FAQ structured data only if the FAQ content is visibly present and current. Do not expect an FAQ rich result.
- Do not add fabricated `AggregateRating`, `Review` or customer data.
- Ensure authentication, callbacks, private dashboard pages and parameterized private records are not indexable.
- Ensure public pages return meaningful server-rendered HTML and crawlable `<a>` links.
- Use descriptive public URLs; avoid query-string-only landing pages.
- Add a proper `not-found.tsx` that returns a genuine 404 response.
- Confirm production redirects enforce one HTTPS host: `https://pharmacyos.co.ke`.
- If a previous production domain exists, add permanent one-to-one redirects and submit the domain move in Search Console.

### Performance and accessibility

- Preserve `next/image` optimization and correct `sizes` values.
- Measure mobile LCP, INP and CLS on the homepage and core landing pages.
- Keep important text as HTML, not baked into images.
- Maintain one clear H1 per public page and a logical heading hierarchy.
- Keep keyboard access, visible focus and descriptive image alternatives.
- Avoid loading dashboard-only JavaScript on marketing pages.
- Avoid adding third-party chat/analytics scripts synchronously.

### Indexing controls

Index:

- Homepage, pricing, demo, feature/solution pages and substantive guides.

Noindex or keep behind authentication:

- Login and registration utility steps where indexing adds no search value.
- Billing callbacks, authentication callbacks and error states.
- All organization/customer-specific dashboard routes.
- Internal demo controls or test routes.

Do not use `robots.txt` as the only way to prevent indexing; use authentication or `noindex` as appropriate.

## 7. Structured Data

Add only verifiable fields. Initial homepage graph:

- `Organization`
  - `name`: Pharmacy OS
  - `url`: `https://pharmacyos.co.ke`
  - `logo`: absolute production logo URL
  - `description`: accurate product/company description
  - `contactPoint`: only after support email/phone is confirmed
  - `sameAs`: only confirmed official profiles

`SoftwareApplication` rich-result markup should wait until the public page contains a real offer and a genuine visible review or aggregate rating, because Google currently requires an offer plus a rating/review for eligibility. Never manufacture these fields.

## 8. Internal Linking and Navigation

Add a crawlable public navigation structure:

- Product
  - POS
  - Inventory
  - Dispensing
  - Insurance
  - Finance and reporting
- Solutions
  - Independent pharmacies
  - Growing/multi-branch pharmacies, if verified
  - New pharmacies
- Pricing
- Guides
- Demo
- Sign in

Use descriptive anchor text such as “pharmacy inventory management,” not repeated “learn more.”

Each commercial page should link to:

- Two closely related feature pages.
- Pricing.
- Demo or registration.
- One relevant guide.

Each guide should link back to one primary commercial page and two related guides where useful.

## 9. Conversion and Analytics Plan

Install privacy-conscious analytics and Google Search Console. Define events before launching new pages.

### Required events

| Event | Trigger | Key properties |
| --- | --- | --- |
| `view_landing_page` | Public landing-page view | route, referrer, campaign, device |
| `demo_start` | Visitor enters live demo | source page, CTA label |
| `registration_start` | Visitor begins registration | source page, CTA label |
| `registration_complete` | Pharmacy workspace created | source/medium, landing page |
| `activated_workspace` | Agreed activation milestone | source/medium, days from registration |
| `pricing_view` | Pricing page viewed | previous route |
| `contact_click` | WhatsApp/email/phone clicked | method, page, CTA label |
| `sales_demo_request` | Demo/contact form submitted | page, stated pharmacy size if collected |

Never send patient, prescription, medicine, consultation, insurance-member or other sensitive workspace data to marketing analytics.

### Reporting funnel

Report weekly:

1. Non-brand impressions and clicks.
2. Qualified organic sessions by landing page.
3. Demo starts.
4. Registration starts.
5. Completed registrations.
6. Activated workspaces.
7. Qualified sales conversations.

Segment brand searches from non-brand searches. A rise in brand traffic alone does not validate the content strategy.

## 10. Authority and Distribution

Organic rankings will require real discovery and authority beyond on-page changes.

### Initial distribution motions

- Publish a pharmacy-software selection checklist that associations, consultants and pharmacy founders can reference.
- Build relationships with pharmacy accountants, POS hardware vendors, industry trainers, suppliers and professional communities.
- Offer useful co-authored operational material rather than buying links.
- Create real implementation case studies after customers consent.
- Maintain official LinkedIn and other confirmed company profiles with consistent naming and domain.
- Use small, high-intent Google Search campaigns while organic pages mature; feed converting search terms back into SEO priorities.
- Make WhatsApp or a short demo request easy for owners who do not want to self-register.

Do not buy backlinks, mass-produce location pages or publish thin AI content.

## 11. 90-Day Delivery Sequence

### Phase 1 — Foundation (Days 1-14)

- Configure the production domain and canonical host.
- Implement metadata, robots, sitemap, canonical URLs, Open Graph, icons and Organization schema.
- Decide index/noindex behavior for all existing routes.
- Connect Search Console and analytics.
- Instrument the acquisition and activation events.
- Rewrite the homepage title, description, H1 and supporting introduction.
- Add privacy, terms and verified support/company information.

### Phase 2 — Commercial pages (Days 15-35)

- Ship `/pricing` and `/demo`.
- Ship POS, inventory, M-Pesa, eTIMS and insurance pages.
- Add public navigation and internal linking.
- Add FAQs grounded in actual product behavior.
- Validate mobile performance and structured data.

### Phase 3 — Decision content (Days 36-60)

- Publish the software selection guide.
- Publish generic POS comparison and migration checklist.
- Publish FEFO/expiry and M-Pesa reconciliation guides.
- Start partner/referral outreach and secure the first legitimate mentions or links.

### Phase 4 — Learn and refine (Days 61-90)

- Use Search Console query/page data to revise titles, introductions and internal links.
- Compare landing-page conversion rates.
- Improve or consolidate content with impressions but weak engagement.
- Turn real onboarding evidence into the first case study when available.
- Expand only into validated queries and buyer problems.

## 12. Definition of Done

The first SEO release is complete only when:

- `https://pharmacyos.co.ke` is the single canonical production host.
- All intended public routes are present in a valid sitemap.
- Private and utility routes are appropriately protected or noindexed.
- Homepage and commercial pages have unique metadata and one descriptive H1.
- Canonical, Open Graph and icon URLs resolve successfully in production.
- Organization JSON-LD passes schema validation and contains no fabricated fields.
- Search Console ownership is verified and the sitemap is submitted.
- Analytics can trace landing page -> demo/registration -> completion -> activation without collecting sensitive pharmacy or patient data.
- Core landing pages work at mobile and desktop widths and meet reasonable Core Web Vitals expectations.
- Every published claim has been checked against the live product or explicitly approved evidence.
- `npm run lint`, `npm run typecheck` and `npm run build` pass.
- The agent provides a changed-file summary, production verification checklist and any unresolved product-evidence questions.

## 13. Required Agent Handoff Report

The implementing agent must return:

1. Files and routes created or changed.
2. Metadata and schema implemented.
3. Routes included in and excluded from indexing.
4. Analytics events implemented and where they fire.
5. Lighthouse/Core Web Vitals results for homepage plus two commercial pages.
6. Search Console and production tasks that still require the owner.
7. Claims or product questions that could not be verified.
8. Test, typecheck and build results.

## 14. Evidence and Research Notes

### Current repository observations

- The application uses Next.js 16.4.5.
- `app/layout.tsx` currently supplies only a generic title and description.
- No `app/robots.ts`, `app/sitemap.ts`, canonical configuration or public JSON-LD implementation was found during the 7 November 2026 review.
- The homepage already contains strong product screenshots and detailed workflow copy that can be reused across dedicated pages.
- `PRODUCT.md` defines the authoritative product positioning and claims constraints.

### Competitive search-language examples

- Zameda: <https://zameda.co.ke/>
- DawaSoft: <https://www.dawasoft.co.ke/>
- Livia PIMS: <https://pims.liviahealth.com/>
- PharmaSync: <https://pharmasync.co.ke/>
- DawaSmart: <https://dawasmart.safravo.co.ke/pharmacy-pos-software-kenya>
- PharmaCloud: <https://www.hillsdatatechnologies.co.ke/products/pharmacy>

### Search-engine guidance

- Google Search Essentials: <https://developers.google.com/search/docs/essentials>
- SEO Starter Guide: <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Technical SEO: <https://developers.google.com/search/docs/fundamentals/get-started>
- Organization structured data: <https://developers.google.com/search/docs/appearance/structured-data/organization>
- Software application structured data: <https://developers.google.com/search/docs/appearance/structured-data/software-app>
- Ranking systems and exact-match domains: <https://developers.google.com/search/docs/appearance/ranking-systems-guide>

## 15. Evidence Gaps Requiring Owner Decisions

These gaps should not block the technical foundation, but they affect conversion content:

- Final pricing, trial length and onboarding/setup fees.
- Confirmed production status and approved wording for M-Pesa and eTIMS.
- Whether multi-branch management is live.
- Data import/migration scope and whether assistance is offered.
- Support channels, service hours and response expectations.
- Legal company name, business address and public contact details.
- Privacy, data-processing and security statements approved for publication.
- The exact activation milestone used for acquisition reporting.

Until confirmed, omit uncertain claims or use narrowly accurate descriptions based on the working implementation.
