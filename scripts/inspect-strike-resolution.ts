import assert from "node:assert/strict";
import { resolveStrike } from "../helpers/resolveStrike";
import type { BlockTier, SkillId } from "../types/fableProtocol";

type FixtureOptions = {
  name: string;
  skillId?: SkillId;
  blockTier?: BlockTier;
  baseDamageBoost?: number;
  isCrit?: boolean;
  isEvade?: boolean;
  isFast?: boolean;
  nextStrikeBuff?: { damageMult: number };
  expected: {
    damage: number;
    resultingHp: number;
    isCrit?: boolean;
    isEvade?: boolean;
    isFast?: boolean;
    blockTier?: BlockTier;
  };
};

const inspectFixture = ({
  name,
  skillId = "basic",
  blockTier = "none",
  baseDamageBoost = 100,
  isCrit = false,
  isEvade = false,
  isFast = false,
  nextStrikeBuff,
  expected,
}: FixtureOptions) => {
  const result = resolveStrike({
    attacker: {
      stats: {
        baseDamageBoost,
        critChance: 0,
        critMultiplier: 2,
        evadeChance: 0,
        fastChance: 0,
        skillCritChance: 0,
      },
      nextStrikeBuff,
    },
    defender: {
      hp: 1000,
      stats: { evadeChance: 0 },
    },
    skillId,
    defense: { blockTier },
    outcomes: { isCrit, isEvade, isFast },
  });

  assert.equal(result.damage, expected.damage, `${name}: damage`);
  assert.equal(result.resultingHp, expected.resultingHp, `${name}: HP`);
  if (expected.isCrit !== undefined) {
    assert.equal(result.isCrit, expected.isCrit, `${name}: crit`);
  }
  if (expected.isEvade !== undefined) {
    assert.equal(result.isEvade, expected.isEvade, `${name}: evade`);
  }
  if (expected.isFast !== undefined) {
    assert.equal(result.isFast, expected.isFast, `${name}: fast`);
  }
  if (expected.blockTier !== undefined) {
    assert.equal(result.blockTier, expected.blockTier, `${name}: block tier`);
  }

  return { name, ...result };
};

const fixtures: FixtureOptions[] = [
  {
    name: "basic",
    expected: { damage: 100, resultingHp: 900 },
  },
  {
    name: "crit",
    isCrit: true,
    expected: { damage: 200, resultingHp: 800, isCrit: true },
  },
  {
    name: "precise guaranteed crit",
    skillId: "precise",
    expected: { damage: 200, resultingHp: 800, isCrit: true },
  },
  {
    name: "fast",
    isFast: true,
    expected: { damage: 250, resultingHp: 750, isFast: true },
  },
  {
    name: "heavy after basic block",
    skillId: "heavy",
    blockTier: "basic",
    baseDamageBoost: 101,
    expected: {
      damage: 80,
      resultingHp: 920,
      blockTier: "basic",
    },
  },
  {
    name: "evade",
    isEvade: true,
    expected: { damage: 0, resultingHp: 1000, isEvade: true },
  },
  {
    name: "basic block",
    blockTier: "basic",
    expected: {
      damage: 40,
      resultingHp: 960,
      blockTier: "basic",
    },
  },
  {
    name: "perfect parry",
    blockTier: "perfect",
    expected: {
      damage: 0,
      resultingHp: 1000,
      blockTier: "perfect",
    },
  },
];

const results = fixtures.map(inspectFixture);

const buffedStrike = inspectFixture({
  name: "parry buff consumed",
  nextStrikeBuff: { damageMult: 1.25 },
  expected: { damage: 125, resultingHp: 875 },
});
assert.deepEqual(buffedStrike.consumedBuff, { damageMult: 1.25 });

const nextStrike = inspectFixture({
  name: "next strike unbuffed",
  expected: { damage: 100, resultingHp: 900 },
});
assert.equal(nextStrike.consumedBuff, null);

const legacyBlock = resolveStrike({
  attacker: {
    stats: {
      baseDamageBoost: 100,
      critChance: 0,
      critMultiplier: 2,
      evadeChance: 0,
      fastChance: 0,
      skillCritChance: 0,
    },
  },
  defender: { hp: 1000, stats: { evadeChance: 0 } },
  skillId: "basic",
  defense: {
    attackZone: 1,
    attackTime: 1000,
    blockZone: 1,
    blockTime: 700,
  },
  outcomes: { isCrit: true, isEvade: false, isFast: false },
});
assert.equal(legacyBlock.damage, 100);
assert.equal(legacyBlock.block, "50%");

console.table(
  [...results, buffedStrike, nextStrike].map(result => ({
    fixture: result.name,
    damage: result.damage,
    hp: result.resultingHp,
    crit: result.isCrit,
    evade: result.isEvade,
    fast: result.isFast,
    blockTier: result.blockTier,
    consumedBuff: result.consumedBuff?.damageMult ?? "none",
  })),
);
console.log("Legacy block compatibility:", {
  damage: legacyBlock.damage,
  block: legacyBlock.block,
});
