import { selectHero } from "../../drizzle/queries/hero";
import { selectFightRoom } from "../../drizzle/queries/fightRoom";
import { activateFablePveRoom } from "../../helpers/activateFablePveRoom";
import { calculateStatsHelper } from "../../helpers/calculateStatsHelper";
import type { RoomType } from "../../types/roomType";
import { fightRoomsCache } from "../socketCache";
import { topic } from "../socketTopics";
import { isValidSkillLoadout } from "../../constants/skills";

export const createBotRoomRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
    roomId: string;
    botId: string;
  },
) => {
  console.log("CREATING_ROOM");
  // Get userInfo from DB OR via socket?? (DB is safer)
  // Populate required fields in a const
  // Create a rom in rooms.MAP object

  try {
    const hero = await selectHero(parsedMessage.heroId);
    const bot = await selectHero(
      parsedMessage.botId + "-" + parsedMessage.roomId,
    ); // Bot ID with suffix
    const fightRoom = await selectFightRoom(parsedMessage.roomId);
    console.log("Hero AND Bot", hero, bot);
    if (hero && bot && fightRoom) {
      if (
        !isValidSkillLoadout(hero.skillLoadout, hero.lvl, hero.criticalStrikes)
      ) {
        throw new Error("Hero has an invalid skill loadout");
      }

      const { hp: calcHp, ...calcStats } = calculateStatsHelper(hero);
      const { hp: calcBotHp, ...calcBotStats } = calculateStatsHelper(bot);
      console.log("CALC_STATS", calcStats);

      const room: RoomType = {
        id: parsedMessage.roomId,
        status: "active",
        createdAt: new Date(),
        startTime: 0,
        turnTimeLimit: 60, //seconds. Maybe should be an enum?
        creator: {
          heroId: parsedMessage.heroId,
          nickname: hero.nickname,
          level: hero.lvl,
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
            souls: hero.souls ?? 0,
            shardsA: hero.shardsA ?? 0,
            shardsB: hero.shardsB ?? 0,
            shardsC: hero.shardsC ?? 0,
            items: hero.items.filter(item => item.equipped) ?? [],
            skillLoadout: hero.skillLoadout,
            criticalStrikes: hero.criticalStrikes,
          },
          {
            id: bot.id,
            name: bot.nickname,
            hp: calcBotHp,
            maxHp: calcBotHp,
            stats: calcBotStats,
            history: {
              // Need to add to Bot DB object
              win: 0,
              loss: 0,
            },
            lvl: bot.lvl,
            exp: bot.exp,
            statsPoints: bot.statsPoints,
            souls: 0,
            shardsA: 0,
            shardsB: 0,
            shardsC: 0,
            items: bot.items ?? [],
            skillLoadout: bot.skillLoadout,
            criticalStrikes: bot.criticalStrikes,
          },
        ],
        isPvp: false,
        isDungeon: fightRoom.isDungeon ?? false,
        shardsType: fightRoom.shardsType ?? "",
        rounds: [],
      };

      console.log("NEW_ROOM", room);
      const fableRoom = activateFablePveRoom(server, ws, room);
      console.log("FABLE_FIGHT_ROOM", fableRoom.id);

      const roomsArray = Array.from(fightRoomsCache.values());

      server.publish(
        topic.activeFightRooms,
        JSON.stringify({
          type: topic.activeFightRooms,
          rooms: roomsArray,
        }),
      );
    } else {
      console.log("NO_HERO_OR_BOT_FOUND");
    }
  } catch (err) {
    console.log("BAD_ERROR_500");
  }
};
