// @ts-nocheck
import {
  createRoom as createRoomSvc,
  updateRoom as updateRoomSvc,
  deleteRoom as deleteRoomSvc,
  getAllRooms as getAllRoomsSvc,
} from "../services/roomService.js";
import { getHttpStatusForError, getPublicErrorMessage } from "../helpers/dbResilience.js";

export const createRoom = async (req: any, res: any) => {
  try {
    const { name, description } = req.body;
    const newRoom = await createRoomSvc(name, description);
    return res.status(201).json({ message: "Room created successfully", newRoom });
  } catch (error: any) {
    console.error("createRoom:", error);
    return res.status(getHttpStatusForError(error)).json({ message: getPublicErrorMessage(error, "Could not create room") });
  }
};

export const updateRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;
    const room = await updateRoomSvc(roomId, name, description);
    return res.status(200).json({ message: "Room updated successfully", room });
  } catch (error: any) {
    console.error("updateRoom:", error);
    return res.status(getHttpStatusForError(error)).json({ message: getPublicErrorMessage(error, "Could not update room") });
  }
};

export const deleteRoom = async (req: any, res: any) => {
  try {
    await deleteRoomSvc(req.params.roomId);
    return res.status(200).json({ message: "Room deleted successfully" });
  } catch (error: any) {
    console.error("deleteRoom:", error);
    return res.status(getHttpStatusForError(error)).json({ message: getPublicErrorMessage(error, "Could not delete room") });
  }
};

export const getAllRooms = async (_req: any, res: any) => {
  try {
    const rooms = await getAllRoomsSvc();
    return res.status(200).json({ message: "Rooms retrieved successfully", rooms });
  } catch (error: any) {
    console.error("getAllRooms:", error);
    return res.status(getHttpStatusForError(error)).json({ message: getPublicErrorMessage(error, "Could not load rooms") });
  }
};
