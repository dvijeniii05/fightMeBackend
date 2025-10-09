import type { ActiveHeroesType } from "../types/activeHeroesType";
import type { RoomType, UserRoomType } from "../types/roomType";

// temp. local solution to store user session on runtime
export const userSockets = new Map<
  string,
  Bun.ServerWebSocket<{ heroId?: string }>
>();

//Should fetch current fightRooms from DB intially AND on restarts
export const fightRoomsCache = new Map<string, RoomType>();

export const userRoomsCache = new Map<string, UserRoomType>(); //Used to map user to room TO make sure 1 room per 1 user

//TODO: create a cache for activeUsers including nickname, max & currentHp, status i.e. active or in-fight

export const activeHeroesCache = new Map<string, ActiveHeroesType>();
