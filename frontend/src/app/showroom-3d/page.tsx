"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";
import { showroomApi } from "@/src/apis/showroomApi";
import type {
  ShowroomEligibleProduct,
  ShowroomSavedSetup,
  ShowroomScene,
  ShowroomSceneDetailResponse,
  ShowroomSceneSlot,
} from "@/src/types";
import { ShowroomCanvas } from "@/src/components/public/showroom/ShowroomCanvas";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { Spinner } from "@/src/components/ui/spinner";
import { ShowroomProductPreview } from "@/src/components/public/showroom/ShowroomProductPreview";
import { useUserRank } from "@/src/hooks";
import { isGoldRank, SHOWROOM_GOLD_REQUIRED_TOAST } from "@/src/lib/showroomAccess";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";

type SlotSelectionMap = Record<string, string>;

function stableSelectionKey(value: SlotSelectionMap) {
  return JSON.stringify(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .reduce<Record<string, string>>((acc, [slotId, productId]) => {
        acc[slotId] = productId;
        return acc;
      }, {}),
  );
}

function groupSceneCategories(slots: ShowroomSceneSlot[], products: ShowroomEligibleProduct[]) {
  const byCategoryId = new Map<
    number,
    {
      categoryId: number;
      categoryName: string;
      slots: ShowroomSceneSlot[];
      products: ShowroomEligibleProduct[];
    }
  >();

  slots.forEach((slot) => {
    if (!slot.isActive || slot.allowedCategoryId == null || !slot.allowedCategory?.name) return;

    const current = byCategoryId.get(slot.allowedCategoryId);
    if (current) {
      current.slots.push(slot);
      return;
    }

    byCategoryId.set(slot.allowedCategoryId, {
      categoryId: slot.allowedCategoryId,
      categoryName: slot.allowedCategory.name,
      slots: [slot],
      products: products.filter((product) => product.categoryId === slot.allowedCategoryId),
    });
  });

  return Array.from(byCategoryId.values()).sort((left, right) => left.categoryName.localeCompare(right.categoryName));
}

function getMatchingSlotsForProduct(product: ShowroomEligibleProduct, slots: ShowroomSceneSlot[]) {
  return slots.filter((slot) => slot.isActive && slot.allowedCategoryId === product.categoryId);
}

