"use client";

import React, { useMemo, useState } from "react";
import type { Product, ProductVariant } from "@/src/types";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Sofa } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import {
  attrsLabel,
  formatMoney,
  variantList,
  variantUnitPrice,
} from "@/src/components/admin/discount-campaigns/discountCampaignProductUi";

const qtyInputClass =
  "h-8 w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export type SelectedBundleLineKey = string;

type ProductBlock =
  | { productId: string; product: Product; mode: "single" }
  | {
      productId: string;
      product: Product;
      mode: "multi";
      selectedVariants: { variantId: string; variant: ProductVariant }[];
    };

function hasRealVariants(p: Product) {
  return variantList(p).filter((v) => !v.isDefault).length > 0;
}

function buildProductBlocks(
  productIds: string[],
  productDetails: Record<string, Product | undefined>,
  variantByProduct: Record<string, string[]>,
  variantAllByProduct: Record<string, string[]>
): ProductBlock[] {
  const out: ProductBlock[] = [];
  for (const pid of productIds) {
    const full = productDetails[pid];
    if (!full) continue;
    const all = variantList(full);
    const allIds = all.map((v) => v.variantId as string);
    const sel =
      variantByProduct[pid] ??
      (variantAllByProduct[pid]?.length ? variantAllByProduct[pid]! : allIds);

    if (!sel?.length) continue;

    if (hasRealVariants(full)) {
      const realVars = all.filter((v) => !v.isDefault);
      const byVid = new Map(realVars.map((v) => [v.variantId as string, v]));
      const selectedVariants: { variantId: string; variant: ProductVariant }[] = [];
      for (const vid of sel) {
        const v = byVid.get(vid);
        if (v) selectedVariants.push({ variantId: vid, variant: v });
      }
      if (!selectedVariants.length) continue;
      out.push({ productId: pid, product: full, mode: "multi", selectedVariants });
    } else {
      out.push({ productId: pid, product: full, mode: "single" });
    }
  }
  return out;
}

type Props = {
  productIds: string[];
  variantByProduct: Record<string, string[]>;
  variantAllByProduct: Record<string, string[]>;
  productDetails: Record<string, Product | undefined>;
  onDeleteRows: (lineKeys: SelectedBundleLineKey[]) => void;
  quantities: Record<string, number>;
  onQuantityChange: (variantId: string, qty: number) => void;
  /** True while edit mode is hydrating selection from server (show spinner, not empty state). */
  isHydratingSelection?: boolean;
};

export function BundleSelectedProductsTable({
  productIds,
  variantByProduct,
  variantAllByProduct,
  productDetails,
  onDeleteRows,
  quantities,
  onQuantityChange,
  isHydratingSelection = false,
}: Props) {
  const [marked, setMarked] = useState<string[]>([]);

  const blocks = useMemo(
    () => buildProductBlocks(productIds, productDetails, variantByProduct, variantAllByProduct),
    [productIds, productDetails, variantByProduct, variantAllByProduct]
  );

  const toggleMark = (key: string) => {
    setMarked((m) => (m.includes(key) ? m.filter((x) => x !== key) : [...m, key]));
  };

  const handleDelete = () => {
    if (!marked.length) return;
    onDeleteRows(marked);
    setMarked([]);
  };

  if (isHydratingSelection) {
    return (
      <div className="border-muted flex min-h-[200px] w-full flex-1 items-center justify-center rounded-md border bg-muted/20">
        <AdminContentLoader minHeightClass="min-h-0" />
      </div>
    );
  }

  if (!productIds.length) {
    return <p className="text-muted-foreground text-sm">No products selected yet.</p>;
  }

  const loadingIncomplete = productIds.some((pid) => !productDetails[pid]);

  return (
    <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-2">
      <div className="flex min-h-0 flex-1 w-full overflow-y-auto overflow-x-hidden rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_hsl(var(--border))]">
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead className="w-28 text-right">Price</TableHead>
              <TableHead className="w-28 text-center">Quantity</TableHead>
              <TableHead className="w-28 text-right">
                {marked.length > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDelete}
                  >
                    Remove ({marked.length})
                  </Button>
                ) : null}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingIncomplete ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center">
                  <AdminContentLoader minHeightClass="min-h-0" />
                </TableCell>
              </TableRow>
            ) : blocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                  No lines to show.
                </TableCell>
              </TableRow>
            ) : (
              blocks.map((block) => {
                const full = block.product;

                if (block.mode === "single") {
                  const key = block.productId;
                  const v = variantList(full)[0];
                  const variantId = v?.variantId as string | undefined;
                  const unit = v ? variantUnitPrice(v) : 0;
                  return (
                    <TableRow key={key} className="bg-muted/20 hover:bg-muted/30">
                      <TableCell className="w-10">
                        <Checkbox
                          checked={marked.includes(key)}
                          onCheckedChange={() => toggleMark(key)}
                          aria-label={`Mark ${full.name} for removal`}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 whitespace-normal">
                        <div className="flex min-w-0 items-center gap-2 pr-4">
                          <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                            {full.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={full.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-muted-foreground flex h-full items-center justify-center text-[9px]">
                                <Sofa className="text-muted-foreground h-4 w-4" />
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 truncate font-semibold leading-tight">{full.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-28 text-right text-xs tabular-nums font-semibold text-foreground">
                        {formatMoney(unit)}
                      </TableCell>
                      <TableCell className="w-28 text-center">
                        {variantId ? (
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className={qtyInputClass}
                            value={quantities[variantId] ?? 1}
                            onChange={(e) =>
                              onQuantityChange(variantId, Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                          />
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  );
                }

                // Multi-variant product
                const parentKey = block.productId;
                return (
                  <React.Fragment key={parentKey}>
                    <TableRow className="bg-muted/20">
                      <TableCell className="w-10">
                        <Checkbox
                          checked={marked.includes(parentKey)}
                          onCheckedChange={() => toggleMark(parentKey)}
                          aria-label={`Mark product ${full.name} for removal`}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 whitespace-normal" colSpan={4}>
                        <div className="flex min-w-0 items-center gap-2 pr-4">
                          <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                            {full.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={full.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-muted-foreground flex h-full items-center justify-center text-[9px]">
                                <Sofa className="text-muted-foreground h-4 w-4" />
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 truncate font-semibold leading-tight">{full.name}</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {block.selectedVariants.map(({ variantId, variant: v }) => {
                      const rowKey = `${block.productId}:${variantId}`;
                      const unit = variantUnitPrice(v);
                      return (
                        <TableRow key={rowKey} className="hover:bg-muted/40">
                          <TableCell className="w-10 pl-9">
                            <Checkbox
                              checked={marked.includes(rowKey)}
                              onCheckedChange={() => toggleMark(rowKey)}
                              aria-label={`Mark variant for removal`}
                            />
                          </TableCell>
                          <TableCell className="max-w-0 whitespace-normal">
                            <span className="text-foreground text-xs font-medium leading-tight">
                              {attrsLabel(v.attributes)}
                            </span>
                          </TableCell>
                          <TableCell className="w-28 text-right text-xs tabular-nums font-semibold text-foreground">
                            {formatMoney(unit)}
                          </TableCell>
                          <TableCell className="w-28 text-center">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              className={qtyInputClass}
                              value={quantities[variantId] ?? 1}
                              onChange={(e) =>
                                onQuantityChange(variantId, Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                            />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
