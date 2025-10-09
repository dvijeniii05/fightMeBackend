import { selectHero } from "../../drizzle/queries/hero";
import { calculateStatsHelper } from "../../helpers/calculateStatsHelper";
import { activeHeroesCache } from "../socketCache";
import { topic } from "../socketTopics";

export const activeHeroesRoute = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  parsedMessage: {
    heroId: string;
  },
) => {
  try {
    if (!activeHeroesCache.has(parsedMessage.heroId)) {
      const hero = await selectHero(parsedMessage.heroId);
      if (hero) {
        const { hp: maxHp } = calculateStatsHelper(hero?.stats);

        //NOTE: eveyrtime we update user stats, we need to update the activeHeroesCache too to keep Hp in sync

        activeHeroesCache.set(hero.id, {
          nickname: hero.nickname,
          lvl: hero.lvl!,
          maxHp: maxHp,
          currHp: maxHp,
          status: "idle",
        });
        console.log("NEW_HERO_IN_ACTIVE_HERO_POOL", activeHeroesCache);
      } else {
        //500 type error as this is really bad!
      }
    }
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
  } catch (err) {}
};