export default function Showroom3DPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, rank, isLoading: rankLoading, refresh, userId } = useUserRank();
  const rankRefreshAttemptedRef = useRef<string | null>(null);
  const [availableScenes, setAvailableScenes] = useState<ShowroomScene[]>([]);
  const [activeSceneKey, setActiveSceneKey] = useState<string | null>(null);
  const [sceneDetail, setSceneDetail] = useState<ShowroomSceneDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBySlot, setSelectedBySlot] = useState<SlotSelectionMap>({});
  const [savedSetup, setSavedSetup] = useState<ShowroomSavedSetup | null>(null);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [activeSelectionProductId, setActiveSelectionProductId] = useState<string | null>(null);
  const [pendingPlacementByProduct, setPendingPlacementByProduct] = useState<Record<string, string | null>>({});
  const [savingSetup, setSavingSetup] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    rankRefreshAttemptedRef.current = null;
  }, [userId]);

  useEffect(() => {
    let active = true;

    if (!isLoaded || !isSignedIn || rankLoading) {
      return () => {
        active = false;
      };
    }

    if (!isGoldRank(rank)) {
      if (userId && rankRefreshAttemptedRef.current !== userId) {
        rankRefreshAttemptedRef.current = userId;
        void refresh();
        return () => {
          active = false;
        };
      }

      toast.error(SHOWROOM_GOLD_REQUIRED_TOAST);
      router.replace("/");
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        const scenes = await showroomApi.getScenes();
        if (!active) return;

        setAvailableScenes(scenes);

        if (!scenes.length) {
          setSceneDetail(null);
          setError("No saved showroom scene is available yet.");
          return;
        }

        setError(null);
        setActiveSceneKey((current) => current ?? scenes[0].sceneKey);
      } catch (err: unknown) {
        console.error("Failed to load 3D showroom:", err);
        if (!active) return;
        setError(
          isAxiosError(err)
            ? ((err.response?.data as { error?: string } | undefined)?.error ?? "Could not load the 3D showroom")
            : "Could not load the 3D showroom",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, rank, rankLoading, refresh, router, userId]);

  useEffect(() => {
    let active = true;
    if (!activeSceneKey || !isGoldRank(rank)) {
      return () => {
        active = false;
      };
    }

    const loadScene = async () => {
      setSceneLoading(true);
      setSelectedBySlot({});
      setSavedSetup(null);
      setSelectedProductIds([]);
      setActiveSelectionProductId(null);
      setPendingPlacementByProduct({});
      try {
        const detail = await showroomApi.getSceneByKey(activeSceneKey);
        if (!active) return;
        setSceneDetail(detail);
        setSavedSetup(detail.savedSetup ?? null);
        setSelectedBySlot(detail.savedSetup?.selectedBySlot ?? {});
        setFocusedSlotId(null);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to load showroom scene:", err);
        if (!active) return;
        setError(
          isAxiosError(err)
            ? ((err.response?.data as { error?: string } | undefined)?.error ?? "Could not load the showroom scene")
            : "Could not load the showroom scene",
        );
      } finally {
        if (active) setSceneLoading(false);
      }
    };

    void loadScene();
    return () => {
      active = false;
    };
  }, [activeSceneKey, rank]);

  const sceneCategories = useMemo(
    () => groupSceneCategories(sceneDetail?.slots || [], sceneDetail?.eligibleProducts || []),
    [sceneDetail?.eligibleProducts, sceneDetail?.slots],
  );

  const occupants = useMemo(() => {
    if (!sceneDetail) return [];
    return sceneDetail.slots
      .map((slot) => {
        const productId = selectedBySlot[slot.slotId];
        const product = sceneDetail.eligibleProducts.find((item) => item.productId === productId);
        if (!product) return null;
        return { slot, product };
      })
      .filter(Boolean) as Array<{ slot: ShowroomSceneSlot; product: ShowroomEligibleProduct }>;
  }, [sceneDetail, selectedBySlot]);

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((productId) => sceneDetail?.eligibleProducts.find((product) => product.productId === productId) ?? null)
        .filter(Boolean) as ShowroomEligibleProduct[],
    [sceneDetail?.eligibleProducts, selectedProductIds],
  );
  const activeSelectedProduct =
    selectedProducts.find((product) => product.productId === activeSelectionProductId) ?? selectedProducts[0] ?? null;
  const selectedReadyCount = useMemo(
    () => selectedProducts.filter((product) => Boolean(pendingPlacementByProduct[product.productId])).length,
    [pendingPlacementByProduct, selectedProducts],
  );
  const hasUnsavedSetupChanges = useMemo(
    () => stableSelectionKey(selectedBySlot) !== stableSelectionKey(savedSetup?.selectedBySlot ?? {}),
    [savedSetup?.selectedBySlot, selectedBySlot],
  );

  const assignPendingPlacement = (productId: string, slotId: string | null) => {
    setPendingPlacementByProduct((prev) => {
      const next: Record<string, string | null> = { ...prev };
      Object.keys(next).forEach((key) => {
        if (slotId && next[key] === slotId && key !== productId) {
          next[key] = null;
        }
      });
      next[productId] = slotId;
      return next;
    });
  };

  const handleConfirmPlacement = () => {
    if (!selectedProducts.length) return;

    setSelectedBySlot((prev) => {
      const next = { ...prev };
      selectedProducts.forEach((product) => {
        const targetSlotId = pendingPlacementByProduct[product.productId];
        if (!targetSlotId) return;

        Object.keys(next).forEach((slotId) => {
          if (next[slotId] === product.productId || slotId === targetSlotId) {
            delete next[slotId];
          }
        });

        next[targetSlotId] = product.productId;
      });
      return next;
    });
    const lastAssignedSlotId =
      selectedProducts
        .map((product) => pendingPlacementByProduct[product.productId])
        .filter(Boolean)
        .at(-1) ?? null;
    setFocusedSlotId(lastAssignedSlotId);
    setSelectedProductIds([]);
    setActiveSelectionProductId(null);
    setPendingPlacementByProduct({});
  };

  const handleSelectSlot = (slotId: string | null) => {
    setFocusedSlotId(slotId);
    if (!slotId || !activeSelectedProduct || !sceneDetail) return;

    const slot = sceneDetail.slots.find((item) => item.slotId === slotId);
    if (!slot || slot.allowedCategoryId !== activeSelectedProduct.categoryId || !slot.isActive) return;

    assignPendingPlacement(activeSelectedProduct.productId, slotId);
  };

  const handleClearSlot = (slotId: string) => {
    setSelectedBySlot((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleSaveSetup = async () => {
    if (!activeSceneKey) return;
    setSavingSetup(true);
    try {
      const nextSavedSetup = await showroomApi.saveSceneSetup(activeSceneKey, { selectedBySlot });
      setSavedSetup(nextSavedSetup);
      toast.success("Showroom setup saved.");
    } catch (err: unknown) {
      console.error("Failed to save showroom setup:", err);
      toast.error(
        isAxiosError(err)
          ? ((err.response?.data as { error?: string } | undefined)?.error ?? "Could not save showroom setup")
          : "Could not save showroom setup",
      );
    } finally {
      setSavingSetup(false);
    }
  };

  const handleToggleSelectedProduct = (product: ShowroomEligibleProduct) => {
    const matchingSlots = sceneDetail ? getMatchingSlotsForProduct(product, sceneDetail.slots) : [];
    const isSelected = selectedProductIds.includes(product.productId);

    if (isSelected) {
      setSelectedProductIds((prev) => prev.filter((productId) => productId !== product.productId));
      setPendingPlacementByProduct((prev) => {
        const next = { ...prev };
        delete next[product.productId];
        return next;
      });
      setActiveSelectionProductId((current) => (current === product.productId ? null : current));
      return;
    }

    setSelectedProductIds((prev) => [...prev, product.productId]);
    setActiveSelectionProductId(product.productId);

    if (matchingSlots.length === 1) {
      assignPendingPlacement(product.productId, matchingSlots[0].slotId);
      setFocusedSlotId(matchingSlots[0].slotId);
      return;
    }

    assignPendingPlacement(product.productId, null);
  };

  if (!isLoaded || rankLoading || loading) {
    return <PageContentLoader className="bg-background" minHeightClass="min-h-[65vh]" />;
  }

  if (error && !sceneDetail) {
    return (
      <div className="bg-background">
        <div className={cn("mx-auto max-w-7xl py-6", STOREFRONT_H_PADDING)}>
          <Alert variant="destructive">
            <AlertTitle>Could not load showroom</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (activeSceneKey && (sceneLoading || !sceneDetail)) {
    return <PageContentLoader className="bg-background" minHeightClass="min-h-[65vh]" />;
  }

  if (!sceneDetail?.scene.roomModelUrl) {
    return (
      <div className="bg-background">
        <div className={cn("mx-auto max-w-7xl py-6", STOREFRONT_H_PADDING)}>
          <Alert>
            <AlertTitle>No showroom scene ready</AlertTitle>
            <AlertDescription>Admin has not saved a room model to the storefront yet.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>
        <div className="grid gap-4 xl:h-[calc(100dvh-5.5rem)] xl:grid-cols-[minmax(290px,0.84fr)_minmax(0,1.66fr)]">
          <aside className="flex min-h-0 max-h-[min(48dvh,780px)] flex-col overflow-hidden rounded-xl border bg-card p-4 xl:h-full xl:max-h-none">
            <div className="mb-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select value={activeSceneKey ?? undefined} onValueChange={setActiveSceneKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a scene" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableScenes.map((scene) => (
                        <SelectItem key={scene.sceneId} value={scene.sceneKey}>
                          {scene.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant={hasUnsavedSetupChanges ? "default" : "outline"}
                  disabled={savingSetup || !hasUnsavedSetupChanges}
                  onClick={() => void handleSaveSetup()}
                >
                  {savingSetup ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Save setup
                    </>
                  ) : (
                    "Save setup"
                  )}
                </Button>
              </div>

              {selectedProducts.length > 0 ? (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mt-3 space-y-3">
                    {activeSelectedProduct ? (
                      <div className="space-y-2">
                        {getMatchingSlotsForProduct(activeSelectedProduct, sceneDetail.slots).length > 1 ? (
                          <>
                            <p className="text-sm text-muted-foreground">Choose which position to place this product into.</p>
                            <div className="flex flex-wrap gap-2">
                              {getMatchingSlotsForProduct(activeSelectedProduct, sceneDetail.slots).map((slot) => (
                                <Button
                                  key={slot.slotId}
                                  type="button"
                                  size="sm"
                                  variant={pendingPlacementByProduct[activeSelectedProduct.productId] === slot.slotId ? "default" : "outline"}
                                  onClick={() => {
                                    assignPendingPlacement(activeSelectedProduct.productId, slot.slotId);
                                    setFocusedSlotId(slot.slotId);
                                  }}
                                >
                                  {slot.label}
                                </Button>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={selectedReadyCount === 0} onClick={handleConfirmPlacement}>
                        Fill placement
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setSelectedProductIds([]);
                          setActiveSelectionProductId(null);
                          setPendingPlacementByProduct({});
                        }}
                      >
                        Clear selected
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <h2 className="text-base font-semibold">Products</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only products with saved 3D models appear here.
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              {sceneCategories.map((group) => (
                <section key={group.categoryId} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">{group.categoryName}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Positions: {group.slots.map((slot) => slot.label).join(", ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-normal">
                      {group.products.length} items
                    </Badge>
                  </div>

                  {group.products.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
                      No 3D products are ready in this category yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {group.products.map((product) => {
                        const matchingSlots = getMatchingSlotsForProduct(product, sceneDetail.slots);
                        const placedInSlot =
                          group.slots.find((slot) => selectedBySlot[slot.slotId] === product.productId) ?? null;
                        const isSelected = selectedProductIds.includes(product.productId);

                        return (
                          <article
                            key={product.productId}
                            className={cn(
                              "rounded-xl border bg-card p-3 transition-colors",
                              placedInSlot ? "border-orange-400" : isSelected ? "border-primary" : "border-border",
                            )}
                          >
                            <div className="space-y-3">
                              <ShowroomProductPreview src={product.model3dUrl} className="rounded-[18px]" />
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                                </div>
                                <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{product.description}</p>
                                <div
                                  className={cn(
                                    "grid gap-2",
                                    placedInSlot ? "grid-cols-2" : "grid-cols-1",
                                  )}
                                >
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => handleToggleSelectedProduct(product)}
                                  >
                                    {isSelected ? "Selected" : "Select"}
                                  </Button>
                                  {placedInSlot ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => handleClearSlot(placedInSlot.slotId)}
                                    >
                                      Remove
                                    </Button>
                                  ) : null}
                                </div>
                                {matchingSlots.length > 1 && !placedInSlot ? (
                                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {matchingSlots.length} positions available
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 max-h-[min(52dvh,900px)] flex-col gap-4 xl:h-full xl:max-h-none">
            <div className="rounded-xl border bg-card p-3 xl:flex-1 xl:min-h-0">
              <div className="relative xl:h-full">
                <ShowroomCanvas
                  roomModelUrl={sceneDetail.scene.roomModelUrl}
                  slots={sceneDetail.slots}
                  occupants={occupants}
                  focusedSlotId={focusedSlotId}
                  onSelectSlot={handleSelectSlot}
                  className="xl:h-full"
                />
                {sceneLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
                    <div className="rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
                      Loading scene...
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="max-h-[min(22dvh,220px)] overflow-y-auto rounded-xl border bg-card p-4 xl:max-h-[220px]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Scene positions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Click a position label in the scene or use the list below to focus it. If you are selecting a product with multiple matching positions, click the exact position you want.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {sceneDetail.slots.map((slot) => {
                  const placedProductId = selectedBySlot[slot.slotId] ?? null;
                  const isPendingPlacement = Object.values(pendingPlacementByProduct).includes(slot.slotId);
                  const canReceiveActiveProduct =
                    activeSelectedProduct != null && slot.isActive && slot.allowedCategoryId === activeSelectedProduct.categoryId;
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      onClick={() => handleSelectSlot(slot.slotId)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-left text-sm transition-all",
                        focusedSlotId === slot.slotId ? "border-primary bg-primary/8" : "border-border hover:bg-muted/40",
                        canReceiveActiveProduct && "cursor-pointer",
                        isPendingPlacement && "ring-2 ring-primary/30",
                      )}
                    >
                      <span className="font-medium">{slot.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{placedProductId ? "Filled" : "Empty"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
