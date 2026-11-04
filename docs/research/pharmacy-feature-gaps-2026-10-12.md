# Pharmacy feature-gap review — PharmaPOS comparison

12 October 2026 · Kenyan retail pharmacies · Branches and stock transfers included in Release 1

## Overview

The full-parity execution plan now controls implementation scope: [master plan](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/docs/research/pharmacy-parity-execution-plan-2026-10-12.md). Payroll, accounting and other observed back-office modules remain required for full parity even when implemented after the retail pilot.

PharmaPOS currently shows broader retail and back-office coverage. Our strongest existing foundation is pharmacy workflow: consultations, pharmacist/cashier/dispensing queues, FEFO allocation, prescription attachments and labels, insurance invoicing, targeted discounts and operational analytics. The first release should add branch/store stock control and close payment, stock and accounting correctness gaps before chasing every module.

Reviewed on 12 October 2026 for Kenyan retail pharmacies, using the browser Playwright interface and the supplied admin access. Inspected 90 distinct menu-linked pages plus the dashboard; the cashier Daily Sales page was subsequently verified. This is a read-only UI and source-code comparison, not an end-to-end competitor test, production certification or security audit. No records, settings, sales, payments, payroll or messages were submitted. Browser automation is not a guarantee against rate limits; navigation was sequential without direct API scraping.

Our posture: Missing = no corresponding model/workflow found in the inspected schema, routes and actions; Partial = related implementation exists but coverage or correctness is incomplete; Schema only = stored fields/models exist without an operational workflow found; Incomplete = a concrete source-level gap. Observed UI confirms screens/controls, not successful execution. Opportunity denotes a proposed differentiator, not a proven competitor deficiency.

Priorities: P0 = first-release requirement or correctness gate; P1 = next competitive increment; P2 = later/optional. These are sequencing recommendations, not time estimates. No workload or calendar commitment is inferred.

Backlog: 67 items (28 P0, 27 P1, 12 P2).

## Existing strengths

- **Consultations and pharmacist handoff:** Doctor assignment, vitals, encounters, medication orders, external fulfillment and consultation checkout exist. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/consultations.ts)
- **Checkout and dispensing queues:** Queued order pickup, finalization, ready-to-dispense and dispensed states exist. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/pos-orders.ts)
- **Batch safety and traceability:** FEFO excludes expired and deleted batches; sale allocations link to batches. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/fefo.ts)
- **Insurance operations:** Schemes, claim aggregation, insurer invoices and invoice payments exist; this is not proof of a live insurer API integration. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/insurance-invoices.ts)
- **Targeted discount rules:** Codes have scopes, patient segments, schedules, stacking and application snapshots. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/discount-codes.ts)
- **Operational analytics:** Revenue, COGS, gross profit, stock valuation, category mix and repeat patients exist, but historical-cost and tax semantics need strengthening. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts)
- **AI assistance:** Read-only data tools and advisory consultation safety checks exist; clinical efficacy has not been validated. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/ai/tools.ts)

## Source-level readiness findings

### M-Pesa confirmation is a release blocker

The callback handler sets MpesaTransaction to COMPLETED when CheckoutRequestID is present, without checking ResultCode, extracting the receipt or updating the linked Payment. A failure can therefore be recorded as completed. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/app/api/mpesa/callback/route.ts)

### Tenant isolation does not provide branch operations

Organization scopes data today; the schema has no Branch, Store, Location, Transfer or batch-location balance model. A batch is unique by drug and batch number, so adding only branchId to the current batch table will not model shared lots across locations adequately. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma)

### Historical profit can change after a cost edit

Analytics computes COGS from SaleLineBatch quantities joined to current DrugBatch.unitCost or Drug.costLast. Snapshot allocated unit cost at sale time before extending branch margin reports. Revenue also comes from Sale.total, which includes tax; define net-sales reporting explicitly. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts)

### Tax classes need a real line-level model

Sales use an organization rate and sale-wide tax toggle. There are no per-product tax classes or effective rate records in the current schema. Preserve exempt versus zero-rated semantics instead of representing everything as tax off. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts)

### Offline and marketing models are groundwork

OfflineSyncQueue and PromoCampaign exist, but no operational use was found in app/lib/components. The service worker caches GET responses and skips API requests; that is not offline checkout synchronization. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/public/sw.js)

### Void and return enums are not completed workflows

SaleStatus.VOIDED and stock RETURN/VOID_RESTOCK enum values exist, but no complete sale-void or partial-refund workflow was found in the reviewed actions and routes. [Code](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma)

## Competitor snapshot

PharmaPOS v3.2.1 presents a broad branch-aware retail suite with inventory, procurement, receivables, payroll, accounts, permissions and communications. Its appeal is having these workflows in one system. Pricing, customer adoption, performance, live integrations, security implementation and support quality were not evaluated. Our opportunity is to combine comparable retail control with a clearer pharmacy-specific clinical workflow and reliable reconciliation.

### Observations worth investigating

