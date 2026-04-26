"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { VoucherForm } from "@/src/components/admin/vouchers/VoucherForm";
import { useVoucherStore } from "@/src/stores";
import type { VoucherFormPayload } from "@/src/types";

export default function CreateVoucherPage() {
  const router = useRouter();
  const { createVoucher } = useVoucherStore();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (payload: VoucherFormPayload) => {
    setSubmitting(true);
    try {
      const r = await createVoucher(payload);
      if (r.success) router.push("/admin/vouchers");
      return r.success;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <VoucherForm mode="create" submitting={submitting} onSubmit={onSubmit} />
    </AdminLayout>
  );
}
