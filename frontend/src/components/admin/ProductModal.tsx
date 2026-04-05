"use client";

import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import type { Product, Category } from "../../types";
import { isValidImage } from "../../utils";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: FormData) => Promise<boolean>;
  product?: Product | null;
  categories: Category[];
  mode: "create" | "edit";
}

export const ProductModal = ({ isOpen, onClose, onSave, product, categories, mode }: ProductModalProps) => {
  // Initialize form data based on mode and product
  const getInitialFormData = () => {
    if (product && mode === "edit") {
      return {
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        categoryId: product.categoryId.toString(),
      };
    }
    return {
      name: "",
      description: "",
      price: "",
      stock: "",
      categoryId: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || "");
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Update form when modal opens with different product or mode
  useEffect(() => {
    if (isOpen) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
      setImagePreview(product?.imageUrl || "");
      setImageFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = isValidImage(file);
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid image");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("stock", formData.stock);
      data.append("categoryId", formData.categoryId);
      if (mode === "create") {
        data.append("status", "ACTIVE");
      }

      if (imageFile) {
        data.append("image", imageFile);
      }

      const success = await onSave(data);

      if (success) {
        setFormData({
          name: "",
          description: "",
          price: "",
          stock: "",
          categoryId: "",
        });
        setImageFile(null);
        setImagePreview("");
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        name: "",
        description: "",
        price: "",
        stock: "",
        categoryId: "",
      });
      setImageFile(null);
      setImagePreview("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add product" : "Edit product"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new product to your catalog." : "Update product details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="name">
                  Product name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Name"
                  className="w-full min-w-0"
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger id="category" className="w-full min-w-0">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.categoryId} value={category.categoryId.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
                rows={3}
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="price">
                  Price (VND) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000000"
                  className="w-full min-w-0"
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <Label htmlFor="stock">
                  Stock <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="w-full min-w-0"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="grid gap-2">
              <Label>Product image</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              {imagePreview ? (
                <div className="bg-muted relative mt-1 aspect-video w-full min-w-0 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="size-full object-cover" />
                </div>
              ) : null}
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
                  {mode === "create" ? "Creating…" : "Saving…"}
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
