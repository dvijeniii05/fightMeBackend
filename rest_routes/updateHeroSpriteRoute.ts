import type { BunRequest } from "bun";
import { updateHeroSprite } from "../drizzle/queries/hero";
import { activeHeroesCache } from "../socket_helpers/socketCache";

const AVAILABLE_SPRITES = new Set([1, 2]);

export const updateHeroSpriteRoute = async (
  req: BunRequest<"/user/updateSprite/:heroId">,
) => {
  try {
    const body = (await req.json()) as { sprite?: unknown };
    if (
      typeof body.sprite !== "number" ||
      !AVAILABLE_SPRITES.has(body.sprite)
    ) {
      return Response.json(
        { message: "Sprite must be one of the available sprite IDs" },
        { status: 400 },
      );
    }

    const updatedHero = await updateHeroSprite(req.params.heroId, body.sprite);
    if (!updatedHero) {
      return Response.json({ message: "Hero not found" }, { status: 404 });
    }

    const activeHero = activeHeroesCache.get(req.params.heroId);
    if (activeHero) {
      activeHeroesCache.set(req.params.heroId, {
        ...activeHero,
        sprite: body.sprite,
      });
    }

    return Response.json(updatedHero, { status: 200 });
  } catch (error) {
    console.error("Failed to update hero sprite", error);
    return Response.json(
      { message: "Failed to update hero sprite" },
      { status: 500 },
    );
  }
};
