import { getAdminAnalyticsReport } from "@/lib/actions/analytics";
import { AnalyticsClient } from "./analytics-client";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const report = await getAdminAnalyticsReport({
    preset: pick("preset"),
    bucket: pick("bucket"),
    includeVoided: pick("includeVoided"),
    paymentMethod: pick("paymentMethod"),
    insuranceSchemeId: pick("insuranceSchemeId"),
    cashierId: pick("cashierId"),
    expiryWithinDays: pick("expiryWithinDays"),
    topN: pick("topN"),
    from: pick("from"),
    to: pick("to"),
  });

  if (!report) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        This report is only available to administrators.
      </div>
    );
  }

  return <AnalyticsClient report={report} />;
}