- **Accounting discrepancy:** The trial balance visibly warned that debits and credits differ by KES 11,349. The balance sheet showed assets of 295,570 versus liabilities plus equity of 284,221, the same difference. Demo data and workflow history may explain it; this does not establish a universal product defect. [Screen](https://pharmapos.jisoftapps.cc/?page=accounting/trial_balance)
- **Stock valuation needs an explicit basis:** Dashboard stock valuation was 85,960; stock registry cost valuation was 74,450; balance-sheet inventory valuation was 40,510. Scope, date or costing choices may differ; establish one traceable valuation policy in our system. [Screen](https://pharmapos.jisoftapps.cc/?page=inventory/stock)
- **Possible double-counting in cash summary:** Business Snapshot showed collected 4,150 plus other income 4,100 and net cash position 8,250; the other-income category was Sales. This suggests duplication to investigate, not proof of the underlying cause. [Screen](https://pharmapos.jisoftapps.cc/?page=reports/business_snapshot)
- **Loyalty consistency needs verification:** Customer list showed walk-in points while redemption summary showed zero and no customer records. Eligibility/filter scope could explain it. Our ledger and redemption views should reconcile under the same scope. [Screen](https://pharmapos.jisoftapps.cc/?page=customers/manage_loyalty)
- **Claims exceed inspected workflow evidence:** About describes prescription management, refill SMS, encryption and legal compliance. Equivalent clinical/refill screens were not found in the inspected navigation, and no security/compliance claim was independently validated. Generic school-fees wording appeared in M-Pesa settings. [Screen](https://pharmapos.jisoftapps.cc/?page=about)

## Comprehensive comparison and backlog

| ID | Area / feature | Our posture | PharmaPOS evidence | Priority |
| --- | --- | --- | --- | --- |
| F01 | Branches — Branch hierarchy and business identity | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/manage_branches) | P0 |
| F02 | Branches — Stores, shelves and bins | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/manage_stores) | P0 |
| F03 | Branches — Store rules and quarantine locations | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/store_types) | P0 |
| F04 | Branches — Branch and store access scope | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=users/create_user) | P0 |
| F05 | Branches — Batch-preserving internal transfers | Missing | [Observed UI and existing log](https://pharmapos.jisoftapps.cc/?page=inventory/transfer_stock) | P0 |
| F06 | Branches — Transfer approvals and reversal | Missing | [Opportunity beyond inspected UI](https://pharmapos.jisoftapps.cc/?page=inventory/transfer_stock) | P0 |
| F07 | Branches — Branch dashboards and consolidated reporting | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=reports/business_snapshot) | P0 |
| F08 | Inventory — Purchase, dispensing and stock unit conversion | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/unit_conversion) | P0 |
| F09 | Inventory — Decimal quantities and unit precision | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/units) | P1 |
| F10 | Inventory — Stocktake sessions and variance approval | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/stock_reconcile) | P0 |
| F11 | Inventory — Printable and importable count sheets | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=reports/stock_take) | P1 |
| F12 | Inventory — Physical, reserved and available stock | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/stock) | P0 |
| F13 | Inventory — Concurrency-safe stock allocation | Partial | [Not validated; launch requirement](https://pharmapos.jisoftapps.cc/?page=inventory/stock) | P0 |
| F14 | Inventory — Stock movement explorer and audit viewer | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/stock_movement) | P1 |
| F15 | Inventory — Batch recall, quarantine and disposal | Partial | [Opportunity](https://pharmapos.jisoftapps.cc/?page=purchases/expiry) | P1 |
| F16 | Inventory — Per-location reorder levels and suggested POs | Partial | [Reorder fields observed; suggestions proposed](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) | P1 |
| F17 | Catalog — Product tax classes and effective rates | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/manage_taxes) | P0 |
| F18 | Catalog — Wholesale, promotional and minimum price tiers | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) | P1 |
| F19 | Catalog — Product images and receipt aliases | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) | P2 |
| F20 | Catalog — Hierarchical categories | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/product_categories) | P2 |
| F21 | Catalog — Structured brands and manufacturers | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/manufacturers) | P2 |
| F22 | Catalog — Inventory items and service behavior | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=inventory/product_types) | P1 |
| F23 | Catalog — Validated CSV catalog import | Missing | [Import control observed](https://pharmapos.jisoftapps.cc/?page=inventory/product_list) | P1 |
| F24 | Procurement — Supplier financial terms and opening balances | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/add_supplier) | P1 |
| F25 | Procurement — Purchase-order drafting and approval | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/add_purchase_order) | P0 |
| F26 | Procurement — Partial receiving against purchase orders | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/manage_purchase_orders) | P0 |
| F27 | Procurement — Goods received notes and batch capture | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/create_grn) | P0 |
| F28 | Procurement — Direct supplier invoice receipt | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/items_invoice) | P0 |
| F29 | Procurement — PO–GRN–invoice matching | Missing | [Document links observed; matching controls proposed](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_invoice) | P1 |
| F30 | Procurement — Supplier returns and credit allocation | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_returns) | P0 |
| F31 | Procurement — Supplier statements and aging | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_payments) | P1 |
| F32 | Sales — Register opening, cash float and day close | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/sales_register) | P0 |
| F33 | Sales — Customer credit invoices and payment terms | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/create_invoice) | P1 |
| F34 | Sales — Customer debt settlement and statements | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/customer_statement) | P1 |
| F35 | Sales — Quotations and conversion | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/manage_quotations) | P2 |
| F36 | Sales — Partial sales returns and refund approvals | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/sales_returns_list) | P0 |
| F37 | Sales — Sale voids and controlled corrections | Schema only | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/cancelled_sales) | P0 |
| F38 | Sales — Cashier UI for split tender | Partial | [Observed UI wording; not transacted](https://pharmapos.jisoftapps.cc/?page=sales/create_invoice) | P1 |
| F39 | Sales — Additional payment channels | Missing | [Channel choices observed](https://pharmapos.jisoftapps.cc/?page=reports/payments) | P1 |
| F40 | Sales — Quick-sale shortcuts and counter efficiency | Partial | [Observed UI labels](https://pharmapos.jisoftapps.cc/?page=sales/pos) | P1 |
| F41 | Sales — Delivery charges and invoice remarks | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=sales/pos) | P2 |
| F42 | Customers — Loyalty points ledger and redemption | Missing | [Observed UI; inconsistent displayed balances](https://pharmapos.jisoftapps.cc/?page=customers/manage_loyalty) | P2 |
| F43 | Customers — Corporate accounts and account status | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=customers/add_customer) | P2 |
| F44 | Customers — SMS/email gateway and delivery history | Schema only | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/send_bulk_sms) | P1 |
| F45 | Customers — Overdue balance reminders | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/invoice_due_sms) | P2 |
| F46 | Customers — Prescription refill reminders | Schema only | [About-page claim only](https://pharmapos.jisoftapps.cc/?page=about) | P1 |
| F47 | Finance — Immutable transaction-time cost snapshots | Partial | [Unit cost shown; historical immutability unverified](https://pharmapos.jisoftapps.cc/?page=sales/sales_audit) | P0 |
| F48 | Finance — Revenue, tax and COGS correctness | Partial | [Reports observed; discrepancies noted](https://pharmapos.jisoftapps.cc/?page=accounting/income_statement) | P0 |
| F49 | Finance — Double-entry ledger and chart of accounts | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=accounting/journal_entry) | P1 |
| F50 | Finance — Trial balance, balance sheet and income statement | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=accounting/trial_balance) | P1 |
| F51 | Finance — Cash, bank and M-Pesa reconciliation | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=accounting/bank_reconciliation) | P0 |
| F52 | Finance — Configurable expenses and other income | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=accounting/entry) | P1 |
| F53 | Finance — Financial exports and report catalogue | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=reports/sales) | P1 |
| F54 | Administration — Granular configurable permissions | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=users/permission_list) | P0 |
| F55 | Administration — Approval queues and actionable exceptions | Missing | [Returns/GRN approval UI; unified queue proposed](https://pharmapos.jisoftapps.cc/?page=sales/sales_returns_list) | P1 |
| F56 | Administration — Staff directory and payroll profiles | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=payroll/employees) | P2 |
| F57 | Administration — Payroll allowances, deductions and advances | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=payroll/assign_allow_deduct) | P2 |
| F58 | Administration — Payroll runs, payslips and payment ledger | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=payroll/payroll_report) | P2 |
| F59 | Administration — Internal support tickets | Missing | [Observed UI](https://pharmapos.jisoftapps.cc/?page=ticketing/tickets) | P2 |
| F60 | Readiness — Correct M-Pesa callback and confirmation lifecycle | Incomplete | [Configuration UI only; gateway not validated](https://pharmapos.jisoftapps.cc/?page=settings/mpesa_settings) | P0 |
| F61 | Readiness — Tenant/branch-specific gateway configuration | Partial | [Observed UI](https://pharmapos.jisoftapps.cc/?page=settings/mpesa_settings) | P0 |
| F62 | Readiness — eTIMS submission and credit-note lifecycle | Schema only | [Not observed in inspected menus](https://pharmapos.jisoftapps.cc/?page=about) | P0 |
| F63 | Readiness — True offline selling and safe synchronization | Schema/cache only | [Not verified](https://pharmapos.jisoftapps.cc/?page=about) | P1 |
| F64 | Readiness — Safe retries and document numbering | Partial | [Not validated; launch requirement](https://pharmapos.jisoftapps.cc/?page=sales/pos) | P0 |
| F65 | Differentiation — Structured pharmacist review and clinical safety | Partial | [Prescription manager claimed; comparable workflow not observed](https://pharmapos.jisoftapps.cc/?page=about) | P1 |
| F66 | Differentiation — Expiry loss prevention and branch redistribution | Partial | [Expiry monitor observed; redistribution proposed](https://pharmapos.jisoftapps.cc/?page=purchases/expiry) | P1 |
| F67 | Differentiation — Fast onboarding, migration and release proof | Missing | [Catalog import observed; wider migration proposed](https://pharmapos.jisoftapps.cc/?page=inventory/product_list) | P1 |

## Acceptance criteria and source references

### F01 · Branch hierarchy and business identity · P0

One organization owns multiple branches; every sale, receipt, order, payment and stock event records its branch; migrate current data to a default branch.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/manage_branches) (Observed UI).

### F02 · Stores, shelves and bins · P0

Each branch contains stores and locations; the same drug batch can have separate balances at multiple locations without duplicating the drug catalog.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/manage_stores) (Observed UI).

### F03 · Store rules and quarantine locations · P0

Define sellable, receiving, transit, returns and damaged locations; POS cannot allocate quarantined or non-sellable stock.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/store_types) (Observed UI).

### F04 · Branch and store access scope · P0

Assign permitted branches and stores to staff; enforce scope in server reads, writes, exports and background jobs; cross-branch access is explicitly authorized.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/authz.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=users/create_user) (Observed UI).

### F05 · Batch-preserving internal transfers · P0

Dispatch from a source, track in transit, receive at destination; retain batch, expiry and cost; partial receipts and discrepancies remain visible.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/transfer_stock) (Observed UI and existing log).

### F06 · Transfer approvals and reversal · P0

A distinct authorized receiver confirms delivery; duplicate dispatch/receipt cannot move stock twice; reversals use linked movements instead of editing history.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/transfer_stock) (Opportunity beyond inspected UI).

### F07 · Branch dashboards and consolidated reporting · P0

Owners see consolidated and branch-filtered sales, margins, debt, stock and collections; transfers do not inflate organization-wide stock or revenue.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=reports/business_snapshot) (Observed UI).

### F08 · Purchase, dispensing and stock unit conversion · P0

Buy a pack of 100, sell 6 tablets, and retain 94 base units; product-specific conversion factors drive receipt, sale, return and transfer math.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/validations/sale.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/unit_conversion) (Observed UI).

### F09 · Decimal quantities and unit precision · P1

Precision rules permit fractional quantities only for supported units; rounding never creates unexplained stock differences.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/units) (Observed UI).

