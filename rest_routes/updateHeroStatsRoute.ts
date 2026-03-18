import { type BunRequest } from "bun";
import { selectHero, updateHeroStats } from "../drizzle/queries/hero";
import { activeHeroesCache } from "../socket_helpers/socketCache";
import { calculateStatsHelper } from "../helpers/calculateStatsHelper";

export const updateHeroStatsRoute = async (
  req: BunRequest<"/user/updateHeroStats">,
) => {
  try {
    const body = await req.json();
    console.log("Update Hero Stats", body);

    await updateHeroStats(body);
    console.log(`Update Hero stats with heroId: ${body.ownerId}`);
    const hero = await selectHero(body.ownerId);
    const { hp: maxHp } = calculateStatsHelper({
      stats: body,
      items: hero?.items ?? [],
    });
    activeHeroesCache.set(body.ownerId, {
      ...activeHeroesCache.get(body.ownerId)!,
      maxHp: maxHp,
    });

    return Response.json({ status: 200 });
  } catch (err: any) {
    console.log("Error updating hero stats", err);
    return Response.json(
      { message: `ERROR: hero stats update failed ` },
      { status: 500 },
    );
  }
};
