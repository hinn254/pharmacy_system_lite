---
name: Pharmacy OS
description: A calm, operational marketing system for connected pharmacy work in Kenya.
colors:
  pharmacy-ground: "#f4f8f6"
  paper: "#ffffff"
  operational-green: "#006b5d"
  operational-green-hover: "#00594e"
  deep-workspace: "#0e2e28"
  footer-green: "#0a241f"
  ink: "#102521"
  body-green: "#526a64"
  navigation-green: "#49635d"
  quiet-green: "#617871"
  rule-green: "rgb(23 58 51 / 0.15)"
  proof-mint: "#72ddc9"
  check-green: "#008c78"
  hover-wash: "#eaf3f0"
  error: "#9b2c2c"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7778
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  control: "0.5rem"
  frame-inner: "0.75rem"
  frame-outer: "1rem"
spacing:
  control-x: "1.5rem"
  section-mobile: "5rem"
  section-wide: "7rem"
  page-mobile: "1.25rem"
  page-tablet: "2rem"
  page-wide: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.operational-green}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.operational-green-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
    height: "3rem"
  proof-strip:
    backgroundColor: "{colors.deep-workspace}"
    textColor: "{colors.paper}"
  screenshot-frame:
    backgroundColor: "{colors.deep-workspace}"
    rounded: "{rounded.frame-outer}"
    padding: "0.625rem"
---

# Design System: Pharmacy OS

## Overview

**Creative North Star: "The Connected Pharmacy Ledger"**

Pharmacy OS presents operational evidence with the composure of a well-run dispensary: pale green breathing room, deep green working surfaces, concise editorial type, and real product screens that show the system rather than decorate it. The public experience is persuasive because it follows one credible workflow from medicine and patient context through payment, stock movement, and reporting.

This is an established-world extension of the product, not a separate campaign identity. Marketing pages use the same calm green authority as the application while increasing scale, whitespace, and narrative rhythm. Copy stays specific to repository-backed capabilities and never substitutes generic growth claims for product evidence.

**Key Characteristics:**

- Real Pharmacy OS screenshots are the focal evidence.
- Pale green ground alternates with deep operational surfaces and white reading sections.
- Large, tightly tracked Geist headings create an editorial voice without introducing a separate display face.
- Thin dividers and connected workflow links organize long pages more often than standalone cards.
- Registration and shared-demo actions remain visible, concrete, and paired with honest context.

## Colors

The palette is a restrained pharmacy green spectrum: quiet enough for long reading, decisive enough for workflow proof and action.

### Primary

- **Operational Green:** The principal action, link, brand-mark, and active emphasis color.
- **Deep Workspace Green:** The evidence surface for proof strips, pricing emphasis, workflow calls to action, and screenshot framing.

### Secondary

- **Proof Mint:** A light accent reserved for checks, labels, and calls to action on deep green surfaces.
- **Check Green:** A compact semantic accent for confirmed capabilities and ordered workflow steps.

### Neutral

- **Pharmacy Ground:** The default public-page background, warmer and calmer than plain white.
- **Paper:** Reading sections, secondary controls, and the inner surface behind product screenshots.
- **Ink:** Primary copy and headline color.
- **Body Green:** Long-form explanatory copy.
- **Navigation Green:** Quiet navigation and supporting labels.
- **Rule Green:** Low-contrast dividers that structure content without boxing every section.

**The Operational Contrast Rule.** Deep green is used for workflow evidence and decision moments; it is not a decorative fill scattered across the page.

**The Mint-on-Deep Rule.** Proof Mint belongs on deep operational surfaces. On pale or white surfaces, use Operational Green or Check Green for emphasis.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui, sans-serif fallback)
**Body Font:** Geist (with ui-sans-serif, system-ui, sans-serif fallback)
**Label/Mono Font:** Geist for labels; Geist Mono is available for application data but is not a marketing-page motif.

**Character:** The system gets its editorial quality from scale, line breaks, compact leading, and negative tracking rather than a decorative typeface. Body copy stays open and legible, balancing the density of the workflows being described.

### Hierarchy

- **Display** (600, responsive 3–3.75rem, 1.02 line-height): one primary proposition per page; balance lines and keep the measure controlled.
- **Headline** (600, responsive 1.875–2.25rem, approximately 1.1 line-height): section decisions and workflow stages.
- **Title** (600, 1.125–1.5rem): related workflows, step titles, and concise component headings.
- **Body** (400, 1–1.125rem, 1.75–2rem line-height): explanatory product truth, normally constrained to a readable column.
- **Label** (600, 0.875rem): navigation, buttons, breadcrumbs, plan names, and proof statements.

**The Scale-Not-Ornament Rule.** Build hierarchy with size, weight, tracking, and whitespace; do not introduce decorative display lettering for public pages.

## Layout

Marketing pages use centered containers up to 80rem, with narrower 64–72rem reading and pricing measures where appropriate. Page gutters progress from 1.25rem on mobile to 2rem on small screens and 2.5rem on large screens. Primary sections typically use 5rem vertical padding on compact screens and up to 7rem on wider screens.

