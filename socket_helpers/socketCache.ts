import type { ActiveHeroesType } from "../types/activeHeroesType";
import type { RoomType, UserRoomType } from "../types/roomType";

// temp. local solution to store user session on runtime
export const userSockets = new Map<
  string,
  Bun.ServerWebSocket<{ heroId?: string }>
>();

//Should fetch current fightRooms from DB intially AND on restart
{
  /*
  actual cache of ALL fightRooms including its status, players, startTime, etc. This is the source of truth for all room-related info during runtime.
  */
}
export const fightRoomsCache = new Map<string, RoomType>();

{
  /*
  This is used to quickly find the room for a specific user. It maps heroId to roomId. Whenever a user tries to join or reconnect, we can quickly check this cache to find their room without having to iterate through all rooms.
  */
}
export const userRoomsCache = new Map<string, UserRoomType>(); //Used to map user to room TO make sure 1 room per 1 user

{
  /*
  This cache keeps track of all currently active/online heroes irrelevant of rooms
  */
}
export const activeHeroesCache = new Map<string, ActiveHeroesType>();
