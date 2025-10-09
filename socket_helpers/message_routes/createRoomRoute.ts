import { selectHero } from "../../drizzle/queries/hero";
import { calculateStatsHelper } from "../../helpers/calculateStatsHelper";
import type { RoomType } from "../../types/roomType";
import { fightRoomsCache, userRoomsCache } from "../socketCache";
import { topic } from "../socketTopics";

export const createRoomRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    roomId: string;
  },
) => {
  console.log("CREATING_ROOM");
  // Get userInfo from DB OR via socket?? (DB is safer)
  // Populate required fields in a const
  // Create a rom in rooms.MAP object

  try {
    const hero = await selectHero(parsedMessage.heroId);
    console.log("Hero", hero);
    if (hero) {
      const { hp: calcHp, ...calcStats } = calculateStatsHelper(hero?.stats);
      console.log("CALC_STATS", calcStats);

      const room: RoomType = {
        id: parsedMessage.roomId,
        status: "waiting",
        createdAt: new Date(),
        startTime: 0,
        turnTimeLimit: 60, //seconds. Maybe should be an enum?
        creator: {
          heroId: parsedMessage.heroId,
          nickname: hero.nickname,
        },
        currentRound: 1,
        players: [
          {
            id: parsedMessage.heroId,
            name: hero.nickname,
            hp: calcHp,
            maxHp: calcHp,
            stats: calcStats,
            history: {
              // Need to add to Hero DB object
              win: 0,
              loss: 0,
            },
            lvl: hero.lvl,
            exp: hero.exp,
            statsPoints: hero.statsPoints,
          },
        ],
        isPvp: true,
        rounds: [],
      };

      fightRoomsCache.set(parsedMessage.roomId, room);
      userRoomsCache.set(parsedMessage.heroId, {
        id: parsedMessage.roomId,
        isPvp: true,
      });

      ws.subscribe(parsedMessage.roomId);
      console.log("FIGHT_ROOMS", fightRoomsCache);

      ws.send(
        JSON.stringify({
          type: "personal_room_update",
          data: room,
        }),
      );

      const roomsArray = Array.from(userRoomsCache.values());

      server.publish(
        topic.activeFightRooms,
        JSON.stringify({
          type: "all_active_rooms",
          rooms: roomsArray,
        }),
      );
    } else {
      console.log("NO_HERO_FOUND");
    }
  } catch (err) {
    console.log("BAD_ERROR_500");
  }
};
