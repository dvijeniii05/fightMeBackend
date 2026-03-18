import { activeHeroesCache } from "../socketCache";
import { calculateRegenRate } from "../../helpers/calculateRegenRate";

export const currentHpRoute = async (
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
  },
) => {
  try {
    const hero = activeHeroesCache.get(parsedMessage.heroId);
    // console.log("CURRENT_HP_ROUTE", hero);
    if (hero) {
      //Check following every 1 OR 5 sec
      setInterval(() => {
        // Re-read from cache each tick to pick up updates (e.g. maxHp changes)
        const hero = activeHeroesCache.get(parsedMessage.heroId);
        if (!hero) return;
        // console.log("IN_INTERVAL");
        // console.log("HP_CHECK", hero.currHp, hero.maxHp);

        if (hero.currHp < hero.maxHp) {
          // console.log("IN_INTERVAL_REGEN");
          const regenPerTick = calculateRegenRate(hero.maxHp);
          hero.currHp = Math.round(
            Math.min(hero.currHp + regenPerTick, hero.maxHp),
          );
          ws.send(
            JSON.stringify({
              type: "current_hp",
              data: {
                maxHp: hero.maxHp,
                currHp: hero.currHp,
              },
            }),
          );
        } else {
          // console.log("IN_INTERVAL_FULL");

          //hero is full hp, no calculation is required
          ws.send(
            JSON.stringify({
              type: "current_hp",
              data: {
                maxHp: hero.maxHp,
                currHp: hero.currHp,
              },
            }),
          );
        }
      }, 2000); //TODO: currently every 20 sec but should be 1 or 2 sec max
    } else {
      // 500 as user doeasnt exist in the cache
    }
  } catch (err) {}
};
