import { createRoom } from "./rest_routes/createRoom";
import { createHero } from "./rest_routes/createHero";
import { joinRoom } from "./rest_routes/joinRoom";
import {
  activeHeroesCache,
  fightRoomsCache,
  userRoomsCache,
  userSockets,
} from "./socket_helpers/socketCache";
import { sendFableReconnectSnapshot } from "./helpers/sendFableReconnectSnapshot";
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
import { deleteHero } from "./rest_routes/deleteHero";
import { staleRoomDaemon } from "./daemons/staleRoomDaemon";
import { deleteFightRoom } from "./drizzle/queries/fightRoom";
import { updateSkillLoadoutRoute } from "./rest_routes/updateSkillLoadoutRoute";
import { updateHeroSpriteRoute } from "./rest_routes/updateHeroSpriteRoute";

// --- Dashboard ---
const dashboardHtml = await Bun.file("./dashboard/dashboard.html").text();
const dashboardClients = new Set<Bun.ServerWebSocket<{ heroId?: string }>>();

const handleDashboardMessage = async (
  ws: Bun.ServerWebSocket<{ heroId?: string }>,
  data: unknown,
) => {
  if (!data || typeof data !== "object" || !("action" in data)) {
    throw new Error("Invalid dashboard command");
  }

  if (data.action === "deleteUserRoom") {
    if (!("heroId" in data) || typeof data.heroId !== "string") {
      throw new Error("heroId is required");
    }

    const deleted = userRoomsCache.delete(data.heroId);
    ws.send(
      JSON.stringify({
        type: "dashboardResult",
        action: data.action,
        ok: deleted,
        message: deleted
          ? `Removed room mapping for ${data.heroId}`
          : `No room mapping found for ${data.heroId}`,
      }),
    );
    return;
  }

  if (data.action === "deleteFightRooms") {
    if (
      !("roomIds" in data) ||
      !Array.isArray(data.roomIds) ||
      !data.roomIds.every(roomId => typeof roomId === "string")
    ) {
      throw new Error("roomIds must be an array of strings");
    }

    const roomIds = [...new Set(data.roomIds)];
    for (const roomId of roomIds) {
      await deleteFightRoom(roomId);
      fightRoomsCache.delete(roomId);

      for (const [heroId, userRoom] of userRoomsCache.entries()) {
        if (userRoom.id === roomId) userRoomsCache.delete(heroId);
      }
    }

    ws.send(
      JSON.stringify({
        type: "dashboardResult",
        action: data.action,
        ok: true,
        message: `Deleted ${roomIds.length} fight room${roomIds.length === 1 ? "" : "s"}`,
      }),
    );
    return;
  }

  throw new Error("Unknown dashboard command");
};

const newServer = Bun.serve({
  port: 3003,
  hostname: "0.0.0.0",
  fetch(req, server) {
    const url = new URL(req.url);

    //TODO: get userToken from the cookie using the method below.
    // const cookies = new Bun.CookieMap(req.headers.get("cookie")!);
    // const userToken = cookies.get("X-Token")
    // const heroId = getUserFromToken(ws.data.userToken);

    // Serve dashboard HTML
    if (url.pathname === "/dashboard") {
      return new Response(dashboardHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Dashboard live WebSocket
    if (url.pathname === "/dashboard-ws") {
      const success = server.upgrade(req, {
        data: { heroId: "__dashboard__" },
      });
      return success
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }

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
    "/user/updateSkillLoadout/:heroId": async req =>
      await updateSkillLoadoutRoute(req),
    "/user/updateSprite/:heroId": async req => await updateHeroSpriteRoute(req),
    "/user/deleteHero/:heroId": async req => await deleteHero(req),
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

      // Dashboard client — just track it, don't treat as a game socket
      if (heroId === "__dashboard__") {
        dashboardClients.add(ws);
        return;
      }

      ws;
      if (!heroId) {
        ws.close(401, "Unauthorised Access");
      } else {
        const previousSocket = userSockets.get(heroId);
        userSockets.set(heroId, ws);
        if (previousSocket && previousSocket !== ws) {
          previousSocket.close(4001, "Connection replaced");
        }
        console.log(`Hero with ${heroId} is connected`);
        sendFableReconnectSnapshot(ws, heroId);
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
        if (ws.data.heroId === "__dashboard__") {
          await handleDashboardMessage(ws, data);
          return;
        }

        console.log("WS_CHECK", ws);
        console.log("IN_MESSAGE?", data);
        await messageRouter(newServer, ws, data);
      } catch (err) {
        console.error("Bad WS message:", err);
        if (ws.data.heroId === "__dashboard__") {
          ws.send(
            JSON.stringify({
              type: "dashboardResult",
              ok: false,
              message: err instanceof Error ? err.message : "Command failed",
            }),
          );
        }
      }
    },
    async close(ws) {
      // Dashboard client cleanup
      if (ws.data.heroId === "__dashboard__") {
        dashboardClients.delete(ws);
        return;
      }

      console.log(`Player ${ws.data.heroId} disconnected`);
      // Clean up disconnected players from rooms
      if (ws.data.heroId) {
        if (userSockets.get(ws.data.heroId) !== ws) return;
        userSockets.delete(ws.data.heroId);
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
            heroes: Array.from(activeHeroesCache.entries()),
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
console.log(
  `Dashboard: http://${newServer.hostname}:${newServer.port}/dashboard`,
);

// --- Broadcast cache snapshot to dashboard clients every 1s ---
setInterval(() => {
  if (dashboardClients.size === 0) return;
  const snapshot = JSON.stringify({
    userSockets: Array.from(userSockets.keys()),
    activeHeroes: Array.from(activeHeroesCache.entries()),
    fightRooms: Array.from(fightRoomsCache.entries()),
    userRooms: Array.from(userRoomsCache.entries()),
  });
  for (const client of dashboardClients) {
    client.send(snapshot);
  }
}, 1000);

/*
!! IMPORTANT !! ==> This seems to be a really expensive daemon/logic in terms of service load AND "write" methods to DB.
Maybe, mechanism should be reworked compeltely, and usee something else instead of HP regen? Maybe a rest timer that scales
with players' HP + lvl? i.e. 1000 hp = 5 min of rest if coming from 0?
*/
// ✅ Explicitly start the health regen daemon after server boots
// hpRegenDaemon(newServer);

// ✅ Remove fight rooms stuck in 'waiting' for over an hour
staleRoomDaemon();
