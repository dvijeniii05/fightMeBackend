import {
  ATTACK_PICK_DEADLINE_MS,
  FIGHT_STAMINA,
} from "../constants/combatTiming";
import type {
  FableExchange,
  FablePlayer,
  FableRoomType,
  FableRound,
  Player,
  RoomType,
} from "../types/roomType";

const initializeFablePlayer = (player: Player): FablePlayer => ({
  ...player,
  stamina: FIGHT_STAMINA,
  maxStamina: FIGHT_STAMINA,
});

export const initializeFablePveRound = (
  playerId: string,
  botId: string,
  roundNumber: number,
  startedAtMs: number,
): FableRound => {
  const exchanges: [FableExchange, FableExchange] = [
    {
      exchangeIndex: 0,
      attackerId: playerId,
      defenderId: botId,
      state: "awaiting_attack",
      strike: null,
      defense: null,
      blockTier: null,
      deadlines: {
        attackAtMs: startedAtMs + ATTACK_PICK_DEADLINE_MS,
        blockAtMs: null,
      },
      resolution: null,
    },
    {
      exchangeIndex: 1,
      attackerId: botId,
      defenderId: playerId,
      state: "awaiting_attack",
      strike: null,
      defense: null,
      blockTier: null,
      deadlines: {
        attackAtMs: null,
        blockAtMs: null,
      },
      resolution: null,
    },
  ];

  return {
    roundNumber,
    activeExchangeIndex: 0,
    exchanges,
    results: [],
  };
};

export const initializeFablePveRoom = (
  legacyRoom: RoomType,
  startedAtMs = Date.now(),
): FableRoomType => {
  if (legacyRoom.isPvp) {
    throw new Error("Fable PvE rooms require isPvp=false");
  }

  if (legacyRoom.players.length !== 2) {
    throw new Error("Fable PvE rooms require exactly one player and one bot");
  }

  const [player, bot] = legacyRoom.players;

  return {
    ...legacyRoom,
    combatVersion: "fable_v2",
    isPvp: false,
    players: [initializeFablePlayer(player), initializeFablePlayer(bot)],
    rounds: [
      initializeFablePveRound(
        player.id,
        bot.id,
        legacyRoom.currentRound,
        startedAtMs,
      ),
    ],
  };
};
