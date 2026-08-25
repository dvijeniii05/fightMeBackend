import {
  deleteFablePveRoom,
  startFablePveCoordinator,
} from "./fablePveCoordinator";
import { initializeFablePveRoom } from "./initializeFablePveRoom";
import {
  fableFightRoomsCache,
  userRoomsCache,
} from "../socket_helpers/socketCache";
import type { RoomType } from "../types/roomType";

type FightSocket = Bun.ServerWebSocket<{ heroId?: string }>;

export const activateFablePveRoom = (
  server: Bun.Server,
  ws: FightSocket,
  legacyRoom: RoomType,
  startedAtMs = Date.now(),
) => {
  const room = initializeFablePveRoom(legacyRoom, startedAtMs);

  fableFightRoomsCache.set(room.id, room);
  userRoomsCache.set(room.players[0].id, {
    id: room.id,
    isPvp: false,
  });
  ws.subscribe(room.id);
  ws.send(
    JSON.stringify({
      type: "personal_room_update",
      data: legacyRoom,
    }),
  );

  if (!startFablePveCoordinator(server, room.id)) {
    ws.unsubscribe(room.id);
    if (userRoomsCache.get(room.players[0].id)?.id === room.id) {
      userRoomsCache.delete(room.players[0].id);
    }
    deleteFablePveRoom(room.id);
    throw new Error(`Failed to start Fable PvE coordinator for ${room.id}`);
  }

  return room;
};
