export type FeatureSlug =
  | "pharmacy-pos"
  | "inventory-management"
  | "mpesa-payments"
  | "insurance-management"
  | "consultations"
  | "pharmacy-analytics";

export type FeaturePage = {
  slug: FeatureSlug;
  navLabel: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  image: string;
  imageAlt: string;
  imageAspect?: "wide";
  imageFit?: "contain";
  imageCrop?: "pos" | "insurance" | "analytics-report";
  secondaryImage?: string;
  secondaryImageAlt?: string;
  secondaryImageCrop?: "analytics-dashboard";
  proof: string[];
  sections: Array<{ title: string; body: string; points: string[] }>;
  decisionTitle: string;
  decisionBody: string;
  related: FeatureSlug[];
};

export const featurePages: Record<FeatureSlug, FeaturePage> = {
  "pharmacy-pos": {
    slug: "pharmacy-pos",
    navLabel: "Pharmacy POS",
    title: "Pharmacy POS System Kenya",
    description:
      "Run a pharmacy-specific POS with medicine search, patient and prescription context, FEFO batch allocation, receipts, labels, cash, M-Pesa and insurance workflows.",
    h1: "A pharmacy POS that carries the clinical detail through checkout.",
    intro:
      "Pharmacy OS is built for the moment when a medicine, patient, prescription, price, batch and payment method must come together. Your team can move quickly at the counter without reducing a pharmacy sale to a generic retail transaction.",
    image: "/product/feature-pos.png",
    imageAlt:
      "Pharmacy OS point of sale showing an Amoxicillin search result with batch, expiry, cash, M-Pesa, and insurance payment choices",
    imageAspect: "wide",
    imageCrop: "pos",
    proof: [
      "Search or scan medicines",
      "Cash, M-Pesa and insurance",
      "FEFO batch allocation",
      "Receipts and dispensing labels",
    ],
    sections: [
      {
        title: "Keep the sale connected to the patient and prescription.",
        body:
          "A cashier can attach patient and prescription context while building the sale. That context stays available for the dispensing trail instead of being reconstructed from a paper note after payment.",
        points: ["Patient-aware checkout", "Prescription references", "Retail and scheme pricing"],
      },
      {
        title: "Move the appropriate stock, not just a product count.",
        body:
          "Pharmacy OS works with inventory batches and expiry dates. FEFO allocation helps the team issue stock by the earliest suitable expiry while retaining the batch movement behind the receipt.",
        points: ["Batch-level stock", "Expiry-aware FEFO", "Traceable stock movements"],
      },
      {
        title: "Separate cashier speed from dispensing control.",
        body:
          "Role-specific cashier and dispensing queues let payment and medicine preparation remain connected without forcing every staff member into the same workspace or administrative controls.",
        points: ["Cashier queue", "Dispensing workflow", "Role-based access"],
      },
    ],
    decisionTitle: "Choose a POS around the medicine journey.",
    decisionBody:
      "When comparing a chemist POS in Kenya, ask what happens after the total is calculated: which batch moves, where the prescription goes, how the payer is recorded, and what the owner can trace later.",
    related: ["inventory-management", "mpesa-payments", "insurance-management"],
  },
  "inventory-management": {
    slug: "inventory-management",
    navLabel: "Inventory",
    title: "Pharmacy Inventory Management Software Kenya",
    description:
      "Track pharmacy stock by batch, expiry date, supplier and reorder level. Use FEFO, low-stock signals, expiry monitoring and movement history in one workspace.",
    h1: "Know which medicine is in stock, which batch will move, and what needs attention next.",
    intro:
      "A pharmacy stock figure is only useful when the team can see the batch, expiry, supplier and movement behind it. Pharmacy OS turns inventory into a daily control system for receiving, selling, replenishing and reviewing medicines.",
    image: "/product/inventory.jpg",
    imageAlt:
      "Pharmacy OS inventory showing medicine batches, expiry dates, quantities, low-stock status and suppliers",
    proof: ["Batch and expiry tracking", "Low-stock signals", "Supplier records", "Fast and slow movers"],
    sections: [
      {
        title: "Receive stock with the details you will need later.",
        body:
          "Record the medicine, batch number, expiry date, supplier, quantity and unit cost at receipt. Those details remain attached to later stock movement and reporting.",
        points: ["Supplier and purchase reference", "Batch quantity and cost", "Expiry date at receipt"],
      },
      {
        title: "Turn expiry and reorder data into a working watch list.",
        body:
          "Low-stock and expiry signals help the team focus on items that need a decision. FEFO at checkout then connects that inventory control to the medicine leaving the shelf.",
        points: ["Configurable reorder levels", "Expiry monitoring", "FEFO selling"],
      },
      {
        title: "Buy with evidence from actual movement.",
        body:
          "Fast- and slow-mover views make it easier to identify what is selling, what is sitting, and where purchasing attention belongs before the next supplier order.",
        points: ["Movement history", "Fast movers", "Slow movers"],
      },
    ],
    decisionTitle: "Inventory control starts below the product total.",
    decisionBody:
      "When evaluating pharmacy inventory software, check whether it can explain the stock number by batch and expiry—not merely show a single quantity beside the medicine name.",
    related: ["pharmacy-pos", "pharmacy-analytics", "insurance-management"],
  },
  "mpesa-payments": {
    slug: "mpesa-payments",
    navLabel: "M-Pesa",
    title: "M-Pesa Pharmacy POS Kenya",
    description:
      "Keep M-Pesa payment method, reference and status connected to the pharmacy sale alongside cash and insurance payment workflows.",
    h1: "Keep the M-Pesa payment connected to the sale it settled.",
    intro:
      "Pharmacy OS brings M-Pesa into the same checkout record as the medicines, patient, cashier and receipt. The goal is a payment trail your team can follow—not a separate message that must be matched to a sale later.",
    image: "/product/pos.jpg",
    imageAlt:
      "Pharmacy OS checkout with M-Pesa available alongside cash and insurance payment methods",
    proof: ["M-Pesa at checkout", "Payment references", "Payment status", "Sale-linked records"],
    sections: [
      {
        title: "Choose M-Pesa inside the pharmacy checkout.",
        body:
          "The cashier selects the payment method while completing the same sale. M-Pesa does not become a disconnected note outside the transaction that changed stock and produced the receipt.",
        points: ["One checkout flow", "Sale and payer context", "Receipt trail"],
      },
      {
        title: "Retain the reference and payment state.",
        body:
          "Payment references and statuses remain available with the transaction. This supports follow-up when a payment needs confirmation without implying that every external exception is automatically resolved.",
        points: ["Reference capture", "Status visibility", "Manual confirmation workflow"],
      },
      {
        title: "See payment in the wider operating record.",
        body:
          "Because checkout, stock movement and reporting share the same workspace, owners can review payment activity in the context of the sale rather than comparing separate till and inventory systems.",
        points: ["Connected sales record", "Stock movement context", "Operational reporting"],
      },
    ],
    decisionTitle: "Ask what happens when a payment is not straightforward.",
    decisionBody:
      "A useful M-Pesa pharmacy POS should show how references, pending or confirmed states, manual records and the final receipt remain connected. Exact provider behavior depends on the configured production environment.",
    related: ["pharmacy-pos", "pharmacy-analytics", "insurance-management"],
  },
  "insurance-management": {
    slug: "insurance-management",
    navLabel: "Insurance",
    title: "Pharmacy Insurance Claims Software Kenya",
    description:
      "Manage insurance schemes, member details, scheme pricing, pharmacy claims and insurer invoices from the same sale and dispensing workflow.",
    h1: "Carry an insured sale from scheme pricing to insurer invoice.",
    intro:
      "Insurance work begins before the claim is grouped. Pharmacy OS keeps the scheme, member, price, medicines and payment context connected from checkout through unsettled claims and insurer invoicing.",
    image: "/product/feature-insurance.png",
    imageAlt: "Pharmacy OS insurance workspace showing active schemes and pending claims by insurer",
    imageAspect: "wide",
    imageFit: "contain",
    imageCrop: "insurance",
    proof: ["Scheme-specific pricing", "Member details", "Claims workflow", "Insurer invoices"],
    sections: [
      {
        title: "Capture the payer context at the point of sale.",
        body:
          "Select the insurance scheme, retain member details and apply the appropriate price while the medicines and patient are still in front of the cashier.",
        points: ["Scheme selection", "Member information", "Insurance pricing"],
      },
      {
        title: "Keep unsettled claims visible after checkout.",
        body:
          "An insured sale remains part of the insurance workflow instead of disappearing into general sales. Teams can review claim records and the detail needed for follow-up.",
        points: ["Claim status", "Sale detail", "Payer traceability"],
      },
      {
        title: "Group claim lines into insurer invoices.",
        body:
          "Pharmacy OS supports insurer invoicing from eligible claims, helping administration move from individual transactions to a payer-level financial record.",
        points: ["Invoice grouping", "Claim line detail", "Payment history"],
      },
    ],
    decisionTitle: "Evaluate the entire payer trail, not one insurance field.",
    decisionBody:
      "Ask whether a system connects scheme pricing, member details, claim status, invoice lines and payments. Pharmacy OS supports that administrative trail without claiming to replace an insurer’s own approval process.",
    related: ["pharmacy-pos", "pharmacy-analytics", "consultations"],
  },
  consultations: {
    slug: "consultations",
    navLabel: "Consultations",
    title: "Pharmacy Consultation Software Kenya",
    description:
      "Connect pharmacy consultations, patients, medication orders, prescriptions, cashier checkout and dispensing in one role-aware workflow.",
    h1: "Move from consultation to medication order without losing the care context.",
    intro:
      "Pharmacy OS gives doctors, pharmacy technologists and cashiers role-appropriate steps inside one workspace. Patient, encounter and medication-order context can move forward instead of being re-entered at each handoff.",
    image: "/product/consultations.png",
    imageAlt:
      "Pharmacy OS consultation workspace showing patient cases moving from intake to doctor, pharmacy technologist and cashier",
    proof: ["Patient records", "Consultation cases", "Medication orders", "Role-specific handoffs"],
    sections: [
      {
        title: "Organize the consultation around a patient case.",
        body:
          "Record the encounter and its clinical context against the patient. The consultation remains a distinct workflow while still belonging to the same pharmacy operation.",
        points: ["Patient-linked cases", "Encounter records", "Doctor assignment"],
      },
      {
        title: "Send medication decisions into the next queue.",
        body:
          "Medication orders can move from the consultation toward cashier and dispensing work, reducing the need to recreate medicine instructions from a separate system.",
        points: ["Medication orders", "Cashier handoff", "Dispensing handoff"],
      },
      {
        title: "Give each role the controls it needs.",
        body:
          "Doctors, pharmacy technologists, cashiers and administrators work through role-specific areas. Clinical and commercial work stays connected without exposing every administrative control to every user.",
        points: ["Doctor workspace", "Pharm-tech workflow", "Role-based access"],
      },
    ],
    decisionTitle: "Look closely at the handoffs between people.",
    decisionBody:
      "The value of consultation software is not only the encounter form. Check how the patient, medication decision, price, payment and dispensing record move between roles after the consultation ends.",
    related: ["pharmacy-pos", "insurance-management", "pharmacy-analytics"],
  },
  "pharmacy-analytics": {
    slug: "pharmacy-analytics",
    navLabel: "Analytics",
    title: "Pharmacy Analytics and Reporting Kenya",
    description:
      "Review pharmacy sales, stock health, expiry, fast and slow movers, expenses, payables and finance from connected operational records.",
    h1: "See the operating decisions behind the pharmacy numbers.",
    intro:
      "Pharmacy OS reporting starts with connected sales, batches, payments, suppliers and expenses. Owners can move from a summary to the operational record that changed it instead of reconciling separate tools first.",
    image: "/product/feature-analytics-report.png",
    imageAlt:
      "Pharmacy OS analytics report showing revenue, transactions, stock usage and payment breakdown",
    secondaryImage: "/product/feature-analytics-dashboard.png",
    secondaryImageAlt:
      "Pharmacy OS operational dashboard showing low stock, expiring batches, fast movers and slow movers",
    imageFit: "contain",
    imageCrop: "analytics-report",
    secondaryImageCrop: "analytics-dashboard",
    proof: ["Sales reporting", "Stock health", "Fast and slow movers", "Finance visibility"],
    sections: [
      {
        title: "Review sales in the context of stock and payment.",
        body:
          "Sales reporting remains connected to medicine lines, payment method and stock movement. That gives owners a clearer trail when a number needs investigation.",
        points: ["Sales summaries", "Payment-method context", "Transaction detail"],
      },
      {
        title: "Make stock health visible before it becomes urgent.",
        body:
          "Low stock, expiry watch, fast movers and slow movers bring different inventory decisions into one operating view: replenish, rotate, reduce or investigate.",
        points: ["Low-stock watch", "Expiry signals", "Movement insight"],
      },
      {
        title: "Bring supplier and finance activity into the owner view.",
        body:
          "Expenses, supplier bills and payments, insurer invoices and sales reporting provide a broader picture of the work around the till total.",
        points: ["Expenses", "Supplier payables", "Insurer invoices"],
      },
    ],
    decisionTitle: "Reporting is strongest when the source records agree.",
    decisionBody:
      "Before comparing dashboards, compare the operational links underneath them. Pharmacy OS is designed so selling, stock, payer and finance records can be followed through one pharmacy workspace.",
    related: ["inventory-management", "pharmacy-pos", "insurance-management"],
  },
};

export const featureSlugs = Object.keys(featurePages) as FeatureSlug[];
