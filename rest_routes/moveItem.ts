import { type BunRequest } from "bun";
import { toggleItemEquipped } from "../drizzle/queries/item";

//TODO: implement actual Move item logic to equip/unequip items
export const moveItem = async (
  req: BunRequest<"/inventory/moveItem/:heroId">,
) => {
  try {
    const { heroId } = req.params;
    const { itemId, equipped, equipSlot } = (await req.json()) as {
      itemId: string;
      equipped: boolean;
      equipSlot?: number;
    };

    // console.log("BODY_RECEIVED_MOVE_ITEM", { itemId, equipped, equipSlot });

    const updatedItem = await toggleItemEquipped(heroId, itemId, {
      equipped,
      equipSlot,
    });

    // console.log(`Item moved ${heroId}:`, updatedItem);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error moving item for hero:", error);
    return Response.json(
      { message: `ERROR: failed to move item for hero` },
      { status: 500 },
    );
  }
};
