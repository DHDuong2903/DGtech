"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { SceneEditorForm } from "@/src/components/admin/showroom/SceneEditorForm";
import { showroomApi } from "@/src/apis/showroomApi";
import type { ShowroomScene, ShowroomSceneSlot } from "@/src/types";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";

type AdminShowroomScene = ShowroomScene & { slots: ShowroomSceneSlot[] };

export default function EditShowroomScenePage() {
  const params = useParams();
  const router = useRouter();
  const sceneId = String(params.sceneId || "");
  const [scene, setScene] = useState<AdminShowroomScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScene = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextScene = await showroomApi.adminGetSceneById(sceneId);
      setScene(nextScene);
    } catch (err) {
      console.error("Failed to load showroom scene for edit:", err);
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

  const handleSave = async (payload: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const savedScene = await showroomApi.adminSaveScene(sceneId, payload);
      toast.success("Scene saved");
      router.push(`/admin/showroom/${savedScene.sceneId}`);
    } catch (err) {
      console.error("Failed to save showroom scene:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not save 3D scene";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !scene ? (
          <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin/showroom")}>
            Back to list
          </Button>
        ) : (
          <SceneEditorForm
            key={scene?.sceneId ?? "edit-loading"}
            title="Edit scene"
            scene={scene}
            loading={loading}
            saving={saving}
            backHref={scene ? `/admin/showroom/${scene.sceneId}` : "/admin/showroom"}
            onSave={handleSave}
          />
        )}
      </div>
    </AdminLayout>
  );
}
