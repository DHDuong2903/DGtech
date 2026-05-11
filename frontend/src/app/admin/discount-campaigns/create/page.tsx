"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import dynamic from "next/dynamic";
const DiscountCampaignForm = dynamic(() => import("@/src/components/admin/discount-campaigns/DiscountCampaignForm").then(mod => mod.DiscountCampaignForm), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
});
import { useDiscountCampaignStore } from "@/src/stores";
import type { DiscountCampaignFormPayload } from "@/src/types";

export default function CreateDiscountCampaignPage() {
  const router = useRouter();
  const { createCampaign } = useDiscountCampaignStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: DiscountCampaignFormPayload) => {
    setSubmitting(true);
    try {
      const r = await createCampaign(payload);
      if (r.success) {
        router.push("/admin/discount-campaigns");
      }
      return r.success;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <DiscountCampaignForm mode="create" onSubmit={handleSubmit} submitting={submitting} />
    </AdminLayout>
  );
}
