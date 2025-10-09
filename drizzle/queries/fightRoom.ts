import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  fightRoomSxma,
  type InsertFightRoom,
  type SelectFightRoom,
} from "../schema/fightRoom";

export const insertFightRoom = async (data: InsertFightRoom) => {
  await db.insert(fightRoomSxma).values(data);
};

export const updateFightRoom = async (data: Partial<InsertFightRoom>) => {
  const updatedFightRoom = await db
    .update(fightRoomSxma)
    .set({ ...data })
    .where(eq(fightRoomSxma.roomId, data.roomId!));

  return updatedFightRoom;
};
