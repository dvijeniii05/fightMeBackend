import { fightRoomsCache, userRoomsCache, userSockets } from "../socketCache";

export const reconnectRoomRoute = (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
  },
) => {
  console.log("RECONNECT_ROOM");

  try {
    const userRoom = userRoomsCache.get(parsedMessage.heroId);

    if (!userRoom) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "No active room found for this hero.",
        }),
      );
      return;
    }

    const room = fightRoomsCache.get(userRoom.id);

    if (!room || room.status === "finished") {
      // Room no longer exists or already finished — clean up stale mapping
      userRoomsCache.delete(parsedMessage.heroId);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Room is no longer active.",
        }),
      );
      return;
    }

    const isPlayerInRoom = room.players.some(
      p => p.id === parsedMessage.heroId,
    );

    if (!isPlayerInRoom) {
      userRoomsCache.delete(parsedMessage.heroId);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Hero is not a participant in this room.",
        }),
      );
      return;
    }

    // Update the socket reference so future publishes reach this client
    userSockets.set(parsedMessage.heroId, ws);

    // Re-subscribe to the room topic
    ws.subscribe(userRoom.id);

    // Send the current room state so the client can resume
    ws.send(
      JSON.stringify({
        type: "personal_room_update",
        data: room,
      }),
    );

    console.log(
      "RECONNECTED_HERO",
      parsedMessage.heroId,
      "TO_ROOM",
      userRoom.id,
    );
  } catch (err) {
    console.log("RECONNECT_ERROR", err);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Failed to reconnect to room.",
      }),
    );
  }
};