### F10 · Stocktake sessions and variance approval · P0

Start a count by branch/store, capture observed quantities, review variance and reasons, approve once, and retain counter/approver and before/after balances.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/batches.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/stock_reconcile) (Observed UI).

### F11 · Printable and importable count sheets · P1

Export a count sheet, optionally hide expected counts, import results with row validation, and post only reviewed variances.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/batches.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=reports/stock_take) (Observed UI).

### F12 · Physical, reserved and available stock · P0

Reserve stock for queued checkout and transfers with an expiry; available equals physical less reservations; release reservations on cancellation or timeout.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/pos-orders.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/stock) (Observed UI).

### F13 · Concurrency-safe stock allocation · P0

Two simultaneous buyers of the last unit produce one successful allocation; use atomic availability checks or locking and idempotent finalization.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/stock) (Not validated; launch requirement).

### F14 · Stock movement explorer and audit viewer · P1

Filter movements by branch/store/batch/reason/operator/document and drill through to origin; retain adjustment history and export it with permission checks.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/audit.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/stock_movement) (Observed UI).

### F15 · Batch recall, quarantine and disposal · P1

Quarantine specific batches, trace affected sales, document disposal and block allocations; preserve existing FEFO and expired-stock exclusion.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/fefo.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/expiry) (Opportunity).

