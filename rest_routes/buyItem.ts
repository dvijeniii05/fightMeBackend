import { type BunRequest } from "bun";
import { createItemInstance } from "../drizzle/queries/item";

export const buyItem = async (req: BunRequest<"/shop/buyItem/:heroId">) => {
  try {
    const { heroId } = req.params;
    const body = await req.json();

    const [itemInstance] = await createItemInstance(heroId, body.templateId, {
      equipped: false,
    });

    console.log(`Item instance created for hero ${heroId}:`, itemInstance);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error buying item for hero:", error);
    return Response.json(
      { message: `ERROR: failed to buy item for hero` },
      { status: 500 },
    );
  }
};
