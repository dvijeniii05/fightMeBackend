import { drizzle } from "drizzle-orm/neon-serverless";
import * as heroSchema from "./schema/hero";
import * as fightRoomSchema from "./schema/fightRoom";
import * as itemSchema from "./schema/item";

export const db = drizzle(process.env.DB_URL!, {
  schema: {
    ...heroSchema,
    ...fightRoomSchema,
    ...itemSchema,
  },
});