### F16 · Per-location reorder levels and suggested POs · P1

Calculate demand and lead-time-based reorder suggestions per drug/location using usable stock; approved suggestions create draft POs.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/dashboard.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) (Reorder fields observed; suggestions proposed).

### F17 · Product tax classes and effective rates · P0

A mixed basket distinguishes standard, zero-rated, exempt and out-of-scope classes with effective dates and line-level snapshots; validate local tax mappings before release.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/manage_taxes) (Observed UI).

### F18 · Wholesale, promotional and minimum price tiers · P1

Retain cash and insurance prices; add wholesale and promotional tiers plus a margin/price floor with authorized override and audit.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) (Observed UI).

### F19 · Product images and receipt aliases · P2

Attach a product image and short label/receipt alias without losing generic name, strength or dosage form.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/add_products) (Observed UI).

### F20 · Hierarchical categories · P2

Allow parent-child categories and descriptions; search and reporting include child categories without double-counting sales.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/product_categories) (Observed UI).

### F21 · Structured brands and manufacturers · P2

Maintain reusable brand/manufacturer records and references with contacts and origin; migrate free-text values without losing data.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/manufacturers) (Observed UI).

### F22 · Inventory items and service behavior · P1

Support pharmacy sundries and defined services; services do not consume drug stock, while tracked medicines retain required batch/expiry controls.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/product_types) (Observed UI).

### F23 · Validated CSV catalog import · P1

Preview mappings and errors, detect duplicates, choose create/update behavior, and import valid rows atomically or with a clear per-row result.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/drugs.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/product_list) (Import control observed).

### F24 · Supplier financial terms and opening balances · P1

Record contact person, tax identifier where needed, terms, credit limits and opening balance with audit; calculate overdue balances consistently.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/add_supplier) (Observed UI).

### F25 · Purchase-order drafting and approval · P0

Create supplier/branch/store POs with quantities, units, costs, tax, discounts, freight and expected delivery; move draft to approved with permission checks.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/add_purchase_order) (Observed UI).

### F26 · Partial receiving against purchase orders · P0

Receive less than ordered, retain outstanding quantities, and prevent over-receipt unless explicitly authorized; show draft, approved, partial, received and cancelled states.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/batches.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/manage_purchase_orders) (Observed UI).

### F27 · Goods received notes and batch capture · P0

Capture actual quantities, lots, expiry and storage locations on a GRN; commit once to stock after review and link it to the PO.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/batches.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/create_grn) (Observed UI).

### F28 · Direct supplier invoice receipt · P0

Receive multiple drugs/batches directly from an invoice without a PO; one commit updates stock and supplier liability with a shared reference.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/supplier-payables.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/items_invoice) (Observed UI).

### F29 · PO–GRN–invoice matching · P1

Flag quantity, price and tax discrepancies across ordered, received and billed items; do not pay a disputed document without an explicit override.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_invoice) (Document links observed; matching controls proposed).

### F30 · Supplier returns and credit allocation · P0

Return accepted quantities against original receipt batches, remove appropriate stock, record reason and credit, and allocate the credit against supplier bills.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_returns) (Observed UI).

