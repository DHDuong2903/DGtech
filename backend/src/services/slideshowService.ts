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
  return { id, title, description, image, ...(cta ? { cta } : {}) };
}

export function normalizeSlidesArray(
  slides: unknown
): { ok: true; data: Record<string, unknown>[] } | { ok: false; error: string } {
  if (!Array.isArray(slides)) return { ok: false, error: "slides must be an array" };
  if (slides.length > MAX_SLIDES) return { ok: false, error: `At most ${MAX_SLIDES} slides allowed` };
  const normalized: Record<string, unknown>[] = [];
  for (let i = 0; i < slides.length; i++) {
    const s = normalizeSlide(slides[i]);
    if (!s) return { ok: false, error: `Slide ${i + 1}: invalid data` };
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

export async function getActiveSlides() {
  const row = await Slideshow.findOne({ where: { isActive: true } });
  if (!row || !Array.isArray(row.slides)) return [];
  return row.slides;
}

export async function listSlideshows() {
  return Slideshow.findAll({
    order: [["isActive", "DESC"], ["updatedAt", "DESC"]],
  });
}

export async function createSlideshow(name: string, slides: unknown, activate: boolean) {
  if (!name || name.length > NAME_MAX) {
    throw Object.assign(new Error("Valid name is required"), { status: 400 });
  }
  const existing = await Slideshow.findOne({ where: { name } });
  if (existing) {
    throw Object.assign(new Error("A campaign with this name already exists"), { status: 409 });
  }
  const norm = normalizeSlidesArray(slides ?? []);
  if (!norm.ok) throw Object.assign(new Error(norm.error), { status: 400 });

  return sequelize.transaction(async (transaction) => {
    if (activate) await deactivateAllOthers(transaction);
    return Slideshow.create({ name, slides: norm.data, isActive: activate }, { transaction });
  });
}

export async function updateSlideshow(slideshowId: number, body: Record<string, unknown>) {
  const row = await Slideshow.findByPk(slideshowId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > NAME_MAX) {
      throw Object.assign(new Error("Valid name is required"), { status: 400 });
    }
    const taken = await Slideshow.findOne({
      where: { name, slideshowId: { [Op.ne]: slideshowId } },
    });
    if (taken) {
      throw Object.assign(new Error("A campaign with this name already exists"), { status: 409 });
    }
    patch.name = name;
  }

  if (body.slides !== undefined) {
    const norm = normalizeSlidesArray(body.slides);
    if (!norm.ok) throw Object.assign(new Error(norm.error), { status: 400 });
    patch.slides = norm.data;
  }

  if (Object.keys(patch).length === 0) {
    throw Object.assign(new Error("No valid fields to update"), { status: 400 });
  }

  await row.update(patch);
  await row.reload();
  return row;
}

export async function deleteSlideshow(slideshowId: number) {
  const row = await Slideshow.findByPk(slideshowId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  await row.destroy();
}

export async function activateSlideshow(slideshowId: number) {
  const row = await Slideshow.findByPk(slideshowId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });

  await sequelize.transaction(async (transaction) => {
    await deactivateAllOthers(transaction);
    await row.update({ isActive: true }, { transaction });
  });

  await row.reload();
  const slideshows = await Slideshow.findAll({
    order: [["isActive", "DESC"], ["updatedAt", "DESC"]],
  });
  return { slideshow: row, slideshows };
}

export async function deactivateSlideshow(slideshowId: number) {
  const row = await Slideshow.findByPk(slideshowId);
  if (!row) throw Object.assign(new Error("Campaign not found"), { status: 404 });

  await row.update({ isActive: false });
  await row.reload();
  const slideshows = await Slideshow.findAll({
    order: [["isActive", "DESC"], ["updatedAt", "DESC"]],
  });
  return { slideshow: row, slideshows };
}
