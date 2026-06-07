"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit2, ImageIcon, Plus, Save, Upload, X } from "lucide-react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { useAdminProductVariants } from "@/src/components/admin/product-editor/useAdminProductVariants";
import {
  ADMIN_VARIANT_VIEW_COLUMNS,
  createAdminVariantEditColumns,
} from "@/src/components/admin/product-editor/variantColumns";
import {
  filterNonDefaultVariants,
  type AdminVariantGridRow,
} from "@/src/components/admin/product-editor/variantUtils";
import { VariantAttributesEditor } from "@/src/components/admin/product-editor/VariantAttributesEditor";
import { GlbPreviewViewer } from "@/src/components/shared/GlbPreviewViewer";
import { useCategoryStore, useProductStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { DataTable } from "@/src/components/ui/data-table";
import { Spinner } from "@/src/components/ui/spinner";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { formatCurrency, isValidGlbModel, isValidImage } from "@/src/utils";
import type { Product } from "@/src/types";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { fetchProductById, updateProduct, currentProduct, error } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "",
    categoryId: "",
    status: "ACTIVE",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [model3dFile, setModel3dFile] = useState<File | null>(null);
  const [model3dPreviewUrl, setModel3dPreviewUrl] = useState<string | null>(null);
  const [removeModel3d, setRemoveModel3d] = useState(false);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const [model3dError, setModel3dError] = useState<string | null>(null);

  const getFallbackGridWhenNoValidAttributes = useCallback((): AdminVariantGridRow[] => {
    return filterNonDefaultVariants(product?.variants) as AdminVariantGridRow[];
  }, [product?.variants]);

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
    hydrateFromProduct,
  } = useAdminProductVariants({
    mergeWithPrevious: true,
    getFallbackGridWhenNoValidAttributes,
  });

  const variantColumns = useMemo(() => createAdminVariantEditColumns(setVariantsGrid), [setVariantsGrid]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (productId && typeof productId === "string") {
      setProduct(null);
      setLoading(true);
      void fetchProductById(productId);
    }
  }, [fetchProductById, productId]);

  useEffect(() => {
    if (currentProduct && currentProduct.productId === productId) {
      setProduct(currentProduct);
      setFormData({
        name: currentProduct.name,
        description: currentProduct.description || "",
        price: String(currentProduct.price),
        compareAtPrice: currentProduct.compareAtPrice ? String(currentProduct.compareAtPrice) : "",
        stock: String(currentProduct.stock),
        categoryId: String(currentProduct.categoryId),
        status: currentProduct.status,
      });
      setImagePreview(currentProduct.imageUrl || "");
      setImageFile(null);
      setModel3dFile(null);
      setRemoveModel3d(false);
      setModel3dError(null);
      hydrateFromProduct(currentProduct);
      setLoading(false);
    } else if (error) {
      setLoading(false);
    }
  }, [currentProduct, error, hydrateFromProduct, productId]);

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
    setRemoveModel3d(true);
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
    setRemoveModel3d(false);
    setModel3dError(null);
  };

  const handleSave = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!product || typeof productId !== "string") return;

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
      data.append("price", formData.price);
      data.append("compareAtPrice", formData.compareAtPrice);
      data.append("stock", formData.stock);
      data.append("categoryId", formData.categoryId);
      data.append("status", formData.status);
      if (imageFile) data.append("image", imageFile);
      if (model3dFile) data.append("model3d", model3dFile);
      if (removeModel3d) data.append("removeModel3d", "true");
      data.append("variants", JSON.stringify(variantsGrid.length > 0 ? variantsGrid : []));

      const response = await updateProduct(product.productId, data);
      if (!response.success) return;

      setIsEditing(false);
      await fetchProductById(productId);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!product) return;
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
      stock: String(product.stock),
      categoryId: String(product.categoryId),
      status: product.status,
    });
    setImagePreview(product.imageUrl || "");
    setImageFile(null);
    setModel3dFile(null);
    setRemoveModel3d(false);
    setModel3dError(null);
    hydrateFromProduct(product);
    setIsEditing(false);
  };

  const currentModelPreview = removeModel3d ? null : model3dPreviewUrl || product?.model3dUrl || null;
  const activeMedia: "empty" | "image" | "model" = currentModelPreview ? "model" : imagePreview ? "image" : "empty";
  const totalStock =
    variantsGrid.length > 0
      ? variantsGrid.reduce((sum, variant) => sum + parseInt(String(variant.stock ?? "0"), 10), 0)
      : product?.stock || 0;

  if (loading) {
    return (
      <AdminLayout>
        <AdminContentLoader />
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-red-500">{error || "Product not found"}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">{isEditing ? "Edit product" : "Product details"}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button onClick={cancelEdit} variant="outline" size="sm" disabled={saving} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const form = document.getElementById("edit-product-form") as HTMLFormElement | null;
                    form?.requestSubmit();
                  }}
                  size="sm"
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
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
                    src={currentModelPreview}
                    title="3D product preview"
                    description="Upload a .glb file to preview the saved or local model in full 360 degrees."
                    useEmbeddedCameraMarkers={false}
                    allowFreeNavigation
                  />
                ) : activeMedia === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt={product.name}
                    className="aspect-square w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-md border border-border bg-muted/30 px-6 text-center text-muted-foreground">
                    <div className="rounded-full bg-background p-3 shadow-sm">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">No media uploaded</p>
                    </div>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap justify-center gap-2">
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

                  {model3dError ? <p className="text-center text-xs font-medium text-destructive">{model3dError}</p> : null}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <input
                    ref={model3dInputRef}
                    type="file"
                    accept=".glb,model/gltf-binary"
                    className="hidden"
                    onChange={handleModel3dChange}
                  />
                </div>
              ) : null}
            </section>

            {isEditing ? (
              <form
                id="edit-product-form"
                onSubmit={handleSave}
                className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-sm"
              >
                <div className="grid gap-2">
                  <Label className="font-semibold">
                    Product name <span className="text-red-500">*</span>
                  </Label>
                  <Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
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
                      Total Stock <span className="text-red-500">*</span>
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
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    rows={5}
                  />
                </div>
              </form>
            ) : (
              <section className="space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {product.category?.name || "No category"}
                  </Badge>
                  <h1 className="break-words text-3xl font-bold text-foreground">{product.name}</h1>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-foreground">{formatCurrency(product.price)}</p>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <p className="text-lg text-muted-foreground line-through decoration-muted-foreground/40">
                      {formatCurrency(product.compareAtPrice)}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold text-foreground">Stock</h3>
                  <p className="text-sm">{totalStock}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-base font-semibold text-foreground">Description</h3>
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {product.description || "No description"}
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="min-w-0 space-y-6 rounded-md border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Product Variants</h3>
              </div>
              {isEditing && (
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
                      onClick={() => generateVariants(formData.name, formData.price)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Generate combinations
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <>
                <VariantAttributesEditor
                  variantOptions={variantOptions}
                  onUpdateOptionName={updateOptionName}
                  onAddOptionValue={addOptionValue}
                  onRemoveOptionValue={removeOptionValue}
                  onRemoveOption={removeOption}
                  emptyContent={
                    <div className="rounded-md border border-dashed bg-muted/20 py-6 text-center text-muted-foreground">
                      <p className="text-sm">No attributes configured.</p>
                    </div>
                  }
                />
                {variantsGrid.length > 0 && (
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
                )}
              </>
            ) : variantsGrid.length > 0 ? (
              <DataTable
                {...ADMIN_LIST_DATA_TABLE_PROPS}
                columns={ADMIN_VARIANT_VIEW_COLUMNS}
                data={variantsGrid}
                showToolbar={true}
                filterColumnId="sku"
                filterPlaceholder="Search by SKU..."
                enableRowSelection={false}
                noun="variants"
              />
            ) : (
              <div className="rounded-md border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
                <p>This product does not have any variants.</p>
                <p className="mt-1 text-sm">Switch to Edit mode to generate variants.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