### F31 · Supplier statements and aging · P1

Opening debt plus invoices minus credits/payments equals closing debt; show due/overdue buckets and printable supplier statements.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/supplier-payables.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_payments) (Observed UI).

### F32 · Register opening, cash float and day close · P0

Open a cashier/register session with float; close with counted cash, expected cash, payments by channel, variance and supervisor approval.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/sales_register) (Observed UI).

### F33 · Customer credit invoices and payment terms · P1

Permit an authorized credit sale with due date and customer limit; support partial settlement, outstanding amount and overdue status separately from insurance claims.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/create_invoice) (Observed UI).

### F34 · Customer debt settlement and statements · P1

Allocate payments to invoices, prevent duplicate receipts and show opening balance, invoices, credits, settlements and closing balance.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/customer_statement) (Observed UI).

### F35 · Quotations and conversion · P2

Prepare a quote with validity, quantities and terms; track pending/sent/accepted/rejected; convert once with a fresh stock and price check.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/manage_quotations) (Observed UI).

### F36 · Partial sales returns and refund approvals · P0

Return only unreturned sold quantities, approve a refund, link payment reversal/credit and batch disposition, and never automatically restock unsafe returned medicines.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/sales_returns_list) (Observed UI).

### F37 · Sale voids and controlled corrections · P0

Void with reason and permission before dispatch where appropriate; corrections after completion use linked reversal/credit documents and preserve financial history.

Baseline: Schema only. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/cancelled_sales) (Observed UI).

### F38 · Cashier UI for split tender · P1

A cashier splits one invoice across supported channels; pending versus confirmed payments and any insurance portion remain explicit; balance reconciles to total.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/components/cashier-pos.tsx) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/create_invoice) (Observed UI wording; not transacted).

### F39 · Additional payment channels · P1

Record card, bank transfer and Airtel Money with traceable references and reconciliation states; treat recorded tender separately from a certified gateway integration.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=reports/payments) (Channel choices observed).

### F40 · Quick-sale shortcuts and counter efficiency · P1

Preserve keyboard search/Enter selection; add clear checkout shortcuts, focus return and rapid repeat scanning; measure completion time using representative tasks.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/components/pos-drug-search.tsx) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/pos) (Observed UI labels).

### F41 · Delivery charges and invoice remarks · P2

Record delivery/handling as explicit sale lines and notes, with correct totals and tax mapping; print a delivery document where needed.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/validations/sale.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/pos) (Observed UI).

### F42 · Loyalty points ledger and redemption · P2

Earn/redeem through a traceable ledger, configure point value and expiry, reverse points on returns, and never confuse discounts with point balances.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=customers/manage_loyalty) (Observed UI; inconsistent displayed balances).

### F43 · Corporate accounts and account status · P2

Represent individual versus corporate payer accounts, account status, terms and optional billing identifiers while keeping patient clinical identity distinct.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=customers/add_customer) (Observed UI).

### F44 · SMS/email gateway and delivery history · P1

Configure tenant-scoped credentials safely; preview recipient selection and templates, queue delivery, record success/failure and enforce consent/preferences.

Baseline: Schema only. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/send_bulk_sms) (Observed UI).

### F45 · Overdue balance reminders · P2

Filter due and overdue invoices, preview SMS/email reminders, log sending and suppress settled accounts or opted-out recipients.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/invoice_due_sms) (Observed UI).

### F46 · Prescription refill reminders · P1

Use refillDueAt to queue consent-aware reminders with quiet hours, deduplication, delivery status and patient-facing pharmacy contact information.

Baseline: Schema only. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/patients.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=about) (About-page claim only).

### F47 · Immutable transaction-time cost snapshots · P0

Snapshot cost on each batch allocation; changing a batch cost later must not rewrite previously earned gross margin.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/sales_audit) (Unit cost shown; historical immutability unverified).

### F48 · Revenue, tax and COGS correctness · P0

Gross profit equals net sales excluding tax minus historical COGS after discounts and returns; collection of old debt does not count as new sales revenue.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=accounting/income_statement) (Reports observed; discrepancies noted).

### F49 · Double-entry ledger and chart of accounts · P1

Post balanced, linked journal entries for sales, receipts, returns, stock and expenses; retain reversal history and make journal totals traceable.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=accounting/journal_entry) (Observed UI).

### F50 · Trial balance, balance sheet and income statement · P1

Generate statements from the same ledger and period rules; debit equals credit and assets equal liabilities plus equity; expose unresolved opening-balance differences.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=accounting/trial_balance) (Observed UI).

### F51 · Cash, bank and M-Pesa reconciliation · P0

Match each settlement to a payment exactly once; retain unmatched items, fees and variance; branch/register collection totals tie to the payment ledger.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=accounting/bank_reconciliation) (Observed UI).

### F52 · Configurable expenses and other income · P1

Add user-defined categories, payment source, branch, attachments and approval; keep sales-derived income separate from manually entered other income.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/expenses.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=accounting/entry) (Observed UI).

### F53 · Financial exports and report catalogue · P1

Offer permission-scoped CSV/Excel and print outputs for sales, payments, aging, stock, returns and branch summaries with consistent filters and totals.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/analytics.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=reports/sales) (Observed UI).

### F54 · Granular configurable permissions · P0

Separate cashier, pharmacist, branch manager, purchaser, accountant and owner privileges; require specific grants for price overrides, refunds, stock changes and exports.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/authz.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=users/permission_list) (Observed UI).

