"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Spinner } from "@/src/components/ui/spinner";
import type { HeroSlide, SlideshowCampaign, SlideshowCampaignFormData } from "../../types";
import { isValidImage } from "../../utils";
import { slideshowsApi } from "../../apis/slideshowsApi";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";

const MAX_SLIDES = 10;

function newSlideId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Local slide row: URL from server and/or pending file (uploaded on Save, like product modal). */
type ModalSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageFile: File | null;
  imagePreview: string | null;
  cta?: HeroSlide["cta"];
};

const emptySlide = (): ModalSlide => ({
  id: newSlideId(),
  title: "",
  description: "",
  image: "",
  imageFile: null,
  imagePreview: null,
});

function heroSlideFromModal(s: ModalSlide, imageUrl: string): HeroSlide {
  const title = s.title.trim();
  const description = s.description.trim();
  const text = s.cta?.text?.trim() ?? "";
  const link = s.cta?.link?.trim() ?? "";
  const hasCta = text && link;
  const base = { id: s.id, title, description: description || "", image: imageUrl };
  if (!hasCta) return base;
  return { ...base, cta: { text, link } };
}

/** Validate, upload pending files, return API-ready slides. */
async function buildHeroSlidesForSave(slides: ModalSlide[]): Promise<HeroSlide[]> {
  type Row = { slide: ModalSlide; imagePromise: Promise<string> };
  const rows: Row[] = [];

  for (const s of slides) {
    const title = s.title.trim();
    const description = s.description.trim();
    const hasImage = !!s.imageFile || !!s.image.trim();
    if (!title && !description && !hasImage) continue;
    if (!title || !hasImage) {
      throw new Error("Each slide needs a title and an image (use Upload). Remove incomplete slides.");
    }
    const imagePromise = s.imageFile
      ? slideshowsApi.uploadImage(s.imageFile)
      : Promise.resolve(s.image.trim());
    rows.push({ slide: s, imagePromise });
  }

  const imageUrls = await Promise.all(rows.map((r) => r.imagePromise));
  return rows.map((r, i) => heroSlideFromModal(r.slide, imageUrls[i]));
}

interface SlideshowCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SlideshowCampaignFormData) => Promise<boolean>;
  campaign?: SlideshowCampaign | null;
  mode: "create" | "edit";
}

export const SlideshowCampaignModal = ({ isOpen, onClose, onSave, campaign, mode }: SlideshowCampaignModalProps) => {
  const [name, setName] = useState("");
  const [slides, setSlides] = useState<ModalSlide[]>([]);
  const [activateOnCreate, setActivateOnCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && campaign) {
      setName(campaign.name);
      setSlides(
        Array.isArray(campaign.slides) && campaign.slides.length > 0
          ? campaign.slides.map((s) => ({
              ...s,
              id: s.id || newSlideId(),
              imageFile: null,
              imagePreview: null,
            }))
          : [emptySlide()],
      );
      setActivateOnCreate(false);
    } else {
      setName("");
      setSlides([emptySlide()]);
      setActivateOnCreate(false);
    }
  }, [isOpen, mode, campaign]);

  const updateSlide = (index: number, patch: Partial<ModalSlide>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const updateCta = (index: number, patch: { text?: string; link?: string }) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const nextCta = { ...s.cta, ...patch };
        const text = nextCta.text ?? "";
        const link = nextCta.link ?? "";
        if (!text.trim() && !link.trim()) {
          const { cta: _, ...rest } = s;
          return rest as ModalSlide;
        }
        return { ...s, cta: { text, link } };
      }),
    );
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const v = isValidImage(file);
    if (!v.valid) {
      toast.error(v.error ?? "Invalid image");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateSlide(index, {
        imageFile: file,
        imagePreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) {
      toast.error(`At most ${MAX_SLIDES} slides`);
      return;
    }
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => (prev.length <= 1 ? [emptySlide()] : prev.filter((_, i) => i !== index)));
  };

  const moveSlide = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Slideshow name is required");
      return;
    }
    setSaving(true);
    try {
      let prepared: HeroSlide[];
      try {
        prepared = await buildHeroSlidesForSave(slides);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid slides");
        return;
      }
      if (prepared.length === 0) {
        toast.error("Add at least one complete slide.");
        return;
      }

      const payload: SlideshowCampaignFormData = {
        name: trimmedName,
        slides: prepared,
        ...(mode === "create" ? { activate: activateOnCreate } : {}),
      };
      const ok = await onSave(payload);
      if (ok) onClose();
    } catch (err) {
      console.error(err);
      toast.error("Upload or save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{mode === "create" ? "New slideshow" : "Edit slideshow"}</DialogTitle>
          <DialogDescription>
            Only one slideshow can be active. Max {MAX_SLIDES} slides per slideshow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="slideshow-name" className="text-sm font-medium">
                  Slideshow name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slideshow-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Christmas 2026"
                  className="h-9"
                  autoComplete="off"
                />
              </div>

              {mode === "create" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="activate-on-create"
                    checked={activateOnCreate}
                    onCheckedChange={(v) => setActivateOnCreate(!!v)}
                  />
                  <Label htmlFor="activate-on-create" className="text-sm font-normal leading-none">
                    Set as active slideshow
                  </Label>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">Slides</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSlide}
                  disabled={slides.length >= MAX_SLIDES || saving}
                >
                  <Plus className="h-4 w-4" />
                  Add slide
                </Button>
              </div>

              <div className="space-y-4">
                {slides.map((slide, index) => (
                  <Card key={slide.id} className="gap-3 py-3">
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-0 pt-0">
                      <CardTitle className="text-sm font-semibold">Slide {index + 1}</CardTitle>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0 || saving}
                          onClick={() => moveSlide(index, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === slides.length - 1 || saving}
                          onClick={() => moveSlide(index, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          disabled={saving}
                          onClick={() => removeSlide(index)}
                          aria-label="Remove slide"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 pb-0 pt-0 sm:grid-cols-2">
                      <div className="grid min-w-0 gap-2 sm:col-span-2">
                        <Label className="text-sm font-medium">
                          Image <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={saving}
                            onClick={() => document.getElementById(`modal-file-${slide.id}`)?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            Upload Image
                          </Button>
                          <input
                            id={`modal-file-${slide.id}`}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => handleImageChange(index, e)}
                          />
                        </div>
                        {slide.imagePreview || slide.image ? (
                          <div className="bg-muted relative mt-1 aspect-video w-full min-w-0 overflow-hidden rounded-md border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slide.imagePreview || slide.image}
                              alt=""
                              className="size-full object-cover"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-sm font-medium">
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={slide.title}
                          onChange={(e) => updateSlide(index, { title: e.target.value })}
                          className="h-9"
                          disabled={saving}
                        />
                      </div>
                      <div className="grid min-w-0 gap-2 sm:col-span-2">
                        <Label className="text-sm font-medium">Description</Label>
                        <Textarea
                          value={slide.description}
                          onChange={(e) => updateSlide(index, { description: e.target.value })}
                          rows={2}
                          className="min-h-[64px] resize-y"
                          disabled={saving}
                        />
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-sm font-medium">Button label</Label>
                        <Input
                          value={slide.cta?.text ?? ""}
                          onChange={(e) => updateCta(index, { text: e.target.value })}
                          className="h-9"
                          disabled={saving}
                        />
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <Label className="text-sm font-medium">Button URL</Label>
                        <Input
                          value={slide.cta?.link ?? ""}
                          onChange={(e) => updateCta(index, { link: e.target.value })}
                          className="h-9"
                          disabled={saving}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
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
