import { selectHero, updateHeroLocation } from "../../drizzle/queries/hero";
import { calculateStatsHelper } from "../../helpers/calculateStatsHelper";
import { activeHeroesCache } from "../socketCache";
import { topic } from "../socketTopics";

export const activeHeroesRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    location?: unknown;
  },
) => {
  try {
    const heroId = ws.data.heroId;
    if (!heroId) {
      ws.send(JSON.stringify({ type: "error", message: "Unauthorised" }));
      return;
    }

    const requestedLocation =
      typeof parsedMessage.location === "string"
        ? parsedMessage.location.trim()
        : null;
    if (requestedLocation !== null && requestedLocation.length === 0) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid location" }));
      return;
    }

    const hero = await selectHero(heroId);
    if (!hero) {
      ws.send(JSON.stringify({ type: "error", message: "Hero not found" }));
      return;
    }

    const location = requestedLocation ?? hero.location;
    if (requestedLocation && requestedLocation !== hero.location) {
      await updateHeroLocation(heroId, requestedLocation);
    }

    const cachedHero = activeHeroesCache.get(heroId);
    const { hp: maxHp } = calculateStatsHelper(hero);
    activeHeroesCache.set(heroId, {
      nickname: hero.nickname,
      lvl: hero.lvl,
      sprite: hero.sprite,
      location,
      maxHp,
      currHp: cachedHero?.currHp ?? maxHp,
      status: cachedHero?.status ?? "idle",
    });

    ws.subscribe(topic.activeHeroes); //to subs to all active_heroes topic
    const activeHeroesArray = Array.from(activeHeroesCache.entries());
    console.log("ALL_ACTIVE_HEROES", activeHeroesArray);

    //Sending an updated list of activeHeroes to all connected sockets
    server.publish(
      topic.activeHeroes,
      JSON.stringify({
        type: "all_active_heroes",
        heroes: activeHeroesArray,
      }),
    );
  } catch (error) {
    console.error("Failed to broadcast active heroes", error);
  }
};
