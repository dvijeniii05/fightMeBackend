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
    const forgedItem = await forgeItemInstance(heroId, itemId);

    return Response.json(
      {
        success: true,
        forgedItem,
        message: `Item forged to level ${forgedItem.forgeLevel}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error forging item:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        success: false,
        message: `ERROR: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
};
