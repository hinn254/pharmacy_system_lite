import { getOrganizationSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscountCodesAdmin } from "@/components/discount-codes-admin";
import { InvoiceTemplateSettings } from "@/components/invoice-template-settings";
import { listDrugCategories } from "@/lib/actions/drug-categories";

export default async function AdminSettingsPage() {
  const [settings, categories] = await Promise.all([
    getOrganizationSettings(),
    listDrugCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Platform preferences and pricing tools
        </p>
      </div>
      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="discounts">Discount codes</TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <SettingsForm initial={settings} categories={categories} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceTemplateSettings initial={settings} />
        </TabsContent>

        <TabsContent value="discounts">
          <DiscountCodesAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
