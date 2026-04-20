"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { useAdminProductVariants } from "@/src/components/admin/product-editor/useAdminProductVariants";
import {
  ADMIN_VARIANT_VIEW_COLUMNS,
  createAdminVariantEditColumns,
} from "@/src/components/admin/product-editor/variantColumns";
import { VariantAttributesEditor } from "@/src/components/admin/product-editor/VariantAttributesEditor";
import {
  filterNonDefaultVariants,
  type AdminVariantGridRow,
} from "@/src/components/admin/product-editor/variantUtils";
import { useProductStore, useCategoryStore } from "@/src/stores";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, Edit2, Save, X, Upload, Plus } from "lucide-react";
import { ProductImageFallback } from "@/src/components/public/product/ProductImageFallback";
import type { Product } from "@/src/types";
import { formatCurrency, isValidImage } from "@/src/utils";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { toast } from "sonner";
import { Spinner } from "@/src/components/ui/spinner";
import Link from "next/link";
import { DataTable } from "@/src/components/ui/data-table";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";

export default function ProductDetailPage() {
  const { productId } = useParams();

  const { fetchProductById, updateProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
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
  const [imagePreview, setImagePreview] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (productId && typeof productId === "string") {
      setProduct(null);
      setLoading(true);
      fetchProductById(productId);
    }
  }, [productId, fetchProductById]);

  const { currentProduct, error } = useProductStore();

  useEffect(() => {
    if (currentProduct && currentProduct.productId === productId) {
      setProduct(currentProduct);
      setFormData({
        name: currentProduct.name,
        description: currentProduct.description || "",
        price: currentProduct.price.toString(),
        compareAtPrice: currentProduct.compareAtPrice ? currentProduct.compareAtPrice.toString() : "",
        stock: currentProduct.stock.toString(),
        categoryId: currentProduct.categoryId.toString(),
        status: currentProduct.status,
      });
      setImagePreview(currentProduct.imageUrl || "");
      hydrateFromProduct(currentProduct);

      setLoading(false);
    } else if (error) {
      setLoading(false);
    }
  }, [currentProduct, error, productId, hydrateFromProduct]);

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

  const variantColumns = useMemo(
    () => createAdminVariantEditColumns(setVariantsGrid),
    [setVariantsGrid],
  );

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) return toast.error("Please enter product name");
    if (!formData.categoryId) return toast.error("Please select a category");

    // Validate main specs if variants don't exist
    if (variantsGrid.length === 0) {
      if (formData.price === "" || parseFloat(formData.price) < 0) return toast.error("Please enter a valid price");
      if (formData.stock === "" || parseInt(formData.stock) < 0) return toast.error("Please enter a valid stock");
    }

    if (!product || typeof productId !== "string") return;
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

      if (variantsGrid.length > 0) {
        data.append("variants", JSON.stringify(variantsGrid));
      } else {
        data.append("variants", JSON.stringify([]));
      }

      const res = await updateProduct(product.productId, data);
      if (res.success) {
        setIsEditing(false);
        await fetchProductById(productId);
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toString() : "",
        stock: product.stock.toString(),
        categoryId: product.categoryId.toString(),
        status: product.status,
      });
      setImagePreview(product.imageUrl || "");
      setImageFile(null);
      hydrateFromProduct(product);
    }
    setIsEditing(false);
  };

  if (loading)
    return (
      <AdminLayout>
        <AdminContentLoader />
      </AdminLayout>
    );
  if (error || !product)
    return (
      <AdminLayout>
        <div className="p-8 text-center text-red-500">{error || "Product not found"}</div>
      </AdminLayout>
    );

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
                    const form = document.getElementById("edit-product-form") as HTMLFormElement;
                    if (form) form.requestSubmit();
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

        {!isEditing ? (
          /* VIEW MODE */
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 items-start">
            {/* LEFT COLUMN: Image & Basic Info */}
            <div className="min-w-0 space-y-8">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={product.name}
                    className="w-full rounded-md border aspect-square object-cover"
                  />
                ) : (
                  <div className="aspect-square w-full overflow-hidden rounded-md border">
                    <ProductImageFallback className="h-full w-full" iconClassName="h-14 w-14" />
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <Badge variant={product.status === "ACTIVE" ? "success" : "secondary"} className="mb-1 font-normal">
                    {product.status === "ACTIVE" ? "Active" : "Draft"}
                  </Badge>
                  <Badge variant="outline" className="mb-1 ml-2">
                    {product.category?.name || "No Category"}
                  </Badge>
                  <h1 className="text-3xl font-bold text-foreground mb-2 break-words">{product.name}</h1>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-foreground">{formatCurrency(product.price)}</p>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <p className="text-lg text-muted-foreground line-through decoration-muted-foreground/40">
                        {formatCurrency(product.compareAtPrice)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Stock</h3>
                    <p className="text-sm">
                      {variantsGrid.length > 0
                        ? variantsGrid.reduce(
                            (sum, v) => sum + parseInt(String(v.stock ?? "0"), 10),
                            0,
                          )
                        : product.stock}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Description</h3>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {product.description || "No description"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Variants */}
            <div className="min-w-0 space-y-4 h-full bg-card rounded-md p-4 border shadow-sm">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Variants Configuration</h3>
                {variantsGrid.length > 0 ? (
                  <DataTable
                    {...ADMIN_LIST_DATA_TABLE_PROPS}
                    columns={ADMIN_VARIANT_VIEW_COLUMNS}
                    data={variantsGrid}
                    showToolbar={true}
                    filterColumnId="sku"
                    filterPlaceholder="Search by SKU…"
                    enableRowSelection={false}
                    noun="variants"
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                    <p>This product does not have any variants.</p>
                    <p className="text-sm mt-1">Switch to Edit mode to generate variants.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <form
            id="edit-product-form"
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 items-start"
          >
            {/* LEFT COLUMN: Image & Basic Info Edit */}
            <div className="min-w-0 space-y-8">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={product.name}
                    className="w-full rounded-md border aspect-square object-cover"
                  />
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
                    Change image
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="grid gap-6">
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
                        Total Stock <span className="text-red-500">*</span>
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
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Variants Edit */}
            <div className="min-w-0 space-y-6 h-full border rounded-md p-4 bg-card shadow-sm">
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
                      onClick={() => generateVariants(formData.name, formData.price)}
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
                  <div className="rounded-md border border-dashed bg-muted/20 py-6 text-center text-muted-foreground">
                    <p className="text-sm">No attributes configured.</p>
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
                    onBulkDelete={({ selectedData, clearSelection }) => {
                      setVariantsGrid(variantsGrid.filter((v) => !selectedData.includes(v)));
                      clearSelection();
                    }}
                  />
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