At large breakpoints, hero content pairs a slightly narrower message column with a wider product screenshot. Editorial sections use asymmetric two-column grids so a decision headline can sit beside evidence and details. Proof summaries become two or four columns, while workflow links become three connected columns separated by rules.

At approximately 390px, all major grids linearize. The public header wraps into two rows: brand and registration action first, then a full-width three-column navigation grid. Hero actions stack full-width, product evidence follows the copy, and bordered rows replace multi-column comparisons. The mobile sequence must preserve proposition, benefit, action, and evidence without horizontal scrolling.

**The Workflow Continuity Rule.** Prefer bordered sequences, related-workflow links, and explicit next actions over isolated promotional cards.

## Elevation & Depth

The system is flat by default. Most hierarchy comes from tonal layers and thin dividers. Soft ambient depth is reserved for product screenshot frames and the primary pricing container, where it helps real interface evidence read as a tangible workspace.

### Shadow Vocabulary

- **Product Evidence** (`0 28px 80px rgba(22,55,48,0.22)`): the large deep-green frame around hero screenshots.
- **Decision Surface** (`0 24px 70px rgba(22,55,48,0.12)`): a quieter lift for the combined pricing surface.

**The Evidence-Only Elevation Rule.** Shadows elevate product proof and consequential decisions; ordinary text sections, navigation, and workflow links stay flat.

## Shapes

Controls use gently rounded 0.5rem corners. Screenshot frames and major pricing surfaces use a nested 1rem outer / 0.75rem inner radius, creating a deliberate product-window silhouette. Thin borders and open edges do most structural work; feature content should not become a field of floating rounded cards.

**The Nested Frame Rule.** Product captures sit inside a deep-green outer frame with a slightly tighter white inner window.

## Components

### Buttons

- **Shape:** Gently rounded control (0.5rem) with a 3rem standard marketing height; the compact header action is 2.5rem.
- **Primary:** Operational Green with white semibold label text and 1.5rem horizontal padding.
- **Hover / Focus:** Darken to Operational Green Hover; interactive controls retain a visible green focus ring. The demo launcher may lift by 0.125rem to signal entry into the sample workspace.
- **Secondary:** White on pale surfaces with a subtle dark-green ring, shifting to Hover Wash; on deep surfaces, use either Proof Mint with deep text or a transparent white-ring treatment.
- **Responsive:** Paired hero and closing actions stack on narrow screens and sit inline from the small breakpoint.

### Cards / Containers

- **Corner Style:** Major evidence surfaces use the nested 1rem / 0.75rem frame; ordinary editorial sections remain square and divider-led.
- **Background:** Paper for reading and monthly pricing; Deep Workspace Green for proof, annual pricing, and workflow calls to action.
- **Shadow Strategy:** Follow the evidence-only elevation rule.
- **Border:** Use low-opacity green or white rules to connect adjacent content.
- **Internal Padding:** 1.75rem on compact screens, increasing to 2.5rem where the layout permits.

### Navigation

The public header uses a pale ground, thin bottom rule, clear wordmark, subdued green links, and one persistent registration action. On large screens it is a single row; on narrow screens it deliberately becomes two rows with a three-column link grid. The footer changes to Footer Green and groups destinations by product, workflow, and starting action.

### Product Evidence Frame

Place an accurate, repository-owned screenshot inside the nested deep-green frame. Use an informative alt description of the visible workflow, crop from the top, and keep the screenshot large enough to remain the dominant visual material. Do not replace product proof with abstract illustration.

### Capability Strip

A full-width Deep Workspace Green band follows feature heroes. Compact proof statements use white text, Proof Mint check icons, and dividers that become rows on mobile and columns on larger screens.

### Connected Workflow Links

Related capabilities appear as a shared bordered row rather than separate cards. Each link combines a green category label, a benefit-led title, and a directional action; hover shifts the title and arrow without adding a floating shadow.

## Do's and Don'ts

### Do:

- **Do** lead persuasive pages with one real pharmacy workflow, one clear benefit, product evidence, and demo or registration actions.
- **Do** use the actual product screenshots under `public/product` as the focal material and describe what each screen visibly proves.
- **Do** keep pricing bound to `lib/billing/plans.ts` and explain that monthly and annual options provide the same workspace.
- **Do** explain that the demo is a shared, pre-seeded sample workspace that may reset; prohibit real patient or business information.
- **Do** linearize at narrow widths while retaining the two-row public navigation and stacked action order.
- **Do** connect feature, guide, pricing, demo, and registration paths so the visitor can follow the workflow rather than reach a dead end.

### Don't:

- **Don't** invent testimonials, customer logos, adoption metrics, revenue uplift, certifications, uptime, or unverified integrations.
- **Don't** create a new campaign palette, decorative illustration system, or glossy card world outside the incumbent Pharmacy OS language.
- **Don't** imply that eTIMS fields prove regulatory approval or that the product replaces an insurer's approval process.
- **Don't** use shadows on every container; depth is reserved for product evidence and consequential decision surfaces.
- **Don't** hide operating caveats about demo data, migration scope, hardware, onboarding, or payment behavior.
