import { DEFENSE_COMMIT_DEADLINE_MS } from "../../constants/combatTiming";
import { COMBAT_SKILLS } from "../../constants/skills";
import {
  clearFableAttackDeadline,
  handleFableExchangeResolved,
  isFablePveCoordinatorRunning,
  resolveFableBotDefense,
} from "../../helpers/fablePveCoordinator";
import { scheduleFableDefenseDeadline } from "../../helpers/resolveFableExchange";
import type {
  FableCommitStrikeMessage,
  FableExchangeStartedMessage,
  FableIncomingStrikeMessage,
  FableStrikeCommittedMessage,
  FableStrikeCommitRejectedMessage,
  FightDirection,
  SkillId,
  StrikeCommitRejectionReason,
} from "../../types/fableProtocol";
import { fableFightRoomsCache, userSockets } from "../socketCache";

type CommitStrikePayload = Omit<FableCommitStrikeMessage, "type">;
type FightSocket = Bun.ServerWebSocket<{ heroId?: string }>;

const DIRECTIONS: readonly FightDirection[] = ["up", "right", "down", "left"];
const SKILL_IDS: readonly SkillId[] = ["basic", "precise", "heavy"];

const isSkillId = (value: unknown): value is SkillId =>
  typeof value === "string" && SKILL_IDS.includes(value as SkillId);

const rejectCommit = (
  ws: FightSocket,
  parsedMessage: CommitStrikePayload,
  reason: StrikeCommitRejectionReason,
) => {
  const rejection: FableStrikeCommitRejectedMessage = {
    type: "strikeCommitRejected",
    roomId: parsedMessage.roomId,
    roundNumber: parsedMessage.roundNumber,
    exchangeIndex: parsedMessage.exchangeIndex,
    reason,
  };
  ws.send(JSON.stringify(rejection));
};

export const commitStrikeRoute = (
  server: Bun.Server,
  ws: FightSocket,
  parsedMessage: CommitStrikePayload,
) => {
  const room = fableFightRoomsCache.get(parsedMessage.roomId);

  if (!room || room.combatVersion !== "fable_v2" || room.matchResult) {
    rejectCommit(ws, parsedMessage, "invalid_room");
    return;
  }

  const round = room.rounds.find(
    existingRound => existingRound.roundNumber === parsedMessage.roundNumber,
  );
  const exchange = round?.exchanges[parsedMessage.exchangeIndex];
  const attacker = room.players.find(
    player => player.id === parsedMessage.heroId,
  );

  if (
    ws.data.heroId !== parsedMessage.heroId ||
    userSockets.get(parsedMessage.heroId) !== ws
  ) {
    rejectCommit(ws, parsedMessage, "identity_mismatch");
    return;
  }

  if (
    !round ||
    round.roundNumber !== room.currentRound ||
    round.activeExchangeIndex !== parsedMessage.exchangeIndex ||
    !exchange ||
    exchange.exchangeIndex !== parsedMessage.exchangeIndex ||
    exchange.state === "resolved"
  ) {
    rejectCommit(ws, parsedMessage, "stale_exchange");
    return;
  }

  if (exchange.attackerId !== parsedMessage.heroId || !attacker) {
    rejectCommit(ws, parsedMessage, "not_attacker");
    return;
  }

  if (exchange.strike !== null || exchange.state !== "awaiting_attack") {
    rejectCommit(ws, parsedMessage, "duplicate_commit");
    return;
  }

  if (!DIRECTIONS.includes(parsedMessage.direction as FightDirection)) {
    rejectCommit(ws, parsedMessage, "invalid_direction");
    return;
  }

  if (!isSkillId(parsedMessage.skillId)) {
    rejectCommit(ws, parsedMessage, "unknown_skill");
    return;
  }

  const skill = COMBAT_SKILLS[parsedMessage.skillId];
  if (attacker.stamina < skill.cost) {
    rejectCommit(ws, parsedMessage, "insufficient_stamina");
    return;
  }

  const committedAtMs = Date.now();
  const damageBuff = attacker.nextStrikeBuff
    ? { ...attacker.nextStrikeBuff }
    : null;

  clearFableAttackDeadline(room.id, round.roundNumber, exchange.exchangeIndex);
  attacker.stamina -= skill.cost;
  delete attacker.nextStrikeBuff;
  exchange.strike = {
    skillId: skill.id,
    direction: parsedMessage.direction,
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

  const accepted: FableStrikeCommittedMessage = {
    type: "strikeCommitted",
    roomId: room.id,
    roundNumber: round.roundNumber,
    exchangeIndex: exchange.exchangeIndex,
    skillId: skill.id,
    direction: exchange.strike.direction,
    stamina: attacker.stamina,
  };
  ws.send(JSON.stringify(accepted));

  const exchangeStarted: FableExchangeStartedMessage = {
    type: "exchangeStarted",
    roomId: room.id,
    roundNumber: round.roundNumber,
    exchangeIndex: exchange.exchangeIndex,
    attackerId: exchange.attackerId,
  };
  server.publish(room.id, JSON.stringify(exchangeStarted));

  if (
    isFablePveCoordinatorRunning(room.id) &&
    exchange.defenderId === room.players[1].id
  ) {
    resolveFableBotDefense(server, room, round, exchange);
    return;
  }

  const defenderSocket = userSockets.get(exchange.defenderId);
  if (defenderSocket) {
    const incomingStrike: FableIncomingStrikeMessage = {
      type: "incomingStrike",
      roomId: room.id,
      roundNumber: round.roundNumber,
      exchangeIndex: exchange.exchangeIndex,
      direction: exchange.strike.direction,
    };
    defenderSocket.send(JSON.stringify(incomingStrike));
  }
};
