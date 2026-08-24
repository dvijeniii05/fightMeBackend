import {
  ATTACK_PICK_DEADLINE_MS,
  DEFENSE_COMMIT_DEADLINE_MS,
  INTER_EXCHANGE_PAUSE_MS,
  INTER_ROUND_PAUSE_MS,
  MIN_RESULT_DISPLAY_MS,
  WINDUP_MS,
} from "../constants/combatTiming";
import {
  BOT_BLOCK_OFFSET_MAX_MS,
  BOT_BLOCK_OFFSET_MIN_MS,
  BOT_DIRECTION_MATCH_CHANCE,
} from "../constants/fableBot";
import {
  fableFightRoomsCache,
  userSockets,
} from "../socket_helpers/socketCache";
import type {
  FableExchangeResolvedMessage,
  FableExchangeResolvedPayload,
  FableExchangeStartedMessage,
  FableIncomingStrikeMessage,
  FableRoundResolvedMessage,
  FightDirection,
} from "../types/fableProtocol";
import type {
  FableExchange,
  FableRoomType,
  FableRound,
} from "../types/roomType";
import { initializeFablePveRound } from "./initializeFablePveRoom";
import {
  clearFableDefenseDeadline,
  clearFableRoomDefenseDeadlines,
  inspectFableRoomDefenseDeadlines,
  resolveFableExchange,
  scheduleFableDefenseDeadline,
} from "./resolveFableExchange";

const DIRECTIONS: readonly FightDirection[] = ["up", "right", "down", "left"];
const attackDeadlineTimers = new Map<string, ReturnType<typeof setTimeout>>();
const transitionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const coordinatedRoomIds = new Set<string>();

const getStepKey = (
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
) => `${roomId}:${roundNumber}:${exchangeIndex}`;

const clearRoomTimers = (
  timers: Map<string, ReturnType<typeof setTimeout>>,
  roomId: string,
) => {
  const keyPrefix = `${roomId}:`;
  for (const [key, timer] of timers) {
    if (!key.startsWith(keyPrefix)) continue;
    clearTimeout(timer);
    timers.delete(key);
  }
};

const sampleItem = <T>(items: readonly T[], random: () => number): T => {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
};

const sampleInteger = (
  minimum: number,
  maximum: number,
  random: () => number,
) => minimum + Math.floor(random() * (maximum - minimum + 1));

export const sampleFableBotDefense = (
  attackDirection: FightDirection,
  random: () => number = Math.random,
) => {
  const directionMatches = random() < BOT_DIRECTION_MATCH_CHANCE;
  const mismatchedDirections = DIRECTIONS.filter(
    direction => direction !== attackDirection,
  );

  return {
    direction: directionMatches
      ? attackDirection
      : sampleItem(mismatchedDirections, random),
    blockOffsetMs: sampleInteger(
      BOT_BLOCK_OFFSET_MIN_MS,
      BOT_BLOCK_OFFSET_MAX_MS,
      random,
    ),
  };
};

export const isFablePveCoordinatorRunning = (roomId: string) =>
  coordinatedRoomIds.has(roomId);

export const clearFableAttackDeadline = (
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
) => {
  const key = getStepKey(roomId, roundNumber, exchangeIndex);
  const timer = attackDeadlineTimers.get(key);
  if (timer) clearTimeout(timer);
  attackDeadlineTimers.delete(key);
};

const publishForfeit = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
) => {
  const resolution: FableExchangeResolvedPayload = {
    exchangeIndex: exchange.exchangeIndex,
    skillId: null,
    attackZone: null,
    blockZone: null,
    blockTier: "none",
    isCrit: false,
    isEvade: false,
    damage: 0,
    hp: Object.fromEntries(room.players.map(player => [player.id, player.hp])),
    stamina: Object.fromEntries(
      room.players.map(player => [player.id, player.stamina]),
    ),
    forfeitReason: "attack_timeout",
  };

  exchange.deadlines.attackAtMs = null;
  exchange.resolution = resolution;
  exchange.state = "resolved";
  round.results.push(resolution);

  const message: FableExchangeResolvedMessage = {
    type: "exchangeResolved",
    roomId: room.id,
    roundNumber: round.roundNumber,
    ...resolution,
  };
  server.publish(room.id, JSON.stringify(message));
};

export const forfeitFableAttack = (
  server: Bun.Server,
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
) => {
  clearFableAttackDeadline(roomId, roundNumber, exchangeIndex);
  if (!isFablePveCoordinatorRunning(roomId)) return false;

  const room = fableFightRoomsCache.get(roomId);
  const round = room?.rounds.find(item => item.roundNumber === roundNumber);
  const exchange = round?.exchanges[exchangeIndex];
  if (
    !room ||
    !round ||
    !exchange ||
    room.currentRound !== roundNumber ||
    round.activeExchangeIndex !== exchangeIndex ||
    exchange.state !== "awaiting_attack" ||
    exchange.strike !== null ||
    exchange.resolution !== null
  ) {
    return false;
  }

  publishForfeit(server, room, round, exchange);
  handleFableExchangeResolved(server, room, round, exchange);
  return true;
};

