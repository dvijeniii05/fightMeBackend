import { randomUUIDv7, type BunRequest, type ServerWebSocket } from "bun";
import { insertFightRoom } from "../drizzle/queries/fightRoom";
import { selectHero } from "../drizzle/queries/hero";
import { calculateStatsHelper } from "../helpers/calculateStatsHelper";

export const createRoom = async (
  req: BunRequest<"/fight/createRoom/:heroId">,
) => {
  const { heroId } = req.params;
  const roomId = randomUUIDv7();
  console.log("CREATE_ROOM_FUNC", heroId);

  //TODO: same user cannot have multiple fightRooms active!!!

  try {
    const hero = await selectHero(heroId);
    if (hero) {
      const caclStats = calculateStatsHelper(hero);

      await insertFightRoom({
        roomId,
        playerOneCalcStats: caclStats,
        playerOne: heroId,
        createdAt: Date.now(),
      });
      console.log(`Room ${roomId} created`);
      return Response.json({ roomId: roomId }, { status: 200 });
    } else {
      console.log("NO_HERO_FOUND");
    }
  } catch (err) {
    console.log("CREATE_ROOM_ERROR", err);
    return Response.json(
      { message: `ERROR: Failed to create room foor ${heroId}` },
      { status: 502 },
    );
  }
};
