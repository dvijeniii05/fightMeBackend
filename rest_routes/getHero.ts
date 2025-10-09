import { type BunRequest } from "bun";
import { selectHero } from "../drizzle/queries/hero";

export const getHero = async (req: BunRequest<"/user/getHero/:heroId">) => {
  const { heroId } = req.params;
  console.log("GET_HERO_FUN", heroId);

  try {
    const heroData = await selectHero(heroId);
    const currTime = Math.floor(Date.now() / 1000);
    console.log(`Get Hero with heroId: ${heroId}`);
    return Response.json(heroData, { status: 200 });
  } catch (err: any) {
    console.log("Error getting hero", err);
    return Response.json(
      { message: `ERROR: hero selection failed for ${heroId}` },
      { status: 500 },
    );
  }
};
