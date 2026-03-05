import { type BunRequest } from "bun";
import { buyItemInstance } from "../drizzle/queries/item";

export const buyItem = async (req: BunRequest<"/shop/buyItem/:heroId">) => {
  try {
    const { heroId } = req.params;
    const body = await req.json();

    const itemInstance = await buyItemInstance(heroId, body.templateId, {
      equipped: false,
    });

    console.log(`Item instance created for hero ${heroId}:`, itemInstance);

    return Response.json(
      { success: true, item: itemInstance },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error buying item for hero:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Not enough souls - client error (4xx)
    if (errorMessage.includes("Not enough souls")) {
      return Response.json({ message: errorMessage }, { status: 400 });
    }

    // Not found errors - server error (5xx)
    if (errorMessage.includes("not found")) {
      return Response.json({ message: errorMessage }, { status: 502 });
    }

    // Generic error
    return Response.json(
      { message: `ERROR: failed to buy item for hero` },
      { status: 500 },
    );
  }
};
