import type { BunRequest } from "bun";
import { updateHeroAppearance } from "../drizzle/queries/hero";
import { activeHeroesCache } from "../socket_helpers/socketCache";
import { isAvatarId, isSpriteId } from "../constants/characterAppearance";

export const updateHeroAppearanceRoute = async (
  req:
    | BunRequest<"/user/updateAppearance/:heroId">
    | BunRequest<"/user/updateSprite/:heroId">,
) => {
  try {
    const body = (await req.json()) as { avatar?: unknown; sprite?: unknown };
    const hasAvatar = body.avatar !== undefined;
    const hasSprite = body.sprite !== undefined;

    if (!hasAvatar && !hasSprite) {
      return Response.json(
        { message: "Avatar or sprite is required" },
        { status: 400 },
      );
    }
    if (hasAvatar && !isAvatarId(body.avatar)) {
      return Response.json({ message: "Invalid avatar ID" }, { status: 400 });
    }
    if (hasSprite && !isSpriteId(body.sprite)) {
      return Response.json({ message: "Invalid sprite ID" }, { status: 400 });
    }

    const appearance = {
      ...(hasAvatar ? { avatar: body.avatar as number } : {}),
      ...(hasSprite ? { sprite: body.sprite as number } : {}),
    };
    const updatedHero = await updateHeroAppearance(
      req.params.heroId,
      appearance,
    );
    if (!updatedHero) {
      return Response.json({ message: "Hero not found" }, { status: 404 });
    }

    const activeHero = activeHeroesCache.get(req.params.heroId);
    if (activeHero && appearance.sprite !== undefined) {
      activeHeroesCache.set(req.params.heroId, {
        ...activeHero,
        sprite: appearance.sprite,
      });
    }

    return Response.json(updatedHero, { status: 200 });
  } catch (error) {
    console.error("Failed to update hero appearance", error);
    return Response.json(
      { message: "Failed to update hero appearance" },
      { status: 500 },
    );
  }
};
