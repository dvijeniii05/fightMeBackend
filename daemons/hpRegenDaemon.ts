import { activeHeroesCache } from "../socket_helpers/socketCache";
import { topic } from "../socket_helpers/socketTopics";

/*
!! IMPORTANT !! ==> This seems to be a really expensive daemon/logic in terms of service load AND "write" methods to DB.
Maybe, mechanism should be reworked compeltely, and usee something else instead of HP regen? Maybe a rest timer that scales
with players' HP + lvl? i.e. 1000 hp = 5 min of rest if coming from 0?
*/
export const hpRegenDaemon = (server: Bun.Server) => {
  console.info("🤖 ==> hpRegenDaemon is running");
  setInterval(() => {
    for (const [_, stats] of activeHeroesCache.entries()) {
      if (stats.currHp < stats.maxHp) {
        stats.currHp = Math.min(stats.currHp + 30, stats.maxHp);
        //TODO: will need to update store values for activeHp here
      }
    }

    const activeHeroesArray = Array.from(activeHeroesCache.entries());
    if (activeHeroesArray.length > 0) {
      console.log("Active_Heroes?", activeHeroesArray);
      server.publish(
        topic.activeHeroes,
        JSON.stringify({
          type: "all_active_heroes",
          heroes: activeHeroesArray,
        }),
      );
    }
  }, 2000);
};
