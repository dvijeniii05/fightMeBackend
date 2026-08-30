export type CombatVersion = "legacy" | "fable_v2";

export type FightDirection = "up" | "right" | "down" | "left";
export type SkillId =
  | "basic"
  | "precise"
  | "heavy"
  | "sunder"
  | "leech"
  | "hidden"
  | "perfect";
export type BlockTier = "perfect" | "basic" | "none";
export type FableForfeitReason = "attack_timeout";
export type ExchangeState = "awaiting_attack" | "awaiting_block" | "resolved";
export type ExchangeIndex = 0 | 1;
export type StrikeCommitRejectionReason =
  | "invalid_room"
  | "identity_mismatch"
  | "stale_exchange"
  | "not_attacker"
  | "duplicate_commit"
  | "invalid_direction"
  | "unknown_skill"
  | "skill_not_equipped"
  | "skill_unavailable"
  | "insufficient_stamina";
export type DefenseCommitRejectionReason =
  | "invalid_room"
  | "identity_mismatch"
  | "stale_exchange"
  | "not_defender"
  | "duplicate_commit"
  | "invalid_direction"
  | "invalid_offset"
  | "deadline_expired";

type FableExchangeMessageBase = {
  roomId: string;
  roundNumber: number;
  exchangeIndex: ExchangeIndex;
};

export type FableCommitStrikeMessage = FableExchangeMessageBase & {
  type: "commitStrike";
  heroId: string;
  skillId: SkillId;
  direction: FightDirection;
};

export type FableCommitDefenseMessage = FableExchangeMessageBase & {
  type: "commitDefense";
  heroId: string;
  direction: FightDirection;
  blockOffsetMs: number;
};

export type FableExchangeStartedMessage = FableExchangeMessageBase & {
  type: "exchangeStarted";
  attackerId: string;
};

export type FableIncomingStrikeMessage = FableExchangeMessageBase & {
  type: "incomingStrike";
  direction: FightDirection;
};

export type FableStrikeCommittedMessage = FableExchangeMessageBase & {
  type: "strikeCommitted";
  skillId: SkillId;
  direction: FightDirection;
  stamina: number;
};

export type FableExchangeSnapshotMessage = FableExchangeMessageBase & {
  type: "exchangeSnapshot";
  serverNowMs: number;
  state: ExchangeState;
  attackerId: string;
  defenderId: string;
  strike: {
    skillId: SkillId | null;
    direction: FightDirection;
  } | null;
  defense: {
    direction: FightDirection;
    blockOffsetMs: number;
  } | null;
  hp: Record<string, number>;
  stamina: Record<string, number>;
  parryBuffActive: boolean;
  attackDeadlineAtMs: number | null;
  impactAtMs: number | null;
  defenseDeadlineAtMs: number | null;
};

export type FableStrikeCommitRejectedMessage = FableExchangeMessageBase & {
  type: "strikeCommitRejected";
  reason: StrikeCommitRejectionReason;
};

export type FableDefenseCommitRejectedMessage = FableExchangeMessageBase & {
  type: "defenseCommitRejected";
  reason: DefenseCommitRejectionReason;
};

export type FableExchangeResolvedPayload = {
  exchangeIndex: ExchangeIndex;
  skillId: SkillId | null;
  attackZone: FightDirection | null;
  blockZone: FightDirection | null;
  blockTier: BlockTier;
  isCrit: boolean;
  isEvade: boolean;
  damage: number;
  hp: Record<string, number>;
  stamina: Record<string, number>;
  forfeitReason?: FableForfeitReason;
  parryBuff?: { playerId: string };
};

export type FableExchangeResolvedMessage = {
  type: "exchangeResolved";
  roomId: string;
  roundNumber: number;
} & FableExchangeResolvedPayload;

export type FableRoundResolvedMessage = {
  type: "roundResolved";
  roomId: string;
  roundNumber: number;
  results: readonly FableExchangeResolvedPayload[];
};

export type FableClientMessage =
  | FableCommitStrikeMessage
  | FableCommitDefenseMessage;

export type FableServerMessage =
  | FableExchangeStartedMessage
  | FableIncomingStrikeMessage
  | FableStrikeCommittedMessage
  | FableExchangeSnapshotMessage
  | FableStrikeCommitRejectedMessage
  | FableDefenseCommitRejectedMessage
  | FableExchangeResolvedMessage
  | FableRoundResolvedMessage;

type ProtocolExample<T extends FableClientMessage | FableServerMessage> = T;

export type FableProtocolExamples = [
  ProtocolExample<{
    type: "commitStrike";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    heroId: "hero-1";
    skillId: "precise";
    direction: "up";
  }>,
  ProtocolExample<{
    type: "commitDefense";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    heroId: "hero-2";
    direction: "up";
    blockOffsetMs: 150;
  }>,
  ProtocolExample<{
    type: "exchangeStarted";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    attackerId: "hero-1";
  }>,
  ProtocolExample<{
    type: "incomingStrike";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    direction: "up";
  }>,
  ProtocolExample<{
    type: "strikeCommitted";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    skillId: "precise";
    direction: "up";
    stamina: 70;
  }>,
  ProtocolExample<{
    type: "exchangeSnapshot";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    serverNowMs: 1000;
    state: "awaiting_block";
    attackerId: "hero-1";
    defenderId: "hero-2";
    strike: { skillId: null; direction: "up" };
    defense: null;
    hp: { "hero-1": 1000; "hero-2": 1000 };
    stamina: { "hero-1": 70; "hero-2": 100 };
    parryBuffActive: false;
    attackDeadlineAtMs: null;
    impactAtMs: 1900;
    defenseDeadlineAtMs: 3300;
  }>,
  ProtocolExample<{
    type: "strikeCommitRejected";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    reason: "insufficient_stamina";
  }>,
  ProtocolExample<{
    type: "defenseCommitRejected";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    reason: "invalid_offset";
  }>,
  ProtocolExample<{
    type: "exchangeResolved";
    roomId: "room-1";
    roundNumber: 1;
    exchangeIndex: 0;
    skillId: "precise";
    attackZone: "up";
    blockZone: "up";
    blockTier: "perfect";
    isCrit: true;
    isEvade: false;
    damage: 0;
    hp: { "hero-1": 1000; "hero-2": 1000 };
    stamina: { "hero-1": 70; "hero-2": 100 };
    parryBuff: { playerId: "hero-2" };
  }>,
  ProtocolExample<{
    type: "roundResolved";
    roomId: "room-1";
    roundNumber: 1;
    results: [];
  }>,
];