export const scheduleFableAttackDeadline = (
  server: Bun.Server,
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
  deadlineAtMs: number,
) => {
  clearFableAttackDeadline(roomId, roundNumber, exchangeIndex);
  const key = getStepKey(roomId, roundNumber, exchangeIndex);

  const forfeitAtDeadline = () => {
    const remainingMs = deadlineAtMs - Date.now();
    if (remainingMs >= 0) {
      attackDeadlineTimers.set(
        key,
        setTimeout(forfeitAtDeadline, remainingMs + 1),
      );
      return;
    }

    attackDeadlineTimers.delete(key);
    forfeitFableAttack(server, roomId, roundNumber, exchangeIndex);
  };

  attackDeadlineTimers.set(
    key,
    setTimeout(forfeitAtDeadline, Math.max(0, deadlineAtMs - Date.now() + 1)),
  );
};

const publishBotStrike = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
) => {
  const exchangeStarted: FableExchangeStartedMessage = {
    type: "exchangeStarted",
    roomId: room.id,
    roundNumber: round.roundNumber,
    exchangeIndex: exchange.exchangeIndex,
    attackerId: exchange.attackerId,
  };
  server.publish(room.id, JSON.stringify(exchangeStarted));

  const defenderSocket = userSockets.get(exchange.defenderId);
  if (!defenderSocket || !exchange.strike) return;

  const incomingStrike: FableIncomingStrikeMessage = {
    type: "incomingStrike",
    roomId: room.id,
    roundNumber: round.roundNumber,
    exchangeIndex: exchange.exchangeIndex,
    direction: exchange.strike.direction,
  };
  defenderSocket.send(JSON.stringify(incomingStrike));
};

const commitFableBotStrike = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  random: () => number = Math.random,
) => {
  const exchange = round.exchanges[1];
  const bot = room.players[1];
  if (
    round.activeExchangeIndex !== 1 ||
    exchange.attackerId !== bot.id ||
    exchange.state !== "awaiting_attack" ||
    exchange.strike !== null
  ) {
    return false;
  }

  const committedAtMs = Date.now();
  const damageBuff = bot.nextStrikeBuff ? { ...bot.nextStrikeBuff } : null;
  delete bot.nextStrikeBuff;
  exchange.strike = {
    skillId: "basic",
    direction: sampleItem(DIRECTIONS, random),
    committedAtMs,
    damageBuff,
  };
  exchange.state = "awaiting_block";
  exchange.deadlines.attackAtMs = null;
  exchange.deadlines.blockAtMs = committedAtMs + DEFENSE_COMMIT_DEADLINE_MS;
  scheduleFableDefenseDeadline(
    server,
    room.id,
    round.roundNumber,
    exchange.exchangeIndex,
    exchange.deadlines.blockAtMs,
    handleFableExchangeResolved,
  );
  publishBotStrike(server, room, round, exchange);
  return true;
};

export const resolveFableBotDefense = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
  random: () => number = Math.random,
) => {
  if (
    !isFablePveCoordinatorRunning(room.id) ||
    exchange.exchangeIndex !== 0 ||
    exchange.defenderId !== room.players[1].id ||
    !exchange.strike
  ) {
    return null;
  }

  const sampledDefense = sampleFableBotDefense(
    exchange.strike.direction,
    random,
  );
  const resolution = resolveFableExchange({
    server,
    room,
    round,
    exchange,
    defense: {
      ...sampledDefense,
      committedAtMs: Date.now(),
    },
  });
  if (resolution) handleFableExchangeResolved(server, room, round, exchange);
  return resolution;
};

const scheduleFableTransition = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
) => {
  const key = getStepKey(room.id, round.roundNumber, exchange.exchangeIndex);
  if (transitionTimers.has(key)) return;

  const resolvedAtMs = Date.now();
  const pauseMs =
    exchange.exchangeIndex === 0
      ? INTER_EXCHANGE_PAUSE_MS
      : INTER_ROUND_PAUSE_MS;
  const impactAtMs = exchange.strike
    ? exchange.strike.committedAtMs + WINDUP_MS
    : resolvedAtMs;
  const transitionAtMs = Math.max(
    impactAtMs + pauseMs,
    resolvedAtMs + MIN_RESULT_DISPLAY_MS,
  );

  const advanceAtDeadline = () => {
    const remainingMs = transitionAtMs - Date.now();
    if (remainingMs >= 0) {
      transitionTimers.set(key, setTimeout(advanceAtDeadline, remainingMs + 1));
      return;
    }

    transitionTimers.delete(key);
    advanceFablePveRoom(
      server,
      room.id,
      round.roundNumber,
      exchange.exchangeIndex,
    );
  };

  transitionTimers.set(
    key,
    setTimeout(advanceAtDeadline, Math.max(0, transitionAtMs - Date.now() + 1)),
  );
};

