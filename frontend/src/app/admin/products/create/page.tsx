"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImageIcon, Plus, Save, Upload, X } from "lucide-react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { createAdminVariantEditColumns } from "@/src/components/admin/product-editor/variantColumns";
import { VariantAttributesEditor } from "@/src/components/admin/product-editor/VariantAttributesEditor";
import { useAdminProductVariants } from "@/src/components/admin/product-editor/useAdminProductVariants";
import type { AdminVariantGridRow } from "@/src/components/admin/product-editor/variantUtils";
import { GlbPreviewViewer } from "@/src/components/shared/GlbPreviewViewer";
import { useCategoryStore, useProductStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { DataTable } from "@/src/components/ui/data-table";
import { Spinner } from "@/src/components/ui/spinner";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { isValidGlbModel, isValidImage } from "@/src/utils";
import { toast } from "sonner";

const emptyVariantGrid = (): AdminVariantGridRow[] => [];

export default function CreateProductPage() {
  const router = useRouter();
  const { createProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    categoryId: "",
    status: "ACTIVE",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [model3dFile, setModel3dFile] = useState<File | null>(null);
  const [model3dPreviewUrl, setModel3dPreviewUrl] = useState<string | null>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const [model3dError, setModel3dError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!model3dFile) {
      setModel3dPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(model3dFile);
    setModel3dPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [model3dFile]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = isValidImage(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image");
      return;
    }

    setImageFile(file);
    setModel3dFile(null);
    setModel3dError(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleModel3dChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validation = isValidGlbModel(file);
    if (!validation.valid) {
      setModel3dError(validation.error || "Invalid 3D model");
      return;
    }

    setModel3dFile(file);
    setImageFile(null);
    setImagePreview("");
    setModel3dError(null);
  };

  const handleSave = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();

    if (!formData.name.trim()) return toast.error("Please enter product name");
    if (!formData.categoryId) return toast.error("Please select a category");
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
      if (model3dFile) data.append("model3d", model3dFile);
      if (variantsGrid.length > 0) data.append("variants", JSON.stringify(variantsGrid));

      const response = await createProduct(data);
      if (!response.success) {
        toast.error(response.error || "Failed to create product");
        return;
      }

      toast.success("Product created successfully");
      router.push(response.data?.productId ? `/admin/products/${response.data.productId}` : "/admin/products");
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const activeMedia: "empty" | "image" | "model" = model3dPreviewUrl ? "model" : imagePreview ? "image" : "empty";

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
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"
        >
          <div className="min-w-0 space-y-4">
            <section className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Product Media</h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {activeMedia === "model" ? "3D model" : activeMedia === "image" ? "2D image" : "No media"}
                </span>
              </div>

              <div className="mt-4">
                {activeMedia === "model" ? (
                  <GlbPreviewViewer
                    src={model3dPreviewUrl}
                    title="3D product preview"
                    description="Upload a .glb file to inspect it with full 360 rotation."
                    useEmbeddedCameraMarkers={false}
                    allowFreeNavigation
                  />
                ) : activeMedia === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="aspect-square w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-md border border-border bg-muted/30 px-6 text-center text-muted-foreground">
                    <div className="rounded-full bg-background p-3 shadow-sm">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Choose one media type</p>
                      <p className="text-xs leading-5">
                        Upload image for the regular catalog card, or upload a `.glb` model if this product should use 3D instead.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {activeMedia === "image" ? "Replace image" : "Upload image"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => model3dInputRef.current?.click()}
                  disabled={saving}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {activeMedia === "model" ? "Replace model" : "Upload model"}
                </Button>
              </div>

              {model3dError ? <p className="mt-3 text-center text-xs font-medium text-destructive">{model3dError}</p> : null}

              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <input
                ref={model3dInputRef}
                type="file"
                accept=".glb,model/gltf-binary"
                className="hidden"
                onChange={handleModel3dChange}
              />
            </section>

            <section className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="grid gap-2">
                <Label className="font-semibold">
                  Product name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
                  <Label className="font-semibold">
                    Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={variantsGrid.length > 0}
                    value={formData.price}
                    onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-semibold">
                    Initial Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    disabled={variantsGrid.length > 0}
                    value={formData.stock}
                    onChange={(event) => setFormData({ ...formData, stock: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Description</Label>
                <Textarea
                  placeholder="Describe your product..."
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  rows={5}
                />
              </div>
            </section>
          </div>

          <div className="min-w-0 space-y-6 rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Product Variants</h3>
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
                  <Plus className="h-4 w-4" />
                  Add attribute
                </Button>
                {variantOptions.length > 0 && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => generateVariants(formData.name, formData.price || "0")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Generate combinations
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

            {variantsGrid.length > 0 && (
              <div className="mt-6 pt-0">
                <DataTable
                  {...ADMIN_LIST_DATA_TABLE_PROPS}
                  columns={variantColumns}
                  data={variantsGrid}
                  showToolbar={true}
                  filterColumnId="sku"
                  filterPlaceholder="Search by SKU..."
                  noun="variants"
                  onBulkDelete={({ selectedData, clearSelection }) => {
                    setVariantsGrid(variantsGrid.filter((variant) => !selectedData.includes(variant)));
                    clearSelection();
                  }}
                />
                <p className="mt-2 text-center text-[10px] italic text-muted-foreground">
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
