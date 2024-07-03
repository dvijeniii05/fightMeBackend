import { calculateDamageHelper } from "./helpers/calculateDamageHelper";

const users = new Map();
let maybeArray = new Array();

const server = Bun.serve({
  port: 3003,
  fetch(req, server) {
    const url = new URL(req.url);
    // Handle the root path
    if (url.pathname.match(/:/)) {
      // const success = server.upgrade(req, {
      //   data: { userId: req.headers.get("Authorization") },
      // });
      const success = server.upgrade(req, {
        data: { userId: url.pathname.split(":")[1] },
      });
      if (success) {
        // Bun automatically returns a 101 Switching Protocols
        // if the upgrade succeeds
        return undefined;
      }

      // handle HTTP request normally
      return new Response("Hello world!");
    }

    // // Handle the /blog path
    // if (url.pathname === "/blog") {
    //   return new Response("Blog!");
    // }

    // // Handle the /about path
    // if (url.pathname === "/about") {
    //   return new Response("About us!");
    // }

    // Default response for unknown paths
    return new Response("404 Not Found!", { status: 404 });
  },
  websocket: {
    // this is called when a message is received
    async open(ws) {
      console.log("Socked_open?", ws.data.userId);
      users.set(ws.data.userId, ws.data.userId);
      ws.subscribe("room");

      console.log("USERS:", users);
    },
    async message(ws, message) {
      console.log(`Received ${message}`);
      console.log("USER_ID", ws.data.userId);

      if (
        maybeArray.filter((userData) => userData.userId === ws.data.userId)
          .length === 0
      ) {
        maybeArray.push({ userId: ws.data.userId, pick: JSON.parse(message) });
      }
      console.log("ARRAY_CHECK", maybeArray);

      // matchInput.set(ws.data.userId, JSON.parse(message));
      const userOnePick = maybeArray[0].pick;
      const userTwoPick = maybeArray[1]?.pick;
      // const userTwoPick = maybeArray[1].pick;
      console.log("User_One_Pick", userOnePick);
      console.log("User_Two_Pick", userTwoPick);

      // const userOneData = matchInput.get(ws.data.userId);
      // console.log("User_One_Input", userOneData.deffence);
      // console.log("MATCH_INPUT_Map", matchInput);

      // Starting stats: 5 on all stats AND user can allcoate 15 stats ==> 25+15 = 40 points from the start
      // Only 2 stats can be at 100 points! 270 points in total can be used at the top level ==> 100 50 5 100 15 (example)

      // MAX physical damage = 2250 (including mx crit multiplier)
      // MAX magical damage =

      // const first = {
      //   attack: { head: false, body: false, legs: true },
      //   deffence: { head: false, body: false, legs: false },
      //   stats: { strength: 10, evasion: 5, crit: 8, health: 10, intel: 5 },
      //   buffs: {
      //     physicalDamage: 30,
      //     spellDamage: 0,
      //     addHealth: 500,
      //     addCritChance: 10,
      //     addCritMultiplier: 1.5,
      //   },
      // };

      // const second = {
      //   attack: { head: false, body: true, legs: false },
      //   deffence: { head: true, body: false, legs: false },
      //   stats: { strength: 10, evasion: 5, crit: 10, health: 10, intel: 5 },
      //   buffs: {
      //     physicalDamage: 10,
      //     spellDamage: 0,
      //     addHealth: 100,
      //     addCritChance: 5, //percent
      //     addCritMultiplier: 0.2,
      //     addEvasion: 10,
      //     addBlockDamage: 10,
      //   },
      // };

      // if 2 users submitted data ==> calculate result and send back
      if (maybeArray.length === 2) {
        const incomingToFirst = calculateDamageHelper(userOnePick, userTwoPick);
        const incomingToSecond = calculateDamageHelper(
          userTwoPick,
          userOnePick
        );
        console.log("ACTUAL_DAMAGE_TO_FIRST", incomingToFirst);
        console.log("ACTUAL_DAMAGE_TO_SECOND", incomingToSecond);

        const singleOutcome = [
          {
            userId: maybeArray[0].userId,
            incoming: incomingToFirst,
            outgoing: incomingToSecond,
          },
          {
            userId: maybeArray[1].userId,
            incoming: incomingToSecond,
            outgoing: incomingToFirst,
          },
        ];

        // ws.send(JSON.stringify(singleOutcome));
        server.publish("room", JSON.stringify(singleOutcome));
        maybeArray = [];
      }
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
