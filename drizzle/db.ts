import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import * as heroSchema from "./schema/hero";
import * as fightRoomSchema from "./schema/fightRoom";
import * as itemSchema from "./schema/item";

const schema = {
  ...heroSchema,
  ...fightRoomSchema,
  ...itemSchema,
};

export const db = drizzle(process.env.DB_URL!, { schema });
export const readDb = drizzleHttp(process.env.DB_URL!, { schema });
