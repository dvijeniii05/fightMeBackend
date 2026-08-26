import assert from "node:assert/strict";
import { WINDUP_MS } from "../constants/combatTiming";
import { sendFableReconnectSnapshot } from "../helpers/sendFableReconnectSnapshot";
import { initializeFablePveRoom } from "../helpers/initializeFablePveRoom";
import {
  fableFightRoomsCache,
  userRoomsCache,
} from "../socket_helpers/socketCache";
import type { FableExchangeSnapshotMessage } from "../types/fableProtocol";
import type { Player, RoomType } from "../types/roomType";

const createPlayer = (id: string): Player => ({
  id,
  name: id,
  hp: 1000,
  maxHp: 1000,
  stats: {
    baseDamageBoost: 10,
    critChance: 0,
    critMultiplier: 2,
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

const roomId = "fable-reconnect-room";
const startedAtMs = 1_000_000;
const legacyRoom: RoomType = {
  id: roomId,
  status: "active",
  createdAt: new Date(0),
  startTime: startedAtMs,
  turnTimeLimit: 30,
  creator: { heroId: "player", nickname: "player", level: 1 },
  currentRound: 1,
  players: [createPlayer("player"), createPlayer("bot")],
  rounds: [],
  isPvp: false,
};
const room = initializeFablePveRoom(legacyRoom, startedAtMs);
fableFightRoomsCache.set(roomId, room);
userRoomsCache.set("player", { id: roomId, isPvp: false });
userRoomsCache.set("bot", { id: roomId, isPvp: false });

const readSnapshot = (heroId: string, serverNowMs: number) => {
  const messages: string[] = [];
  const subscriptions: string[] = [];
  const ws = {
    data: { heroId },
    subscribe: (topic: string) => subscriptions.push(topic),
    send: (message: string) => messages.push(message),
  } as unknown as Bun.ServerWebSocket<{ heroId?: string }>;

  assert.equal(sendFableReconnectSnapshot(ws, heroId, serverNowMs), true);
  assert.deepEqual(subscriptions, [roomId]);
  assert.equal(JSON.parse(messages[0]).type, "personal_room_update");
  assert.deepEqual(JSON.parse(messages[0]).data.rounds, []);
  return JSON.parse(messages[1]) as FableExchangeSnapshotMessage;
};

const awaitingAttack = readSnapshot("player", startedAtMs + 100);
assert.equal(awaitingAttack.state, "awaiting_attack");
assert.equal(awaitingAttack.strike, null);
assert.equal(awaitingAttack.attackDeadlineAtMs, startedAtMs + 30_000);

const exchange = room.rounds[0].exchanges[0];
exchange.strike = {
  skillId: "precise",
  direction: "up",
  committedAtMs: startedAtMs + 500,
  damageBuff: null,
};
exchange.state = "awaiting_block";
exchange.deadlines.attackAtMs = null;
exchange.deadlines.blockAtMs = startedAtMs + 2800;

const attackerSnapshot = readSnapshot("player", startedAtMs + 700);
assert.deepEqual(attackerSnapshot.strike, {
  skillId: "precise",
  direction: "up",
});
assert.equal(attackerSnapshot.impactAtMs, startedAtMs + 500 + WINDUP_MS);
assert.equal(attackerSnapshot.defenseDeadlineAtMs, startedAtMs + 2800);

const defenderSnapshot = readSnapshot("bot", startedAtMs + 700);
assert.deepEqual(defenderSnapshot.strike, {
  skillId: null,
  direction: "up",
});

exchange.defense = {
  direction: "up",
  blockOffsetMs: 150,
  committedAtMs: startedAtMs + 1250,
};
exchange.state = "resolved";
exchange.deadlines.blockAtMs = null;
const resolvedSnapshot = readSnapshot("bot", startedAtMs + 1500);
assert.equal(resolvedSnapshot.state, "resolved");
assert.deepEqual(resolvedSnapshot.defense, {
  direction: "up",
  blockOffsetMs: 150,
});
assert.equal("resolution" in resolvedSnapshot, false);

fableFightRoomsCache.delete(roomId);
userRoomsCache.delete("player");
userRoomsCache.delete("bot");
console.log("Fable reconnect snapshot checks passed");
