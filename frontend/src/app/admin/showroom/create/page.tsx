"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { SceneEditorForm } from "@/src/components/admin/showroom/SceneEditorForm";
import { showroomApi } from "@/src/apis/showroomApi";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { toast } from "sonner";

export default function CreateShowroomScenePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (payload: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const scene = await showroomApi.adminCreateScene(payload);
      toast.success("Scene created");
      router.push(`/admin/showroom/${scene.sceneId}`);
    } catch (err) {
      console.error("Failed to create scene:", err);
      const message = isAxiosError(err)
        ? ((err.response?.data as { error?: string } | undefined)?.error ?? err.message)
        : "Could not create 3D scene";
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
        <SceneEditorForm key="create-scene" title="Create scene" saving={saving} onSave={handleSave} />
      </div>
    </AdminLayout>
  );
}
