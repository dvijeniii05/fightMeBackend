import type { CalculatedStatsProps } from "./calculateStatsHelper";
import { isItCritHelper } from "./critHelpers";
import { isItEvadedHelper } from "./evasionHelper";
import { isItFastHelper } from "./fastHelper";
import { incomingDamageHelper } from "./incomingDamageHelper";

export const calculateDamageHelper = (to: any, from: any) => {
  const critChance = from.stats.crit * 0.15 + from.buffs.addCritChance; //percent
  const critMultiplier = from.stats.crit * 0.02 + from.buffs.addCritMultiplier; //mutiplier
  const evastionChance = from.stats.evasion * 0.2 + from.buffs.addEvasion; //percent
  // const blockDamage =
  //   (userOnePick.stats.strength + userOnePick.stats.health) * 1.5 +
  //   userOnePick.buffs.addBlockDamage;
  const blockDamage = 50;
  console.log("BLOCK_DAMAGE", blockDamage);

  const isItCrit = isItCritHelper(critChance);
  const isItEvaded = isItEvadedHelper(evastionChance);

  const potentialTotalDamage = () => {
    // below logic should be reworked for magic damage
    const damageFromStats = from.stats.strength * 1.5;
    const additionalDamage = from.buffs.physicalDamage;
    return (
      (damageFromStats + additionalDamage) * (isItCrit ? 1 + critMultiplier : 1)
    );
  };
  console.log("TOTAL_DAMAGE", potentialTotalDamage());
  console.log("IS_CRIT?", isItCrit);
  console.log("IS_EVADED", isItEvaded);
  // value below should be multiplied to block coefficient of user's character.
  // User's character's stats should be passed in for calculation
  const isGoodBlock =
    Object.keys(from.attack).filter(key => {
      if (from.attack[key] && from.attack[key] === to.deffence[key]) {
        return key;
      }
    }).length > 0;
  console.log("IS_BLOCKED?", isGoodBlock);

  const rawDamage = potentialTotalDamage();
  console.log("rawDamage", rawDamage);
  const afterBlockDamage = isGoodBlock ? rawDamage - blockDamage : rawDamage;
  const finalTotalDamage = isItEvaded
    ? 0
    : afterBlockDamage < 0
    ? 0
    : afterBlockDamage;
  const calcualtedOrigHealth = to.stats.health * 100 + to.buffs.addHealth;

  return {
    damage: finalTotalDamage,
    isGoodBlock,
    isItCrit,
    isItEvaded,
    healthLeft: to.healthLeft - finalTotalDamage,
    originalHealth: calcualtedOrigHealth,
  };
};

interface PLayerActionAndStats extends Omit<CalculatedStatsProps, "hp"> {
  attackTime: number;
  blockTime: number;
  maxHp: number;
  hp: number;
}
//Below A - playerOne ; B - playerTwo
export const calculateRoundOutcome = (
  A: PLayerActionAndStats,
  B: PLayerActionAndStats,
) => {
  const isCritA = isItCritHelper(A.critChance);
  const isCritB = isItCritHelper(B.critChance);

  const isEvadeA = isItEvadedHelper(A.evadeChance);
  const isEvadeB = isItEvadedHelper(B.evadeChance);

  const isFastA = isItFastHelper(A.fastChance);
  const isFastB = isItFastHelper(B.fastChance);

  const attackRangeA = {
    min: Math.max(A.attackTime - A.attackArea, 0), //min limit is 0
    max: Math.min(A.attackTime + A.attackArea, 200), //max limit is 200
  };
  const attackRangeB = {
    min: Math.max(B.attackTime - B.attackArea, 0),
    max: Math.min(B.attackTime + B.attackArea, 200),
  };

  const blockRangeA = {
    min: Math.max(A.blockTime - A.blockArea, 0),
    max: Math.min(A.blockTime + A.blockArea, 200),
  };
  const blockRangeB = {
    min: Math.max(B.blockTime - B.blockArea, 0),
    max: Math.min(B.blockTime + B.blockArea, 200),
  };

  const potentialDamageA =
    A.baseDamageBoost * (isCritA ? A.critMultiplier : 1) * (isFastA ? 2.5 : 1);
  const potentialDamageB =
    B.baseDamageBoost * (isCritB ? B.critMultiplier : 1) * (isFastB ? 2.5 : 1);

  //Below relates to block calculation. Is it blocked? If yes, then what is the amount.
  //If block covers 50%+ of attackArea then 0 damage is dealt

  const incomingDamageA = incomingDamageHelper({
    blockRange: blockRangeA,
    incomingAttackRange: attackRangeB,
    incomingDamage: potentialDamageB,
  });

  const incomingDamageB = incomingDamageHelper({
    blockRange: blockRangeB,
    incomingAttackRange: attackRangeA,
    incomingDamage: potentialDamageA,
  });

  const hpLeftA = Math.max(0, A.hp - (isEvadeA ? 0 : incomingDamageA.damage));
  const hpLeftB = Math.max(0, B.hp - (isEvadeB ? 0 : incomingDamageB.damage));

  return {
    playerOne: {
      hp: hpLeftA,
      isCrit: isCritA,
      isEvade: isEvadeA,
      isFastA: isFastA,
      incomingDamage: incomingDamageA.damage,
      outgoingDamage: incomingDamageB.damage,
      block: incomingDamageA.block,
      isBlocked: incomingDamageA.isBlocked,
      attackRange: `${attackRangeA.min}-${attackRangeA.max}`,
      blockRange: `${blockRangeA.min}-${blockRangeA.max}`,
    },
    playerTwo: {
      hp: hpLeftB,
      isCrit: isCritB,
      isEvade: isEvadeB,
      isFastA: isFastB,
      incomingDamage: incomingDamageB.damage,
      outgoingDamage: incomingDamageA.damage,
      block: incomingDamageB.block,
      isBlocked: incomingDamageB.isBlocked,
      attackRange: `${attackRangeB.min}-${attackRangeB.max}`,
      blockRange: `${blockRangeB.min}-${blockRangeB.max}`,
    },
  };
};
