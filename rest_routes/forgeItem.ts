import { type BunRequest } from "bun";
import { forgeItemInstance } from "../drizzle/queries/item";

export const forgeItem = async (
  req: BunRequest<"/inventory/forgeItem/:heroId">,
) => {
  try {
    const { heroId } = req.params;
    const { itemId } = (await req.json()) as {
      itemId: string;
    };
    console.log("FORGE_ITEM_REQUEST", { heroId, itemId });
    const { item, wasForgeSuccess } = await forgeItemInstance(heroId, itemId);
    console.log("FORGE_ITEM_RESULT", { item, wasForgeSuccess });
    return Response.json(
      {
        hasFailed: !wasForgeSuccess,
        item,
        message: `Item forged to level ${item.forgeLevel}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error forging item:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        hasFailed: true,
        message: `ERROR: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
};
