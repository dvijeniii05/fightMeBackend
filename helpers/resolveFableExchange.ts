import {
  BLOCK_TOLERANCE_MS,
  PARRY_BUFF_MULT,
  PERFECT_BLOCK_MS,
} from "../constants/combatTiming";
import { COMBAT_SKILLS } from "../constants/skills";
import { fableFightRoomsCache } from "../socket_helpers/socketCache";
import type {
  BlockTier,
  FableExchangeResolvedMessage,
  FableExchangeResolvedPayload,
  FightDirection,
} from "../types/fableProtocol";
import type {
  FableExchange,
  FableRoomType,
  FableRound,
} from "../types/roomType";
import { resolveStrike } from "./resolveStrike";

type CommittedDefense = NonNullable<FableExchange["defense"]>;
type ExchangeResolvedHandler = (
  server: Bun.Server,
  room: FableRoomType,
  round: FableRound,
  exchange: FableExchange,
) => void;

const defenseDeadlineTimers = new Map<string, ReturnType<typeof setTimeout>>();

const getDeadlineKey = (
  roomId: string,
  roundNumber: number,
  exchangeIndex: number,
) => `${roomId}:${roundNumber}:${exchangeIndex}`;

export const classifyBlockTier = (
  attackDirection: FightDirection,
  defenseDirection: FightDirection,
  blockOffsetMs: number,
): BlockTier => {
  if (attackDirection !== defenseDirection || blockOffsetMs < 0) return "none";
  if (blockOffsetMs <= PERFECT_BLOCK_MS) return "perfect";
  if (blockOffsetMs <= BLOCK_TOLERANCE_MS) return "basic";
  return "none";
};

export const clearFableDefenseDeadline = (
  roomId: string,
  roundNumber: number,
  exchangeIndex: number,
) => {
  const key = getDeadlineKey(roomId, roundNumber, exchangeIndex);
  const timer = defenseDeadlineTimers.get(key);
  if (timer) clearTimeout(timer);
  defenseDeadlineTimers.delete(key);
};

export const clearFableRoomDefenseDeadlines = (roomId: string) => {
  const keyPrefix = `${roomId}:`;
  for (const [key, timer] of defenseDeadlineTimers) {
    if (!key.startsWith(keyPrefix)) continue;
    clearTimeout(timer);
    defenseDeadlineTimers.delete(key);
  }
};

export const inspectFableRoomDefenseDeadlines = (roomId: string) => {
  const keyPrefix = `${roomId}:`;
  return [...defenseDeadlineTimers.keys()].filter(key =>
    key.startsWith(keyPrefix),
  ).length;
};

export const resolveFableExchange = ({
  server,
  room,
  round,
  exchange,
  defense,
}: {
  server: Bun.Server;
  room: FableRoomType;
  round: FableRound;
  exchange: FableExchange;
  defense: CommittedDefense | null;
}): FableExchangeResolvedPayload | null => {
  if (
    exchange.state !== "awaiting_block" ||
    !exchange.strike ||
    exchange.resolution
  ) {
    return null;
  }

  const attacker = room.players.find(
    player => player.id === exchange.attackerId,
  );
  const defender = room.players.find(
    player => player.id === exchange.defenderId,
  );
  if (!attacker || !defender) return null;

  const skill = COMBAT_SKILLS[exchange.strike.skillId];
  const attemptedBlockTier = defense
    ? classifyBlockTier(
        exchange.strike.direction,
        defense.direction,
        defense.blockOffsetMs,
      )
    : "none";
  const blockTier =
    defender.blockDisabled || !skill.blockable
      ? "none"
      : attemptedBlockTier === "perfect" && !skill.parryable
        ? "basic"
        : attemptedBlockTier;
  delete defender.blockDisabled;
  const strikeResult = resolveStrike({
    attacker: {
      stats: attacker.stats,
      nextStrikeBuff: exchange.strike.damageBuff ?? undefined,
    },
    defender: {
      hp: defender.hp,
      stats: defender.stats,
    },
    skillId: exchange.strike.skillId,
    defense: { blockTier },
  });

  defender.hp = strikeResult.resultingHp;
  if (skill.lifeStealPercent > 0 && strikeResult.damage > 0) {
    attacker.hp = Math.min(
      attacker.maxHp,
      attacker.hp +
        Math.round((strikeResult.damage * skill.lifeStealPercent) / 100),
    );
  }
  if (skill.deniesOpponentBlock) defender.blockDisabled = true;
  if (blockTier === "perfect") {
    defender.nextStrikeBuff = { damageMult: PARRY_BUFF_MULT };
  }

  const resolution: FableExchangeResolvedPayload = {
    exchangeIndex: exchange.exchangeIndex,
    skillId: exchange.strike.skillId,
    attackZone: exchange.strike.direction,
    blockZone: defense?.direction ?? null,
    blockTier,
    isCrit: strikeResult.isCrit,
    isEvade: strikeResult.isEvade,
    damage: strikeResult.damage,
    hp: Object.fromEntries(room.players.map(player => [player.id, player.hp])),
    stamina: Object.fromEntries(
      room.players.map(player => [player.id, player.stamina]),
    ),
    ...(blockTier === "perfect"
      ? { parryBuff: { playerId: defender.id } }
      : {}),
  };

  exchange.defense = defense;
  exchange.blockTier = blockTier;
  exchange.deadlines.blockAtMs = null;
  exchange.resolution = resolution;
  exchange.state = "resolved";
  round.results.push(resolution);
  clearFableDefenseDeadline(room.id, round.roundNumber, exchange.exchangeIndex);

  const message: FableExchangeResolvedMessage = {
    type: "exchangeResolved",
    roomId: room.id,
    roundNumber: round.roundNumber,
    ...resolution,
  };
  server.publish(room.id, JSON.stringify(message));

  return resolution;
};

export const scheduleFableDefenseDeadline = (
  server: Bun.Server,
  roomId: string,
  roundNumber: number,
  exchangeIndex: 0 | 1,
  deadlineAtMs: number,
  onResolved?: ExchangeResolvedHandler,
) => {
  clearFableDefenseDeadline(roomId, roundNumber, exchangeIndex);
  const key = getDeadlineKey(roomId, roundNumber, exchangeIndex);

  const resolveAtDeadline = () => {
    const remainingMs = deadlineAtMs - Date.now();
    if (remainingMs >= 0) {
      defenseDeadlineTimers.set(
        key,
        setTimeout(resolveAtDeadline, remainingMs + 1),
      );
      return;
    }

    defenseDeadlineTimers.delete(key);
    const room = fableFightRoomsCache.get(roomId);
    const round = room?.rounds.find(item => item.roundNumber === roundNumber);
    const exchange = round?.exchanges[exchangeIndex];
    if (!room || !round || !exchange) return;

    const resolution = resolveFableExchange({
      server,
      room,
      round,
      exchange,
      defense: null,
    });
    if (resolution) onResolved?.(server, room, round, exchange);
  };

  defenseDeadlineTimers.set(
    key,
    setTimeout(resolveAtDeadline, Math.max(0, deadlineAtMs - Date.now() + 1)),
  );
};
