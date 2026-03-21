import { fightRoomsCache } from "../socketCache";
import { topic } from "../socketTopics";

export const activeFightRoomsRoute = (
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
) => {
  const roomsArray = Array.from(fightRoomsCache.values());
  // console.log("FIGHT_ROOMS_ARRAY", roomsArray);
  ws.subscribe(topic.activeFightRooms); //to subs to all active_rooms
  ws.send(
    JSON.stringify({
      type: topic.activeFightRooms,
      rooms: roomsArray,
    }),
  );
};
