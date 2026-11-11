import {
  deleteFablePveRoom,
  startFablePveCoordinator,
} from "./fablePveCoordinator";
import {
  initializeFablePveRoom,
  initializeFablePveRound,
} from "./initializeFablePveRoom";
import { deleteFightRoom } from "../drizzle/queries/fightRoom";
import { deleteCopiedBot } from "../drizzle/queries/hero";
import { sendFableReconnectSnapshot } from "./sendFableReconnectSnapshot";
import {
  fableFightRoomsCache,
  userRoomsCache,
  userSockets,
} from "../socket_helpers/socketCache";
import type { RoomType } from "../types/roomType";

type FightSocket = Bun.ServerWebSocket<{ heroId?: string }>;
const preparationTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const PREPARATION_TIMEOUT_MS = 60_000;

export const cancelPreparedFablePveRoom = (
  roomId: string,
  reason: "cancelled" | "expired",
) => {
  const room = fableFightRoomsCache.get(roomId);
  if (!room || room.status !== "waiting") return false;
  clearTimeout(preparationTimers.get(roomId));
  preparationTimers.delete(roomId);
  deleteFablePveRoom(roomId);
  const heroId = room.players[0].id;
  if (userRoomsCache.get(heroId)?.id === roomId) userRoomsCache.delete(heroId);
  const socket = userSockets.get(heroId);
  socket?.unsubscribe(roomId);
  socket?.send(
    JSON.stringify({ type: "encounterPreparationEnded", roomId, reason }),
  );
  void Promise.all([
    deleteFightRoom(roomId),
    deleteCopiedBot(room.players[1].id),
  ]).catch(error =>
    console.error("Failed to delete prepared fight room", roomId, error),
  );
  return true;
};

export const prepareFablePveRoom = (ws: FightSocket, legacyRoom: RoomType) => {
  const room = initializeFablePveRoom(legacyRoom);
  room.status = "waiting";
  room.preparationExpiresAtMs = Date.now() + PREPARATION_TIMEOUT_MS;
  room.rounds[0].exchanges[0].deadlines.attackAtMs = null;
  fableFightRoomsCache.set(room.id, room);
  userRoomsCache.set(room.players[0].id, { id: room.id, isPvp: false });
  ws.subscribe(room.id);
  preparationTimers.set(
    room.id,
    setTimeout(() => {
      cancelPreparedFablePveRoom(room.id, "expired");
    }, PREPARATION_TIMEOUT_MS),
  );
  ws.send(JSON.stringify({ type: "personal_room_update", data: room }));
  return room;
};

export const readyFablePveRoom = (
  server: Bun.Server,
  ws: FightSocket,
  roomId: string,
  startedAtMs = Date.now(),
) => {
  const room = fableFightRoomsCache.get(roomId);
  if (!room || room.players[0].id !== ws.data.heroId) return false;
  if (room.status === "active") {
    sendFableReconnectSnapshot(ws, room.players[0].id, startedAtMs);
    return true;
  }
  if (room.status !== "waiting") return false;
  if ((room.preparationExpiresAtMs ?? 0) <= startedAtMs) {
    cancelPreparedFablePveRoom(roomId, "expired");
    return false;
  }
  clearTimeout(preparationTimers.get(roomId));
  preparationTimers.delete(roomId);
  delete room.preparationExpiresAtMs;
  room.status = "active";
  room.startTime = startedAtMs;
  room.rounds = [
    initializeFablePveRound(
      room.players[0].id,
      room.players[1].id,
      room.currentRound,
      startedAtMs,
    ),
  ];
  ws.send(JSON.stringify({ type: "personal_room_update", data: room }));
  const started = startFablePveCoordinator(server, roomId);
  if (started) sendFableReconnectSnapshot(ws, room.players[0].id, startedAtMs);
  return started;
};

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
      data: room,
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