export const handleFableExchangeResolved = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
) => {
  if (
    !isFablePveCoordinatorRunning(room.id) ||
    room.status !== "active" ||
    room.matchResult ||
    round.roundNumber !== room.currentRound ||
    round.activeExchangeIndex !== exchange.exchangeIndex ||
    exchange.state !== "resolved" ||
    !exchange.resolution
  ) {
    return;
  }

  clearFableAttackDeadline(room.id, round.roundNumber, exchange.exchangeIndex);
  clearFableDefenseDeadline(room.id, round.roundNumber, exchange.exchangeIndex);
  scheduleFableTransition(server, room, round, exchange);
};

export const advanceFablePveRoom = (
  server: Bun.Server,
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
) => {
  const key = getStepKey(roomId, roundNumber, exchangeIndex);
  const timer = transitionTimers.get(key);
  if (timer) clearTimeout(timer);
  transitionTimers.delete(key);
  if (!isFablePveCoordinatorRunning(roomId)) return false;

  const room = fableFightRoomsCache.get(roomId);
  const round = room?.rounds.find(item => item.roundNumber === roundNumber);
  const exchange = round?.exchanges[exchangeIndex];
  if (
    !room ||
    !round ||
    !exchange ||
    room.status !== "active" ||
    room.matchResult ||
    room.currentRound !== roundNumber ||
    round.activeExchangeIndex !== exchangeIndex ||
    exchange.state !== "resolved" ||
    !exchange.resolution
  ) {
    return false;
  }

  if (exchangeIndex === 0) {
    round.activeExchangeIndex = 1;
    return commitFableBotStrike(server, room, round);
  }

  const roundResolved: FableRoundResolvedMessage = {
    type: "roundResolved",
    roomId: room.id,
    roundNumber: round.roundNumber,
    results: round.results,
  };
  server.publish(room.id, JSON.stringify(roundResolved));

  if (room.players.some(player => player.hp <= 0)) {
    stopFablePveCoordinator(room.id);
    return true;
  }

  const nextRoundNumber = round.roundNumber + 1;
  const nextRound = initializeFablePveRound(
    room.players[0].id,
    room.players[1].id,
    nextRoundNumber,
    Date.now(),
  );
  room.currentRound = nextRoundNumber;
  room.rounds.push(nextRound);
  scheduleFableAttackDeadline(
    server,
    room.id,
    nextRoundNumber,
    0,
    nextRound.exchanges[0].deadlines.attackAtMs ??
      Date.now() + ATTACK_PICK_DEADLINE_MS,
  );
  return true;
};

export const startFablePveCoordinator = (
  server: Bun.Server,
  roomId: string,
) => {
  const room = fableFightRoomsCache.get(roomId);
  const round = room?.rounds.find(
    item => item.roundNumber === room.currentRound,
  );
  const exchange = round?.exchanges[round.activeExchangeIndex];
  if (
    !room ||
    !round ||
    !exchange ||
    room.status !== "active" ||
    room.matchResult ||
    room.players.some(player => player.hp <= 0)
  ) {
    return false;
  }

  coordinatedRoomIds.add(roomId);
  if (exchange.state === "awaiting_attack") {
    if (exchange.exchangeIndex === 1) {
      return commitFableBotStrike(server, room, round);
    }

    const deadlineAtMs =
      exchange.deadlines.attackAtMs ?? Date.now() + ATTACK_PICK_DEADLINE_MS;
    exchange.deadlines.attackAtMs = deadlineAtMs;
    scheduleFableAttackDeadline(
      server,
      room.id,
      round.roundNumber,
      exchange.exchangeIndex,
      deadlineAtMs,
    );
  } else if (
    exchange.state === "awaiting_block" &&
    exchange.deadlines.blockAtMs
  ) {
    scheduleFableDefenseDeadline(
      server,
      room.id,
      round.roundNumber,
      exchange.exchangeIndex,
      exchange.deadlines.blockAtMs,
      handleFableExchangeResolved,
    );
  } else if (exchange.state === "resolved") {
    handleFableExchangeResolved(server, room, round, exchange);
  }
  return true;
};

export const stopFablePveCoordinator = (roomId: string) => {
  coordinatedRoomIds.delete(roomId);
  clearRoomTimers(attackDeadlineTimers, roomId);
  clearRoomTimers(transitionTimers, roomId);
  clearFableRoomDefenseDeadlines(roomId);
};

export const deleteFablePveRoom = (roomId: string) => {
  stopFablePveCoordinator(roomId);
  return fableFightRoomsCache.delete(roomId);
};

export const inspectFablePveCoordinator = (roomId: string) => {
  const keyPrefix = `${roomId}:`;
  return {
    running: isFablePveCoordinatorRunning(roomId),
    attackDeadlines: [...attackDeadlineTimers.keys()].filter(key =>
      key.startsWith(keyPrefix),
    ).length,
    transitions: [...transitionTimers.keys()].filter(key =>
      key.startsWith(keyPrefix),
    ).length,
    defenseDeadlines: inspectFableRoomDefenseDeadlines(roomId),
  };
};
