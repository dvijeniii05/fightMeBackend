import assert from "node:assert/strict";
import {
  ATTACK_PICK_DEADLINE_MS,
  FIGHT_STAMINA,
} from "../constants/combatTiming";
import { activateFablePveRoom } from "../helpers/activateFablePveRoom";
import {
  deleteFablePveRoom,
  inspectFablePveCoordinator,
} from "../helpers/fablePveCoordinator";
import {
  fableFightRoomsCache,
  fightRoomsCache,
  userRoomsCache,
} from "../socket_helpers/socketCache";
import type { Player, RoomType } from "../types/roomType";

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  hp: 1000,
  maxHp: 1000,
  stats: {
    baseDamageBoost: 0,
    critChance: 0,
    critMultiplier: 1.5,
    evadeChance: 0,
    fastChance: 0,
    skillCritChance: 0,
  },
  history: { win: 0, loss: 0 },
  lvl: 1,
  exp: 0,
  statsPoints: 0,
  souls: 0,
  shardsA: 0,
  shardsB: 0,
  shardsC: 0,
  items: [],
});

const startedAtMs = 1_000_000;
const legacyRoom: RoomType = {
  id: "fable-inspection-room",
  status: "active",
  createdAt: new Date(0),
  startTime: 0,
  turnTimeLimit: 60,
  creator: {
    heroId: "player",
    nickname: "player",
    level: 1,
  },
  currentRound: 1,
  players: [createPlayer("player"), createPlayer("bot")],
  rounds: [],
  isPvp: false,
};

const timeline: string[] = [];
const directMessages: string[] = [];
const publishedMessages: string[] = [];
const ws = {
  data: { heroId: "player" },
  subscribe: (topic: string) => timeline.push(`subscribe:${topic}`),
  unsubscribe: (topic: string) => timeline.push(`unsubscribe:${topic}`),
  send: (message: string) => {
    directMessages.push(message);
    timeline.push(`send:${JSON.parse(message).type}`);
  },
} as unknown as Bun.ServerWebSocket<{ heroId?: string }>;
const server = {
  publish: (_topic: string, message: string) => {
    publishedMessages.push(message);
    timeline.push(`publish:${JSON.parse(message).type}`);
    return 1;
  },
} as unknown as Bun.Server;

const room = activateFablePveRoom(server, ws, legacyRoom, startedAtMs);

const cachedRoom = fableFightRoomsCache.get(room.id);
assert.ok(cachedRoom);
assert.equal(cachedRoom.combatVersion, "fable_v2");
assert.equal(cachedRoom.players[0].stamina, FIGHT_STAMINA);
assert.equal(cachedRoom.players[1].maxStamina, FIGHT_STAMINA);
assert.equal(cachedRoom.rounds[0].activeExchangeIndex, 0);
assert.deepEqual(
  cachedRoom.rounds[0].exchanges.map(exchange => [
    exchange.attackerId,
    exchange.defenderId,
  ]),
  [
    ["player", "bot"],
    ["bot", "player"],
  ],
);
assert.equal(
  cachedRoom.rounds[0].exchanges[0].deadlines.attackAtMs,
  startedAtMs + ATTACK_PICK_DEADLINE_MS,
);
assert.equal(cachedRoom.rounds[0].exchanges[1].deadlines.attackAtMs, null);
assert.equal(fightRoomsCache.has(room.id), false);
assert.deepEqual(timeline, [
  `subscribe:${room.id}`,
  "send:personal_room_update",
  "publish:exchangeStarted",
]);
assert.equal(JSON.parse(directMessages[0]).data.id, room.id);
assert.equal(JSON.parse(publishedMessages[0]).attackerId, "player");
assert.deepEqual(inspectFablePveCoordinator(room.id), {
  running: true,
  attackDeadlines: 1,
  transitions: 0,
  defenseDeadlines: 0,
});
assert.deepEqual(userRoomsCache.get("player"), {
  id: room.id,
  isPvp: false,
});
assert.equal(legacyRoom.rounds.length, 0);
assert.equal("stamina" in legacyRoom.players[0], false);

console.log({
  roomId: cachedRoom.id,
  combatVersion: cachedRoom.combatVersion,
  stamina: cachedRoom.players.map(player => player.stamina),
  exchanges: cachedRoom.rounds[0].exchanges.map(exchange => ({
    exchangeIndex: exchange.exchangeIndex,
    attackerId: exchange.attackerId,
    defenderId: exchange.defenderId,
    state: exchange.state,
    deadlines: exchange.deadlines,
  })),
  legacyCacheContainsRoom: fightRoomsCache.has(room.id),
  activationTimeline: timeline,
});

deleteFablePveRoom(room.id);
userRoomsCache.delete("player");
