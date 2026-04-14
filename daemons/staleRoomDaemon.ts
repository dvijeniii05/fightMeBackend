import { deleteFightRoom } from "../drizzle/queries/fightRoom";
import { fightRoomsCache, userRoomsCache } from "../socket_helpers/socketCache";

const ONE_HOUR_MS = 60 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

export const staleRoomDaemon = () => {
  console.info("🤖 ==> staleRoomDaemon is running");

  setInterval(async () => {
    const now = Date.now();

    for (const [roomId, room] of fightRoomsCache.entries()) {
      if (room.status !== "waiting" && room.status !== "finished") continue;

      const age = now - new Date(room.createdAt).getTime();
      if (age < ONE_HOUR_MS) continue;

      console.info(
        `[staleRoomDaemon] Removing stale room ${roomId} (waiting for ${Math.round(age / 60000)} min)`,
      );

      try {
        await deleteFightRoom(roomId);
      } catch (err) {
        console.error(
          `[staleRoomDaemon] Failed to delete room ${roomId} from DB:`,
          err,
        );
        continue; // leave it in cache so we retry next tick
      }

      // Remove from caches
      fightRoomsCache.delete(roomId);
      for (const [heroId, userRoom] of userRoomsCache.entries()) {
        if (userRoom.id === roomId) {
          userRoomsCache.delete(heroId);
        }
      }
    }
  }, POLL_INTERVAL_MS);
};
