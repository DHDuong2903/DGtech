"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { createAdminVariantEditColumns } from "@/src/components/admin/product-editor/variantColumns";
import { VariantAttributesEditor } from "@/src/components/admin/product-editor/VariantAttributesEditor";
import { useAdminProductVariants } from "@/src/components/admin/product-editor/useAdminProductVariants";
import type { AdminVariantGridRow } from "@/src/components/admin/product-editor/variantUtils";
import { useProductStore, useCategoryStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, Save, X, Upload, Plus } from "lucide-react";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import { isValidImage } from "@/src/utils";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { toast } from "sonner";
import { Spinner } from "@/src/components/ui/spinner";
import Link from "next/link";
import { DataTable } from "@/src/components/ui/data-table";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";

const emptyVariantGrid = (): AdminVariantGridRow[] => [];

export default function CreateProductPage() {
  const router = useRouter();
  const { createProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    categoryId: "",
    status: "ACTIVE",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const getFallbackGridWhenNoValidAttributes = useCallback(() => emptyVariantGrid(), []);

  const {
    variantOptions,
    variantsGrid,
    setVariantsGrid,
    addOption,
    updateOptionName,
    addOptionValue,
    removeOptionValue,
    removeOption,
    generateVariants,
  } = useAdminProductVariants({
    mergeWithPrevious: false,
    getFallbackGridWhenNoValidAttributes,
  });

  const variantColumns = useMemo(() => createAdminVariantEditColumns(setVariantsGrid), [setVariantsGrid]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && isValidImage(file).valid) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error(isValidImage(file).error || "Invalid image");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) return toast.error("Please enter product name");
    if (!formData.categoryId) return toast.error("Please select a category");

    // Validate main specs if variants don't exist
    if (variantsGrid.length === 0) {
      if (formData.price === "" || parseFloat(formData.price) < 0) return toast.error("Please enter a valid price");
      if (formData.stock === "" || parseInt(formData.stock) < 0) return toast.error("Please enter a valid stock");
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price || "0");
      data.append("stock", formData.stock || "0");
      data.append("categoryId", formData.categoryId);
      data.append("status", formData.status);
      if (imageFile) data.append("image", imageFile);

      if (variantsGrid.length > 0) {
        data.append("variants", JSON.stringify(variantsGrid));
      }

      const res = await createProduct(data);
      if (res.success) {
        toast.success("Product created successfully");
        const newId = res.data?.productId;
        router.push(newId ? `/admin/products/${newId}` : "/admin/products");
      } else {
        toast.error(res.error || "Failed to create product");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Create new product</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/admin/products")}
              variant="outline"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving product
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save product
                </>
              )}
            </Button>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 items-start"
        >
          {/* LEFT COLUMN: Image & Basic Info */}
          <div className="min-w-0 space-y-4">
            <div className="relative group">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full rounded-md border aspect-square object-cover" />
              ) : (
                <div className="aspect-square w-full overflow-hidden rounded-md border">
                  <ProductImageFallback className="h-full w-full" iconClassName="h-14 w-14" />
                </div>
              )}
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {imagePreview ? "Change image" : "Upload image"}
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="font-semibold">
                  Product name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={c.categoryId.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="font-semibold flex items-center justify-between">
                    <span>
                      Price <span className="text-red-500">*</span>
                    </span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={variantsGrid.length > 0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-semibold flex items-center justify-between">
                    <span>
                      Initial Stock <span className="text-red-500">*</span>
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    disabled={variantsGrid.length > 0}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Description</Label>
                <Textarea
                  placeholder="Describe your product..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Variants */}
          <div className="min-w-0 space-y-6 h-full rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Product Variants</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={variantOptions.length >= 3}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add attribute
                </Button>
                {variantOptions.length > 0 && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => generateVariants(formData.name, formData.price || "0")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Generate combinations
                  </Button>
                )}
              </div>
            </div>

            <VariantAttributesEditor
              variantOptions={variantOptions}
              onUpdateOptionName={updateOptionName}
              onAddOptionValue={addOptionValue}
              onRemoveOptionValue={removeOptionValue}
              onRemoveOption={removeOption}
              emptyContent={
                <div className="rounded-md border border-dashed bg-muted/10 py-12 text-center text-muted-foreground">
                  <Plus className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">No variants configured. This will be a simple product.</p>
                </div>
              }
            />

            {/* Generated Grid */}
            {variantsGrid.length > 0 && (
              <div className="mt-6 pt-0">
                <DataTable
                  {...ADMIN_LIST_DATA_TABLE_PROPS}
                  columns={variantColumns}
                  data={variantsGrid}
                  showToolbar={true}
                  filterColumnId="sku"
                  filterPlaceholder="Search by SKU…"
                  noun="variants"
                  bulkSelectionActions={({ selectedData, clearSelection }) => (
                    <>
                      <span className="text-muted-foreground text-sm font-medium">{selectedData.length} selected</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setVariantsGrid(variantsGrid.filter((v) => !selectedData.includes(v)));
                          clearSelection();
                        }}
                      >
                        Delete selected
                      </Button>
                    </>
                  )}
                />
                <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                  Tip: You can edit individual prices and stock after generation.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
