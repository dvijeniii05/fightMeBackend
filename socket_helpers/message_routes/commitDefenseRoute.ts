import type {
  DefenseCommitRejectionReason,
  FableCommitDefenseMessage,
  FableDefenseCommitRejectedMessage,
  FightDirection,
} from "../../types/fableProtocol";
import { handleFableExchangeResolved } from "../../helpers/fablePveCoordinator";
import { resolveFableExchange } from "../../helpers/resolveFableExchange";
import { fableFightRoomsCache, userSockets } from "../socketCache";

type CommitDefensePayload = Omit<FableCommitDefenseMessage, "type">;
type FightSocket = Bun.ServerWebSocket<{ heroId?: string }>;

const MIN_BLOCK_OFFSET_MS = -1400;
const MAX_BLOCK_OFFSET_MS = 900;
const DIRECTIONS: readonly FightDirection[] = ["up", "right", "down", "left"];

const rejectCommit = (
  ws: FightSocket,
  parsedMessage: CommitDefensePayload,
  reason: DefenseCommitRejectionReason,
) => {
  const rejection: FableDefenseCommitRejectedMessage = {
    type: "defenseCommitRejected",
    roomId: parsedMessage.roomId,
    roundNumber: parsedMessage.roundNumber,
    exchangeIndex: parsedMessage.exchangeIndex,
    reason,
  };
  ws.send(JSON.stringify(rejection));
};

export const commitDefenseRoute = (
  server: Bun.Server,
  ws: FightSocket,
  parsedMessage: CommitDefensePayload,
) => {
  const room = fableFightRoomsCache.get(parsedMessage.roomId);
  if (!room || room.combatVersion !== "fable_v2" || room.matchResult) {
    rejectCommit(ws, parsedMessage, "invalid_room");
    return;
  }

  if (
    ws.data.heroId !== parsedMessage.heroId ||
    userSockets.get(parsedMessage.heroId) !== ws
  ) {
    rejectCommit(ws, parsedMessage, "identity_mismatch");
    return;
  }

  const round = room.rounds.find(
    existingRound => existingRound.roundNumber === parsedMessage.roundNumber,
  );
  const exchange = round?.exchanges[parsedMessage.exchangeIndex];
  if (
    !round ||
    round.roundNumber !== room.currentRound ||
    round.activeExchangeIndex !== parsedMessage.exchangeIndex ||
    !exchange ||
    exchange.exchangeIndex !== parsedMessage.exchangeIndex
  ) {
    rejectCommit(ws, parsedMessage, "stale_exchange");
    return;
  }

  const defender = room.players.find(
    player => player.id === parsedMessage.heroId,
  );
  if (exchange.defenderId !== parsedMessage.heroId || !defender) {
    rejectCommit(ws, parsedMessage, "not_defender");
    return;
  }

  if (exchange.defense !== null) {
    rejectCommit(ws, parsedMessage, "duplicate_commit");
    return;
  }

  if (
    exchange.state !== "awaiting_block" ||
    !exchange.strike ||
    exchange.resolution
  ) {
    rejectCommit(ws, parsedMessage, "stale_exchange");
    return;
  }

  if (!DIRECTIONS.includes(parsedMessage.direction as FightDirection)) {
    rejectCommit(ws, parsedMessage, "invalid_direction");
    return;
  }

  if (
    !Number.isInteger(parsedMessage.blockOffsetMs) ||
    parsedMessage.blockOffsetMs < MIN_BLOCK_OFFSET_MS ||
    parsedMessage.blockOffsetMs > MAX_BLOCK_OFFSET_MS
  ) {
    rejectCommit(ws, parsedMessage, "invalid_offset");
    return;
  }

  if (
    exchange.deadlines.blockAtMs === null ||
    Date.now() > exchange.deadlines.blockAtMs
  ) {
    rejectCommit(ws, parsedMessage, "deadline_expired");
    return;
  }

  const resolution = resolveFableExchange({
    server,
    room,
    round,
    exchange,
    defense: {
      direction: parsedMessage.direction,
      blockOffsetMs: parsedMessage.blockOffsetMs,
      committedAtMs: Date.now(),
    },
  });
  if (resolution) handleFableExchangeResolved(server, room, round, exchange);
};
