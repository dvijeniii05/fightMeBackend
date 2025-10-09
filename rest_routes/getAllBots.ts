import { selectAllUniqueBots } from "../drizzle/queries/hero";

export const getAllBots = async () => {
  try {
    const botsData = await selectAllUniqueBots();
    console.log(`Got all Bots: ${JSON.stringify(botsData)}`);
    return Response.json(botsData, { status: 200 });
  } catch (err: any) {
    console.log("Error getting bots", err);
    return Response.json(
      { message: `ERROR: bot selection failed` },
      { status: 500 },
    );
  }
};
