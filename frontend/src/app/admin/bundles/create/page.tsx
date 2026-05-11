"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import dynamic from "next/dynamic";
const BundleForm = dynamic(() => import("@/src/components/admin/bundles/BundleForm").then(mod => mod.BundleForm), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
});
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
