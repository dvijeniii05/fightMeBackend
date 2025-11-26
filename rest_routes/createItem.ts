import { type BunRequest } from "bun";
import { insertItemTemplate } from "../drizzle/queries/item";

export const createItem = async (req: BunRequest<"/misc/createItem">) => {
  try {
    const body = await req.json();

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
