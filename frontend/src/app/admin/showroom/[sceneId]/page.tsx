"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, Pencil } from "lucide-react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { ROOM_CAMERA_SLOT_OVERRIDES } from "@/src/components/admin/showroom/constants";
import { GlbPreviewViewer } from "@/src/components/shared/GlbPreviewViewer";
import { showroomApi } from "@/src/apis/showroomApi";
import type { ShowroomScene, ShowroomSceneSlot } from "@/src/types";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

type AdminShowroomScene = ShowroomScene & { slots: ShowroomSceneSlot[] };

export default function AdminShowroomDetailPage() {
  const params = useParams();
  const sceneId = String(params.sceneId || "");
  const [scene, setScene] = useState<AdminShowroomScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScene = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextScene = await showroomApi.adminGetSceneById(sceneId);
      setScene(nextScene);
    } catch (err) {
      console.error("Failed to load showroom scene detail:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not load 3D scene";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sceneId]);

  useEffect(() => {
    void loadScene();
  }, [loadScene]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {loading ? (
          <AdminContentLoader minHeightClass="min-h-[320px]" />
        ) : error || !scene ? (
          <>
            <Alert variant="destructive">
              <AlertDescription>{error || "Scene not found"}</AlertDescription>
            </Alert>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/showroom">Back to list</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/showroom" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold tracking-tight">{scene.name}</h1>
              </div>
              <Button asChild size="sm" className="gap-2">
                <Link href={`/admin/showroom/${scene.sceneId}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
                <GlbPreviewViewer
                  src={scene.roomModelUrl}
                  title="Room preview"
                  description="No 3D model uploaded yet."
                  className="aspect-[1/1.02]"
                  autoRotate={false}
                  allowFreeNavigation
                  showNamedMarkers
                  cameraMarkerOverrides={ROOM_CAMERA_SLOT_OVERRIDES}
                  showResetViewButton
                />
              </div>

              <div className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Room</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scene.room?.name || "No room"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Status</p>
                    <div className="mt-1">
                      {scene.isActive ? (
                        <Badge variant="success" className="font-normal">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Saved model</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scene.roomModelFileName || "No model"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Positions</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scene.slots.length}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Positions</h2>
                  {scene.slots.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                      No positions yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scene.slots.map((slot, index) => (
                        <div key={slot.slotId} className="rounded-md border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">Position {index + 1}</p>
                            <Badge variant="outline">{slot.allowedCategory?.name || "No category"}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{slot.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
