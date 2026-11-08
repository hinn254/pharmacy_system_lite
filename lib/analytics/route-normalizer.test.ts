import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAnalyticsRoute, routeAccess } from "./route-normalizer";

test("removes query strings and fragments", () => {
  assert.equal(normalizeAnalyticsRoute("/inventory/batches?q=secret#row"), "/inventory/batches");
});

test("replaces sensitive record identifiers with route parameters", () => {
  assert.equal(normalizeAnalyticsRoute("/patients/abc123"), "/patients/[patientId]");
  assert.equal(normalizeAnalyticsRoute("/consultations/case123/prescription"), "/consultations/[caseId]/prescription");
  assert.equal(normalizeAnalyticsRoute("/pos/receipt/sale-secret/labels"), "/pos/receipt/[saleId]/labels");
  assert.equal(normalizeAnalyticsRoute("/admin/insurers/invoices/claim-secret/print"), "/admin/insurers/invoices/[invoiceId]/print");
});

test("distinguishes public and authenticated routes", () => {
  assert.equal(routeAccess("/register"), "public");
  assert.equal(routeAccess("/dashboard"), "authenticated");
});
