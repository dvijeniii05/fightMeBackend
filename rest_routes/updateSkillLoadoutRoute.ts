import type { BunRequest } from "bun";
import { selectHero, updateHeroSkillLoadout } from "../drizzle/queries/hero";
import { isValidSkillLoadout } from "../constants/skills";

export const updateSkillLoadoutRoute = async (
  req: BunRequest<"/user/updateSkillLoadout/:heroId">,
) => {
  const { heroId } = req.params;

  try {
    const hero = await selectHero(heroId);
    if (!hero) {
      return Response.json({ message: "Hero not found" }, { status: 404 });
    }

    const body = await req.json();
    const skillLoadout = body?.skillLoadout;
    if (!isValidSkillLoadout(skillLoadout, hero.lvl, hero.criticalStrikes)) {
      return Response.json(
        { message: "Invalid or locked skill loadout" },
        { status: 400 },
      );
    }

    await updateHeroSkillLoadout(heroId, skillLoadout);
    return Response.json({ skillLoadout }, { status: 200 });
  } catch (error) {
    console.error("Failed to update skill loadout", error);
    return Response.json(
      { message: "Skill loadout update failed" },
      { status: 500 },
    );
  }
};
