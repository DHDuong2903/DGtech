"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import dynamic from "next/dynamic";
const BundleForm = dynamic(() => import("@/src/components/admin/bundles/BundleForm").then(mod => mod.BundleForm), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
});
import { bundleApi } from "@/src/apis/bundleApi";
import { useBundleStore } from "@/src/stores";
import type { Bundle, BundleFormPayload } from "@/src/types";
import { Alert, AlertDescription } from "@/src/components/ui/alert";

export default function EditBundlePage() {
  const params = useParams();
  const bundleId = typeof params.bundleId === "string" ? params.bundleId : "";
  const { updateBundle } = useBundleStore();

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!bundleId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const b = await bundleApi.getById(bundleId);
      setBundle(b);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load bundle");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const router = useRouter();
  const handleSubmit = async (payload: BundleFormPayload) => {
    if (!bundleId) return false;
    setSubmitting(true);
    try {
      const r = await updateBundle(bundleId, payload);
      if (r.success) {
        router.push("/admin/bundles");
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
      ) : bundle ? (
        <BundleForm mode="edit" initialBundle={bundle} onSubmit={handleSubmit} submitting={submitting} />
      ) : !loadError ? (
        <AdminContentLoader minHeightClass="min-h-[320px]" />
      ) : null}
    </AdminLayout>
  );
}
