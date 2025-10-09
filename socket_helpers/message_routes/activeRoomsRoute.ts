import { userRoomsCache } from "../socketCache";
import { topic } from "../socketTopics";

export const activeRoomsRoute = (
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
) => {
  const roomsArray = Array.from(userRoomsCache.values());
  console.log("ALL_ACTIVE_ROOMS", roomsArray);
  ws.subscribe(topic.activeFightRooms); //to subs to all active_rooms
  ws.send(
    JSON.stringify({
      type: "all_active_rooms",
      rooms: roomsArray,
    }),
  );
};
