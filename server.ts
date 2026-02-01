import { createRoom } from "./rest_routes/createRoom";
import { createHero } from "./rest_routes/createHero";
import { joinRoom } from "./rest_routes/joinRoom";
import { activeHeroesCache, userSockets } from "./socket_helpers/socketCache";
import { topic } from "./socket_helpers/socketTopics";
import { messageRouter } from "./socket_helpers/socketRouter";
import { getHero } from "./rest_routes/getHero";
import { selectHero, updateHeroCurrHp } from "./drizzle/queries/hero";
import { calculateStatsHelper } from "./helpers/calculateStatsHelper";
import { createBotRoom } from "./rest_routes/createBotRoom";
import { getAllBots } from "./rest_routes/getAllBots";
import { updateHeroStatsRoute } from "./rest_routes/updateHeroStatsRoute";
import { createItem } from "./rest_routes/createItem";
import { getAllShopItems } from "./rest_routes/getAllShopItems";
import { buyItem } from "./rest_routes/buyItem";
import { moveItem } from "./rest_routes/moveItem";
import { createBotWithItems } from "./rest_routes/createBotWithItems";
import { forgeItem } from "./rest_routes/forgeItem";

const newServer = Bun.serve({
  port: 3003,
  fetch(req, server) {
    const url = new URL(req.url);

    //TODO: get userToken from the cookie using the method below.
    // const cookies = new Bun.CookieMap(req.headers.get("cookie")!);
    // const userToken = cookies.get("X-Token")
    // const heroId = getUserFromToken(ws.data.userToken);

    if (url.pathname === "/fightroom") {
      console.log("SAERCH_PARAMS", url.searchParams);
      const success = server.upgrade(req, {
        data: {
          heroId: url.searchParams.get("heroId"),
          roomId: url.searchParams.get("roomId"),
          type: url.searchParams.get("type"),
        },
      });

      return success
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }

    // handle HTTP request normally
    return new Response("unhandled request", { status: 501 });
  },
  routes: {
    "/user/registerHero/:heroName": async req => await createHero({ req }),
    "/user/getHero/:heroId": async req => await getHero(req),
    "/user/updateHeroStats": async req => await updateHeroStatsRoute(req),
    "/fight/createRoom/:heroId": async req => await createRoom(req),
    "/fight/createBotRoom/:heroId/:botId": async req =>
      await createBotRoom(req),
    "/fight/joinRoom/:heroId/:roomId": async req => await joinRoom(req),
    "/misc/createBot/:heroName": async req =>
      await createHero({ req, isBot: true }),
    "/misc/createBotWithItems": async req => await createBotWithItems(req),
    "/misc/getAllBots": async () => await getAllBots(),
    "/misc/createItem": async req => await createItem(req),
    "/shop/getItems": async req => await getAllShopItems(req),
    "/shop/buyItem/:heroId": async req => await buyItem(req),
    "/inventory/moveItem/:heroId": async req => await moveItem(req),
    "/inventory/forgeItem/:heroId": async req => await forgeItem(req),

    /*
    !!! TODO: rework socket open logic and move it to onMessage as the socket connection will now be used for everything
    !!! Open should only be used to check some kind of cached / existing data i.e. reconnect when available and nothing else.
      **/
  },
  websocket: {
    async open(ws: Bun.ServerWebSocket<{ heroId?: string }>) {
      //TODO ==> check whether user is trying to re-connect i.e. by matching heroId & roomId to the Map objects and subscribe accrodingly
      const { heroId } = ws.data;
      ws;
      if (!heroId) {
        ws.close(401, "Unauthorised Access");
      } else {
        userSockets.set(heroId, ws);
        console.log(`Hero with ${heroId} is connected`);
        // MOVE THIS back to its own route and rework it!!!
        //Adding hero to an activeHeroes pull in socket cache
      }

      // if (userRoomsCache.get(heroId)) {
      //   //User is trying to reconnect
      //   console.log("USER_IS_RECONNECTING_TO_ROOM", userRoomsCache.get(heroId));
      //   ws.subscribe(userRoomsCache.get(heroId));
      // }
    },
    async message(ws, message: string) {
      try {
        const data = JSON.parse(message);
        console.log("WS_CHECK", ws);
        console.log("IN_MESSAGE?", data);
        await messageRouter(newServer, ws, data);
      } catch (err) {
        console.error("Bad WS message:", err);
      }
    },
    async close(ws) {
      console.log(`Player ${ws.data.heroId} disconnected`);
      // Clean up disconnected players from rooms
      if (ws.data.heroId) {
        //‼️ Add logic to handle user disconnection & reconneciton to still have a rest penalty if not reconnected in time.
        await updateHeroCurrHp({
          heroId: ws.data.heroId,
          currHp: activeHeroesCache.get(ws.data.heroId)?.currHp ?? 0,
        });
        activeHeroesCache.delete(ws.data.heroId);
        newServer.publish(
          topic.activeHeroes,
          JSON.stringify({
            type: "all_active_heroes",
            activeUser: Array.from(activeHeroesCache.entries()),
          }),
        );
      }
      // for (const [roomId, room] of fightRooms.entries()) {
      //   if (room.player1 === ws || room.player2 === ws) {
      //     fightRooms.delete(roomId);
      //     console.log(`Room ${roomId} deleted due to player disconnect`);
      //   }
      // }
    },
  },
});

// console.log(`Listening on ${server.hostname}:${server.port}`);
console.log(`Listening on ${newServer.hostname}:${newServer.port}`);

/*
!! IMPORTANT !! ==> This seems to be a really expensive daemon/logic in terms of service load AND "write" methods to DB.
Maybe, mechanism should be reworked compeltely, and usee something else instead of HP regen? Maybe a rest timer that scales
with players' HP + lvl? i.e. 1000 hp = 5 min of rest if coming from 0?
*/
// ✅ Explicitly start the health regen daemon after server boots
// hpRegenDaemon(newServer);
