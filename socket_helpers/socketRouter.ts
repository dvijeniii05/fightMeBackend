import { activeHeroesRoute } from "./message_routes/activeHeroesRoute";
import { activeRoomsRoute } from "./message_routes/activeRoomsRoute";
import { createBotRoomRoute } from "./message_routes/createBotRoomRoute";
import { createRoomRoute } from "./message_routes/createRoomRoute";
import { currentHpRoute } from "./message_routes/currentHpRoute";
import { joinRoomRoute } from "./message_routes/joinRoomRoute";
import { submitRoundRoute } from "./message_routes/submitRoundRoute";

export const messageRouter = async (
  server: Bun.Server,
  ws: Bun.ServerWebSocket<{
    heroId?: string;
  }>,
  message: any,
) => {
  const { type, ...rest } = message;
  console.log("MESSAGE_ROUTER_msg_type:", type);
  switch (type) {
    case "createRoom":
      return createRoomRoute(server, ws, rest);
    case "joinRoom":
      return joinRoomRoute(server, ws, rest);
    case "createBotRoom":
      return createBotRoomRoute(server, ws, rest);
    case "activeRooms":
      return activeRoomsRoute(ws);
    case "submitRound":
      return await submitRoundRoute(server, ws, rest);
    case "activeHeroes":
      return activeHeroesRoute(server, ws, rest);
    case "currentHp":
      return currentHpRoute(ws, rest);
    default:
      ws.send(JSON.stringify({ type: "error", message: "Unknown type" }));
  }
};
