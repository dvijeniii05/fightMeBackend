type Player = {
  id: string;
  name: string;
  hp: number; //current Health
  maxHp: number; //initial Health
  stats: {
    baseDamageBoost: number;
    attackArea: number;
    blockArea: number;
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
};

export type Round = {
  roundNumber: number;
  actions: {
    playerId: string;
    // healthLeft: number; //OR leave it here???
    attackTime: number;
    attackArea: number; // OR string?
    blockTime: number;
    blockArea: number; // OR string?

    //TODO: to add magic related fields
    // isMulticast: boolean;
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
    attackRange: string;
    blockRange: string;
  }[];

  //TODO: Might be an overkill??
  // actionedPlayers: {
  //   playerOne: boolean; //false by default, true once picked an action
  //   playerTwo: boolean; //false by default, true once picked an action
  // };
  actionedPlayers: {
    id: string;
    madeSelection: boolean;
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
  };

  creator: {
    heroId: string;
    nickname: string;
    //Should include more yser data such as level, maybe some stats
  };

  currentRound: number;

  players: Player[];
  rounds: Round[]; //New roudn is always added as 0 index el into this array
  isPvp: boolean;
};

export type UserRoomType = {
  id: string;
  isPvp: boolean;
};
