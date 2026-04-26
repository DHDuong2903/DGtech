"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { VoucherForm } from "@/src/components/admin/vouchers/VoucherForm";
import { vouchersApi } from "@/src/apis/vouchersApi";
import { useVoucherStore } from "@/src/stores";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import type { Voucher, VoucherFormPayload } from "@/src/types";

export default function EditVoucherPage() {
  const params = useParams();
  const router = useRouter();
  const voucherId = typeof params.voucherId === "string" ? params.voucherId : "";
  const { updateVoucher } = useVoucherStore();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!voucherId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setVoucher(await vouchersApi.getById(voucherId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load voucher");
    } finally {
      setLoading(false);
    }
  }, [voucherId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (payload: VoucherFormPayload) => {
    setSubmitting(true);
    try {
      const r = await updateVoucher(voucherId, payload);
      if (r.success) router.push("/admin/vouchers");
      return r.success;
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
      ) : voucher ? (
        <VoucherForm mode="edit" initialVoucher={voucher} submitting={submitting} onSubmit={onSubmit} />
      ) : null}
    </AdminLayout>
  );
}