### F55 · Approval queues and actionable exceptions · P1

Show pending transfers, GRNs, returns, large discounts and reconciliation variances with ownership, age, review evidence and decision audit.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/nav-badge-counts.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/sales_returns_list) (Returns/GRN approval UI; unified queue proposed).

### F56 · Staff directory and payroll profiles · P2

Maintain employee records linked to user and branch, salary details and employment state; payroll access is separately restricted.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=payroll/employees) (Observed UI).

### F57 · Payroll allowances, deductions and advances · P2

Version allowance/deduction rules by period, track advance balances and repayment; validate applicable Kenyan payroll rules before production use.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=payroll/assign_allow_deduct) (Observed UI).

### F58 · Payroll runs, payslips and payment ledger · P2

Approve one payroll per period, produce payslips and exports, record partial disbursements and outstanding amounts, and prevent duplicate runs/payments.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=payroll/payroll_report) (Observed UI).

### F59 · Internal support tickets · P2

Create ticket with assignee, priority, attachment and threaded history; show pending items and permissions without sending messages automatically.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/prisma/schema.prisma) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=ticketing/tickets) (Observed UI).

### F60 · Correct M-Pesa callback and confirmation lifecycle · P0

A failed callback remains failed; success extracts and verifies amount/receipt and updates the linked Payment atomically; duplicate callbacks are harmless.

Baseline: Incomplete. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/app/api/mpesa/callback/route.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/mpesa_settings) (Configuration UI only; gateway not validated).

### F61 · Tenant/branch-specific gateway configuration · P0

Scope business numbers and secure credential references to the owning tenant/branch; use the chosen environment in actual requests; never expose secrets in UI responses.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/mpesa/daraja.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=settings/mpesa_settings) (Observed UI).

### F62 · eTIMS submission and credit-note lifecycle · P0

Implement queued submission, acknowledgment, retries, reconciliation and credit-note linkage; validate official current KRA integration requirements before specifying production acceptance.

Baseline: Schema only. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=about) (Not observed in inspected menus).

### F63 · True offline selling and safe synchronization · P1

Persist supported transactions locally, show pending sync, deduplicate on reconnect and resolve stock conflicts; define supported tenders and protect data on logout/device loss.

Baseline: Schema/cache only. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/public/sw.js) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=about) (Not verified).

### F64 · Safe retries and document numbering · P0

Use idempotency keys and concurrency-safe document sequences per scope; retrying checkout, GRN or transfer cannot duplicate stock, payment or numbering effects.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/sales.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=sales/pos) (Not validated; launch requirement).

### F65 · Structured pharmacist review and clinical safety · P1

Retain doctor-to-pharmacist-to-cashier handoff; capture structured allergies and review decisions; use validated clinical evidence and overrides rather than treating AI text as clearance.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/components/consultations/consultation-safety-check.tsx) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=about) (Prescription manager claimed; comparable workflow not observed).

### F66 · Expiry loss prevention and branch redistribution · P1

Rank batches at risk by expiry, quantity, demand and value; suggest branch transfers or supplier returns with review before execution.

Baseline: Partial. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/lib/actions/dashboard.ts) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=purchases/expiry) (Expiry monitor observed; redistribution proposed).

### F67 · Fast onboarding, migration and release proof · P1

Import opening batches, balances, suppliers and patients with a reconciliation report; validate critical workflows with two-branch acceptance scenarios and recovery drills.

