"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { DeleteConfirmModal } from "@/src/components/admin/DeleteConfirmModal";
import { addressApi } from "@/src/apis/addressApi";
import { VN_PROVINCES, vnWardsForProvince } from "@/src/constants/vnAdministrative";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Badge } from "@/src/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { VnAddressFormFields, type VnAddressDraft } from "@/src/components/public/address/VnAddressFormFields";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { cn } from "@/src/lib/utils";
import type { UserAddress, VnProvince, VnWard } from "@/src/types";
import { useAuth } from "@/src/hooks";

const MAX_USER_ADDRESSES = 3;

const emptyDraft = (): VnAddressDraft => ({
  phone: "",
  provinceCode: "",
  provinceName: "",
  wardCode: "",
  wardName: "",
  addressLine: "",
  isDefault: true,
});

export default function AddressesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { user: appUser } = useAuth();
  const accountDisplayName = (appUser?.username?.trim() || "Your account") as string;
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VnAddressDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);

  const loadAddresses = useCallback(async () => {
    const { addresses: list } = await addressApi.list();
    setAddresses(list);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const addr = await addressApi.list();
        if (cancelled) return;
        setProvinces(VN_PROVINCES);
        setAddresses(addr.addresses);
      } catch (e) {
        console.error(e);
        toast.error("Could not load addresses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!draft.provinceCode) {
      setWards([]);
      return;
    }
    setWards(vnWardsForProvince(draft.provinceCode));
  }, [draft.provinceCode]);

  const openCreate = () => {
    if (addresses.length >= MAX_USER_ADDRESSES) {
      toast.error(`You can save up to ${MAX_USER_ADDRESSES} addresses.`);
      return;
    }
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = useCallback((a: UserAddress) => {
    setEditingId(a.addressId);
    setDraft({
      phone: a.phone,
      provinceCode: a.provinceCode,
      provinceName: a.provinceName,
      wardCode: a.wardCode,
      wardName: a.wardName,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = async () => {
    if (!draft.phone.trim() || !draft.provinceCode || !draft.wardCode || !draft.addressLine.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!editingId && addresses.length >= MAX_USER_ADDRESSES) {
      toast.error(`You can save up to ${MAX_USER_ADDRESSES} addresses.`);
      return;
    }
    setSaving(true);
    try {
      const body = {
        phone: draft.phone.trim(),
        provinceCode: draft.provinceCode,
        wardCode: draft.wardCode,
        addressLine: draft.addressLine.trim(),
        isDefault: draft.isDefault,
      };
      if (editingId) {
        await addressApi.update(editingId, body);
        toast.success("Address updated.");
      } else {
        await addressApi.create(body);
        toast.success("Address added.");
      }
      setDialogOpen(false);
      await loadAddresses();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTarget = deleteTargetId ? addresses.find((a) => a.addressId === deleteTargetId) : null;

  const confirmDeleteAddress = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteWorking(true);
    try {
      await addressApi.remove(deleteTargetId);
      toast.success("Address removed.");
      setDeleteTargetId(null);
      await loadAddresses();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Could not delete address.");
    } finally {
      setDeleteWorking(false);
    }
  }, [deleteTargetId, loadAddresses]);

  const atAddressLimit = addresses.length >= MAX_USER_ADDRESSES;

  if (!isLoaded || loading) {
    return <PageContentLoader className="bg-background" minHeightClass="min-h-screen" />;
  }

  return (
    <div className="bg-background">
      <div className={cn("mx-auto max-w-7xl py-3", STOREFRONT_H_PADDING)}>
        {addresses.length > 0 && (
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              disabled={atAddressLimit}
              title={atAddressLimit ? `Maximum ${MAX_USER_ADDRESSES} addresses` : undefined}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add address
            </Button>
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="bg-card border-border rounded-lg border py-16 text-center shadow-sm">
            <MapPin className="text-muted-foreground mx-auto mb-4 h-16 w-16" aria-hidden />
            <h2 className="text-foreground mb-2 text-xl font-semibold">No saved addresses</h2>
            <p className="text-muted-foreground mb-6">
              Add an address to keep checkout quick and accurate. You can save up to {MAX_USER_ADDRESSES} addresses.
            </p>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={openCreate}
              disabled={atAddressLimit}
              title={atAddressLimit ? `Maximum ${MAX_USER_ADDRESSES} addresses` : undefined}
            >
              <MapPin className="size-3.5" />
              Add address
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              You can save up to {MAX_USER_ADDRESSES} delivery addresses ({addresses.length}/{MAX_USER_ADDRESSES} used).
            </p>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.map((a) => (
                    <TableRow key={a.addressId}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground font-medium">{accountDisplayName}</span>
                          {a.isDefault ? (
                            <Badge
                              variant="secondary"
                              className="border-orange-500/35 bg-orange-500/12 text-orange-700 shadow-none dark:bg-orange-500/18 dark:text-orange-300 shrink-0 border text-xs font-medium"
                            >
                              Default
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.phone}</TableCell>
                      <TableCell>
                        <div className="max-w-md space-y-0.5">
                          <p className="text-foreground text-sm leading-snug">{a.addressLine}</p>
                          <p className="text-muted-foreground text-sm leading-snug">
                            {a.wardName} - {a.provinceName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTargetId(a.addressId)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton className="max-h-[90vh] gap-3 overflow-y-auto p-4 sm:max-w-md sm:p-4">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-base">{editingId ? "Edit address" : "Add address"}</DialogTitle>
          </DialogHeader>
          <VnAddressFormFields
            locale="en"
            provinces={provinces}
            wards={wards}
            wardsLoading={false}
            value={draft}
            onChange={setDraft}
            showDefaultCheckbox
            idPrefix="dlg"
          />
          <DialogFooter className="mt-1 gap-2 pt-1 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => {
          if (!deleteWorking) setDeleteTargetId(null);
        }}
        onConfirm={() => void confirmDeleteAddress()}
        itemName={deleteTarget ? `${deleteTarget.addressLine}` : ""}
        itemType="address"
        title="Delete address"
        description="Are you sure you want to delete this saved address? This cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmLoading={deleteWorking}
      />
    </div>
  );
}
