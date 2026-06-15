// @ts-nocheck
import {
  createAdminShowroomScene as createAdminShowroomSceneSvc,
  deleteAdminShowroomScene as deleteAdminShowroomSceneSvc,
  getAdminShowroomSceneById as getAdminShowroomSceneByIdSvc,
  getAdminShowroomScenes as getAdminShowroomScenesSvc,
  getGoldShowroomSceneByKey as getGoldShowroomSceneByKeySvc,
  getGoldShowroomScenes as getGoldShowroomScenesSvc,
  saveGoldShowroomSceneSetup as saveGoldShowroomSceneSetupSvc,
  updateAdminShowroomScene as updateAdminShowroomSceneSvc,
  updateAdminShowroomSlot as updateAdminShowroomSlotSvc,
} from "../services/showroomService.js";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const getGoldShowroomScenes = async (_req: any, res: any) => {
  try {
    const payload = await getGoldShowroomScenesSvc();
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("getGoldShowroomScenes:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not load showroom scenes"),
    });
  }
};

export const getGoldShowroomSceneByKey = async (req: any, res: any) => {
  try {
    const payload = await getGoldShowroomSceneByKeySvc(req.params.sceneKey, req.auth?.userId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("getGoldShowroomSceneByKey:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not load showroom scene"),
    });
  }
};

export const saveGoldShowroomSceneSetup = async (req: any, res: any) => {
  try {
    const payload = await saveGoldShowroomSceneSetupSvc(req.auth?.userId, req.params.sceneKey, req.body);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("saveGoldShowroomSceneSetup:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not save showroom setup"),
    });
  }
};

export const getAdminShowroomScenes = async (_req: any, res: any) => {
  try {
    const payload = await getAdminShowroomScenesSvc();
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("getAdminShowroomScenes:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not load admin showroom scenes"),
    });
  }
};

export const createAdminShowroomScene = async (req: any, res: any) => {
  try {
    const payload = await createAdminShowroomSceneSvc(req.body, req.file);
    return res.status(201).json(payload);
  } catch (error: any) {
    console.error("createAdminShowroomScene:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not create showroom scene"),
    });
  }
};

export const getAdminShowroomSceneById = async (req: any, res: any) => {
  try {
    const payload = await getAdminShowroomSceneByIdSvc(req.params.sceneId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("getAdminShowroomSceneById:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not load showroom scene"),
    });
  }
};

export const updateAdminShowroomSlot = async (req: any, res: any) => {
  try {
    const payload = await updateAdminShowroomSlotSvc(req.params.sceneId, req.params.slotId, req.body);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("updateAdminShowroomSlot:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not update showroom slot"),
    });
  }
};

export const deleteAdminShowroomScene = async (req: any, res: any) => {
  try {
    const payload = await deleteAdminShowroomSceneSvc(req.params.sceneId);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("deleteAdminShowroomScene:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not delete showroom scene"),
    });
  }
};

export const updateAdminShowroomScene = async (req: any, res: any) => {
  try {
    const payload = await updateAdminShowroomSceneSvc(req.params.sceneId, req.body, req.file);
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("updateAdminShowroomScene:", error);
    return res.status(getHttpStatusForError(error)).json({
      error: getPublicErrorMessage(error, "Could not save showroom scene"),
    });
  }
};
