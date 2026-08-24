import type { InventoryItemType } from "./itemsType";
import type {
  BlockTier,
  ExchangeIndex,
  ExchangeState,
  FableExchangeResolvedPayload,
  FightDirection,
  SkillId,
} from "./fableProtocol";

export type Player = {
  id: string;
  name: string;
  hp: number; //current Health
  maxHp: number; //initial Health
  stats: {
    baseDamageBoost: number;
    critChance: number;
    critMultiplier: number;
    evadeChance: number;
    fastChance: number;
    skillCritChance: number;
  };
  history: {
    win: number;
    loss: number;
  };
  lvl: number;
  exp: number;
  statsPoints: number;
  souls: number;
  shardsA: number;
  shardsB: number;
  shardsC: number;
  items: InventoryItemType[];
};

export type Round = {
  roundNumber: number;
  attackSelections: {
    playerId: string;
    attackZone: number;
    attackTime: number;
  }[];
  blockSelections: {
    playerId: string;
    blockZone: number;
    blockTime: number;
  }[];
  results: {
    playerId: string;
    hp: number;
    incomingDamage?: number;
    outgoingDamage?: number;
    isCrit?: boolean;
    isEvade?: boolean;
    isFast?: boolean;
    isBlocked?: boolean;
    block: string; //in %
    attackZne: number;
    blockZne: number;
  }[];
};

export type RoomType = {
  id: string; //Might not need it since the kay value is already a roomId?
  status: "waiting" | "active" | "finished";
  createdAt: Date; // Date.now()
  startTime: number; // Date.now()
  turnTimeLimit: number; //seconds, default 30 or 60?

  matchResult?: {
    isDraw: boolean;
    winnerId?: string;
    winnerName?: string;
    exp?: number;
    souls?: number;
    shardsA?: number;
    shardsB?: number;
    shardsC?: number;
  };

  creator: {
    heroId: string;
    nickname: string;
    level: number;
    //Should include more user data such as level, maybe some stats
  };

  currentRound: number;

  players: Player[];
  rounds: Round[]; //New roudn is always added as 0 index el into this array
  isPvp: boolean;
  isDungeon?: boolean;
  shardsType?: string; //  a = greenForge, b = blueForge, c = purpleForge
};

export type FablePlayer = Player & {
  stamina: number;
  maxStamina: number;
  nextStrikeBuff?: {
    damageMult: number;
  };
};

export type FableExchange = {
  exchangeIndex: ExchangeIndex;
  attackerId: string;
  defenderId: string;
  state: ExchangeState;
  strike: {
    skillId: SkillId;
    direction: FightDirection;
    committedAtMs: number;
    damageBuff: { damageMult: number } | null;
  } | null;
  defense: {
    direction: FightDirection;
    blockOffsetMs: number;
    committedAtMs: number;
  } | null;
  blockTier: BlockTier | null;
  deadlines: {
    attackAtMs: number | null;
    blockAtMs: number | null;
  };
  resolution: FableExchangeResolvedPayload | null;
};

export type FableRound = {
  roundNumber: number;
  activeExchangeIndex: ExchangeIndex;
  exchanges: [FableExchange, FableExchange];
  results: FableExchangeResolvedPayload[];
};

export type FableRoomType = Omit<RoomType, "isPvp" | "players" | "rounds"> & {
  combatVersion: "fable_v2";
  isPvp: false;
  players: [FablePlayer, FablePlayer];
  rounds: FableRound[];
};

export type UserRoomType = {
  id: string;
  isPvp: boolean;
  heroName?: string;
  heroLvl?: number;
  heroId?: string;
};