Baseline: Missing. [Local evidence](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/README.md) · [Competitor screen](https://pharmapos.jisoftapps.cc/?page=inventory/product_list) (Catalog import observed; wider migration proposed).

## Potential schemas and relationships

The [schema and relationship blueprint](/Users/bennyworld/Desktop/CodeManyatta/personal/pharmacy_system/docs/research/pharmacy-schema-blueprint-2026-10-12.md) expands this review into proposed model fields, cardinalities, constraints, relationship diagrams and migration order. It distinguishes inferred PharmaPOS workflow patterns from recommended designs; no competitor database was accessed.

The principal design patterns are:

- Organization → Branch → Store → StockLocation, with explicit user access joins.
- Drug → DrugBatch for lot identity, separated from BatchLocationBalance and receipt cost layers.
- StockTransfer → dispatch allocations → partial receipts, retaining lot, location and acquisition cost.
- PurchaseOrderLine ↔ GoodsReceiptLine ↔ SupplierBillLine through quantity/value allocations.
- Patient clinical identity separate from CustomerAccount payer identity; settlement receipts allocate across invoices.
- SaleLine → original lot/cost allocations → return dispositions, credits and refunds.
- Immutable journals, verified webhook events, reservations and idempotent document posting.

The blueprint preserves existing insurance, consultation and dispensing models and identifies where existing SupplierBill, SupplierPayment, Sale, Payment and DrugBatch should evolve rather than be duplicated. It is a design artifact; no operational Prisma schema or database was changed.

## Guidance and release sequence

### Release 1 — Branch operations and launch correctness

Build branch/store/location scope and staff permissions first; migrate the current organization to one default branch/store. Add batch-location balances, reservations and safe transfer dispatch/receipt. Then complete units, tax classes, immutable costs, payment confirmation, cash registers, returns, direct receiving and POs/GRNs. Reconcile all totals and validate the current eTIMS integration requirements before release.

### Release 2 — Owner control and workflow depth

Add customer credit and statements, procurement matching, supplier aging, a balanced accounting ledger and statements, exports, payment-channel recording, reminder delivery, demand-based replenishment and operational exception queues. Ship offline checkout only after duplicate prevention and inventory conflict handling are proven.

### Release 3 — Retention and optional back office

Add quotations, loyalty, corporate billing refinements, catalog media and hierarchy, payroll and internal ticketing. Payroll can be an integration instead of a native engine if pharmacy owners prefer an existing accountant/payroll tool.

### Architecture implications

Proposed dependency order: Organization → Branch → Store → Location; shared Drug and DrugBatch lot identity → BatchLocationBalance and StockReservation → Transfer/TransferLine/TransferReceipt → PurchaseOrder/GRN/SupplierInvoiceLine → SaleReturn/CreditNote and customer accounts → Journal/JournalLine. Every monetary/stock document needs organization, branch, actor, timestamp, source reference, status, immutable snapshots and an idempotency key. Existing data should migrate to a default branch and store, with totals reconciled before enabling more branches. Separate permissions for clinical records, financial records and branch inventory. Store immutable movement deltas rather than relying on editable quantity fields for historical reconstruction.

### Release proof scenarios

- **Branch and transfer:** Receive 100 tablets of batch B1 at Branch A. Dispatch 20 to Branch B. Until receipt, A available is 80 and B sellable is 0; transit is 20. Receive 18 and retain a discrepancy of 2. Replaying receipt changes nothing. Organization stock still totals 100 until an authorized discrepancy write-off.
- **Units and expiry:** Receive one pack of 100, sell six units from the earliest usable batch, and return two approved units to quarantine. Available sellable quantity is 94 until review; expiry and cost remain attached to the lot.
- **Payments:** A failed M-Pesa callback cannot complete payment or clear debt; successful callbacks reconcile receipt and amount. Replaying the same callback produces no additional payment or accounting entry.
- **Cost and margin:** Sell at net price 100 from a batch costing 60. Updating that batch to cost 70 later leaves the earlier gross profit at 40. Tax and returned quantities are accounted for separately.
- **Ledger and refunds:** Every posted document creates balanced journals. A partial approved return credits only eligible quantities and reverses the appropriate revenue, tax, cost and payment/receivable effects.
- **Permissions:** A staff member assigned only to Branch A cannot view, modify or export Branch B records through direct URLs, server actions or report queries.

### Positioning and discovery

**Say:** We are building pharmacy workflow and branch inventory control around traceable payments, safe dispensing and reconciled owner reports. Do not claim deployed superiority until these workflows have passed acceptance tests.

**Clarify with pharmacy owners:** Which transfers need receiving approval? Do they sell loose tablets and wholesale packs? How often do they sell on customer credit? What do they use for accounting/payroll? Which insurer or fiscal integrations need production proof?

**Prove:** Demonstrate a two-branch transfer, failed/replayed payment callback, partial return, immutable margin report and a balanced daily close. These are proposed proof scenarios, not completed tests.

## What not to overclaim

- A visible module does not prove correct execution, a certified integration or production availability.
- An unobserved competitor clinical/offline/eTIMS workflow is unknown, not confirmed absent.
- Our schema and source code establish implementation presence, not deployment success or production readiness.
- Do not use the competitor’s About-page encryption or legal-compliance wording as verified evidence.
- This report does not determine Kenyan tax classifications, payroll deductions, privacy obligations or KRA integration rules. Validate current official requirements and domain review before implementing those acceptance details.
- Sequential browser automation was used as requested; no throttling or anti-bot guarantee is implied.

## Sources and coverage

Controlling sources: the user-provided PharmaPOS account and URL, plus this repository’s Prisma schema, server actions, routes, components and service worker. Knowledge & Files was satisfied by the local repository. CRM, internal messaging, transcripts and sales-intelligence providers were not relevant to this product comparison; no external account data was requested.

Inspected all module menu groups: POS; Manage Sales; Drugs Inventory; Purchase Orders; Customers; Suppliers; Expense Center (same Add Expense/Income page as Accounts); Payroll & HR; Finance & Accounts; Reports; Users; SMS & Emails; Company Settings; About; internal ticketing. Ninety distinct menu-linked page URLs plus dashboard were inspected. Initial asynchronous table reads sometimes showed loading/empty states, so report controls and labels are stronger evidence than transaction results. External Staff Mail, SMS Portal and hosting portal were outside the PharmaPOS review scope. Detail forms dependent on creating a PO/customer/transaction were not exercised. No credentials or raw customer records are included in the deliverables.

### Useful primary screen references

- [settings/manage_branches](https://pharmapos.jisoftapps.cc/?page=settings/manage_branches)
- [settings/manage_stores](https://pharmapos.jisoftapps.cc/?page=settings/manage_stores)
- [settings/store_types](https://pharmapos.jisoftapps.cc/?page=settings/store_types)
- [users/create_user](https://pharmapos.jisoftapps.cc/?page=users/create_user)
- [inventory/transfer_stock](https://pharmapos.jisoftapps.cc/?page=inventory/transfer_stock)
- [reports/business_snapshot](https://pharmapos.jisoftapps.cc/?page=reports/business_snapshot)
- [inventory/unit_conversion](https://pharmapos.jisoftapps.cc/?page=inventory/unit_conversion)
- [inventory/units](https://pharmapos.jisoftapps.cc/?page=inventory/units)
- [inventory/stock_reconcile](https://pharmapos.jisoftapps.cc/?page=inventory/stock_reconcile)
- [reports/stock_take](https://pharmapos.jisoftapps.cc/?page=reports/stock_take)
- [inventory/stock](https://pharmapos.jisoftapps.cc/?page=inventory/stock)
- [inventory/stock_movement](https://pharmapos.jisoftapps.cc/?page=inventory/stock_movement)
- [purchases/expiry](https://pharmapos.jisoftapps.cc/?page=purchases/expiry)
- [inventory/add_products](https://pharmapos.jisoftapps.cc/?page=inventory/add_products)
- [inventory/manage_taxes](https://pharmapos.jisoftapps.cc/?page=inventory/manage_taxes)
- [inventory/product_categories](https://pharmapos.jisoftapps.cc/?page=inventory/product_categories)
- [inventory/manufacturers](https://pharmapos.jisoftapps.cc/?page=inventory/manufacturers)
- [inventory/product_types](https://pharmapos.jisoftapps.cc/?page=inventory/product_types)
- [inventory/product_list](https://pharmapos.jisoftapps.cc/?page=inventory/product_list)
- [purchases/add_supplier](https://pharmapos.jisoftapps.cc/?page=purchases/add_supplier)
- [purchases/add_purchase_order](https://pharmapos.jisoftapps.cc/?page=purchases/add_purchase_order)
- [purchases/manage_purchase_orders](https://pharmapos.jisoftapps.cc/?page=purchases/manage_purchase_orders)
- [purchases/create_grn](https://pharmapos.jisoftapps.cc/?page=purchases/create_grn)
- [purchases/items_invoice](https://pharmapos.jisoftapps.cc/?page=purchases/items_invoice)
- [purchases/purchase_invoice](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_invoice)
- [purchases/purchase_returns](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_returns)
- [purchases/purchase_payments](https://pharmapos.jisoftapps.cc/?page=purchases/purchase_payments)
- [sales/sales_register](https://pharmapos.jisoftapps.cc/?page=sales/sales_register)
- [sales/create_invoice](https://pharmapos.jisoftapps.cc/?page=sales/create_invoice)
- [sales/customer_statement](https://pharmapos.jisoftapps.cc/?page=sales/customer_statement)
- [sales/manage_quotations](https://pharmapos.jisoftapps.cc/?page=sales/manage_quotations)
- [sales/sales_returns_list](https://pharmapos.jisoftapps.cc/?page=sales/sales_returns_list)
- [sales/cancelled_sales](https://pharmapos.jisoftapps.cc/?page=sales/cancelled_sales)
- [reports/payments](https://pharmapos.jisoftapps.cc/?page=reports/payments)
- [sales/pos](https://pharmapos.jisoftapps.cc/?page=sales/pos)
- [customers/manage_loyalty](https://pharmapos.jisoftapps.cc/?page=customers/manage_loyalty)
- [customers/add_customer](https://pharmapos.jisoftapps.cc/?page=customers/add_customer)
- [settings/send_bulk_sms](https://pharmapos.jisoftapps.cc/?page=settings/send_bulk_sms)
- [settings/invoice_due_sms](https://pharmapos.jisoftapps.cc/?page=settings/invoice_due_sms)
- [about](https://pharmapos.jisoftapps.cc/?page=about)
- [sales/sales_audit](https://pharmapos.jisoftapps.cc/?page=sales/sales_audit)
- [accounting/income_statement](https://pharmapos.jisoftapps.cc/?page=accounting/income_statement)
- [accounting/journal_entry](https://pharmapos.jisoftapps.cc/?page=accounting/journal_entry)
- [accounting/trial_balance](https://pharmapos.jisoftapps.cc/?page=accounting/trial_balance)
- [accounting/bank_reconciliation](https://pharmapos.jisoftapps.cc/?page=accounting/bank_reconciliation)
- [accounting/entry](https://pharmapos.jisoftapps.cc/?page=accounting/entry)
- [reports/sales](https://pharmapos.jisoftapps.cc/?page=reports/sales)
- [users/permission_list](https://pharmapos.jisoftapps.cc/?page=users/permission_list)
- [payroll/employees](https://pharmapos.jisoftapps.cc/?page=payroll/employees)
- [payroll/assign_allow_deduct](https://pharmapos.jisoftapps.cc/?page=payroll/assign_allow_deduct)
- [payroll/payroll_report](https://pharmapos.jisoftapps.cc/?page=payroll/payroll_report)
- [ticketing/tickets](https://pharmapos.jisoftapps.cc/?page=ticketing/tickets)
- [settings/mpesa_settings](https://pharmapos.jisoftapps.cc/?page=settings/mpesa_settings)

### Confidence and gaps

High confidence in the identified schema/workflow gaps and explicitly cited callback behavior. Moderate confidence in competitor functional breadth because this was read-only and some modules had no demo transactions. Competitive clinical, offline, compliance and live payment capabilities remain unverified. Our application was not started or transaction-tested; no app code was changed.

Next useful refinement: validate the smallest uncertain workflow with an isolated, authorized test account and convert Release 1 items into implementation tickets with estimates.


Artifact verification: source links, 67 requirement IDs, embedded CSS and required sections were checked. Visual rendering was not completed because local file browser navigation is blocked and the sandbox prevented a local preview server.
