import assert from "node:assert/strict";
import { DEFENSE_COMMIT_DEADLINE_MS } from "../constants/combatTiming";
import { initializeFablePveRoom } from "../helpers/initializeFablePveRoom";
import { clearFableDefenseDeadline } from "../helpers/resolveFableExchange";
import { commitStrikeRoute } from "../socket_helpers/message_routes/commitStrikeRoute";
import {
  fableFightRoomsCache,
  userSockets,
} from "../socket_helpers/socketCache";
import type { Player, RoomType } from "../types/roomType";

type CommitPayload = Parameters<typeof commitStrikeRoute>[2];

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  hp: 1000,
  maxHp: 1000,
  stats: {
    baseDamageBoost: 100,
    critChance: 0,
    critMultiplier: 2,
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

const createLegacyRoom = (id: string): RoomType => ({
  id,
  status: "active",
  createdAt: new Date(0),
  startTime: 0,
  turnTimeLimit: 60,
  creator: { heroId: "player", nickname: "player", level: 1 },
  currentRound: 1,
  players: [createPlayer("player"), createPlayer("bot")],
  rounds: [],
  isPvp: false,
});

const baseCommit: CommitPayload = {
  roomId: "commit-strike-room",
  roundNumber: 1,
  exchangeIndex: 0,
  heroId: "player",
  skillId: "precise",
  direction: "up",
};

const createHarness = (roomId = baseCommit.roomId) => {
  const room = initializeFablePveRoom(createLegacyRoom(roomId), 1_000_000);
  const attackerMessages: string[] = [];
  const defenderMessages: string[] = [];
  const publishedMessages: string[] = [];
  const attackerSocket = {
    data: { heroId: "player" },
    send: (message: string) => attackerMessages.push(message),
  } as unknown as Bun.ServerWebSocket<{ heroId?: string }>;
  const defenderSocket = {
    data: { heroId: "bot" },
    send: (message: string) => defenderMessages.push(message),
  } as unknown as Bun.ServerWebSocket<{ heroId?: string }>;
  const server = {
    publish: (_topic: string, message: string) => {
      publishedMessages.push(message);
      return 1;
    },
  } as unknown as Bun.Server;

  fableFightRoomsCache.set(room.id, room);
  userSockets.set("bot", defenderSocket);

  return {
    room,
    server,
    attackerSocket,
    attackerMessages,
    defenderMessages,
    publishedMessages,
  };
};

const valid = createHarness();
valid.room.players[0].nextStrikeBuff = { damageMult: 1.25 };
const committedAfterMs = Date.now();
commitStrikeRoute(valid.server, valid.attackerSocket, baseCommit);

const exchange = valid.room.rounds[0].exchanges[0];
assert.equal(valid.room.players[0].stamina, 70);
assert.equal(valid.room.players[0].nextStrikeBuff, undefined);
assert.equal(exchange.state, "awaiting_block");
assert.deepEqual(exchange.strike?.damageBuff, { damageMult: 1.25 });
assert.equal(exchange.strike?.skillId, "precise");
assert.equal(exchange.strike?.direction, "up");
assert.equal(exchange.deadlines.attackAtMs, null);
assert.ok(exchange.deadlines.blockAtMs);
assert.ok(
  exchange.deadlines.blockAtMs >= committedAfterMs + DEFENSE_COMMIT_DEADLINE_MS,
);
assert.deepEqual(JSON.parse(valid.publishedMessages[0]), {
  type: "exchangeStarted",
  roomId: baseCommit.roomId,
  roundNumber: 1,
  exchangeIndex: 0,
  attackerId: "player",
});
assert.deepEqual(JSON.parse(valid.defenderMessages[0]), {
  type: "incomingStrike",
  roomId: baseCommit.roomId,
  roundNumber: 1,
  exchangeIndex: 0,
  direction: "up",
});
assert.equal(valid.attackerMessages.length, 0);

const committedSnapshot = JSON.stringify(valid.room);
commitStrikeRoute(valid.server, valid.attackerSocket, baseCommit);
assert.equal(JSON.stringify(valid.room), committedSnapshot);
assert.equal(valid.attackerMessages.length, 1);
assert.equal(JSON.parse(valid.attackerMessages[0]).reason, "duplicate_commit");
assert.equal(valid.publishedMessages.length, 1);
assert.equal(valid.defenderMessages.length, 1);

const rejectionCases: Array<{
  name: string;
  payload: CommitPayload;
  expectedReason: string;
  prepare?: (room: ReturnType<typeof createHarness>["room"]) => void;
  socketHeroId?: string;
}> = [
  {
    name: "stale round",
    payload: { ...baseCommit, roundNumber: 2 },
    expectedReason: "stale_exchange",
  },
  {
    name: "wrong exchange",
    payload: { ...baseCommit, exchangeIndex: 1 },
    expectedReason: "stale_exchange",
  },
  {
    name: "wrong attacker",
    payload: { ...baseCommit, heroId: "bot" },
    expectedReason: "not_attacker",
    socketHeroId: "bot",
  },
  {
    name: "socket identity mismatch",
    payload: baseCommit,
    expectedReason: "identity_mismatch",
    socketHeroId: "intruder",
  },
  {
    name: "invalid direction",
    payload: {
      ...baseCommit,
      direction: "diagonal" as CommitPayload["direction"],
    },
    expectedReason: "invalid_direction",
  },
  {
    name: "unknown skill",
    payload: {
      ...baseCommit,
      skillId: "__proto__" as CommitPayload["skillId"],
    },
    expectedReason: "unknown_skill",
  },
  {
    name: "insufficient stamina",
    payload: { ...baseCommit, skillId: "heavy" },
    expectedReason: "insufficient_stamina",
    prepare: room => {
      room.players[0].stamina = 49;
      room.players[0].nextStrikeBuff = { damageMult: 1.25 };
    },
  },
];

for (const rejectionCase of rejectionCases) {
  const harness = createHarness();
  rejectionCase.prepare?.(harness.room);
  harness.attackerSocket.data.heroId = rejectionCase.socketHeroId ?? "player";
  const before = JSON.stringify(harness.room);

  commitStrikeRoute(
    harness.server,
    harness.attackerSocket,
    rejectionCase.payload,
  );

  assert.equal(JSON.stringify(harness.room), before, rejectionCase.name);
  assert.equal(harness.attackerMessages.length, 1, rejectionCase.name);
  assert.equal(
    JSON.parse(harness.attackerMessages[0]).reason,
    rejectionCase.expectedReason,
    rejectionCase.name,
  );
  assert.equal(harness.publishedMessages.length, 0, rejectionCase.name);
  assert.equal(harness.defenderMessages.length, 0, rejectionCase.name);
}

fableFightRoomsCache.clear();
userSockets.delete("bot");
clearFableDefenseDeadline(baseCommit.roomId, 1, 0);

console.log({
  validCommit: {
    state: exchange.state,
    stamina: valid.room.players[0].stamina,
    strike: exchange.strike,
    blockDeadlineSet: exchange.deadlines.blockAtMs !== null,
  },
  rejectedWithoutMutation: [
    "duplicate",
    ...rejectionCases.map(rejectionCase => rejectionCase.name),
  ],
});
