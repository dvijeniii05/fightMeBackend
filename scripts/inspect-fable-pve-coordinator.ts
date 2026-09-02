import assert from "node:assert/strict";
import {
  ATTACK_PICK_DEADLINE_MS,
  PARRY_BUFF_MULT,
} from "../constants/combatTiming";
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
  activeHeroesCache,
  fableFightRoomsCache,
  userRoomsCache,
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

const createLegacyRoom = (
  roomId: string,
  playerHp = 10_000,
  botHp = 10_000,
): RoomType => ({
  id: roomId,
  status: "active",
  createdAt: new Date(0),
  startTime: 0,
  turnTimeLimit: 60,
  creator: { heroId: "player", nickname: "player", level: 1 },
  currentRound: 1,
  players: [createPlayer("player", playerHp), createPlayer("bot", botHp)],
  rounds: [],
  isPvp: false,
});

const createHarness = (roomId: string, playerHp = 10_000, botHp = 10_000) => {
  const startedAtMs = Date.now();
  const room = initializeFablePveRoom(
    createLegacyRoom(roomId, playerHp, botHp),
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
  userRoomsCache.set("player", { id: roomId, isPvp: false });
  userSockets.set("player", playerSocket);
  activeHeroesCache.set("player", {
    nickname: "player",
    lvl: 1,
    sprite: null,
    location: "red_moon_castle_arena",
    maxHp: playerHp,
    currHp: playerHp,
    status: "busy",
  });
  assert.equal(startFablePveCoordinator(server, roomId), true);
  assert.equal(
    room.rounds[0].exchanges[0].deadlines.attackAtMs,
    startedAtMs + ATTACK_PICK_DEADLINE_MS,
  );

  return { room, server, playerSocket, playerMessages, publishedMessages };
};

const deleteHarness = (roomId: string) => {
  deleteFablePveRoom(roomId);
  userRoomsCache.delete("player");
  userSockets.delete("player");
  activeHeroesCache.delete("player");
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

const commitPlayerStrikeWithBotMiss = (
  harness: ReturnType<typeof createHarness>,
  direction: FightDirection,
) => {
  const originalRandom = Math.random;
  Math.random = sequenceRandom(0.5, 0, 0);
  try {
    commitStrikeRoute(harness.server, harness.playerSocket, {
      roomId: harness.room.id,
      roundNumber: 1,
      exchangeIndex: 0,
      heroId: "player",
      skillId: "basic",
      direction,
    });
  } finally {
    Math.random = originalRandom;
  }
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
  await advanceFablePveRoom(
    multipleRounds.server,
    multipleRounds.room.id,
    1,
    0,
  ),
  true,
);
assert.equal(
  await advanceFablePveRoom(
    multipleRounds.server,
    multipleRounds.room.id,
    1,
    0,
  ),
  false,
);
assert.equal(firstRound.activeExchangeIndex, 1);
assert.equal(firstRound.exchanges[1].strike?.skillId, "basic");
assert.equal(multipleRounds.room.players[1].stamina, 100);
assert.deepEqual(
  multipleRounds.playerMessages.map(message => JSON.parse(message).type),
  ["strikeCommitted", "incomingStrike"],
);

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
assert.deepEqual(multipleRounds.room.players[0].nextStrikeBuff, {
  damageMult: PARRY_BUFF_MULT,
});
assert.equal(
  await advanceFablePveRoom(
    multipleRounds.server,
    multipleRounds.room.id,
    1,
    1,
  ),
  true,
);
assert.equal(multipleRounds.room.currentRound, 2);
assert.equal(multipleRounds.room.players[0].stamina, 70);
assert.equal(multipleRounds.room.players[1].stamina, 100);
assert.deepEqual(multipleRounds.room.players[0].nextStrikeBuff, {
  damageMult: PARRY_BUFF_MULT,
});
assert.equal(
  multipleRounds.publishedMessages.filter(
    message => JSON.parse(message).type === "roundResolved",
  ).length,
  1,
);

const randomBeforeBuffedStrike = Math.random;
Math.random = sequenceRandom(0.5, 0, 0);
try {
  commitStrikeRoute(multipleRounds.server, multipleRounds.playerSocket, {
    roomId: multipleRounds.room.id,
    roundNumber: 2,
    exchangeIndex: 0,
    heroId: "player",
    skillId: "basic",
    direction: "right",
  });
} finally {
  Math.random = randomBeforeBuffedStrike;
}
const buffedStrike = multipleRounds.room.rounds[1].exchanges[0];
assert.deepEqual(buffedStrike.strike?.damageBuff, {
  damageMult: PARRY_BUFF_MULT,
});
assert.equal(buffedStrike.resolution?.damage, 13);
assert.equal(multipleRounds.room.players[0].nextStrikeBuff, undefined);
assert.equal(
  await advanceFablePveRoom(
    multipleRounds.server,
    multipleRounds.room.id,
    2,
    0,
  ),
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
  await advanceFablePveRoom(
    multipleRounds.server,
    multipleRounds.room.id,
    2,
    1,
  ),
  true,
);
assert.equal(multipleRounds.room.currentRound, 3);
assert.equal(multipleRounds.room.players[0].stamina, 70);
assert.equal(multipleRounds.room.players[1].stamina, 100);
const randomBeforeUnbuffedStrike = Math.random;
Math.random = sequenceRandom(0.5, 0, 0);
try {
  commitStrikeRoute(multipleRounds.server, multipleRounds.playerSocket, {
    roomId: multipleRounds.room.id,
    roundNumber: 3,
    exchangeIndex: 0,
    heroId: "player",
    skillId: "basic",
    direction: "down",
  });
} finally {
  Math.random = randomBeforeUnbuffedStrike;
}
const unbuffedStrike = multipleRounds.room.rounds[2].exchanges[0];
assert.equal(unbuffedStrike.strike?.damageBuff, null);
assert.equal(unbuffedStrike.resolution?.damage, 10);
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
assert.equal(
  await advanceFablePveRoom(timeout.server, timeout.room.id, 1, 0),
  true,
);
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
assert.equal(
  await advanceFablePveRoom(lethal.server, lethal.room.id, 1, 0),
  true,
);
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
let persistenceCalls = 0;
const persistMatchResults = async ({
  room,
  player,
  bot,
}: Parameters<
  typeof import("../helpers/getMatchResults").getMatchResults
>[0]) => {
  persistenceCalls++;
  const isDraw = player.hp <= 0 && bot.hp <= 0;
  room.matchResult = isDraw
    ? { isDraw: true, exp: 0 }
    : {
        isDraw: false,
        winnerId: player.hp <= 0 ? bot.id : player.id,
        winnerName: player.hp <= 0 ? bot.name : player.name,
        exp: 0,
      };
  userRoomsCache.delete(player.id);
};
assert.equal(
  await advanceFablePveRoom(
    lethal.server,
    lethal.room.id,
    1,
    1,
    persistMatchResults,
  ),
  true,
);
assert.equal(
  await advanceFablePveRoom(
    lethal.server,
    lethal.room.id,
    1,
    1,
    persistMatchResults,
  ),
  false,
);
assert.equal(persistenceCalls, 1);
assert.equal(lethal.room.status, "finished");
assert.equal(lethal.room.matchResult?.winnerId, "bot");
assert.equal(activeHeroesCache.get("player")?.currHp, 0);
assert.equal(userRoomsCache.has("player"), false);
assert.equal(fableFightRoomsCache.has(lethal.room.id), false);
const lethalMessageTypes = lethal.publishedMessages.map(
  message => JSON.parse(message).type,
);
assert.ok(
  lethalMessageTypes.indexOf("exchangeResolved") <
    lethalMessageTypes.indexOf("personal_room_update"),
);
assert.ok(
  lethalMessageTypes.indexOf("roundResolved") <
    lethalMessageTypes.indexOf("personal_room_update"),
);
assert.deepEqual(inspectFablePveCoordinator(lethal.room.id), {
  running: false,
  attackDeadlines: 0,
  transitions: 0,
  defenseDeadlines: 0,
});
deleteHarness(lethal.room.id);

const victory = createHarness("fable-coordinator-victory", 10_000, 1);
commitPlayerStrikeWithBotMiss(victory, "up");
assert.equal(victory.room.players[1].hp, 0);
assert.equal(
  await advanceFablePveRoom(victory.server, victory.room.id, 1, 0),
  true,
);
const victoryReturnStrike = victory.room.rounds[0].exchanges[1];
assert.equal(victoryReturnStrike.attackerId, "bot");
assert.equal(victoryReturnStrike.state, "awaiting_block");
commitDefenseRoute(victory.server, victory.playerSocket, {
  roomId: victory.room.id,
  roundNumber: 1,
  exchangeIndex: 1,
  heroId: "player",
  direction: victoryReturnStrike.strike?.direction as FightDirection,
  blockOffsetMs: 401,
});
assert.equal(
  await advanceFablePveRoom(
    victory.server,
    victory.room.id,
    1,
    1,
    persistMatchResults,
  ),
  true,
);
assert.equal(victory.room.matchResult?.winnerId, "player");
assert.equal(fableFightRoomsCache.has(victory.room.id), false);
assert.deepEqual(inspectFablePveCoordinator(victory.room.id), {
  running: false,
  attackDeadlines: 0,
  transitions: 0,
  defenseDeadlines: 0,
});
deleteHarness(victory.room.id);

const draw = createHarness("fable-coordinator-draw", 1, 1);
commitPlayerStrikeWithBotMiss(draw, "right");
assert.equal(draw.room.players[1].hp, 0);
assert.equal(await advanceFablePveRoom(draw.server, draw.room.id, 1, 0), true);
const drawReturnStrike = draw.room.rounds[0].exchanges[1];
assert.equal(drawReturnStrike.attackerId, "bot");
commitDefenseRoute(draw.server, draw.playerSocket, {
  roomId: draw.room.id,
  roundNumber: 1,
  exchangeIndex: 1,
  heroId: "player",
  direction: drawReturnStrike.strike?.direction as FightDirection,
  blockOffsetMs: 401,
});
assert.equal(draw.room.players[0].hp, 0);
assert.equal(
  await advanceFablePveRoom(
    draw.server,
    draw.room.id,
    1,
    1,
    persistMatchResults,
  ),
  true,
);
assert.deepEqual(draw.room.matchResult, { isDraw: true, exp: 0 });
assert.equal(fableFightRoomsCache.has(draw.room.id), false);
assert.deepEqual(inspectFablePveCoordinator(draw.room.id), {
  running: false,
  attackDeadlines: 0,
  transitions: 0,
  defenseDeadlines: 0,
});
deleteHarness(draw.room.id);

console.log({
  botDefense: {
    match: { direction: "up", blockOffsetMs: 0 },
    mismatch,
  },
  completedRounds: 2,
  staminaAfterTwoRounds: { player: 70, bot: 100 },
  parryBuffDamage: { buffed: 13, nextStrike: 10 },
  attackTimeout: {
    skillId: forfeitedExchange.resolution?.skillId,
    attackZone: forfeitedExchange.resolution?.attackZone,
    damage: forfeitedExchange.resolution?.damage,
    reason: forfeitedExchange.resolution?.forfeitReason,
  },
  matchFinalization: {
    persistenceCalls,
    outcomes: {
      defeat: lethal.room.matchResult,
      victory: victory.room.matchResult,
      draw: draw.room.matchResult,
    },
    messageTypes: lethalMessageTypes,
  },
  cleanupVerified: true,
});
