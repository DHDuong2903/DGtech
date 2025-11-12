"use client";

import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, Category } from "../../types";
import { isValidImage } from "../../utils";

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
    if (file) {
      const validation = isValidImage(file);
      if (!validation.valid) {
        alert(validation.error);
        e.target.value = "";
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create FormData for file upload
    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("stock", formData.stock);
    data.append("categoryId", formData.categoryId);

    if (imageFile) {
      data.append("image", imageFile);
    }

    // Call onSave and wait for it to complete
    const success = await onSave(data);

    // Only close modal and reset form if save was successful
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
          <DialogTitle>{mode === "create" ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Thêm một sản phẩm mới cho cửa hàng." : "Thay đổi sản phẩm ở đây."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Product Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Tên sản phẩm <span className="text-red-500">*</span>
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

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả"
                rows={3}
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">
                  Giá (VND) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="10000"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="stock">
                  Số lượng trong kho <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">
                Danh mục <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value: string) => setFormData({ ...formData, categoryId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
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

            {/* Image Upload */}
            <div className="grid gap-2">
              <Label htmlFor="image">Ảnh sản phẩm</Label>
              <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md border" />
                </div>
              )}
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
