import { isItCritHelper } from "./critHelpers";
import { isItEvadedHelper } from "./evasionHelper";

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
    Object.keys(from.attack).filter((key) => {
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
