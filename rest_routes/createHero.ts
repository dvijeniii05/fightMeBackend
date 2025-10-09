import { randomUUIDv7, type BunRequest } from "bun";
import { insertHero } from "../drizzle/queries/hero";

interface Props {
  req:
    | BunRequest<"/user/registerHero/:heroName">
    | BunRequest<"/misc/createBot/:heroName">;
  isBot?: boolean;
}

export const createHero = async ({ req, isBot = false }: Props) => {
  const { heroName } = req.params;
  const heroId = randomUUIDv7();
  console.log("CREATE_USER_FUNC", heroId, heroName, isBot);

  try {
    await insertHero({ data: { id: heroId, nickname: heroName }, isBot });
  } catch (err: any) {
    console.log("CREATE_USER_ERROR", err);
    if (err.code === "23505") {
      // 23505 = unique_violation in PostgreSQL
      return new Response(
        JSON.stringify({
          message: "Nickname is already taken.",
          code: "NICKNAME_NOT_UNIQUE",
        }),
        { status: 409 },
      ); // Conflict
    }

    return Response.json(
      { message: `ERROR: hero creaion failed for ${heroName}` },
      { status: 502 },
    );
  }
  console.log(`Hero created with heroId: ${heroId}`);
  return Response.json({ heroId: heroId }, { status: 200 });
};
