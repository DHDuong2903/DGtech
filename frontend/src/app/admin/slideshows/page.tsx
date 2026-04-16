"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { createAdminSlideshowColumns } from "../../../components/admin/AdminSlideshowTable";
import { SlideshowCampaignModal } from "../../../components/admin/SlideshowModal";
import { DeleteConfirmModal } from "../../../components/admin/DeleteConfirmModal";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { useSlideshowStore } from "../../../stores";
import type { SlideshowCampaign, SlideshowCampaignFormData } from "../../../types";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { DataTable } from "@/src/components/ui/data-table";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Plus, Images } from "lucide-react";

export default function AdminSlideshowsPage() {
  const {
    slideshows,
    loading,
    error,
    fetchSlideshows,
    createSlideshow,
    updateSlideshow,
    deleteSlideshow,
    deleteSlideshows,
    activateSlideshow,
    deactivateSlideshow,
  } = useSlideshowStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<SlideshowCampaign | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<SlideshowCampaign[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchSlideshows();
  }, [fetchSlideshows]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelected(null);
    setIsModalOpen(true);
  };

  const handleEditClick = useCallback((row: SlideshowCampaign) => {
    setModalMode("edit");
    setSelected(row);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((row: SlideshowCampaign) => {
    setSelected(row);
    setIsDeleteModalOpen(true);
  }, []);

  const handleModalSave = async (data: SlideshowCampaignFormData): Promise<boolean> => {
    if (modalMode === "create") {
      const r = await createSlideshow(data);
      return r.success;
    }
    if (!selected) return false;
    const r = await updateSlideshow(selected.slideshowId, {
      name: data.name,
      slides: data.slides,
    });
    return r.success;
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;
    setDeleteWorking(true);
    try {
      const r = await deleteSlideshow(selected.slideshowId);
      if (r.success) {
        setIsDeleteModalOpen(false);
        setSelected(null);
      }
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const r = await deleteSlideshows(bulkDeleteTargets.map((s) => s.slideshowId));
      if (r.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  };

  const columns = useMemo(
    () =>
      createAdminSlideshowColumns({
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
        onActivate: (row) => void activateSlideshow(row.slideshowId),
        onDeactivate: (row) => void deactivateSlideshow(row.slideshowId),
      }),
    [handleEditClick, handleDeleteClick, activateSlideshow, deactivateSlideshow]
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Slideshows management</h1>
          </div>
          <Button type="button" onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4" />
            New slideshow
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        ) : slideshows.length === 0 ? (
          <div className="py-12 text-center">
            <Images className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No slideshows yet</h3>
            <p className="text-muted-foreground mt-2">
              Create a named slideshow with slides, then set one as active for the storefront.
            </p>
            <Button type="button" size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              New slideshow
            </Button>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={slideshows}
            getRowId={(row) => String(row.slideshowId)}
            filterColumnId="name"
            filterPlaceholder="Search by name…"
            noun="slideshows"
            bulkSelectionActions={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              const n = selectedData.length;
              return (
                <>
                  <span className="text-muted-foreground text-sm font-medium">{n} selected</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={n === 0}
                    onClick={() => setBulkDeleteTargets(selectedData)}
                  >
                    Delete selected
                  </Button>
                </>
              );
            }}
          />
        )}
      </div>

      <SlideshowCampaignModal
        key={selected?.slideshowId ?? "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelected(null);
        }}
        onSave={handleModalSave}
        campaign={selected}
        mode={modalMode}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelected(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={selected?.name ?? ""}
        itemType="slideshow"
        title="Delete slideshow"
        confirmLoading={deleteWorking}
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{selected?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} slideshows?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm} disabled={bulkWorking}>
              {bulkWorking ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting
                </>
              ) : (
                "Delete all"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
