"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { DiscountCampaignForm } from "@/src/components/admin/discount-campaigns/DiscountCampaignForm";
import { discountCampaignsApi } from "@/src/apis/discountCampaignsApi";
import { useDiscountCampaignStore } from "@/src/stores";
import type { DiscountCampaign, DiscountCampaignFormPayload } from "@/src/types";
import { Alert, AlertDescription } from "@/src/components/ui/alert";

export default function EditDiscountCampaignPage() {
  const params = useParams();
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : "";
  const { updateCampaign } = useDiscountCampaignStore();

  const [campaign, setCampaign] = useState<DiscountCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const c = await discountCampaignsApi.getById(campaignId);
      setCampaign(c);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load campaign");
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const router = useRouter();
  const handleSubmit = async (payload: DiscountCampaignFormPayload) => {
    if (!campaignId) return false;
    setSubmitting(true);
    try {
      const r = await updateCampaign(campaignId, payload);
      if (r.success) {
        router.push("/admin/discount-campaigns");
        return true;
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <AdminContentLoader minHeightClass="min-h-[320px]" />
      ) : campaign ? (
        <DiscountCampaignForm mode="edit" initialCampaign={campaign} onSubmit={handleSubmit} submitting={submitting} />
      ) : !loadError ? (
        <AdminContentLoader minHeightClass="min-h-[320px]" />
      ) : null}
    </AdminLayout>
  );
}
