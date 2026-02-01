import { type BunRequest } from "bun";
import { insertItemTemplate } from "../drizzle/queries/item";
import { calculateForgeLevels } from "../helpers/calculateForgeLevels";

export const createItem = async (req: BunRequest<"/misc/createItem">) => {
  try {
    const body = await req.json();

    let forgeLevels = null;
    console.log("CREATE_ITEM_BODY", body);

    if (body?.isForgable && body.primaryStatKey && body.secondaryStatKey) {
      forgeLevels = calculateForgeLevels(
        body.baseStats,
        body.primaryStatKey,
        body.secondaryStatKey,
        body.secondaryStatBoostPercent, // optional, defaults to 10%
      );
    }

    await insertItemTemplate({
      name: body.name,
      type: body.type,
      rarity: body.rarity,
      baseStats: body.baseStats,
      requirements: body.requirements,
      description: body.description,
      imageUrl: body.imageUrl,
      price: body.price,
      stackable: body.stackable,
      isForgable: body?.isForgable,
      forgeLevels,
    });
  } catch (error) {
    console.error("Error creating item:", error);
    return Response.json(
      { message: `ERROR: item creation failed` },
      { status: 500 },
    );
  }
  return Response.json({ success: true }, { status: 200 });
};
