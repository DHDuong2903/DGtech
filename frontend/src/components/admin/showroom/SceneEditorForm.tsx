"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { GlbPreviewViewer } from "@/src/components/shared/GlbPreviewViewer";
import { useCategoryStore, useRoomStore } from "@/src/stores";
import type { ShowroomScene, ShowroomSceneSlot } from "@/src/types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { MAX_SHOWROOM_ROOM_MODEL_FILE_SIZE_BYTES } from "@/src/constant";
import { toast } from "sonner";
import { isValidGlbModel } from "@/src/utils";
import { ROOM_CAMERA_SLOT_OVERRIDES } from "./constants";

type EditableScene = ShowroomScene & { slots: ShowroomSceneSlot[] };

type PositionDraft = {
  slotId: string;
  label: string;
  allowedCategoryId: number | null;
};

type SceneDraft = {
  name: string;
  roomId: number | null;
  isActive: boolean;
  roomModelFile: File | null;
  roomModelPreviewUrl: string | null;
  removeRoomModel: boolean;
  positions: PositionDraft[];
};

function buildDraft(scene: EditableScene | null): SceneDraft {
  return {
    name: scene?.name ?? "",
    roomId: scene?.roomId ?? null,
    isActive: scene?.isActive ?? true,
    roomModelFile: null,
    roomModelPreviewUrl: null,
    removeRoomModel: false,
    positions:
      scene?.slots.map((slot) => ({
        slotId: slot.slotId,
        label: slot.label,
        allowedCategoryId: slot.allowedCategoryId,
      })) ?? [],
  };
}

export function SceneEditorForm({
  title,
  scene,
  loading = false,
  saving = false,
  backHref = "/admin/showroom",
  saveLabel = "Save",
  onSave,
}: {
  title: string;
  scene?: EditableScene | null;
  loading?: boolean;
  saving?: boolean;
  backHref?: string;
  saveLabel?: string;
  onSave: (payload: FormData) => Promise<void>;
}) {
  const { categories, fetchCategories } = useCategoryStore();
  const { rooms, fetchRooms } = useRoomStore();
  const previewUrlRef = useRef<string | null>(null);
  const roomFileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<SceneDraft>(() => buildDraft(scene ?? null));

  useEffect(() => {
    void fetchCategories();
    void fetchRooms();
  }, [fetchCategories, fetchRooms]);

  useEffect(() => {
    previewUrlRef.current = draft.roomModelPreviewUrl;
  }, [draft.roomModelPreviewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const previewUrl = useMemo(
    () => draft.roomModelPreviewUrl ?? (draft.removeRoomModel ? null : scene?.roomModelUrl ?? null),
    [draft.removeRoomModel, draft.roomModelPreviewUrl, scene?.roomModelUrl],
  );

  const patchDraft = (patch: Partial<SceneDraft>) => {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleRoomModelChange = (file: File | null) => {
    if (!file) return;
    const validation = isValidGlbModel(file, MAX_SHOWROOM_ROOM_MODEL_FILE_SIZE_BYTES);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid 3D model");
      return;
    }

    setDraft((prev) => {
      if (prev.roomModelPreviewUrl) {
        URL.revokeObjectURL(prev.roomModelPreviewUrl);
      }
      return {
        ...prev,
        roomModelFile: file,
        roomModelPreviewUrl: URL.createObjectURL(file),
        removeRoomModel: false,
      };
    });
  };

  const patchPosition = (slotId: string, patch: Partial<PositionDraft>) => {
    setDraft((prev) => ({
      ...prev,
      positions: prev.positions.map((position) => (position.slotId === slotId ? { ...position, ...patch } : position)),
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      toast.error("Scene name is required");
      return;
    }

    const payload = new FormData();
    payload.append("name", trimmedName);
    payload.append("roomId", draft.roomId == null ? "" : String(draft.roomId));
    payload.append("isActive", String(draft.isActive));
    payload.append(
      "slots",
      JSON.stringify(
        draft.positions.map((position, index) => ({
          slotId: position.slotId.startsWith("temp-slot-") ? undefined : position.slotId,
          label: position.label.trim() || `Position ${index + 1}`,
          allowedCategoryId: position.allowedCategoryId,
        })),
      ),
    );
    if (draft.roomModelFile) payload.append("roomModel", draft.roomModelFile);
    if (draft.removeRoomModel) payload.append("removeRoomModel", "true");

    await onSave(payload);
  };

  if (loading) {
    return <AdminContentLoader minHeightClass="min-h-[320px]" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <Button type="button" size="sm" disabled={saving} className="gap-2" onClick={() => void handleSubmit()}>
          {saving ? (
            <>
              <Spinner data-icon="inline-start" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <GlbPreviewViewer
            src={previewUrl}
            title="Room preview"
            description="Upload a .glb room model to preview it here."
            className="aspect-[1/1.02]"
            autoRotate={false}
            showNamedMarkers
            cameraMarkerOverrides={ROOM_CAMERA_SLOT_OVERRIDES}
            showResetViewButton
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scene-name">Scene name</Label>
              <Input
                id="scene-name"
                value={draft.name}
                onChange={(event) => patchDraft({ name: event.target.value })}
                placeholder="Living room scene"
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={draft.roomId == null ? "none" : String(draft.roomId)}
                onValueChange={(value) => patchDraft({ roomId: value === "none" ? null : Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.roomId} value={String(room.roomId)}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <input
              ref={roomFileInputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              className="hidden"
              onChange={(event) => handleRoomModelChange(event.target.files?.[0] || null)}
            />
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => roomFileInputRef.current?.click()}>
              Upload 3D scene
            </Button>
            <p className="text-xs text-muted-foreground">{draft.roomModelFile?.name || scene?.roomModelFileName || "No scene selected yet"}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Positions</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Positions are synced from the uploaded 3D scene model. You can map categories here but position names and count are read from the model.
          </p>

          {draft.positions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No positions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {draft.positions.map((position, index) => (
                <div key={position.slotId} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Position {index + 1}</p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`position-name-${position.slotId}`}>Position name</Label>
                      <Input
                        id={`position-name-${position.slotId}`}
                        value={position.label}
                        placeholder={`Position ${index + 1}`}
                        readOnly
                        className="bg-muted/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={position.allowedCategoryId == null ? "none" : String(position.allowedCategoryId)}
                        onValueChange={(value) =>
                          patchPosition(position.slotId, {
                            allowedCategoryId: value === "none" ? null : Number(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
