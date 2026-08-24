import assert from "node:assert/strict";
import { ATTACK_PICK_DEADLINE_MS } from "../constants/combatTiming";
import {
  advanceFablePveRoom,
  deleteFablePveRoom,
  handleFableExchangeResolved,
  inspectFablePveCoordinator,
  sampleFableBotDefense,
  scheduleFableAttackDeadline,
  startFablePveCoordinator,
} from "../helpers/fablePveCoordinator";
import { initializeFablePveRoom } from "../helpers/initializeFablePveRoom";
import { scheduleFableDefenseDeadline } from "../helpers/resolveFableExchange";
import { commitDefenseRoute } from "../socket_helpers/message_routes/commitDefenseRoute";
import { commitStrikeRoute } from "../socket_helpers/message_routes/commitStrikeRoute";
import {
  fableFightRoomsCache,
  userSockets,
} from "../socket_helpers/socketCache";
import type { FightDirection } from "../types/fableProtocol";
import type { Player, RoomType } from "../types/roomType";

const createPlayer = (id: string, hp = 10_000): Player => ({
  id,
  name: id,
  hp,
  maxHp: hp,
  stats: {
    baseDamageBoost: 10,
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

const createLegacyRoom = (roomId: string, playerHp = 10_000): RoomType => ({
  id: roomId,
  status: "active",
  createdAt: new Date(0),
  startTime: 0,
  turnTimeLimit: 60,
  creator: { heroId: "player", nickname: "player", level: 1 },
  currentRound: 1,
  players: [createPlayer("player", playerHp), createPlayer("bot")],
  rounds: [],
  isPvp: false,
});

const createHarness = (roomId: string, playerHp = 10_000) => {
  const startedAtMs = Date.now();
  const room = initializeFablePveRoom(
    createLegacyRoom(roomId, playerHp),
    startedAtMs,
  );
  const playerMessages: string[] = [];
  const publishedMessages: string[] = [];
  const playerSocket = {
    data: { heroId: "player" },
    send: (message: string) => playerMessages.push(message),
  } as unknown as Bun.ServerWebSocket<{ heroId?: string }>;
  const server = {
    publish: (_topic: string, message: string) => {
      publishedMessages.push(message);
      return 1;
    },
  } as unknown as Bun.Server;

  fableFightRoomsCache.set(roomId, room);
  userSockets.set("player", playerSocket);
  assert.equal(startFablePveCoordinator(server, roomId), true);
  assert.equal(
    room.rounds[0].exchanges[0].deadlines.attackAtMs,
    startedAtMs + ATTACK_PICK_DEADLINE_MS,
  );

  return { room, server, playerSocket, playerMessages, publishedMessages };
};

const deleteHarness = (roomId: string) => {
  deleteFablePveRoom(roomId);
  userSockets.delete("player");
  assert.deepEqual(inspectFablePveCoordinator(roomId), {
    running: false,
    attackDeadlines: 0,
    transitions: 0,
    defenseDeadlines: 0,
  });
};

const sequenceRandom = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? 0;
};

assert.deepEqual(sampleFableBotDefense("up", sequenceRandom(0, 0)), {
  direction: "up",
  blockOffsetMs: 0,
});
const mismatch = sampleFableBotDefense(
  "up",
  sequenceRandom(0.5, 0, 1 - Number.EPSILON),
);
assert.notEqual(mismatch.direction, "up");
assert.equal(mismatch.blockOffsetMs, 400);

const multipleRounds = createHarness("fable-coordinator-rounds");
assert.deepEqual(inspectFablePveCoordinator(multipleRounds.room.id), {
  running: true,
  attackDeadlines: 1,
  transitions: 0,
  defenseDeadlines: 0,
});

commitStrikeRoute(multipleRounds.server, multipleRounds.playerSocket, {
  roomId: multipleRounds.room.id,
  roundNumber: 1,
  exchangeIndex: 0,
  heroId: "player",
  skillId: "precise",
  direction: "up",
});
const firstRound = multipleRounds.room.rounds[0];
assert.equal(firstRound.exchanges[0].state, "resolved");
assert.equal(multipleRounds.room.players[0].stamina, 70);
assert.equal(multipleRounds.room.players[1].stamina, 100);
assert.equal(inspectFablePveCoordinator(multipleRounds.room.id).transitions, 1);

assert.equal(
  advanceFablePveRoom(multipleRounds.server, multipleRounds.room.id, 1, 0),
  true,
);
assert.equal(
  advanceFablePveRoom(multipleRounds.server, multipleRounds.room.id, 1, 0),
  false,
);
assert.equal(firstRound.activeExchangeIndex, 1);
assert.equal(firstRound.exchanges[1].strike?.skillId, "basic");
assert.equal(multipleRounds.room.players[1].stamina, 100);
assert.equal(multipleRounds.playerMessages.length, 1);

const firstBotDirection = firstRound.exchanges[1].strike
  ?.direction as FightDirection;
commitDefenseRoute(multipleRounds.server, multipleRounds.playerSocket, {
  roomId: multipleRounds.room.id,
  roundNumber: 1,
  exchangeIndex: 1,
  heroId: "player",
  direction: firstBotDirection,
  blockOffsetMs: 150,
});
assert.equal(firstRound.exchanges[1].state, "resolved");
assert.equal(
  advanceFablePveRoom(multipleRounds.server, multipleRounds.room.id, 1, 1),
  true,
);
assert.equal(multipleRounds.room.currentRound, 2);
assert.equal(multipleRounds.room.players[0].stamina, 70);
assert.equal(multipleRounds.room.players[1].stamina, 100);
assert.equal(
  multipleRounds.publishedMessages.filter(
    message => JSON.parse(message).type === "roundResolved",
  ).length,
  1,
);

commitStrikeRoute(multipleRounds.server, multipleRounds.playerSocket, {
  roomId: multipleRounds.room.id,
  roundNumber: 2,
  exchangeIndex: 0,
  heroId: "player",
  skillId: "basic",
  direction: "right",
});
assert.equal(
  advanceFablePveRoom(multipleRounds.server, multipleRounds.room.id, 2, 0),
  true,
);
const secondRound = multipleRounds.room.rounds[1];
const secondBotDirection = secondRound.exchanges[1].strike
  ?.direction as FightDirection;
commitDefenseRoute(multipleRounds.server, multipleRounds.playerSocket, {
  roomId: multipleRounds.room.id,
  roundNumber: 2,
  exchangeIndex: 1,
  heroId: "player",
  direction: secondBotDirection,
  blockOffsetMs: 401,
});
assert.equal(
  advanceFablePveRoom(multipleRounds.server, multipleRounds.room.id, 2, 1),
  true,
);
assert.equal(multipleRounds.room.currentRound, 3);
assert.equal(multipleRounds.room.players[0].stamina, 70);
assert.equal(multipleRounds.room.players[1].stamina, 100);
deleteHarness(multipleRounds.room.id);

const timeout = createHarness("fable-coordinator-timeout");
scheduleFableAttackDeadline(
  timeout.server,
  timeout.room.id,
  1,
  0,
  Date.now() - 1,
);
await new Promise(resolve => setTimeout(resolve, 5));
const forfeitedExchange = timeout.room.rounds[0].exchanges[0];
assert.equal(forfeitedExchange.state, "resolved");
assert.equal(forfeitedExchange.resolution?.skillId, null);
assert.equal(forfeitedExchange.resolution?.attackZone, null);
assert.equal(forfeitedExchange.resolution?.damage, 0);
assert.equal(forfeitedExchange.resolution?.forfeitReason, "attack_timeout");
assert.equal(inspectFablePveCoordinator(timeout.room.id).transitions, 1);
assert.equal(advanceFablePveRoom(timeout.server, timeout.room.id, 1, 0), true);
const silentDefenseExchange = timeout.room.rounds[0].exchanges[1];
assert.equal(silentDefenseExchange.strike?.skillId, "basic");
scheduleFableDefenseDeadline(
  timeout.server,
  timeout.room.id,
  1,
  1,
  Date.now() - 1,
  handleFableExchangeResolved,
);
await new Promise(resolve => setTimeout(resolve, 5));
assert.equal(silentDefenseExchange.state, "resolved");
assert.equal(silentDefenseExchange.defense, null);
assert.equal(silentDefenseExchange.blockTier, "none");
assert.equal(inspectFablePveCoordinator(timeout.room.id).transitions, 1);
deleteHarness(timeout.room.id);

const lethal = createHarness("fable-coordinator-lethal", 1);
commitStrikeRoute(lethal.server, lethal.playerSocket, {
  roomId: lethal.room.id,
  roundNumber: 1,
  exchangeIndex: 0,
  heroId: "player",
  skillId: "basic",
  direction: "down",
});
assert.equal(advanceFablePveRoom(lethal.server, lethal.room.id, 1, 0), true);
const lethalBotDirection = lethal.room.rounds[0].exchanges[1].strike
  ?.direction as FightDirection;
commitDefenseRoute(lethal.server, lethal.playerSocket, {
  roomId: lethal.room.id,
  roundNumber: 1,
  exchangeIndex: 1,
  heroId: "player",
  direction: lethalBotDirection,
  blockOffsetMs: 401,
});
assert.equal(lethal.room.players[0].hp, 0);
assert.equal(advanceFablePveRoom(lethal.server, lethal.room.id, 1, 1), true);
assert.deepEqual(inspectFablePveCoordinator(lethal.room.id), {
  running: false,
  attackDeadlines: 0,
  transitions: 0,
  defenseDeadlines: 0,
});
deleteHarness(lethal.room.id);

console.log({
  botDefense: {
    match: { direction: "up", blockOffsetMs: 0 },
    mismatch,
  },
  completedRounds: 2,
  staminaAfterTwoRounds: { player: 70, bot: 100 },
  attackTimeout: {
    skillId: forfeitedExchange.resolution?.skillId,
    attackZone: forfeitedExchange.resolution?.attackZone,
    damage: forfeitedExchange.resolution?.damage,
    reason: forfeitedExchange.resolution?.forfeitReason,
  },
  cleanupVerified: true,
});
