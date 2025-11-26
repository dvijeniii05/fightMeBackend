import { type BunRequest } from "bun";
import { getAllItems } from "../drizzle/queries/item";

export const getAllShopItems = async (req: BunRequest<"/shop/getItems">) => {
  console.log("GET_ALL_SHOP_ITEMS_FUNC");

  try {
    const itemsData = await getAllItems();
    // console.log(`Retrieved ${itemsData.length} shop items: `, itemsData);
    return Response.json(itemsData, { status: 200 });
  } catch (err: any) {
    console.log("Error getting shop items", err);
    return Response.json(
      { message: "ERROR: Failed to retrieve shop items" },
      { status: 500 },
    );
  }
};
