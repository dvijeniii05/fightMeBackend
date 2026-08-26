import { WINDUP_MS } from "../constants/combatTiming";
import {
  fableFightRoomsCache,
  userRoomsCache,
} from "../socket_helpers/socketCache";
import type { FableExchangeSnapshotMessage } from "../types/fableProtocol";
import type { FableRoomType, RoomType } from "../types/roomType";

type FightSocket = Bun.ServerWebSocket<{ heroId?: string }>;

const toLegacyRoomSnapshot = (room: FableRoomType): RoomType => ({
  ...room,
  rounds: [],
});

export const sendFableReconnectSnapshot = (
  ws: FightSocket,
  heroId: string,
  serverNowMs = Date.now(),
) => {
  const roomMapping = userRoomsCache.get(heroId);
  const room = roomMapping
    ? fableFightRoomsCache.get(roomMapping.id)
    : undefined;
  const player = room?.players.find(candidate => candidate.id === heroId);
  const round = room?.rounds.find(
    candidate => candidate.roundNumber === room.currentRound,
  );
  const exchange = round?.exchanges[round.activeExchangeIndex];

  if (!room || !player || !round || !exchange || room.matchResult) {
    return false;
  }

  ws.subscribe(room.id);
  ws.send(
    JSON.stringify({
      type: "personal_room_update",
      data: toLegacyRoomSnapshot(room),
    }),
  );

  const snapshot: FableExchangeSnapshotMessage = {
    type: "exchangeSnapshot",
    roomId: room.id,
    roundNumber: round.roundNumber,
    exchangeIndex: exchange.exchangeIndex,
    serverNowMs,
    state: exchange.state,
    attackerId: exchange.attackerId,
    defenderId: exchange.defenderId,
    strike: exchange.strike
      ? {
          skillId:
            exchange.attackerId === heroId ? exchange.strike.skillId : null,
          direction: exchange.strike.direction,
        }
      : null,
    defense:
      exchange.defense && exchange.defenderId === heroId
        ? {
            direction: exchange.defense.direction,
            blockOffsetMs: exchange.defense.blockOffsetMs,
          }
        : null,
    hp: Object.fromEntries(
      room.players.map(candidate => [candidate.id, candidate.hp]),
    ),
    stamina: Object.fromEntries(
      room.players.map(candidate => [candidate.id, candidate.stamina]),
    ),
    parryBuffActive: player.nextStrikeBuff !== undefined,
    attackDeadlineAtMs: exchange.deadlines.attackAtMs,
    impactAtMs: exchange.strike
      ? exchange.strike.committedAtMs + WINDUP_MS
      : null,
    defenseDeadlineAtMs: exchange.deadlines.blockAtMs,
  };
  ws.send(JSON.stringify(snapshot));
  return true;
};
