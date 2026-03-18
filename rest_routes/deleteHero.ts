import type { BunRequest } from "bun";
import { db } from "../drizzle/db";
import { heroSxma } from "../drizzle/schema/hero";
import { eq } from "drizzle-orm";

export const deleteHero = async (
  req: BunRequest<"/user/deleteHero/:heroId">,
) => {
  const { heroId } = req.params;

  try {
    const [deleted] = await db
      .delete(heroSxma)
      .where(eq(heroSxma.id, heroId))
      .returning({ id: heroSxma.id });

    if (!deleted) {
      return Response.json({ message: "Hero not found." }, { status: 404 });
    }

    return Response.json(
      { message: "Hero deleted.", heroId: deleted.id },
      { status: 200 },
    );
  } catch (err) {
    console.log("DELETE_HERO_ERROR", err);
    return Response.json(
      { message: `ERROR: hero deletion failed for ${heroId}` },
      { status: 502 },
    );
  }
};
