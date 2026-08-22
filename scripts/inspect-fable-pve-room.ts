import assert from "node:assert/strict";
import {
  ATTACK_PICK_DEADLINE_MS,
  FIGHT_STAMINA,
} from "../constants/combatTiming";
import { initializeFablePveRoom } from "../helpers/initializeFablePveRoom";
import {
  fableFightRoomsCache,
  fightRoomsCache,
} from "../socket_helpers/socketCache";
import type { Player, RoomType } from "../types/roomType";

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  hp: 1000,
  maxHp: 1000,
  stats: {
    baseDamageBoost: 0,
    critChance: 0,
    critMultiplier: 1.5,
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

const startedAtMs = 1_000_000;
const legacyRoom: RoomType = {
  id: "fable-inspection-room",
  status: "active",
  createdAt: new Date(0),
  startTime: 0,
  turnTimeLimit: 60,
  creator: {
    heroId: "player",
    nickname: "player",
    level: 1,
  },
  currentRound: 1,
  players: [createPlayer("player"), createPlayer("bot")],
  rounds: [],
  isPvp: false,
};

const room = initializeFablePveRoom(legacyRoom, startedAtMs);
fableFightRoomsCache.set(room.id, room);

const cachedRoom = fableFightRoomsCache.get(room.id);
assert.ok(cachedRoom);
assert.equal(cachedRoom.combatVersion, "fable_v2");
assert.equal(cachedRoom.players[0].stamina, FIGHT_STAMINA);
assert.equal(cachedRoom.players[1].maxStamina, FIGHT_STAMINA);
assert.equal(cachedRoom.rounds[0].activeExchangeIndex, 0);
assert.deepEqual(
  cachedRoom.rounds[0].exchanges.map(exchange => [
    exchange.attackerId,
    exchange.defenderId,
  ]),
  [
    ["player", "bot"],
    ["bot", "player"],
  ],
);
assert.equal(
  cachedRoom.rounds[0].exchanges[0].deadlines.attackAtMs,
  startedAtMs + ATTACK_PICK_DEADLINE_MS,
);
assert.equal(cachedRoom.rounds[0].exchanges[1].deadlines.attackAtMs, null);
assert.equal(fightRoomsCache.has(room.id), false);
assert.equal(legacyRoom.rounds.length, 0);
assert.equal("stamina" in legacyRoom.players[0], false);

console.log({
  roomId: cachedRoom.id,
  combatVersion: cachedRoom.combatVersion,
  stamina: cachedRoom.players.map(player => player.stamina),
  exchanges: cachedRoom.rounds[0].exchanges.map(exchange => ({
    exchangeIndex: exchange.exchangeIndex,
    attackerId: exchange.attackerId,
    defenderId: exchange.defenderId,
    state: exchange.state,
    deadlines: exchange.deadlines,
  })),
  legacyCacheContainsRoom: fightRoomsCache.has(room.id),
});

fableFightRoomsCache.delete(room.id);
