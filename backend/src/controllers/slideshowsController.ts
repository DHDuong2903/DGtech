// @ts-nocheck
import {
  getActiveSlides,
  listSlideshows as listSlideshowsSvc,
  createSlideshow as createSlideshowSvc,
  updateSlideshow as updateSlideshowSvc,
  deleteSlideshow as deleteSlideshowSvc,
  activateSlideshow as activateSlideshowSvc,
  deactivateSlideshow as deactivateSlideshowSvc,
} from "../services/slideshowService.js";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const getActiveSlideshowSlides = async (req: any, res: any) => {
  try {
    const slides = await getActiveSlides();
    return res.json({ slides });
  } catch (error: any) {
    console.error("getActiveSlideshowSlides:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Internal server error"),
      details: error?.message,
    });
  }
};

export const listSlideshows = async (req: any, res: any) => {
  try {
    const slideshows = await listSlideshowsSvc();
    return res.json({ message: "OK", slideshows });
  } catch (error: any) {
    console.error("listSlideshows:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Internal server error"),
      details: error?.message,
    });
  }
};

export const createSlideshow = async (req: any, res: any) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const activate = Boolean(req.body.activate);
    const slideshow = await createSlideshowSvc(name, req.body.slides, activate);
    return res.status(201).json({ message: "Slideshow campaign created", slideshow });
  } catch (error: any) {
    console.error("createSlideshow:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Internal server error") });
  }
};

export const updateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) return res.status(400).json({ error: "Invalid id" });
    const slideshow = await updateSlideshowSvc(slideshowId, req.body);
    return res.json({ message: "Slideshow campaign updated", slideshow });
  } catch (error: any) {
    console.error("updateSlideshow:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Internal server error") });
  }
};

export const deleteSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) return res.status(400).json({ error: "Invalid id" });
    await deleteSlideshowSvc(slideshowId);
    return res.json({ message: "Slideshow campaign deleted" });
  } catch (error: any) {
    console.error("deleteSlideshow:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Internal server error") });
  }
};

export const activateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) return res.status(400).json({ error: "Invalid id" });
    const { slideshow, slideshows } = await activateSlideshowSvc(slideshowId);
    return res.json({ message: "Campaign activated", slideshow, slideshows });
  } catch (error: any) {
    console.error("activateSlideshow:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Internal server error") });
  }
};

export const deactivateSlideshow = async (req: any, res: any) => {
  try {
    const slideshowId = parseInt(req.params.slideshowId, 10);
    if (Number.isNaN(slideshowId)) return res.status(400).json({ error: "Invalid id" });
    const { slideshow, slideshows } = await deactivateSlideshowSvc(slideshowId);
    return res.json({ message: "Campaign deactivated", slideshow, slideshows });
  } catch (error: any) {
    console.error("deactivateSlideshow:", error);
    return res.status(getHttpStatusForError(error)).json({ error: getPublicErrorMessage(error, "Internal server error") });
  }
};

export const uploadSlideshowsImage = async (req: any, res: any) => {
  try {
    const url = req.file?.path;
    if (!url) return res.status(400).json({ error: "No image file" });
    return res.json({ url });
  } catch (error: any) {
    console.error("uploadSlideshowsImage:", error);
    return res.status(500).json({ error: "Upload failed", details: error?.message });
  }
};
