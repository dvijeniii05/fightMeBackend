import { expMap } from "../constants/expMap";
import {
  deleteCopiedBot,
  updateHeroAfterFight,
  updateHeroCurrHp,
} from "../drizzle/queries/hero";
import type { ActiveHeroesType } from "../types/activeHeroesType";
import type { Player, RoomType } from "../types/roomType";
import { userRoomsCache } from "../socket_helpers/socketCache";
import { calculateExp } from "./calculateExpHelper";
import { calculateShards } from "./calculateShardsHelper";
import { calculateSouls } from "./calculateSoulsHelper";

type MatchResultRoom = Pick<
  RoomType,
  "isDungeon" | "matchResult" | "players" | "shardsType"
>;

export const getMatchResults = async ({
  room,
  player,
  bot,
  socketHeroOne,
}: {
  room: MatchResultRoom;
  player: Player;
  bot: Player;
  socketHeroOne?: ActiveHeroesType;
}) => {
  const isResulDraw = player.hp <= 0 && bot.hp <= 0;
  const winnerId = player.hp <= 0 ? bot.id : player.id;

  await updateHeroCurrHp({
    heroId: player.id,
    currHp: player.hp,
  });

  await deleteCopiedBot(bot.id);

  if (isResulDraw) {
    //it is a draw
    //TODO: Update this logic to not give any exp if draw
    room.matchResult = {
      isDraw: true,
      exp: 0,
    };
  } else {
    console.log("WE_HAVE_A_WINNER...");

    //TODO: need to udapte currHp on loss as well!

    //we have a winner
    const isPlayerWinner = winnerId === player.id;
    const expAwarded = calculateExp(
      isPlayerWinner,
      player.lvl,
      bot.lvl,
      room.isDungeon,
    );
    const soulsAwarded = calculateSouls(
      isPlayerWinner,
      player.lvl,
      bot.lvl,
      room.isDungeon,
    );
    const shardsAwarded =
      room.isDungeon && room.shardsType
        ? calculateShards(isPlayerWinner, room.shardsType)
        : { a: 0, b: 0, c: 0 };

    console.log("RESULT_EXP", expAwarded, room.isDungeon);
    console.log("RESULT_SOULS", soulsAwarded);
    console.log("RESULT_SHARDS", shardsAwarded);
    const isLvlUp = player.exp + expAwarded >= expMap[player.lvl + 1];

    await updateHeroAfterFight({
      heroId: player.id,
      exp: player.exp + expAwarded,
      lvl: isLvlUp ? player.lvl + 1 : player.lvl,
      statsPoints: isLvlUp ? player.statsPoints + 5 : player.statsPoints,
      souls: player.souls + soulsAwarded,
      shards: {
        a: player.shardsA + shardsAwarded.a,
        b: player.shardsB + shardsAwarded.b,
        c: player.shardsC + shardsAwarded.c,
      },
    });

    //TODO: should update Hero's Lvl in activeHeroesCache if there is a level up
    console.log("IS_LVL_UP", isLvlUp, socketHeroOne);
    if (isLvlUp && socketHeroOne) socketHeroOne.lvl++;

    console.log("DELETING_BOT...", bot);

    //TODO: save the outcome into a separate match history table in DB including both player and bot stats, picks, and the outcome details such as damage dealt, exp awarded etc. This is needed for analytics and also for the player to be able to see their past matches history and details
    //AND delete this from the socked cache once saved in DB to free up memory
    //Should run as a daemon i.e. a scheduled function that runs every X minutes and deletes ONLY finished matches from the cache that are already saved in DB AND with a timestamp of at least 5 minutes from the "finsihed status"
    room.matchResult = {
      isDraw: false,
      winnerId: winnerId,
      winnerName: room.players.find(player => player.id === winnerId)?.name,
      exp: expAwarded,
      souls: soulsAwarded,
      shardsA: shardsAwarded.a,
      shardsB: shardsAwarded.b,
      shardsC: shardsAwarded.c,
    };
  }

  //TODO:  add the same should happen in PvP matches
  userRoomsCache.delete(player.id);
};
