import type { BunRequest, ServerWebSocket } from "bun";
import { selectHero } from "../drizzle/queries/hero";
import { calculateStatsHelper } from "../helpers/calculateStatsHelper";
import { updateFightRoom } from "../drizzle/queries/fightRoom";

export const joinRoom = async (
  req: BunRequest<"/fight/joinRoom/:heroId/:roomId">,
) => {
  const { heroId, roomId } = req.params;

  console.log("Join_ROOM", heroId, roomId);
  try {
    const hero = await selectHero(heroId);
    if (hero) {
      const caclStats = calculateStatsHelper(hero);

      //TODO: should calcualte stats on room creation ??
      await updateFightRoom({
        roomId,
        playerTwoCalcStats: caclStats,
        playerTwo: hero.id,
      });
      console.log(`${hero.id} joined room ${roomId}`);
      return Response.json({ roomId: roomId }, { status: 200 });
    } else {
      console.log("NO_HERO_FOUND");
    }
  } catch (err) {
    console.log("CREATE_ROOM_ERROR", err);
    return Response.json(
      { message: `ERROR: Failed to join room foor ${heroId}` },
      { status: 502 },
    );
  }
};
