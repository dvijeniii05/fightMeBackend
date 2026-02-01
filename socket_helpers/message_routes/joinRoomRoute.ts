import { selectHero } from "../../drizzle/queries/hero";
import { calculateStatsHelper } from "../../helpers/calculateStatsHelper";
import { fightRoomsCache, userRoomsCache } from "../socketCache";

export const joinRoomRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    roomId: string;
  },
) => {
  console.log("JOINING_ROOM");

  try {
    const hero = await selectHero(parsedMessage.heroId);
    console.log("Hero", hero);
    if (hero) {
      const { hp: calcHp, ...calcStats } = calculateStatsHelper(hero);
      console.log("CALC_STATS", calcStats);

      const selectedRoom = fightRoomsCache.get(parsedMessage.roomId);

      if (selectedRoom) {
        //TODO: should not be even possible to join if the fight is already in progress
        if (selectedRoom.players.length >= 2) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room is already full.",
            }),
          );
          return;
        }

        // Add player to the room with stats
        selectedRoom.players.push({
          id: parsedMessage.heroId,
          name: hero.nickname,
          hp: calcHp,
          maxHp: calcHp,
          stats: calcStats,
          lvl: hero.lvl,
          exp: hero.exp,
          statsPoints: hero.statsPoints,
          history: {
            // Need to add to Hero DB object
            win: 0,
            loss: 0,
          },
        });

        selectedRoom.status = "active";

        userRoomsCache.set(parsedMessage.heroId, {
          id: parsedMessage.roomId,
          isPvp: true,
        });

        ws.subscribe(parsedMessage.roomId);
        console.log("FIGHT_ROOMS", fightRoomsCache);
        // Notify players about the fight starting
        server.publish(
          parsedMessage.roomId,
          JSON.stringify({
            type: "personal_room_update",
            data: selectedRoom,
          }),
        );
      } else {
        console.log("NO_ROOM_FOR_THIS_USER");
      }
    } else {
      console.log("NO_HERO_FOUND");
    }
  } catch (err) {
    console.log("BAD_ERROR_500");
  }
};
