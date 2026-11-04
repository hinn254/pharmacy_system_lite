# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pharmacy owners and their teams in Kenya. Owners need to set up and understand the business; cashiers, pharmacy technologists, doctors, and administrators need focused workflows for selling, dispensing, consulting, controlling stock, and managing operations.

## Product Purpose

Pharmacy OS brings the commercial and clinical work of a pharmacy into one business workspace. A pharmacy owner can create a business account publicly, then invite staff into role-appropriate workflows. Success means the team can sell, dispense, track stock and expiry, serve patients, manage payers and suppliers, and understand business performance without stitching together separate tools.

## Positioning

Pharmacy OS connects the full path from buying and batch-level inventory through selling, dispensing, payment, insurance, compliance, and reporting. It is designed around pharmacy operations rather than adapted from a generic retail point of sale.

## Operating Context

- Counter sales and dispensing, including cash, M-Pesa, and insurance payments.
- Batch-level stock control with expiry dates and FEFO allocation.
- Patient, prescription, consultation, and medication-order workflows.
- Supplier bills and payments, expenses, insurer invoices, and sales reporting.
- Role-specific work for owners, administrators, cashiers, pharmacy technologists, and doctors.
- Kenyan operating needs including KRA eTIMS data, M-Pesa, and insurance administration.

## Capabilities and Constraints

- Public signup creates a new pharmacy and its owner-administrator account.
- Staff join an existing pharmacy by invitation; each account is scoped to its assigned pharmacy.
- Inventory supports drugs, batches, expiry monitoring, low-stock signals, and FEFO selling.
- Sales supports receipts, dispensing labels, prescriptions, multiple payment methods, and role-separated cashier and dispensing queues.
- The product includes patient and consultation workflows, finance reporting, supplier payables, insurance schemes and invoicing, audit history, and role-based access.
- The product includes an AI assistant intended to make common selling, stock, and purchasing questions easier to answer.
- A client-facing pharmacy website is part of the product offering; its exact public ordering and fulfillment scope remains an implementation-dependent decision.
- Google sign-in, magic links, email invitations, and administrator authenticator-app 2FA are planned authentication upgrades, not current landing-page claims.

## Brand Commitments

- Product name: Pharmacy OS.
- Voice: clear, calm, operationally credible, and grounded in how pharmacies actually work.
- Avoid unsupported claims about customer counts, revenue uplift, regulatory certification, uptime, or integrations that are not production-ready.

## Evidence on Hand

- Seeded demonstration data and accounts in `prisma/seed.ts`.
- Working dashboard, point of sale, dispensing, inventory, patients, consultations, insurer, supplier, finance, settings, and user-management routes under `app/(dashboard)`.
- AI assistant interface in `components/pharmacy-assistant.tsx` and API route in `app/api/ai/chat/route.ts`.
- eTIMS fields and status tracking in `prisma/schema.prisma`.
- No testimonials, customer logos, adoption metrics, pricing, or certification assets are currently available and they must not be fabricated.

## Product Principles

1. Follow the medicine from purchase to patient, not just the payment at the counter.
2. Make the safe next action obvious to every role.
3. Turn stock, sales, and finance data into decisions an owner can act on.
4. Fit Kenyan pharmacy workflows without making unsupported compliance promises.
5. Keep each pharmacy's people and operational data isolated from every other business.

## Accessibility & Inclusion

The web experience should remain keyboard accessible, responsive, readable at common browser zoom levels, and clear without relying on color alone.
