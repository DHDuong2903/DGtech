// @ts-nocheck
import { Room } from "../models/roomModel.js";

function normalizeRoomName(name: unknown) {
  return typeof name === "string" ? name.trim() : "";
}

export async function createRoom(name: string, description: string) {
  const nextName = normalizeRoomName(name);
  if (!nextName) {
    throw Object.assign(new Error("Room name is required"), { status: 400 });
  }

  const existing = await Room.findOne({ where: { name: nextName } });
  if (existing) {
    throw Object.assign(new Error("Room already exists"), { status: 400 });
  }

  return Room.create({
    name: nextName,
    description: typeof description === "string" ? description.trim() : "",
  });
}

export async function updateRoom(roomId: number, name: string, description: string) {
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw Object.assign(new Error("Room does not exist"), { status: 404 });
  }

  const nextName = normalizeRoomName(name);
  if (!nextName) {
    throw Object.assign(new Error("Room name is required"), { status: 400 });
  }

  const duplicate = await Room.findOne({ where: { name: nextName } });
  if (duplicate && Number(duplicate.roomId) !== Number(roomId)) {
    throw Object.assign(new Error("Room already exists"), { status: 400 });
  }

  await room.update({
    name: nextName,
    description: typeof description === "string" ? description.trim() : "",
  });

  return room;
}

export async function deleteRoom(roomId: number) {
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw Object.assign(new Error("Room does not exist"), { status: 404 });
  }

  await room.destroy();
}

export async function getAllRooms() {
  return Room.findAll({
    order: [["name", "ASC"]],
  });
}
