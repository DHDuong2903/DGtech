"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { BundleForm } from "@/src/components/admin/bundles/BundleForm";
import { useBundleStore } from "@/src/stores";
import type { BundleFormPayload } from "@/src/types";

export default function CreateBundlePage() {
  const router = useRouter();
  const { createBundle } = useBundleStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: BundleFormPayload) => {
    setSubmitting(true);
    try {
      const r = await createBundle(payload);
      if (r.success) {
        router.push("/admin/bundles");
      }
      return r.success;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <BundleForm mode="create" onSubmit={handleSubmit} submitting={submitting} />
    </AdminLayout>
  );
}
