"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import type { Room, RoomFormData } from "../../types";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: RoomFormData) => Promise<boolean>;
  room?: Room | null;
  mode: "create" | "edit";
}

export const RoomModal = ({ isOpen, onClose, onSave, room, mode }: RoomModalProps) => {
  const [formData, setFormData] = useState({
    name: room && mode === "edit" ? room.name : "",
    description: room && mode === "edit" ? room.description || "" : "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        setFormData({ name: "", description: "" });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ name: "", description: "" });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add room" : "Edit room"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new room type for your 3D scenes." : "Update the room details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="room-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="room-name"
                type="text"
                required
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Living room"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-description">Description</Label>
              <Textarea
                id="room-description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Short description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  {mode === "create" ? "Creating" : "Saving"}
                </>
              ) : mode === "create" ? (
                "Create"
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
