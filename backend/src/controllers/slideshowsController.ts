// @ts-nocheck
import { Op } from "sequelize";
import { sequelize } from "../libs/db.js";
import { Slideshow } from "../models/slideshowModel.js";
import { randomUUID } from "crypto";

const MAX_SLIDES = 10;
const TITLE_MAX = 160;
const DESC_MAX = 600;
const CTA_TEXT_MAX = 80;
const LINK_MAX = 2048;
const NAME_MAX = 160;

function normalizeCta(raw: unknown): { text: string; link: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  const link = typeof o.link === "string" ? o.link.trim() : "";
  if (!text || !link) return null;
  if (text.length > CTA_TEXT_MAX || link.length > LINK_MAX) return null;
  return { text, link };
}

function normalizeSlide(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  const image = typeof o.image === "string" ? o.image.trim() : "";
  let id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";

  if (!title || title.length > TITLE_MAX) return null;
  if (description.length > DESC_MAX) return null;
  if (!image || image.length > LINK_MAX) return null;

  if (!id) id = randomUUID();

  const cta = normalizeCta(o.cta);
  return {
    id,
    title,
    description,
    image,
    ...(cta ? { cta } : {}),
  };
}

function normalizeSlidesArray(slides: unknown): { ok: true; data: Record<string, unknown>[] } | { ok: false; error: string } {
  if (!Array.isArray(slides)) {
    return { ok: false, error: "slides must be an array" };
  }
  if (slides.length > MAX_SLIDES) {
    return { ok: false, error: `At most ${MAX_SLIDES} slides allowed` };
  }
  const normalized: Record<string, unknown>[] = [];
  for (let i = 0; i < slides.length; i++) {
    const s = normalizeSlide(slides[i]);
    if (!s) {
      return { ok: false, error: `Slide ${i + 1}: invalid data` };
    }
    normalized.push(s);
  }
  return { ok: true, data: normalized };
}

async function deactivateAllOthers(transaction: any) {
  await Slideshow.update(
    { isActive: false },
    { where: { slideshowId: { [Op.gt]: 0 } }, transaction }
  );
}

/** Public storefront: slides của campaign đang active */
export const getActiveSlideshowSlides = async (req: any, res: any) => {
  try {
    const row = await Slideshow.findOne({ where: { isActive: true } });
    if (!row || !Array.isArray(row.slides)) {
      return res.json({ slides: [] });
    }
    return res.json({ slides: row.slides });
  } catch (error: any) {
    console.error("getActiveSlideshowSlides:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const listSlideshows = async (req: any, res: any) => {
  try {
    const rows = await Slideshow.findAll({
      order: [
        ["isActive", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });
    return res.json({ message: "OK", slideshows: rows });
  } catch (error: any) {
    console.error("listSlideshows:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const createSlideshow = async (req: any, res: any) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const activate = Boolean(req.body.activate);
    if (!name || name.length > NAME_MAX) {
      return res.status(400).json({ error: "Valid name is required" });
    }

    const existing = await Slideshow.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: "A campaign with this name already exists" });
    }

    const norm = normalizeSlidesArray(req.body.slides ?? []);
    if (!norm.ok) {
      return res.status(400).json({ error: norm.error });
    }

    const row = await sequelize.transaction(async (transaction) => {
      if (activate) {
        await deactivateAllOthers(transaction);
      }
      return Slideshow.create(
        {
          name,
          slides: norm.data,
          isActive: activate,
        },
        { transaction }
      );
    });

    return res.status(201).json({ message: "Slideshow campaign created", slideshow: row });
  } catch (error: any) {
    console.error("createSlideshow:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const updateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const row = await Slideshow.findByPk(slideshowId);
    if (!row) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const patch: Record<string, unknown> = {};

    if (req.body.name !== undefined) {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      if (!name || name.length > NAME_MAX) {
        return res.status(400).json({ error: "Valid name is required" });
      }
      const taken = await Slideshow.findOne({
        where: {
          name,
          slideshowId: { [Op.ne]: slideshowId },
        },
      });
      if (taken) {
        return res.status(409).json({ error: "A campaign with this name already exists" });
      }
      patch.name = name;
    }

    if (req.body.slides !== undefined) {
      const norm = normalizeSlidesArray(req.body.slides);
      if (!norm.ok) {
        return res.status(400).json({ error: norm.error });
      }
      patch.slides = norm.data;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await row.update(patch);
    await row.reload();
    return res.json({ message: "Slideshow campaign updated", slideshow: row });
  } catch (error: any) {
    console.error("updateSlideshow:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const deleteSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const row = await Slideshow.findByPk(slideshowId);
    if (!row) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await row.destroy();
    return res.json({ message: "Slideshow campaign deleted" });
  } catch (error: any) {
    console.error("deleteSlideshow:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const activateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const row = await Slideshow.findByPk(slideshowId);
    if (!row) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await sequelize.transaction(async (transaction) => {
      await deactivateAllOthers(transaction);
      await row.update({ isActive: true }, { transaction });
    });

    await row.reload();
    const slideshows = await Slideshow.findAll({
      order: [
        ["isActive", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });
    return res.json({ message: "Campaign activated", slideshow: row, slideshows });
  } catch (error: any) {
    console.error("activateSlideshow:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const deactivateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const row = await Slideshow.findByPk(slideshowId);
    if (!row) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await row.update({ isActive: false });
    await row.reload();
    const slideshows = await Slideshow.findAll({
      order: [
        ["isActive", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });
    return res.json({ message: "Campaign deactivated", slideshow: row, slideshows });
  } catch (error: any) {
    console.error("deactivateSlideshow:", error);
    return res.status(500).json({ error: "Internal server error", details: error?.message });
  }
};

export const uploadSlideshowsImage = async (req: any, res: any) => {
  try {
    const url = req.file?.path;
    if (!url) {
      return res.status(400).json({ error: "No image file" });
    }
    return res.json({ url });
  } catch (error: any) {
    console.error("uploadSlideshowsImage:", error);
    return res.status(500).json({ error: "Upload failed", details: error?.message });
  }
};
