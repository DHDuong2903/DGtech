"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cuboid, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { createAdminShowroomColumns, type AdminShowroomSceneRow } from "@/src/components/admin/showroom/AdminShowroomTable";
import { DeleteConfirmModal } from "@/src/components/admin/DeleteConfirmModal";
import { showroomApi } from "@/src/apis/showroomApi";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import { DataTable } from "@/src/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";

export default function AdminShowroomPage() {
  const [scenes, setScenes] = useState<AdminShowroomSceneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<AdminShowroomSceneRow | null>(null);
  const [togglingSceneId, setTogglingSceneId] = useState<string | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<AdminShowroomSceneRow[] | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  const loadScenes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextScenes = await showroomApi.adminGetScenes();
      setScenes(nextScenes);
    } catch (err) {
      console.error("Failed to load showroom scenes:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not load 3D scenes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScenes();
  }, [loadScenes]);

  const handleDeleteScene = async () => {
    if (!selectedScene) return;
    setDeleteWorking(true);
    try {
      await showroomApi.adminDeleteScene(selectedScene.sceneId);
      setScenes((prev) => prev.filter((scene) => scene.sceneId !== selectedScene.sceneId));
      setSelectedScene(null);
      toast.success("Scene deleted");
    } catch (err) {
      console.error("Failed to delete showroom scene:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not delete 3D scene";
      toast.error(message);
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      await Promise.all(bulkDeleteTargets.map((scene) => showroomApi.adminDeleteScene(scene.sceneId)));
      const deletedIds = new Set(bulkDeleteTargets.map((scene) => scene.sceneId));
      setScenes((prev) => prev.filter((scene) => !deletedIds.has(scene.sceneId)));
      setBulkDeleteTargets(null);
      clearTableSelectionRef.current?.();
      toast.success(bulkDeleteTargets.length === 1 ? "Scene deleted" : `Deleted ${bulkDeleteTargets.length} scenes`);
    } catch (err) {
      console.error("Failed to bulk delete showroom scenes:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not delete selected scenes";
      toast.error(message);
    } finally {
      setBulkWorking(false);
    }
  };

  const handleToggleSceneActive = async (scene: AdminShowroomSceneRow) => {
    setTogglingSceneId(scene.sceneId);
    try {
      const fullScene = await showroomApi.adminGetSceneById(scene.sceneId);
      const payload = new FormData();
      payload.append("name", fullScene.name);
      payload.append("roomId", fullScene.roomId == null ? "" : String(fullScene.roomId));
      payload.append("isActive", String(!fullScene.isActive));
      payload.append(
        "slots",
        JSON.stringify(
          (fullScene.slots || []).map((slot, index) => ({
            slotId: slot.slotId,
            label: slot.label?.trim() || `Position ${index + 1}`,
            allowedCategoryId: slot.allowedCategoryId,
          })),
        ),
      );

      const updatedScene = await showroomApi.adminSaveScene(scene.sceneId, payload);
      setScenes((prev) => prev.map((item) => (item.sceneId === updatedScene.sceneId ? updatedScene : item)));
      toast.success(updatedScene.isActive ? "Scene activated" : "Scene marked inactive");
    } catch (err) {
      console.error("Failed to toggle showroom scene status:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not update scene status";
      toast.error(message);
    } finally {
      setTogglingSceneId(null);
    }
  };

  const columns = useMemo(
    () =>
      createAdminShowroomColumns({
        onDelete: setSelectedScene,
        onToggleActive: (scene) => void handleToggleSceneActive(scene),
        togglingSceneId,
      }),
    [togglingSceneId],
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">3D Scenes</h1>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/showroom/create">
              <Plus className="h-4 w-4" />
              Add new scene
            </Link>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        ) : scenes.length === 0 ? (
          <div className="py-12 text-center">
            <Cuboid className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No scenes yet</h3>
            <Button asChild className="mt-4" size="sm">
              <Link href="/admin/showroom/create">
                <Plus className="h-4 w-4" />
                Add new scene
              </Link>
            </Button>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={scenes}
            getRowId={(row) => row.sceneId}
            filterColumnId="name"
            filterPlaceholder="Search by name..."
            noun="scenes"
            onBulkDelete={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              setBulkDeleteTargets(selectedData);
            }}
          />
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!selectedScene}
        onClose={() => setSelectedScene(null)}
        onConfirm={() => void handleDeleteScene()}
        itemName={selectedScene?.name ?? ""}
        itemType="scene"
        title="Delete scene"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{selectedScene?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmLoading={deleteWorking}
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} scenes?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleBulkDeleteConfirm()} disabled={bulkWorking}>
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
