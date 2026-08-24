import assert from "node:assert/strict";
import { initializeFablePveRoom } from "../helpers/initializeFablePveRoom";
import {
  clearFableDefenseDeadline,
  scheduleFableDefenseDeadline,
} from "../helpers/resolveFableExchange";
import { commitDefenseRoute } from "../socket_helpers/message_routes/commitDefenseRoute";
import { commitStrikeRoute } from "../socket_helpers/message_routes/commitStrikeRoute";
import {
  fableFightRoomsCache,
  userSockets,
} from "../socket_helpers/socketCache";
import type {
  BlockTier,
  DefenseCommitRejectionReason,
  FightDirection,
} from "../types/fableProtocol";
import type { Player, RoomType } from "../types/roomType";

type DefensePayload = Parameters<typeof commitDefenseRoute>[2];

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

const createLegacyRoom = (roomId: string): RoomType => ({
  id: roomId,
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

const createHarness = (roomId: string, commitStrike = true) => {
  const room = initializeFablePveRoom(createLegacyRoom(roomId), Date.now());
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

  if (commitStrike) {
    commitStrikeRoute(server, attackerSocket, {
      roomId,
      roundNumber: 1,
      exchangeIndex: 0,
      heroId: "player",
      skillId: "basic",
      direction: "up",
    });
  }

  return {
    room,
    server,
    attackerSocket,
    defenderSocket,
    attackerMessages,
    defenderMessages,
    publishedMessages,
  };
};

const cleanupHarness = (roomId: string) => {
  clearFableDefenseDeadline(roomId, 1, 0);
  fableFightRoomsCache.delete(roomId);
};

const tierCases: Array<{
  offset: number;
  direction?: FightDirection;
  expectedTier: BlockTier;
  expectedDamage: number;
}> = [
  { offset: 0, expectedTier: "perfect", expectedDamage: 0 },
  { offset: 150, expectedTier: "perfect", expectedDamage: 0 },
  { offset: 151, expectedTier: "basic", expectedDamage: 40 },
  { offset: 400, expectedTier: "basic", expectedDamage: 40 },
  { offset: 401, expectedTier: "none", expectedDamage: 100 },
  { offset: -1, expectedTier: "none", expectedDamage: 100 },
  { offset: -1400, expectedTier: "none", expectedDamage: 100 },
  { offset: 900, expectedTier: "none", expectedDamage: 100 },
  {
    offset: 0,
    direction: "left",
    expectedTier: "none",
    expectedDamage: 100,
  },
];

for (const tierCase of tierCases) {
  const roomId = `defense-tier-${tierCase.offset}-${tierCase.direction ?? "up"}`;
  const harness = createHarness(roomId);
  commitDefenseRoute(harness.server, harness.defenderSocket, {
    roomId,
    roundNumber: 1,
    exchangeIndex: 0,
    heroId: "bot",
    direction: tierCase.direction ?? "up",
    blockOffsetMs: tierCase.offset,
  });

  const exchange = harness.room.rounds[0].exchanges[0];
  assert.equal(exchange.state, "resolved", roomId);
  assert.equal(exchange.blockTier, tierCase.expectedTier, roomId);
  assert.equal(exchange.resolution?.damage, tierCase.expectedDamage, roomId);
  assert.equal(
    harness.room.players[1].hp,
    1000 - tierCase.expectedDamage,
    roomId,
  );
  assert.equal(harness.room.rounds[0].results.length, 1, roomId);
  assert.equal(harness.publishedMessages.length, 2, roomId);

  const resolvedMessage = JSON.parse(harness.publishedMessages[1]);
  assert.equal(resolvedMessage.type, "exchangeResolved", roomId);
  assert.equal(resolvedMessage.blockTier, tierCase.expectedTier, roomId);
  assert.equal(resolvedMessage.blockZone, tierCase.direction ?? "up", roomId);
  assert.deepEqual(resolvedMessage.hp, {
    player: 1000,
    bot: 1000 - tierCase.expectedDamage,
  });
  assert.deepEqual(resolvedMessage.stamina, { player: 100, bot: 100 });

  if (tierCase.expectedTier === "perfect") {
    assert.deepEqual(harness.room.players[1].nextStrikeBuff, {
      damageMult: 1.25,
    });
    assert.deepEqual(resolvedMessage.parryBuff, { playerId: "bot" });
  } else {
    assert.equal(harness.room.players[1].nextStrikeBuff, undefined);
    assert.equal(resolvedMessage.parryBuff, undefined);
  }

  const resolvedSnapshot = JSON.stringify(harness.room);
  commitDefenseRoute(harness.server, harness.defenderSocket, {
    roomId,
    roundNumber: 1,
    exchangeIndex: 0,
    heroId: "bot",
    direction: "up",
    blockOffsetMs: 150,
  });
  assert.equal(JSON.stringify(harness.room), resolvedSnapshot, roomId);
  assert.equal(
    JSON.parse(harness.defenderMessages.at(-1)!).reason,
    "duplicate_commit",
    roomId,
  );
  assert.equal(harness.publishedMessages.length, 2, roomId);
  cleanupHarness(roomId);
}

const baseDefense = (roomId: string): DefensePayload => ({
  roomId,
  roundNumber: 1,
  exchangeIndex: 0,
  heroId: "bot",
  direction: "up",
  blockOffsetMs: 150,
});

const rejectionCases: Array<{
  name: string;
  expectedReason: DefenseCommitRejectionReason;
  payload?: Partial<DefensePayload>;
  socketHeroId?: string;
  commitStrike?: boolean;
  prepare?: (harness: ReturnType<typeof createHarness>) => void;
}> = [
  {
    name: "identity mismatch",
    expectedReason: "identity_mismatch",
    socketHeroId: "intruder",
  },
  {
    name: "stale round",
    expectedReason: "stale_exchange",
    payload: { roundNumber: 2 },
  },
  {
    name: "wrong exchange",
    expectedReason: "stale_exchange",
    payload: { exchangeIndex: 1 },
  },
  {
    name: "not defender",
    expectedReason: "not_defender",
    payload: { heroId: "player" },
    socketHeroId: "player",
  },
  {
    name: "awaiting attack",
    expectedReason: "stale_exchange",
    commitStrike: false,
  },
  {
    name: "invalid direction",
    expectedReason: "invalid_direction",
    payload: { direction: "diagonal" as FightDirection },
  },
  {
    name: "offset below bound",
    expectedReason: "invalid_offset",
    payload: { blockOffsetMs: -1401 },
  },
  {
    name: "offset above bound",
    expectedReason: "invalid_offset",
    payload: { blockOffsetMs: 901 },
  },
  {
    name: "fractional offset",
    expectedReason: "invalid_offset",
    payload: { blockOffsetMs: 150.5 },
  },
  {
    name: "non-finite offset",
    expectedReason: "invalid_offset",
    payload: { blockOffsetMs: Number.POSITIVE_INFINITY },
  },
  {
    name: "expired deadline",
    expectedReason: "deadline_expired",
    prepare: harness => {
      harness.room.rounds[0].exchanges[0].deadlines.blockAtMs = Date.now() - 1;
    },
  },
];

for (const rejectionCase of rejectionCases) {
  const roomId = `defense-reject-${rejectionCase.name.replaceAll(" ", "-")}`;
  const harness = createHarness(roomId, rejectionCase.commitStrike ?? true);
  rejectionCase.prepare?.(harness);
  harness.defenderSocket.data.heroId = rejectionCase.socketHeroId ?? "bot";
  const payload = { ...baseDefense(roomId), ...rejectionCase.payload };
  const before = JSON.stringify(harness.room);

  commitDefenseRoute(harness.server, harness.defenderSocket, payload);

  assert.equal(JSON.stringify(harness.room), before, rejectionCase.name);
  assert.equal(
    JSON.parse(harness.defenderMessages.at(-1)!).reason,
    rejectionCase.expectedReason,
    rejectionCase.name,
  );
  assert.equal(
    harness.publishedMessages.length,
    rejectionCase.commitStrike === false ? 0 : 1,
    rejectionCase.name,
  );
  cleanupHarness(roomId);
}

const invalidRoomMessages: string[] = [];
commitDefenseRoute(
  { publish: () => 0 } as unknown as Bun.Server,
  {
    data: { heroId: "bot" },
    send: (message: string) => invalidRoomMessages.push(message),
  } as unknown as Bun.ServerWebSocket<{ heroId?: string }>,
  baseDefense("missing-room"),
);
assert.equal(JSON.parse(invalidRoomMessages[0]).reason, "invalid_room");

const timeoutRoomId = "defense-timeout";
const timeoutHarness = createHarness(timeoutRoomId);
scheduleFableDefenseDeadline(
  timeoutHarness.server,
  timeoutRoomId,
  1,
  0,
  Date.now(),
);
await new Promise(resolve => setTimeout(resolve, 5));

const timeoutExchange = timeoutHarness.room.rounds[0].exchanges[0];
assert.equal(timeoutExchange.state, "resolved");
assert.equal(timeoutExchange.defense, null);
assert.equal(timeoutExchange.blockTier, "none");
assert.equal(timeoutExchange.resolution?.blockZone, null);
assert.equal(timeoutExchange.resolution?.damage, 100);
assert.equal(timeoutHarness.room.players[1].hp, 900);
assert.equal(timeoutHarness.publishedMessages.length, 2);
cleanupHarness(timeoutRoomId);
userSockets.delete("bot");

console.log({
  tierBoundaries: tierCases.map(item => ({
    offset: item.offset,
    direction: item.direction ?? "up",
    tier: item.expectedTier,
  })),
  rejectedWithoutMutation: rejectionCases.map(item => item.name),
  noDefenseFallback: {
    tier: timeoutExchange.blockTier,
    damage: timeoutExchange.resolution?.damage,
    blockZone: timeoutExchange.resolution?.blockZone,
  },
});
