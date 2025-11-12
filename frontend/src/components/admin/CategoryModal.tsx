"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Category, CategoryFormData } from "../../types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: CategoryFormData) => Promise<boolean>;
  category?: Category | null;
  mode: "create" | "edit";
}

export const CategoryModal = ({ isOpen, onClose, onSave, category, mode }: CategoryModalProps) => {
  const [formData, setFormData] = useState({
    name: category && mode === "edit" ? category.name : "",
    description: category && mode === "edit" ? category.description || "" : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Call onSave and wait for it to complete
    const success = await onSave(formData);

    // Only close modal and reset form if save was successful
    if (success) {
      setFormData({ name: "", description: "" });
      onClose();
    }
  };

  // Reset form when modal closes or when category/mode changes
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
          <DialogTitle>{mode === "create" ? "Thêm mới danh mục" : "Chỉnh sửa danh mục"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Tạo một danh mục mới cho sản phẩm." : "Thay đổi danh mục ở đây."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Tên danh mục sản phẩm <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">{mode === "create" ? "Thêm" : "Lưu thay đổi"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
