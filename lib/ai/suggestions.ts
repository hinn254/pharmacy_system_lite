import type { PageContext } from "./page-context";

const SUGGESTIONS: Record<PageContext, string[]> = {
  general: [
    "How did we perform today?",
    "What is low stock or expiring soon?",
    "What were our top sellers today?",
  ],
  pos: [
    "What sold best today?",
    "What is running low that I should watch at checkout?",
    "Quick summary of today’s sales so far",
  ],
  drugs: [
    "Which drugs are low stock?",
    "Search stock for a product name",
    "What batches expire in the next 90 days?",
  ],
  inventory: [
    "What batches expire in the next 90 days?",
    "Which items are below reorder level?",
    "Summarize stock risk (expiry + low stock)",
  ],
  sales: [
    "Compare this week’s sales to last week",
    "What were the top sellers in the last 30 days?",
    "Revenue and transaction count for the last 30 days",
  ],
  analytics: [
    "Top movers in the last 30 days",
    "Total revenue and transactions in the last 30 days",
    "Compare this week vs last week",
  ],
  patients: [
    "How do I find a patient in the system?",
    "What should I verify before dispensing?",
  ],
};

export function getSuggestedQuestions(context: PageContext): string[] {
  return SUGGESTIONS[context] ?? SUGGESTIONS.general;
}
