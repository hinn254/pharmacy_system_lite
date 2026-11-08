import type { UserRole } from "@prisma/client";

export type AnalyticsEnvironment = "production" | "preview" | "development";

export type AnalyticsContext = {
  organization_id: string;
  user_id?: string;
  user_role?: UserRole;
  subscription_plan?: string;
  subscription_status?: string;
  is_demo: boolean;
  environment: AnalyticsEnvironment;
  app_version?: string;
};

export type AnalyticsEventProperties = {
  organization_registered: Record<string, never>;
  inventory_item_created: Record<string, never>;
  stock_batch_received: { item_count_bucket: "1" | "2-5" | "6-20" | "21+" };
  sale_completed: {
    payment_method: "CASH" | "MPESA" | "CARD" | "INSURANCE" | "MIXED";
    item_count_bucket: "1" | "2-5" | "6-20" | "21+";
    workflow: "pos" | "consultation";
  };
  consultation_completed: Record<string, never>;
  insurance_claim_created: Record<string, never>;
  billing_page_viewed: Record<string, never>;
  checkout_started: Record<string, never>;
  checkout_succeeded: Record<string, never>;
  checkout_failed: { failure_category: "payment_failed" | "initialization_failed" };
  subscription_activated: Record<string, never>;
  subscription_cancelled: Record<string, never>;
  subscription_reactivated: Record<string, never>;
  login_succeeded: Record<string, never>;
  analytics_viewed: Record<string, never>;
  ai_assistant_opened: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;

export function countBucket(count: number): "1" | "2-5" | "6-20" | "21+" {
  if (count <= 1) return "1";
  if (count <= 5) return "2-5";
  if (count <= 20) return "6-20";
  return "21+";
}

export function analyticsEnvironment(): AnalyticsEnvironment {
  if (process.env.NODE_ENV === "development") return "development";
  return process.env.VERCEL_ENV === "production" ? "production" : "preview";
}
